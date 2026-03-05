// Supabase Edge Function: audit-suggest
// AI Audit Writing Assistant — Similarity search dari tabel public.matriks
//
// Usage:
//   POST /functions/v1/audit-suggest
//   Body: { "query": "cabang tidak melakukan", "field": "all", "limit": 5 }
//
// Returns:
//   { suggestions: [{ id, field_name, content, score }], query, duration_ms }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple in-memory cache for recent queries (LRU-like)
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000; // 60 seconds
const MAX_CACHE_SIZE = 100;

function getCacheKey(query: string, field: string, limit: number): string {
  return `${query.toLowerCase().trim()}|${field}|${limit}`;
}

function cleanCache() {
  if (queryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE / 2);
    toDelete.forEach(([key]) => queryCache.delete(key));
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const query = (body.query || '').trim();
    const field = body.field || 'all';
    const limit = Math.min(Math.max(body.limit || 5, 1), 10); // Clamp 1-10

    // Validate query
    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ 
          suggestions: [], 
          query, 
          duration_ms: Date.now() - startTime,
          message: 'Query terlalu pendek, minimal 3 karakter' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate field
    const validFields = ['all', 'judul_temuan', 'penyebab', 'dampak', 'kelemahan', 'rekomendasi'];
    if (!validFields.includes(field)) {
      return new Response(
        JSON.stringify({ error: `Field tidak valid. Pilih: ${validFields.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(query, field, limit);
    const cached = queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return new Response(
        JSON.stringify({
          ...cached.data,
          duration_ms: Date.now() - startTime,
          cached: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the PostgreSQL search function
    const { data, error } = await supabase.rpc('search_audit_suggestions', {
      search_query: query,
      search_field: field,
      result_limit: limit,
    });

    if (error) {
      console.error('Search error:', error);
      
      // Fallback: simple ILIKE search if the function doesn't exist yet
      const fallbackResults = await fallbackSearch(supabase, query, field, limit);
      
      const responseData = {
        suggestions: fallbackResults,
        query,
        field,
        total: fallbackResults.length,
        method: 'fallback_ilike',
      };

      return new Response(
        JSON.stringify({ ...responseData, duration_ms: Date.now() - startTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format response
    const suggestions = (data || []).map((row: any) => ({
      id: row.id,
      field_name: row.field_name,
      content: row.content,
      score: Math.round((row.similarity_score || 0) * 100) / 100,
    }));

    const responseData = {
      suggestions,
      query,
      field,
      total: suggestions.length,
      method: 'trigram_similarity',
    };

    // Cache the result
    queryCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    cleanCache();

    return new Response(
      JSON.stringify({ ...responseData, duration_ms: Date.now() - startTime }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('audit-suggest error:', err);
    return new Response(
      JSON.stringify({ 
        error: err.message || 'Internal server error',
        duration_ms: Date.now() - startTime 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback ILIKE search if pg_trgm function is not available
async function fallbackSearch(
  supabase: any, 
  query: string, 
  field: string, 
  limit: number
): Promise<any[]> {
  const fields = field === 'all' 
    ? ['judul_temuan', 'penyebab', 'dampak', 'kelemahan', 'rekomendasi']
    : [field];

  const results: any[] = [];

  for (const f of fields) {
    const { data } = await supabase
      .from('matriks')
      .select(`id, ${f}`)
      .ilike(f, `%${query}%`)
      .not(f, 'is', null)
      .limit(limit);

    if (data) {
      for (const row of data) {
        if (row[f] && row[f].trim()) {
          results.push({
            id: row.id,
            field_name: f,
            content: row[f],
            score: 0.5, // Default score for ILIKE matches
          });
        }
      }
    }
  }

  // Deduplicate by content and sort
  const seen = new Set<string>();
  return results
    .filter(r => {
      const key = r.content.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
