-- Create simple table for tools error reports
CREATE TABLE tools_errors
(
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tools_error BOOLEAN DEFAULT TRUE,
    reported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP
    WITH TIME ZONE DEFAULT NOW
    ()
);

    -- Create index
    CREATE INDEX idx_tools_errors_created_at ON tools_errors(created_at DESC);

    -- Enable RLS
    ALTER TABLE tools_errors ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Allow authenticated users to view tools_errors" ON tools_errors
FOR
    SELECT TO authenticated
    USING
    (true);

    CREATE POLICY "Allow authenticated users to insert tools_errors" ON tools_errors
FOR
    INSERT TO authenticated WITH CHECK (
    true);
