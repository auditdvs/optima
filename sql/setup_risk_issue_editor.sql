-- =====================================================
-- Setup Tabel Risk Issue
-- Struktur mengikuti tabel matriks + tambahan tanggal_audit (dd/mm/yyyy)
-- Setiap QA punya sheet sendiri per jenis audit: regular | special
-- Aman dijalankan berulang
-- =====================================================

CREATE TABLE IF NOT EXISTS public.risk_issue (
  id BIGSERIAL PRIMARY KEY,
  audit_type TEXT DEFAULT 'regular',
  created_by UUID,
  kc_kr_kp TEXT DEFAULT '',
  judul_temuan TEXT DEFAULT '',
  kode_risk_issue TEXT DEFAULT '',
  judul_risk_issue TEXT DEFAULT '',
  kategori TEXT DEFAULT '',
  penyebab TEXT DEFAULT '',
  dampak TEXT DEFAULT '',
  kelemahan TEXT DEFAULT '',
  rekomendasi TEXT DEFAULT '',
  poin INTEGER,
  perbaikan_temuan TEXT DEFAULT '',
  jatuh_tempo TEXT DEFAULT '',
  tanggal_audit TEXT DEFAULT '',
  last_updated TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.risk_issue
  ADD COLUMN IF NOT EXISTS audit_type TEXT DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE public.risk_issue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_issue'
      AND policyname = 'risk_issue_select_authenticated'
  ) THEN
    CREATE POLICY "risk_issue_select_authenticated" ON public.risk_issue
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_issue'
      AND policyname = 'risk_issue_insert_authenticated'
  ) THEN
    CREATE POLICY "risk_issue_insert_authenticated" ON public.risk_issue
      FOR INSERT TO authenticated
      WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_issue'
      AND policyname = 'risk_issue_update_authenticated'
  ) THEN
    CREATE POLICY "risk_issue_update_authenticated" ON public.risk_issue
      FOR UPDATE TO authenticated
      USING (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
      )
      WITH CHECK (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'risk_issue'
      AND policyname = 'risk_issue_delete_authenticated'
  ) THEN
    CREATE POLICY "risk_issue_delete_authenticated" ON public.risk_issue
      FOR DELETE TO authenticated
      USING (
        auth.role() = 'authenticated'
        AND created_by = auth.uid()
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_issue TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.risk_issue_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.set_risk_issue_last_updated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_risk_issue_last_updated ON public.risk_issue;

CREATE TRIGGER trg_risk_issue_last_updated
BEFORE UPDATE ON public.risk_issue
FOR EACH ROW
EXECUTE FUNCTION public.set_risk_issue_last_updated();

ALTER TABLE public.risk_issue
  DROP CONSTRAINT IF EXISTS risk_issue_tanggal_audit_format;

ALTER TABLE public.risk_issue
  ADD CONSTRAINT risk_issue_tanggal_audit_format
  CHECK (
    tanggal_audit = ''
    OR tanggal_audit ~ '^\d{2}/\d{2}/\d{4}$'
  );

ALTER TABLE public.risk_issue
  DROP CONSTRAINT IF EXISTS risk_issue_audit_type_check;

ALTER TABLE public.risk_issue
  ADD CONSTRAINT risk_issue_audit_type_check
  CHECK (audit_type IN ('regular', 'special'));

SELECT COUNT(*) AS total_risk_issue_rows
FROM public.risk_issue;
