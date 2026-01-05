-- =============================================
-- FIX RLS POLICIES FOR SUPPORT_TICKETS
-- Run this in Supabase SQL Editor
-- =============================================

-- First, enable RLS (in case it's not enabled)
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them correctly
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets except status" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update all tickets" ON support_tickets;
DROP POLICY IF EXISTS "Only superadmin can delete tickets" ON support_tickets;

-- =============================================
-- SELECT POLICIES
-- =============================================

-- Policy 1: Users can ONLY view their OWN tickets
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

-- =============================================
-- INSERT POLICIES
-- =============================================

-- Policy 3: Any authenticated user can create their own ticket
CREATE POLICY "Users can create own tickets"
    ON support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =============================================
-- UPDATE POLICIES
-- =============================================

-- Policy 4: Users can update their own tickets (topic, description, priority - but NOT status)
CREATE POLICY "Users can update own tickets"
    ON support_tickets
    FOR UPDATE
    USING (auth.uid() = user_id);

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

-- =============================================
-- DELETE POLICIES
-- =============================================

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
