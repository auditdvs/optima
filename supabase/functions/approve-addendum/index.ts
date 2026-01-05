// Supabase Edge Function: approve-addendum
// Handles: Move Excel to perdin_acc bucket + Protect UM sheet + Update database
// 
// Deploy with: supabase functions deploy approve-addendum
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
  addendumId: string;
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

    const { addendumId, userId }: ApproveRequest = await req.json();

    if (!addendumId || !userId) {
      return new Response(
        JSON.stringify({ error: 'addendumId dan userId wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Processing approval for addendum: ${addendumId}`);

    // 1. Get addendum data
    const { data: addendum, error: addendumError } = await supabase
      .from('addendum')
      .select('*')
      .eq('id', addendumId)
      .single();

    if (addendumError || !addendum) {
      console.error('Addendum not found:', addendumError);
      return new Response(
        JSON.stringify({ error: 'Addendum tidak ditemukan' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Addendum uses excel_file_url or link_file for the file URL
    const fileUrl = addendum.excel_file_url || addendum.link_file;
    
    // If no file, just update status
    if (!fileUrl) {
      const { error: updateError } = await supabase
        .from('addendum')
        .update({
          status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', addendumId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, message: 'Addendum approved (no file to process)' }),
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

    // 7. Get new public URL for LPJ column
    const { data: { publicUrl: lpjFileUrl } } = supabase.storage
      .from('perdin_acc')
      .getPublicUrl(originalFilePath);

    console.log(`🔗 LPJ file URL: ${lpjFileUrl}`);

    // 8. Update addendum status and lpj column in database
    // - link_file/excel_file_url tetap (file original di perdin)
    // - lpj = URL file yang sudah diprotect di perdin_acc
    // - um_locked = true
    const { error: updateError } = await supabase
      .from('addendum')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        lpj: lpjFileUrl,         // URL file yang sudah diprotect untuk LPJ
        um_locked: true          // Flag menandakan UM sudah dilock
      })
      .eq('id', addendumId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    console.log(`✅ Addendum ${addendumId} approved successfully!`);
    console.log(`   - link_file: ${fileUrl} (original)`);
    console.log(`   - lpj: ${lpjFileUrl} (protected)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Addendum approved successfully',
        lpjFileUrl,
        umSheetProtected: umSheetFound,
        sheetsProtected
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in approve-addendum function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
