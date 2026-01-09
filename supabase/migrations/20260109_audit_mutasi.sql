-- Create audit_mutasi table for tracking auditor transfers between branches
CREATE TABLE IF NOT EXISTS audit_mutasi (
    id BIGSERIAL PRIMARY KEY,
    auditor_name TEXT NOT NULL,
    departure_date DATE NOT NULL,
    from_branch TEXT NOT NULL,
    to_branch TEXT NOT NULL,
    transport NUMERIC(15, 2) DEFAULT 0,
    konsumsi NUMERIC(15, 2) DEFAULT 0,
    lainnya NUMERIC(15, 2) DEFAULT 0,
    total NUMERIC(15, 2) GENERATED ALWAYS AS (transport + konsumsi + lainnya) STORED,
    notes TEXT,
    file_url TEXT,
    file_name TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_mutasi_auditor ON audit_mutasi(auditor_name);
CREATE INDEX IF NOT EXISTS idx_audit_mutasi_date ON audit_mutasi(departure_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_mutasi_created_by ON audit_mutasi(created_by);

-- Enable RLS
ALTER TABLE audit_mutasi ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Allow authenticated users to view all audit_mutasi records (READ)
CREATE POLICY "Allow authenticated users to view audit_mutasi"
ON audit_mutasi
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert audit_mutasi records (CREATE)
CREATE POLICY "Allow authenticated users to insert audit_mutasi"
ON audit_mutasi
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Only managers/superadmin can update audit_mutasi records (UPDATE)
CREATE POLICY "Allow managers to update audit_mutasi"
ON audit_mutasi
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role::text IN ('manager', 'superadmin')
    )
);

-- Policy: Only managers/superadmin can delete audit_mutasi records (DELETE)
CREATE POLICY "Allow managers to delete audit_mutasi"
ON audit_mutasi
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role::text IN ('manager', 'superadmin')
    )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_audit_mutasi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_mutasi_updated_at
    BEFORE UPDATE ON audit_mutasi
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_mutasi_updated_at();

-- Grant permissions
GRANT ALL ON audit_mutasi TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE audit_mutasi_id_seq TO authenticated;
