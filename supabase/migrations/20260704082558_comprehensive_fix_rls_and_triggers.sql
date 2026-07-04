-- 1. Add INSERT policy for profiles (admin only)
CREATE POLICY "admin_insert_profiles" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- 2. Drop conflicting duplicate policies on profiles
DROP POLICY IF EXISTS update_own_profile ON profiles;

-- 3. Make sure profiles insert works via service role (for edge function)
-- The edge function uses service role which bypasses RLS, but we need to ensure
-- the profile is created properly

-- 4. Create or replace the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nama_lengkap, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email, 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ustaz'),
    true
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If insert fails (e.g., already exists), try update
  UPDATE public.profiles
  SET nama_lengkap = COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', NEW.email, 'User'),
      role = COALESCE(NEW.raw_user_meta_data->>'role', 'ustaz')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- 5. Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. Fix izin_mengajar INSERT policy - allow admin to insert for anyone
DROP POLICY IF EXISTS insert_own_izin ON izin_mengajar;
CREATE POLICY "insert_izin" ON izin_mengajar
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';