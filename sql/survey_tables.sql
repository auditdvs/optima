-- =====================================================
-- Survey Kepuasan Auditee Tables
-- =====================================================

-- Table 1: survey_tokens
-- Menyimpan token yang dibuat oleh auditor untuk survei
CREATE TABLE IF NOT EXISTS public.survey_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(20) UNIQUE NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    response_count INTEGER DEFAULT 0
);

-- Index untuk pencarian token
CREATE INDEX IF NOT EXISTS idx_survey_tokens_token ON public.survey_tokens(token);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_created_by ON public.survey_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_survey_tokens_expires_at ON public.survey_tokens(expires_at);

-- Table 2: survey_responses
-- Menyimpan jawaban survei dari auditee
CREATE TABLE IF NOT EXISTS public.survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id UUID REFERENCES public.survey_tokens(id) ON DELETE CASCADE,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    
    -- Section 1: Atribut Profesional (A1-A6) - Scale 1-5
    a1 INTEGER CHECK (a1 >= 1 AND a1 <= 5),
    a2 INTEGER CHECK (a2 >= 1 AND a2 <= 5),
    a3 INTEGER CHECK (a3 >= 1 AND a3 <= 5),
    a4 INTEGER CHECK (a4 >= 1 AND a4 <= 5),
    a5 INTEGER CHECK (a5 >= 1 AND a5 <= 5),
    a6 INTEGER CHECK (a6 >= 1 AND a6 <= 5),
    
    -- Section 1: Ruang Lingkup Pegawaian Audit (B1-B3) - Scale 1-5
    b1 INTEGER CHECK (b1 >= 1 AND b1 <= 5),
    b2 INTEGER CHECK (b2 >= 1 AND b2 <= 5),
    b3 INTEGER CHECK (b3 >= 1 AND b3 <= 5),
    
    -- Section 1: Kinerja Pelaksanaan Audit (C1-C7) - Scale 1-5
    c1 INTEGER CHECK (c1 >= 1 AND c1 <= 5),
    c2 INTEGER CHECK (c2 >= 1 AND c2 <= 5),
    c3 INTEGER CHECK (c3 >= 1 AND c3 <= 5),
    c4 INTEGER CHECK (c4 >= 1 AND c4 <= 5),
    c5 INTEGER CHECK (c5 >= 1 AND c5 <= 5),
    c6 INTEGER CHECK (c6 >= 1 AND c6 <= 5),
    c7 INTEGER CHECK (c7 >= 1 AND c7 <= 5),
    
    -- Section 1: Keseluruhan Pelaksanaan Audit (D1-D4) - Scale 1-5
    d1 INTEGER CHECK (d1 >= 1 AND d1 <= 5),
    d2 INTEGER CHECK (d2 >= 1 AND d2 <= 5),
    d3 INTEGER CHECK (d3 >= 1 AND d3 <= 5),
    d4 INTEGER CHECK (d4 >= 1 AND d4 <= 5),
    
    -- Section 2: Hal-hal yang membantu (S2A-S2I) - Boolean Yes/No
    s2a BOOLEAN,
    s2b BOOLEAN,
    s2c BOOLEAN,
    s2d BOOLEAN,
    s2e BOOLEAN,
    s2f BOOLEAN,
    s2g BOOLEAN,
    s2h BOOLEAN,
    s2i BOOLEAN,
    
    -- Section 3: Hal-hal yang mengecewakan (S3A-S3L) - Boolean Yes/No
    s3a BOOLEAN,
    s3b BOOLEAN,
    s3c BOOLEAN,
    s3d BOOLEAN,
    s3e BOOLEAN,
    s3f BOOLEAN,
    s3g BOOLEAN,
    s3h BOOLEAN,
    s3i BOOLEAN,
    s3j BOOLEAN,
    s3k BOOLEAN,
    s3l BOOLEAN,
    
    -- Section 4: Long Answer
    harapan TEXT,
    kritik_saran TEXT
);

-- Index untuk pencarian response berdasarkan token
CREATE INDEX IF NOT EXISTS idx_survey_responses_token_id ON public.survey_responses(token_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_at ON public.survey_responses(submitted_at);

-- Function untuk update response_count pada survey_tokens
CREATE OR REPLACE FUNCTION update_survey_response_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.survey_tokens
    SET response_count = (
        SELECT COUNT(*) FROM public.survey_responses WHERE token_id = NEW.token_id
    )
    WHERE id = NEW.token_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk update response_count setiap ada response baru
DROP TRIGGER IF EXISTS trigger_update_survey_response_count ON public.survey_responses;
CREATE TRIGGER trigger_update_survey_response_count
AFTER INSERT ON public.survey_responses
FOR EACH ROW
EXECUTE FUNCTION update_survey_response_count();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.survey_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Policies untuk survey_tokens
-- Auditor dapat melihat semua token dan membuat token baru
-- Anonymous juga dapat membaca token untuk validasi survei publik
CREATE POLICY "Anyone can view survey tokens for validation"
ON public.survey_tokens
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Authenticated users can create survey tokens"
ON public.survey_tokens
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update own survey tokens"
ON public.survey_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can delete own survey tokens"
ON public.survey_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Policies untuk survey_responses
-- Auditee (anonymous) dapat mengisi survey (INSERT), authenticated dapat melihat (SELECT)
CREATE POLICY "Anyone can submit survey responses"
ON public.survey_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view survey responses"
ON public.survey_responses
FOR SELECT
TO authenticated
USING (true);
