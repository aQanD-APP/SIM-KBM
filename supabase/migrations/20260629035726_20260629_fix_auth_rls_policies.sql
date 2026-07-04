-- Fix RLS policies for profiles table

-- First, drop existing policies
DROP POLICY IF EXISTS "profiles_policy" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Allow public read for login check" ON profiles;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create proper RLS policies for profiles
-- Allow public read (needed for login check and profile fetch)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert only for the user themselves (trigger handles initial creation)
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Add id_login for users that don't have it (extract from email)
-- For users without id_login, set it from email prefix
UPDATE profiles 
SET id_login = SPLIT_PART(email, '@', 1)
WHERE id_login IS NULL AND email IS NOT NULL;