// Supabase Edge Function: approve-letter
// Handles: Move Excel to perdin_acc bucket + Protect UM sheet + Update database
// 
// Deploy with: supabase functions deploy approve-letter
// 
// Required environment variables (set in Supabase Dashboard):
// - SUPABASE_URL (auto-set)
// - SUPABASE_SERVICE_ROLE_KEY (auto-set)
// - UM_SHEET_PASSWORD (custom, set this yourself)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🔐 CUSTOM PASSWORD - GANTI SESUAI KEINGINAN
// ============================================
const UM_SHEET_PASSWORD = Deno.env.get('UM_SHEET_PASSWORD') || 'UM_SHEET_PASSWORD';
// ============================================

interface ApproveRequest {
  letterId: string;
  userId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role for storage operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { letterId, userId }: ApproveRequest = await req.json();

    if (!letterId || !userId) {
      return new Response(
        JSON.stringify({ error: 'letterId dan userId wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processing approval for letter: ${letterId}`);

    // 1. Get letter data
    const { data: letter, error: letterError } = await supabase
      .from('letter')
      .select('*')
      .eq('id', letterId)
      .single();

    if (letterError || !letter) {
      console.error('Letter not found:', letterError);
      return new Response(
        JSON.stringify({ error: 'Letter tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileUrl = letter.file_url;
    
    // If no file, just update status
    if (!fileUrl) {
      const { error: updateError } = await supabase
        .from('letter')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', letterId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Letter approved (no file to process)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Downloading file from: ${fileUrl}`);

    // 2. Extract file path from URL
    // URL format: https://<project>.supabase.co/storage/v1/object/public/perdin/<path>
    const urlParts = new URL(fileUrl);
    const pathMatch = urlParts.pathname.match(/\/storage\/v1\/object\/public\/perdin\/(.+)/);
    
    if (!pathMatch) {
      console.error('Invalid file URL format:', fileUrl);
      return new Response(
        JSON.stringify({ error: 'Format URL file tidak valid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const originalFilePath = decodeURIComponent(pathMatch[1]);
    console.log(`📂 Original file path: ${originalFilePath}`);

    // 3. Download file from perdin bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('perdin')
      .download(originalFilePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Gagal mengunduh file dari storage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ File downloaded, size: ${fileData.size} bytes`);

    // 4. Process Excel - Protect UM sheet
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    let umSheetFound = false;
    const sheetsProtected: string[] = [];

    workbook.eachSheet((worksheet) => {
      const sheetName = worksheet.name;
      const sheetNameUpper = sheetName.toUpperCase();
      
      console.log(`📄 Checking sheet: ${sheetName}`);
      
      // Check if this is the UM sheet (case insensitive)
      if (sheetNameUpper === 'UM' || 
          sheetNameUpper.includes('UANG MUKA') ||
          sheetNameUpper.includes('UANG_MUKA')) {
        
        console.log(`🔒 Protecting sheet: ${sheetName} with specific locks`);
        
        // 1. Unlock everything first (by setting default column style)
        // This is much lighter than iterating every cell
        if (worksheet.columns) {
          worksheet.columns.forEach(col => {
            // @ts-ignore: ExcelJS types might be missing protection on column def
            col.style = { ...col.style, protection: { locked: false } };
          });
        }
        
        // Also ensure cells are unlocked by default if column loop is missed
        // (For existing files, we might need a light loop, but let's try specific locking first)
        
        // 2. Lock specific cells (Transport, Konsumsi, Lainnya values)
        const cellsToLock = [
          'E14', 'E15', 'E16', 'E17', 'E18', 'E19', // Transport column
          'F18', // Konsumsi specific
          'G19'  // Lainnya specific
        ];
        
        cellsToLock.forEach(cellAddress => {
          const cell = worksheet.getCell(cellAddress);
          cell.protection = { locked: true };
        });

        // 3. Protect the sheet
        worksheet.protect(UM_SHEET_PASSWORD, {
          selectLockedCells: true,
          selectUnlockedCells: true, // User can select unlocked cells to edit them
          formatCells: false,
          formatColumns: false,
          formatRows: false,
          insertColumns: false,
          insertRows: false,
          insertHyperlinks: false,
          deleteColumns: false,
          deleteRows: false,
          sort: false,
          autoFilter: false,
          pivotTables: false
        });
        
        console.log(`✅ Sheet ${sheetName} protected successfully`);
        
        umSheetFound = true;
        sheetsProtected.push(sheetName);
      }
    });

    console.log(`📊 Sheets protected: ${sheetsProtected.join(', ') || 'None'}`);

    // 5. Save modified workbook to buffer
    const modifiedBuffer = await workbook.xlsx.writeBuffer();
    const modifiedBlob = new Blob([modifiedBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    console.log(`💾 Modified workbook size: ${modifiedBlob.size} bytes`);

    // 6. Upload to perdin_acc bucket (same path structure)
    const { error: uploadError } = await supabase.storage
      .from('perdin_acc')
      .upload(originalFilePath, modifiedBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: `Gagal upload file ke perdin_acc: ${uploadError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ File uploaded to perdin_acc/${originalFilePath}`);

    // 7. Get new public URL
    const { data: { publicUrl: newFileUrl } } = supabase.storage
      .from('perdin_acc')
      .getPublicUrl(originalFilePath);

    console.log(`🔗 New file URL: ${newFileUrl}`);

    // 8. Update letter status and lpj in database
    const { error: updateError } = await supabase
      .from('letter')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        lpj: newFileUrl,
        um_locked: true
      })
      .eq('id', letterId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Letter ${letterId} approved successfully!`);

    // 9. Optionally delete old file from perdin bucket
    // Uncomment below if you want to delete the original file after moving
    /*
    const { error: deleteError } = await supabase.storage
      .from('perdin')
      .remove([originalFilePath]);
    
    if (deleteError) {
      console.warn('Failed to delete original file:', deleteError);
    } else {
      console.log(`🗑️ Original file deleted from perdin bucket`);
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Letter approved successfully',
        newFileUrl,
        umSheetProtected: umSheetFound,
        sheetsProtected
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve-letter function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
