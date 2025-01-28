/*
  # Database Schema for OPTIMA Dashboard

  1. Tables
    - user_roles: Stores user role assignments
    - branches: Stores branch information
    - audits: Stores audit records

  2. Security
    - RLS enabled on all tables
    - Policies for role-based access control
*/

-- Create enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('user', 'qa', 'admin');
    END IF;
END $$;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
DROP POLICY IF EXISTS "All users can read branches" ON branches;
DROP POLICY IF EXISTS "Admin and QA can manage branches" ON branches;
DROP POLICY IF EXISTS "All users can read audits" ON audits;
DROP POLICY IF EXISTS "Admin and QA can manage audits" ON audits;

-- Create policies
CREATE POLICY "Users can read their own role"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user roles"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update user roles"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin'
  );

CREATE POLICY "All users can read branches"
  ON branches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and QA can manage branches"
  ON branches
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) IN ('admin', 'qa')
  );

CREATE POLICY "All users can read audits"
  ON audits
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and QA can manage audits"
  ON audits
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) IN ('admin', 'qa')
  );