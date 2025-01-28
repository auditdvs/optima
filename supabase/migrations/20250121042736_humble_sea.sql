/*
  # Initial Schema for OPTIMA Dashboard

  1. New Tables
    - `users` (managed by Supabase Auth)
    - `user_roles`
      - `id` (uuid, primary key)
      - `user_id` (references auth.users)
      - `role` (enum: user, qa, admin)
    - `branches`
      - `id` (uuid, primary key)
      - `code` (text)
      - `name` (text)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `region` (text)
    - `audits`
      - `id` (uuid, primary key)
      - `branch_id` (references branches)
      - `audit_date` (date)
      - `fraud_count` (integer)
      - `rating` (text)
      - `created_by` (references auth.users)
    
  2. Security
    - Enable RLS on all tables
    - Policies for role-based access
*/

-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'qa', 'admin');

-- Create tables
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  region text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES branches NOT NULL,
  audit_date date NOT NULL,
  fraud_count integer DEFAULT 0,
  rating text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage user roles"
  ON user_roles
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "All users can read branches"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and QA can manage branches"
  ON branches
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'qa')
    )
  );

CREATE POLICY "All users can read audits"
  ON audits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and QA can manage audits"
  ON audits
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'qa')
    )
  );