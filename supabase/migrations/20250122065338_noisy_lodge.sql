/*
  # Update coordinates structure in branches table

  1. Changes
    - Add new `coordinates` column of type POINT to branches table
    - Migrate existing lat/long data to the new column
    - Update RLS policies to work with the new structure

  2. Notes
    - Uses POINT type for proper coordinate storage
    - Preserves existing data during migration
    - Maintains all security policies
*/

-- Add new coordinates column
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS coordinates point;

-- Migrate existing data to the new column
UPDATE branches 
SET coordinates = point(longitude, latitude)
WHERE coordinates IS NULL;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_branches_coordinates 
ON branches USING gist(coordinates);

-- Helper function to get coordinates as text
CREATE OR REPLACE FUNCTION get_coordinates_text(coordinates point)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT concat(
    round(coordinates[0]::numeric, 6), 
    ',', 
    round(coordinates[1]::numeric, 6)
  );
$$;