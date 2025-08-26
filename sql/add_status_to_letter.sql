-- Add status column to letter table for approval workflow
ALTER TABLE letter ADD COLUMN
IF NOT EXISTS status text DEFAULT 'pending' CHECK
(status IN
('pending', 'approved', 'rejected'));

-- Add approved_by and approved_at columns for tracking who approved
ALTER TABLE letter ADD COLUMN
IF NOT EXISTS approved_by uuid REFERENCES auth.users
(id);
ALTER TABLE letter ADD COLUMN
IF NOT EXISTS approved_at timestamp
with time zone;

-- Add rejection reason for when status is rejected
ALTER TABLE letter ADD COLUMN
IF NOT EXISTS rejection_reason text;

-- Create index for better performance on status queries
CREATE INDEX
IF NOT EXISTS idx_letter_status ON letter
(status);
CREATE INDEX
IF NOT EXISTS idx_letter_approved_by ON letter
(approved_by);
