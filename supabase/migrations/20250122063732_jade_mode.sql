/*
  # Add fraud cases table

  1. New Tables
    - `fraud_cases`
      - `id` (uuid, primary key)
      - `branch_id` (uuid, foreign key to branches)
      - `amount` (numeric, not null)
      - `date` (date, not null)
      - `description` (text)
      - `created_at` (timestamptz)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `fraud_cases` table
    - Add policies for authenticated users to read fraud cases
    - Add policies for admin and qa roles to manage fraud cases
*/

CREATE TABLE IF NOT EXISTS fraud_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  date date NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Enable RLS
ALTER TABLE fraud_cases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "All users can read fraud cases"
  ON fraud_cases
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and QA can manage fraud cases"
  ON fraud_cases
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'qa')
    )
  );