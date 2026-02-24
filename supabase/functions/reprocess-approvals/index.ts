// Supabase Edge Function: reprocess-approvals
// Process ONE approved addendum or letter at a time (to avoid memory limits)
// Called by client in a loop with type + id
//
// Usage:
//   { "type": "addendum", "id": "123" }  - process specific addendum
//   { "type": "letter", "id": "456" }    - process specific letter
//   { "type": "check" }                  - return list of records needing reprocess

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import ExcelJS from "https://esm.sh/exceljs@4.4.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UM_SHEET_PASSWORD = Deno.env.get('UM_SHEET_PASSWORD') || 'UM_SHEET_PASSWORD';

async function processAndUploadFile(
  supabase: any,
  fileUrl: string
): Promise<{ success: boolean; lpjUrl?: string; umSheetFound?: boolean; error?: string }> {
  try {
    const urlParts = new URL(fileUrl);
    const pathMatch = urlParts.pathname.match(/\/storage\/v1\/object\/public\/perdin\/(.+)/);

    if (!pathMatch) {
      return { success: false, error: `Invalid file URL format: ${fileUrl}` };
    }

    const originalFilePath = decodeURIComponent(pathMatch[1]);
    console.log(`  📂 File path: ${originalFilePath}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('perdin')
      .download(originalFilePath);

    if (downloadError || !fileData) {
      return { success: false, error: `Download failed: ${downloadError?.message}` };
    }

    console.log(`  ✅ Downloaded, size: ${fileData.size} bytes`);

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    let umSheetFound = false;

    workbook.eachSheet((worksheet: any) => {
      const sheetNameUpper = worksheet.name.toUpperCase();

      if (sheetNameUpper === 'UM' ||
          sheetNameUpper.includes('UANG MUKA') ||
          sheetNameUpper.includes('UANG_MUKA')) {

        if (worksheet.columns) {
          worksheet.columns.forEach((col: any) => {
            col.style = { ...col.style, protection: { locked: false } };
          });
        }

        const cellsToLock = ['E14', 'E15', 'E16', 'E17', 'E18', 'E19', 'F18', 'G19'];
        cellsToLock.forEach((addr: string) => {
          worksheet.getCell(addr).protection = { locked: true };
        });

        worksheet.protect(UM_SHEET_PASSWORD, {
          selectLockedCells: true,
          selectUnlockedCells: true,
          formatCells: false, formatColumns: false, formatRows: false,
          insertColumns: false, insertRows: false, insertHyperlinks: false,
          deleteColumns: false, deleteRows: false,
          sort: false, autoFilter: false, pivotTables: false
        });

        umSheetFound = true;
      }
    });

    const modifiedBuffer = await workbook.xlsx.writeBuffer();
    const modifiedBlob = new Blob([modifiedBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const { error: uploadError } = await supabase.storage
      .from('perdin_acc')
      .upload(originalFilePath, modifiedBlob, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      return { success: false, error: `Upload failed: ${uploadError.message}` };
    }

    const { data: { publicUrl: lpjUrl } } = supabase.storage
      .from('perdin_acc')
      .getPublicUrl(originalFilePath);

    return { success: true, lpjUrl, umSheetFound };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const type = body.type || 'check';
    const id = body.id;

    if (type === 'check') {
      const { data: addendums } = await supabase
        .from('addendum')
        .select('id, excel_file_url, link_file, assigment_letter, branch_name')
        .or('and(status.eq.approved,um_locked.is.null),and(status.eq.approved,um_locked.eq.false)');

      const { data: letters } = await supabase
        .from('letter')
        .select('id, file_url, assigment_letter, branch_name')
        .or('and(status.eq.approved,um_locked.is.null),and(status.eq.approved,um_locked.eq.false)');

      const pendingAddendums = (addendums || [])
        .filter(a => a.excel_file_url || a.link_file)
        .map(a => ({ 
          id: a.id, 
          type: 'addendum', 
          label: `Addendum - ${a.assigment_letter || 'No No.'} (${a.branch_name || 'No Branch'})` 
        }));

      const pendingLetters = (letters || [])
        .filter(l => l.file_url)
        .map(l => ({ 
          id: l.id, 
          type: 'letter', 
          label: `Surat Tugas - ${l.assigment_letter || 'No No.'} (${l.branch_name || 'No Branch'})` 
        }));

      const skippedAddendums = (addendums || []).filter(a => !a.excel_file_url && !a.link_file).length;
      const skippedLetters = (letters || []).filter(l => !l.file_url).length;

      return new Response(
        JSON.stringify({
          success: true,
          pending: [...pendingAddendums, ...pendingLetters],
          total: pendingAddendums.length + pendingLetters.length,
          skipped: skippedAddendums + skippedLetters
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 2: Process single addendum
    if (type === 'addendum' && id) {
      console.log(`📋 Processing addendum #${id}`);

      const { data: addendum, error } = await supabase
        .from('addendum')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !addendum) {
        return new Response(
          JSON.stringify({ success: false, error: 'Addendum not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const fileUrl = addendum.excel_file_url || addendum.link_file;
      if (!fileUrl) {
        return new Response(
          JSON.stringify({ success: false, error: 'No file URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await processAndUploadFile(supabase, fileUrl);

      if (result.success) {
        await supabase
          .from('addendum')
          .update({ lpj: result.lpjUrl, um_locked: true })
          .eq('id', id);
      }

      return new Response(
        JSON.stringify({ success: result.success, lpjUrl: result.lpjUrl, umSheetFound: result.umSheetFound, error: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 3: Process single letter
    if (type === 'letter' && id) {
      console.log(`� Processing letter #${id}`);

      const { data: letter, error } = await supabase
        .from('letter')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !letter) {
        return new Response(
          JSON.stringify({ success: false, error: 'Letter not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!letter.file_url) {
        return new Response(
          JSON.stringify({ success: false, error: 'No file URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await processAndUploadFile(supabase, letter.file_url);

      if (result.success) {
        await supabase
          .from('letter')
          .update({ lpj: result.lpjUrl, um_locked: true })
          .eq('id', id);
      }

      return new Response(
        JSON.stringify({ success: result.success, lpjUrl: result.lpjUrl, umSheetFound: result.umSheetFound, error: result.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid request. Use type: check/addendum/letter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
