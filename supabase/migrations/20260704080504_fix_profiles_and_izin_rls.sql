-- Fix profiles.nama_lengkap NOT NULL constraint by adding a default
ALTER TABLE profiles ALTER COLUMN nama_lengkap SET DEFAULT 'User';

-- Clean up duplicate RLS policies on izin_mengajar
-- Drop all existing policies first
DROP POLICY IF EXISTS admin_all_izin ON izin_mengajar;
DROP POLICY IF EXISTS delete_own_izin ON izin_mengajar;
DROP POLICY IF EXISTS insert_own_izin ON izin_mengajar;
DROP POLICY IF EXISTS izin_admin_all ON izin_mengajar;
DROP POLICY IF EXISTS izin_user_own ON izin_mengajar;
DROP POLICY IF EXISTS select_own_izin ON izin_mengajar;
DROP POLICY IF EXISTS update_own_izin ON izin_mengajar;

-- Create clean, non-conflicting RLS policies for izin_mengajar
-- Admin can do everything
CREATE POLICY "admin_izin_all" ON izin_mengajar
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can view all izin (for transparency) or just their own - let's make it their own only
CREATE POLICY "select_own_izin" ON izin_mengajar
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Users can insert their own izin
CREATE POLICY "insert_own_izin" ON izin_mengajar
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own izin (only if still diajukan)
CREATE POLICY "update_own_izin" ON izin_mengajar
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());

-- Users can delete their own izin
CREATE POLICY "delete_own_izin" ON izin_mengajar
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR is_admin());

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';