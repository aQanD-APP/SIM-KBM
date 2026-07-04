/*
# Fix Recursive RLS on All Admin Policies

## Problem
All admin policies across 11 tables use a self-referential pattern:
`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`
This causes a RECURSIVE RLS deadlock: to read profiles as admin, the admin policy on profiles
itself must allow reading profiles — which requires proving admin status by reading profiles.
Admins can never read any data because the recursion has no base case.

## Fix
Replace all recursive admin policy predicates with the `is_admin()` SECURITY DEFINER function
(created in the previous migration). This function bypasses RLS to check the caller's role,
breaking the recursion cleanly.

## Tables Updated
1. catatan_guru — admin_all_catatan_guru
2. detail_nilai — admin_all_detail_nilai
3. jurnal_kbm — admin_all_jurnal
4. log_aktivitas — read_log_admin
5. mata_pelajaran — admin_all_mapel
6. penilaian — admin_all_penilaian
7. rapor_final — admin_all_rapor
8. semester — write_semester_admin
9. sikap — admin_all_sikap
10. soal_baru — admin_all_soal
11. tahun_ajaran — write_tahun_ajaran_admin

## Security
- `is_admin()` is SECURITY DEFINER, read-only, owned by postgres — safe to use in policies.
- Non-admin users still get nothing from these admin policies (is_admin() returns false).
- Per-user ownership policies (read_*_own, write_*_own) are unchanged.
*/

-- catatan_guru
DROP POLICY IF EXISTS "admin_all_catatan_guru" ON catatan_guru;
CREATE POLICY "admin_all_catatan_guru"
ON catatan_guru FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- detail_nilai
DROP POLICY IF EXISTS "admin_all_detail_nilai" ON detail_nilai;
CREATE POLICY "admin_all_detail_nilai"
ON detail_nilai FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- jurnal_kbm
DROP POLICY IF EXISTS "admin_all_jurnal" ON jurnal_kbm;
CREATE POLICY "admin_all_jurnal"
ON jurnal_kbm FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- log_aktivitas
DROP POLICY IF EXISTS "read_log_admin" ON log_aktivitas;
CREATE POLICY "read_log_admin"
ON log_aktivitas FOR SELECT
TO authenticated
USING (public.is_admin());

-- mata_pelajaran
DROP POLICY IF EXISTS "admin_all_mapel" ON mata_pelajaran;
CREATE POLICY "admin_all_mapel"
ON mata_pelajaran FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- penilaian
DROP POLICY IF EXISTS "admin_all_penilaian" ON penilaian;
CREATE POLICY "admin_all_penilaian"
ON penilaian FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- rapor_final
DROP POLICY IF EXISTS "admin_all_rapor" ON rapor_final;
CREATE POLICY "admin_all_rapor"
ON rapor_final FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- semester
DROP POLICY IF EXISTS "write_semester_admin" ON semester;
CREATE POLICY "write_semester_admin"
ON semester FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- sikap
DROP POLICY IF EXISTS "admin_all_sikap" ON sikap;
CREATE POLICY "admin_all_sikap"
ON sikap FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- soal_baru
DROP POLICY IF EXISTS "admin_all_soal" ON soal_baru;
CREATE POLICY "admin_all_soal"
ON soal_baru FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- tahun_ajaran
DROP POLICY IF EXISTS "write_tahun_ajaran_admin" ON tahun_ajaran;
CREATE POLICY "write_tahun_ajaran_admin"
ON tahun_ajaran FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
