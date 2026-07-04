/*
# Add Admin SELECT Policies to All Data Tables

## Problem
Many tables only have `*_own` policies (user_id = auth.uid()). Admins cannot see
other ustaz's data on these tables because there is no admin policy.

## Fix
Add an admin SELECT policy to every table that currently lacks one, using the
`is_admin()` SECURITY DEFINER function. Admins get read access to all rows.
For tables where admin should also write (murid, kelas, nilai, absensi, etc.),
we add a full CRUD admin policy instead of SELECT-only.

## Tables Receiving Admin Policies
- absensi, agenda_penting, bank_soal, buku_saku, buku_saku_batas,
  buku_saku_tagihan, capaian_hafalan, catatan_perilaku, jadwal_mengajar,
  kbm_harian, kelas, materi, muhafadhoh, murid, nilai, notifikasi,
  pengumuman, presensi_guru, wa_queue

## Security
- All admin policies use `public.is_admin()` which is SECURITY DEFINER, read-only.
- Non-admin users are unaffected — they still only see their own rows via *_own policies.
*/

-- absensi
DROP POLICY IF EXISTS "admin_all_absensi" ON absensi;
CREATE POLICY "admin_all_absensi" ON absensi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- agenda_penting
DROP POLICY IF EXISTS "admin_all_agenda" ON agenda_penting;
CREATE POLICY "admin_all_agenda" ON agenda_penting FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- bank_soal
DROP POLICY IF EXISTS "admin_all_bank_soal" ON bank_soal;
CREATE POLICY "admin_all_bank_soal" ON bank_soal FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- buku_saku
DROP POLICY IF EXISTS "admin_all_buku_saku" ON buku_saku;
CREATE POLICY "admin_all_buku_saku" ON buku_saku FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- buku_saku_batas
DROP POLICY IF EXISTS "admin_all_buku_saku_batas" ON buku_saku_batas;
CREATE POLICY "admin_all_buku_saku_batas" ON buku_saku_batas FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- buku_saku_tagihan
DROP POLICY IF EXISTS "admin_all_buku_saku_tagihan" ON buku_saku_tagihan;
CREATE POLICY "admin_all_buku_saku_tagihan" ON buku_saku_tagihan FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- capaian_hafalan
DROP POLICY IF EXISTS "admin_all_capaian_hafalan" ON capaian_hafalan;
CREATE POLICY "admin_all_capaian_hafalan" ON capaian_hafalan FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- catatan_perilaku
DROP POLICY IF EXISTS "admin_all_catatan_perilaku" ON catatan_perilaku;
CREATE POLICY "admin_all_catatan_perilaku" ON catatan_perilaku FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- jadwal_mengajar
DROP POLICY IF EXISTS "admin_all_jadwal" ON jadwal_mengajar;
CREATE POLICY "admin_all_jadwal" ON jadwal_mengajar FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kbm_harian
DROP POLICY IF EXISTS "admin_all_kbm" ON kbm_harian;
CREATE POLICY "admin_all_kbm" ON kbm_harian FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- kelas
DROP POLICY IF EXISTS "admin_all_kelas" ON kelas;
CREATE POLICY "admin_all_kelas" ON kelas FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- materi
DROP POLICY IF EXISTS "admin_all_materi" ON materi;
CREATE POLICY "admin_all_materi" ON materi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- muhafadhoh
DROP POLICY IF EXISTS "admin_all_muhafadhoh" ON muhafadhoh;
CREATE POLICY "admin_all_muhafadhoh" ON muhafadhoh FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- murid
DROP POLICY IF EXISTS "admin_all_murid" ON murid;
CREATE POLICY "admin_all_murid" ON murid FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- nilai
DROP POLICY IF EXISTS "admin_all_nilai" ON nilai;
CREATE POLICY "admin_all_nilai" ON nilai FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- notifikasi
DROP POLICY IF EXISTS "admin_all_notifikasi" ON notifikasi;
CREATE POLICY "admin_all_notifikasi" ON notifikasi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pengumuman
DROP POLICY IF EXISTS "admin_all_pengumuman" ON pengumuman;
CREATE POLICY "admin_all_pengumuman" ON pengumuman FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- presensi_guru
DROP POLICY IF EXISTS "admin_all_presensi_guru" ON presensi_guru;
CREATE POLICY "admin_all_presensi_guru" ON presensi_guru FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- wa_queue
DROP POLICY IF EXISTS "admin_all_wa_queue" ON wa_queue;
CREATE POLICY "admin_all_wa_queue" ON wa_queue FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
