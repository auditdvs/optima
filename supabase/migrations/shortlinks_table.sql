-- ─────────────────────────────────────────────────────────────────────────────
-- SHORTLINKS TABLE + RPC
-- Jalankan ini di Supabase Dashboard > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shortlinks (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug           text UNIQUE NOT NULL,
  destination_url text NOT NULL,
  title          text,
  click_count    integer DEFAULT 0 NOT NULL,
  created_by     text,
  created_at     timestamptz DEFAULT now() NOT NULL
);

-- Index untuk pencarian slug yang cepat
CREATE INDEX IF NOT EXISTS shortlinks_slug_idx ON public.shortlinks (slug);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.shortlinks ENABLE ROW LEVEL SECURITY;

-- SELECT: user login bisa baca semua (untuk halaman manajemen)
CREATE POLICY "shortlinks_select_authenticated"
  ON public.shortlinks FOR SELECT
  TO authenticated
  USING (true);

-- SELECT: juga izinkan anon untuk halaman redirect publik /s/:slug
CREATE POLICY "shortlinks_select_anon"
  ON public.shortlinks FOR SELECT
  TO anon
  USING (true);

-- INSERT: user login bisa buat shortlink baru
CREATE POLICY "shortlinks_insert_authenticated"
  ON public.shortlinks FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: user login bisa update (edit)
CREATE POLICY "shortlinks_update_authenticated"
  ON public.shortlinks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: user login bisa hapus
CREATE POLICY "shortlinks_delete_authenticated"
  ON public.shortlinks FOR DELETE
  TO authenticated
  USING (true);

-- ─── RPC: increment click ─────────────────────────────────────────────────────
-- Digunakan oleh ShortlinkRedirect.tsx (halaman publik)
-- SECURITY DEFINER agar anon pun bisa increment tanpa perlu UPDATE policy

CREATE OR REPLACE FUNCTION public.increment_shortlink_click(link_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.shortlinks
  SET click_count = click_count + 1
  WHERE slug = link_slug;
$$;

-- Izinkan anon & authenticated memanggil RPC ini
GRANT EXECUTE ON FUNCTION public.increment_shortlink_click(text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELESAI.
-- Format URL shortlink: https://optima.komida.co.id/s/:slug
-- Redirect ditangani oleh React app (route /s/:slug), TANPA Edge Function.
-- ─────────────────────────────────────────────────────────────────────────────
