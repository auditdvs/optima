-- Create LPJ Submissions Table (Fixed Types)
CREATE TABLE IF NOT EXISTS public.lpj_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Link to either letter or addendum (Changed to BIGINT to match source tables)
    letter_id BIGINT REFERENCES public.letter(id),
    addendum_id BIGINT REFERENCES public.addendum(id),
    
    -- Cached info for easy display
    letter_number TEXT NOT NULL, 
    description TEXT,
    
    -- File info
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    
    -- Status
    status TEXT DEFAULT 'submitted',
    
    -- Constraints
    CONSTRAINT check_reference CHECK (
        (letter_id IS NOT NULL AND addendum_id IS NULL) OR 
        (letter_id IS NULL AND addendum_id IS NOT NULL)
    ),
    CONSTRAINT unique_letter_lpj UNIQUE (letter_id),
    CONSTRAINT unique_addendum_lpj UNIQUE (addendum_id)
);

-- Enable RLS
ALTER TABLE public.lpj_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for lpj_submissions
CREATE POLICY "Enable read access for authenticated users" ON public.lpj_submissions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.lpj_submissions
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Enable update for creator" ON public.lpj_submissions
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Create Storage Bucket for LPJ (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lpj-documents', 'lpj-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: 'ON CONFLICT' doesn't work for create policy, so we drop if exists or rely on dashboard to manage duplicates if run previously.
-- Better to run these only if they don't exist, but SQL editor usually handles 'already exists' errors gracefully or you can ignore them.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Give access to authenticated users to upload'
    ) THEN
        CREATE POLICY "Give access to authenticated users to upload" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lpj-documents');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Give access to public to read'
    ) THEN
        CREATE POLICY "Give access to public to read" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'lpj-documents');
    END IF;
END
$$;
