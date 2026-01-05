-- =============================================
-- SUPPORT TICKETS TABLE SCHEMA
-- =============================================

-- Create the support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_code VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- =============================================
-- FUNCTION: Generate Ticket Code (DDMMYY format with suffix)
-- =============================================
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TRIGGER AS $$
DECLARE
    date_part VARCHAR(6);
    existing_count INT;
    new_code VARCHAR(20);
BEGIN
    -- Format: DDMMYY
    date_part := TO_CHAR(NOW(), 'DDMMYY');
    
    -- Count existing tickets for today
    SELECT COUNT(*) INTO existing_count
    FROM support_tickets
    WHERE ticket_code LIKE '#' || date_part || '%';
    
    -- Generate code with suffix if needed
    IF existing_count = 0 THEN
        new_code := '#' || date_part;
    ELSE
        new_code := '#' || date_part || '-' || existing_count;
    END IF;
    
    NEW.ticket_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate ticket code
DROP TRIGGER IF EXISTS trigger_generate_ticket_code ON support_tickets;
CREATE TRIGGER trigger_generate_ticket_code
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    WHEN (NEW.ticket_code IS NULL OR NEW.ticket_code = '')
    EXECUTE FUNCTION generate_ticket_code();

-- =============================================
-- FUNCTION: Auto-update updated_at timestamp
-- =============================================
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating timestamp
DROP TRIGGER IF EXISTS trigger_update_ticket_timestamp ON support_tickets;
CREATE TRIGGER trigger_update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
    ON support_tickets
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Admin roles (dvs, superadmin, manager) can view ALL tickets
CREATE POLICY "Admins can view all tickets"
    ON support_tickets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('dvs', 'superadmin', 'manager')
        )
    );

-- Policy 3: Users can create their own tickets
CREATE POLICY "Users can create own tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own tickets (but NOT status - handled separately)
CREATE POLICY "Users can update own tickets except status"
    ON support_tickets
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        -- Note: Status changes by regular users are handled in app logic
    );

-- Policy 5: Admin roles can update ANY ticket (including status)
CREATE POLICY "Admins can update all tickets"
    ON support_tickets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role IN ('dvs', 'superadmin', 'manager')
        )
    );

-- Policy 6: Only superadmin can delete tickets
CREATE POLICY "Only superadmin can delete tickets"
    ON support_tickets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'superadmin'
        )
    );

-- =============================================
-- GRANT PERMISSIONS
-- =============================================
GRANT ALL ON support_tickets TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
