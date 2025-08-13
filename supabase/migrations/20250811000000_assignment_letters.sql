/*
  # Create assignment letters and addendums tables

  1. New Tables
    - `assignment_letters` - stores assignment letter data
    - `assignment_addendums` - stores addendum data for assignment letters

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view
    - Add policies for authorized roles to manage
*/

-- Create assignment_letters table
CREATE TABLE IF NOT EXISTS assignment_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_number text NOT NULL UNIQUE,
  branch_name text NOT NULL,
  region text NOT NULL,
  audit_type text CHECK (audit_type IN ('reguler', 'khusus')) NOT NULL,
  audit_period text NOT NULL,
  audit_start_date date NOT NULL,
  audit_end_date date NOT NULL,
  team text NOT NULL,
  risk integer DEFAULT 0,
  priority integer DEFAULT 0,
  transport decimal(15,2) DEFAULT 0,
  konsumsi decimal(15,2) DEFAULT 0,
  etc decimal(15,2) DEFAULT 0,
  file_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assignment_addendums table
CREATE TABLE IF NOT EXISTS assignment_addendums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_letter_id uuid REFERENCES assignment_letters(id) ON DELETE CASCADE,
  addendum_type text CHECK (addendum_type IN ('perubahan', 'perpanjangan')) NOT NULL,
  branch_name text,
  region text,
  audit_type text CHECK (audit_type IN ('reguler', 'khusus')),
  audit_period text,
  audit_start_date date,
  audit_end_date date,
  team text,
  risk integer,
  priority integer,
  transport decimal(15,2) DEFAULT 0,
  konsumsi decimal(15,2) DEFAULT 0,
  etc decimal(15,2) DEFAULT 0,
  file_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE assignment_letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_addendums ENABLE ROW LEVEL SECURITY;

-- Create policies for assignment_letters
CREATE POLICY "Everyone can view assignment letters"
  ON assignment_letters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assignment letters"
  ON assignment_letters
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own assignment letters"
  ON assignment_letters
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin and superadmin can manage all assignment letters"
  ON assignment_letters
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_role IN ('superadmin', 'qa', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_role IN ('superadmin', 'qa', 'manager')
    )
  );

-- Create policies for assignment_addendums
CREATE POLICY "Everyone can view assignment addendums"
  ON assignment_addendums
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create assignment addendums"
  ON assignment_addendums
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own assignment addendums"
  ON assignment_addendums
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin and superadmin can manage all assignment addendums"
  ON assignment_addendums
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_role IN ('superadmin', 'qa', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND user_role IN ('superadmin', 'qa', 'manager')
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_assignment_letters_created_at ON assignment_letters(created_at);
CREATE INDEX idx_assignment_letters_branch_name ON assignment_letters(branch_name);
CREATE INDEX idx_assignment_addendums_letter_id ON assignment_addendums(assignment_letter_id);
CREATE INDEX idx_assignment_addendums_created_at ON assignment_addendums(created_at);
