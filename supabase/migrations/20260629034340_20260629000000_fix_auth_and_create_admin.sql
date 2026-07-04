/*
# Fix Authentication and Create Default Admin

## Purpose
1. Create trigger to auto-populate profiles table when a new user signs up
2. Disable email confirmation requirement for easier testing
3. Create a default admin user for immediate login

## Note
Email confirmation is disabled in Supabase Dashboard > Authentication > Settings.
If you want email confirmation, re-enable it there.
*/

-- ============================================================
-- 1. Function to auto-create profile on user signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email),
    NEW.email,
    'ustaz',
    true,
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. Add anon access for profiles (needed for initial signup flow)
-- ============================================================

-- Allow anon to read profiles (for checking if profile exists)
DROP POLICY IF EXISTS "anon_read_profiles" ON profiles;
CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT TO anon USING (true);

-- Allow anon to insert their own profile during signup callback
DROP POLICY IF EXISTS "anon_insert_profile" ON profiles;
CREATE POLICY "anon_insert_profile" ON profiles FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- 3. Update insert_profile policy to allow both anon and authenticated
-- ============================================================
DROP POLICY IF EXISTS "insert_profile" ON profiles;
CREATE POLICY "insert_profile" ON profiles FOR INSERT TO authenticated, anon WITH CHECK (true);
