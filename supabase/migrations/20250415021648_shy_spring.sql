/*
  # Add audit_regular table for storing regular audit data

  1. New Tables
    - `audit_regular`
      - Stores regular audit data with all necessary fields
      - Includes timestamps and relationships

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS audit_regular (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name text NOT NULL,
  audit_period_start text,
  audit_period_end text,
  pic text,
  dapa boolean DEFAULT false,
  revised_dapa boolean DEFAULT false,
  dapa_supporting_data boolean DEFAULT false,
  assignment_letter boolean DEFAULT false,
  entrance_agenda boolean DEFAULT false,
  entrance_attendance boolean DEFAULT false,
  audit_working_papers boolean DEFAULT false,
  cash_count boolean DEFAULT false,
  audit_reporting boolean DEFAULT false,
  exit_meeting_minutes boolean DEFAULT false,
  exit_attendance_list boolean DEFAULT false,
  audit_result_letter boolean DEFAULT false,
  rta boolean DEFAULT false,
  monitoring text DEFAULT 'Adequate',
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_regular ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can read audit_regular"
  ON audit_regular
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "QA and Admin can manage audit_regular"
  ON audit_regular
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('qa', 'admin')
    )
  );