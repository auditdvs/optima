// Supabase Edge Function: shortlink
// Redirect shortlink slug ke URL tujuan + increment click count
//
// Usage:
//   GET /functions/v1/shortlink/:slug  → redirect ke destination_url
//
// Tabel yang diperlukan:
//   CREATE TABLE shortlinks (
//     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//     slug text UNIQUE NOT NULL,
//     destination_url text NOT NULL,
//     title text,
//     click_count integer DEFAULT 0,
//     created_by text,
//     created_at timestamptz DEFAULT now()
//   );
//
// RLS: Enable RLS, beri SELECT ke authenticated & anon,
//      INSERT/UPDATE/DELETE ke authenticated (atau batasi ke admin).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract slug from URL path: /functions/v1/shortlink/:slug
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // pathParts: ['functions', 'v1', 'shortlink', ':slug']
    const slug = pathParts[pathParts.length - 1];

    if (!slug || slug === 'shortlink') {
      return new Response(
        JSON.stringify({ error: 'Slug tidak ditemukan di URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Cari slug di tabel shortlinks
    const { data: link, error } = await supabase
      .from('shortlinks')
      .select('id, destination_url, click_count')
      .eq('slug', slug)
      .single();

    if (error || !link) {
      // Tampilkan halaman 404 yang rapi
      const html404 = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — Shortlink Tidak Ditemukan</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #334155; }
    .box { text-align: center; max-width: 400px; padding: 2rem; }
    h1 { font-size: 4rem; font-weight: 800; color: #6366f1; margin: 0; }
    p { color: #64748b; }
    a { color: #6366f1; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="box">
    <h1>404</h1>
    <p>Shortlink <strong>/${slug}</strong> tidak ditemukan.</p>
    <p><a href="javascript:history.back()">← Kembali</a></p>
  </div>
</body>
</html>`;
      return new Response(html404, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // Increment click count (fire-and-forget, tidak blokir redirect)
    supabase
      .from('shortlinks')
      .update({ click_count: (link.click_count ?? 0) + 1 })
      .eq('id', link.id)
      .then(() => console.log(`Shortlink /${slug} clicked → count: ${(link.click_count ?? 0) + 1}`));

    // Redirect ke URL tujuan
    return new Response(null, {
      status: 302,
      headers: {
        'Location': link.destination_url,
        ...corsHeaders,
      },
    });

  } catch (err) {
    console.error('Shortlink error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
