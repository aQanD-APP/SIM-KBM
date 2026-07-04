/*
# Fix RLS: Allow all authenticated users to SELECT data
#
# Problem: Ustaz can only see their own data (uid() = user_id).
# They cannot see kelas/mata_pelajaran created by admin, or any
# operational data (murid, jadwal, absensi, etc.) created by others.
#
# Solution: Add a SELECT policy allowing all authenticated users
# to read all data. Insert/update/delete remain restricted to
# owner (uid() = user_id) + admin (is_admin()).
#
# This is appropriate for a madrasah context where teachers need
# to see all students, schedules, and class data.
*/

-- =========================================================
-- 1. mata_pelajaran: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_mata_pelajaran"
  ON mata_pelajaran FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 2. murid: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_murid"
  ON murid FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 3. jadwal_mengajar: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_jadwal_mengajar"
  ON jadwal_mengajar FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 4. absensi: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_absensi"
  ON absensi FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 5. jurnal_kbm: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_jurnal_kbm"
  ON jurnal_kbm FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 6. penilaian: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_penilaian"
  ON penilaian FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 7. detail_nilai: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_detail_nilai"
  ON detail_nilai FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 8. sikap: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_sikap"
  ON sikap FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 9. bank_soal: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_bank_soal"
  ON bank_soal FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 10. catatan_guru: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_catatan_guru"
  ON catatan_guru FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 11. buku_saku: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_buku_saku"
  ON buku_saku FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 12. muhafadhoh: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_muhafadhoh"
  ON muhafadhoh FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 13. kbm_harian: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_kbm_harian"
  ON kbm_harian FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 14. agenda_penting: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_agenda_penting"
  ON agenda_penting FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 15. pengumuman: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_pengumuman"
  ON pengumuman FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 16. tahun_ajaran: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_tahun_ajaran"
  ON tahun_ajaran FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 17. semester: add SELECT for all authenticated
-- =========================================================
CREATE POLICY "select_all_semester"
  ON semester FOR SELECT
  TO authenticated USING (true);

-- =========================================================
-- 18. profiles: add SELECT for all authenticated
--    (so ustaz can see admin profile info if needed)
-- =========================================================
CREATE POLICY "select_all_profiles"
  ON profiles FOR SELECT
  TO authenticated USING (true);
