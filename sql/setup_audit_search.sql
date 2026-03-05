-- =====================================================
-- Search Function: Return FULL ROWS from matriks
-- Setiap hasil = 1 temuan lengkap (judul-rekomendasi)
-- =====================================================

DROP FUNCTION IF EXISTS search_audit_suggestions;

CREATE OR REPLACE FUNCTION search_audit_suggestions(
  search_query TEXT,
  search_field TEXT DEFAULT 'all',
  result_limit INT DEFAULT 3
)
RETURNS TABLE (
  id INT,
  judul_temuan TEXT,
  penyebab TEXT,
  dampak TEXT,
  kelemahan TEXT,
  rekomendasi TEXT,
  matched_fields TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  q TEXT := LOWER(TRIM(search_query));
BEGIN
  RETURN QUERY
  SELECT m.id,
         m.judul_temuan,
         m.penyebab,
         m.dampak,
         m.kelemahan,
         m.rekomendasi,
         ARRAY_TO_STRING(ARRAY_REMOVE(ARRAY[
           CASE WHEN LOWER(COALESCE(m.judul_temuan,'')) ILIKE '%' || q || '%' THEN 'judul_temuan' END,
           CASE WHEN LOWER(COALESCE(m.penyebab,'')) ILIKE '%' || q || '%' THEN 'penyebab' END,
           CASE WHEN LOWER(COALESCE(m.dampak,'')) ILIKE '%' || q || '%' THEN 'dampak' END,
           CASE WHEN LOWER(COALESCE(m.kelemahan,'')) ILIKE '%' || q || '%' THEN 'kelemahan' END,
           CASE WHEN LOWER(COALESCE(m.rekomendasi,'')) ILIKE '%' || q || '%' THEN 'rekomendasi' END
         ], NULL), ',') AS matched_fields
  FROM public.matriks m
  WHERE 
    CASE 
      WHEN search_field = 'all' THEN
        LOWER(COALESCE(m.judul_temuan,'')) ILIKE '%' || q || '%'
        OR LOWER(COALESCE(m.penyebab,'')) ILIKE '%' || q || '%'
        OR LOWER(COALESCE(m.dampak,'')) ILIKE '%' || q || '%'
        OR LOWER(COALESCE(m.kelemahan,'')) ILIKE '%' || q || '%'
        OR LOWER(COALESCE(m.rekomendasi,'')) ILIKE '%' || q || '%'
      WHEN search_field = 'judul_temuan' THEN
        LOWER(COALESCE(m.judul_temuan,'')) ILIKE '%' || q || '%'
      WHEN search_field = 'penyebab' THEN
        LOWER(COALESCE(m.penyebab,'')) ILIKE '%' || q || '%'
      WHEN search_field = 'dampak' THEN
        LOWER(COALESCE(m.dampak,'')) ILIKE '%' || q || '%'
      WHEN search_field = 'kelemahan' THEN
        LOWER(COALESCE(m.kelemahan,'')) ILIKE '%' || q || '%'
      WHEN search_field = 'rekomendasi' THEN
        LOWER(COALESCE(m.rekomendasi,'')) ILIKE '%' || q || '%'
      ELSE false
    END
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_audit_suggestions TO anon, authenticated;

-- TEST:
-- SELECT id, judul_temuan, matched_fields FROM search_audit_suggestions('pembelian', 'all', 3);
-- SELECT id, judul_temuan, matched_fields FROM search_audit_suggestions('galon', 'all', 3);
