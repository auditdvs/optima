-- =============================================
-- ADD RESOLVED_BY COLUMN TO SUPPORT_TICKETS
-- Run this in Supabase SQL Editor
-- =============================================

-- Add resolved_by column (stores the user_id of who handled the ticket)
ALTER TABLE support_tickets 
ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_by ON support_tickets(resolved_by);
