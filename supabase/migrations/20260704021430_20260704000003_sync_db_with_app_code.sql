/*
# Sync Database with Application Code

## Overview
Sinkronisasi struktur database dengan kode aplikasi agar semua fitur
berfungsi dengan benar. Menambahkan kolom yang hilang dan memperbaiki
RLS policies tanpa menghapus data yang ada.

## 1. Tabel `kelas` - Tambah kolom `kode` dan `is_active`
Kode aplikasi (AdminPage, SoalPage, JadwalPage, ustazData.ts) mengquery
kelas dengan `.eq('is_active', true)` dan menggunakan field `kode`.
Tabel saat ini hanya punya `aktif` (boolean) tanpa `kode` dan `is_active`.

Perubahan:
- Tambah `kode` (text, opsional)
- Tambah `is_active` (boolean, default true) - di-backfill dari `aktif`
- Tambah `updated_at` (timestamptz)

## 2. Tabel `murid` - Tambah `updated_at` jika belum ada
Sudah ada dari migration sebelumnya, dipastikan dengan IF NOT EXISTS.

## 3. Pastikan `is_admin()` function ada
Sudah ada dari migration sebelumnya.

## 4. RLS - Pastikan semua tabel punya policy SELECT untuk authenticated
Beberapa tabel mungkin belum punya policy SELECT yang benar.
*/

-- =========================================================
-- 1. Tabel kelas: tambah kode, is_active, updated_at
-- =========================================================
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS kode text;
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill is_active dari aktif jika is_active null
UPDATE kelas SET is_active = aktif WHERE is_active IS NULL;
UPDATE kelas SET is_active = true WHERE is_active IS NULL;

-- Pastikan ada index untuk is_active
CREATE INDEX IF NOT EXISTS idx_kelas_active ON kelas (is_active);

-- =========================================================
-- 2. Pastikan updated_at ada di tabel yang sering diupdate
-- =========================================================
ALTER TABLE murid ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE absensi ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE jadwal_mengajar ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- =========================================================
-- 3. Pastikan is_admin() function ada (idempotent)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- =========================================================
-- 4. RLS: Pastikan kelas bisa di-SELECT oleh semua authenticated
--    dan admin bisa full CRUD
-- =========================================================
DROP POLICY IF EXISTS "select_all_kelas_v2" ON kelas;
CREATE POLICY "select_all_kelas_v2" ON kelas FOR SELECT
  TO authenticated USING (true);

-- Admin full CRUD pada kelas (drop old, create new)
DROP POLICY IF EXISTS "admin_all_kelas_v2" ON kelas;
CREATE POLICY "admin_all_kelas_v2" ON kelas FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 5. RLS: Pastikan murid bisa di-SELECT oleh semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_murid_v2" ON murid;
CREATE POLICY "select_all_murid_v2" ON murid FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_murid_v2" ON murid;
CREATE POLICY "admin_all_murid_v2" ON murid FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 6. RLS: Pastikan jadwal_mengajar bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_jadwal_mengajar_v2" ON jadwal_mengajar;
CREATE POLICY "select_all_jadwal_mengajar_v2" ON jadwal_mengajar FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_jadwal_mengajar_v2" ON jadwal_mengajar;
CREATE POLICY "admin_all_jadwal_mengajar_v2" ON jadwal_mengajar FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 7. RLS: Pastikan absensi bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_absensi_v2" ON absensi;
CREATE POLICY "select_all_absensi_v2" ON absensi FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_absensi_v2" ON absensi;
CREATE POLICY "admin_all_absensi_v2" ON absensi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 8. RLS: Pastikan penilaian & detail_nilai bisa di-SELECT semua
-- =========================================================
DROP POLICY IF EXISTS "select_all_penilaian_v2" ON penilaian;
CREATE POLICY "select_all_penilaian_v2" ON penilaian FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_penilaian_v2" ON penilaian;
CREATE POLICY "admin_all_penilaian_v2" ON penilaian FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "select_all_detail_nilai_v2" ON detail_nilai;
CREATE POLICY "select_all_detail_nilai_v2" ON detail_nilai FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_detail_nilai_v2" ON detail_nilai;
CREATE POLICY "admin_all_detail_nilai_v2" ON detail_nilai FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 9. RLS: Pastikan sikap bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_sikap_v2" ON sikap;
CREATE POLICY "select_all_sikap_v2" ON sikap FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_sikap_v2" ON sikap;
CREATE POLICY "admin_all_sikap_v2" ON sikap FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 10. RLS: Pastikan jurnal_kbm bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_jurnal_kbm_v2" ON jurnal_kbm;
CREATE POLICY "select_all_jurnal_kbm_v2" ON jurnal_kbm FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_jurnal_kbm_v2" ON jurnal_kbm;
CREATE POLICY "admin_all_jurnal_kbm_v2" ON jurnal_kbm FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 11. RLS: Pastikan bank_soal bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_bank_soal_v2" ON bank_soal;
CREATE POLICY "select_all_bank_soal_v2" ON bank_soal FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_bank_soal_v2" ON bank_soal;
CREATE POLICY "admin_all_bank_soal_v2" ON bank_soal FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 12. RLS: Pastikan catatan_guru bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_catatan_guru_v2" ON catatan_guru;
CREATE POLICY "select_all_catatan_guru_v2" ON catatan_guru FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_catatan_guru_v2" ON catatan_guru;
CREATE POLICY "admin_all_catatan_guru_v2" ON catatan_guru FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 13. RLS: Pastikan mata_pelajaran bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_mata_pelajaran_v2" ON mata_pelajaran;
CREATE POLICY "select_all_mata_pelajaran_v2" ON mata_pelajaran FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_mata_pelajaran_v2" ON mata_pelajaran;
CREATE POLICY "admin_all_mata_pelajaran_v2" ON mata_pelajaran FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 14. RLS: Pastikan profiles bisa di-SELECT semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_profiles_v2" ON profiles;
CREATE POLICY "select_all_profiles_v2" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_profiles_v2" ON profiles;
CREATE POLICY "admin_all_profiles_v2" ON profiles FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 15. RLS: tahun_ajaran & semester - SELECT semua, admin CRUD
-- =========================================================
DROP POLICY IF EXISTS "select_all_tahun_ajaran_v2" ON tahun_ajaran;
CREATE POLICY "select_all_tahun_ajaran_v2" ON tahun_ajaran FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_tahun_ajaran_v2" ON tahun_ajaran;
CREATE POLICY "admin_all_tahun_ajaran_v2" ON tahun_ajaran FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "select_all_semester_v2" ON semester;
CREATE POLICY "select_all_semester_v2" ON semester FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_semester_v2" ON semester;
CREATE POLICY "admin_all_semester_v2" ON semester FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
