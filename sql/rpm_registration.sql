-- =============================================
-- RPM Registration Table & RLS Policies
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create the rpm_registration table
CREATE TABLE IF NOT EXISTS public.rpm_registration (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    letter_number TEXT NOT NULL,
    letter_date DATE NOT NULL,
    region TEXT NOT NULL,
    branch_or_region_ho TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Inadequate' CHECK (status IN ('Adequate', 'Inadequate', 'Reminder 1', 'Reminder 2')),
    due_date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rpm_registration_created_at ON public.rpm_registration(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rpm_registration_region ON public.rpm_registration(region);
CREATE INDEX IF NOT EXISTS idx_rpm_registration_status ON public.rpm_registration(status);

-- 3. Enable Row Level Security
ALTER TABLE public.rpm_registration ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Policy: Allow all authenticated users to read all records
CREATE POLICY "Allow authenticated users to read rpm_registration"
ON public.rpm_registration
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow all authenticated users to insert records
CREATE POLICY "Allow authenticated users to insert rpm_registration"
ON public.rpm_registration
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow all authenticated users to update records
CREATE POLICY "Allow authenticated users to update rpm_registration"
ON public.rpm_registration
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow only superadmin, manager, qa, dvs to delete records
CREATE POLICY "Allow admin roles to delete rpm_registration"
ON public.rpm_registration
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('superadmin', 'manager', 'qa', 'dvs')
    )
);

-- 5. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_rpm_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS rpm_registration_updated_at_trigger ON public.rpm_registration;
CREATE TRIGGER rpm_registration_updated_at_trigger
    BEFORE UPDATE ON public.rpm_registration
    FOR EACH ROW
    EXECUTE FUNCTION public.update_rpm_registration_updated_at();

-- 7. Grant permissions
GRANT ALL ON public.rpm_registration TO authenticated;
GRANT ALL ON public.rpm_registration TO service_role;

-- =============================================
-- VERIFICATION QUERIES (optional, run separately)
-- =============================================

-- Check if table was created successfully
-- SELECT * FROM public.rpm_registration LIMIT 5;

-- Check RLS policies
-- SELECT * FROM pg_policies WHERE tablename = 'rpm_registration';

-- =============================================
-- NOTES:
-- =============================================
-- 
-- Table Columns:
-- - id: UUID primary key (auto-generated)
-- - letter_number: Format "001/KMD-AUDIT/QA/I/2026" (auto-generated in frontend)
-- - letter_date: Date of the letter
-- - region: Regional code (A, B, C, HO, etc.)
-- - branch_or_region_ho: Branch name, regional office, or HO
-- - subject: Subject/perihal of the letter
-- - status: Current status (Adequate, Inadequate, Reminder 1, Reminder 2)
-- - due_date: Due date or status text (Open, Finished, or actual date)
-- - created_at: Timestamp when record was created
-- - created_by: User ID who created the record
-- - updated_at: Timestamp of last update
--
-- RLS Policies:
-- - SELECT: All authenticated users can read
-- - INSERT: All authenticated users can insert
-- - UPDATE: All authenticated users can update
-- - DELETE: Only superadmin, manager, qa, dvs can delete

