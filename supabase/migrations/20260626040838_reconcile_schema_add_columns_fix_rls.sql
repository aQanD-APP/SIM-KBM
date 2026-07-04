/*
# Reconcile Schema: Add missing columns and fix RLS policies

## Purpose
The live database is a hybrid of two earlier migrations. Some tables use uuid IDs
with text "kelas" columns (murid, jadwal_mengajar, absensi, nilai, bank_soal,
catatan_perilaku, capaian_hafalan) while others use bigint IDs with kelas_id FKs
(kelas, kbm_harian, buku_saku, muhafadhoh, agenda_penting, pengumuman).

This migration adapts the schema so the application works against the CURRENT live
tables without dropping or renaming anything. It adds missing columns the app needs
and replaces all "FOR ALL" RLS policies with proper 4-policy CRUD.

## Changes

### 1. murid: add nomor_whatsapp and status_aktif
- nomor_whatsapp (text, nullable) — student's WhatsApp contact.
- status_aktif (boolean, default true) — active/inactive flag.

### 2. nilai: add tanggal
- tanggal (date, default CURRENT_DATE) — date the grade was recorded.

### 3. RLS Policies
- Replaces every existing single "FOR ALL" policy with 4 separate policies
  (SELECT/INSERT/UPDATE/DELETE) scoped TO authenticated with auth.uid() = user_id.
- Adds the same 4 policies on catatan_perilaku and capaian_hafalan (they currently
  have no policies and are therefore locked).

## Notes
- No tables dropped, no columns dropped, no types changed, no renames.
- All tables remain owner-scoped (user_id = auth.uid()).
*/

-- ============================================================
-- 1. murid: add nomor_whatsapp, status_aktif
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'murid' AND column_name = 'nomor_whatsapp') THEN
    ALTER TABLE murid ADD COLUMN nomor_whatsapp text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'murid' AND column_name = 'status_aktif') THEN
    ALTER TABLE murid ADD COLUMN status_aktif boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- 2. nilai: add tanggal
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'nilai' AND column_name = 'tanggal') THEN
    ALTER TABLE nilai ADD COLUMN tanggal date NOT NULL DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- ============================================================
-- 3. RLS: 4-policy CRUD on every app table
-- ============================================================

-- kelas
DROP POLICY IF EXISTS "kelas_all" ON kelas;
DROP POLICY IF EXISTS "select_own_kelas" ON kelas;
DROP POLICY IF EXISTS "insert_own_kelas" ON kelas;
DROP POLICY IF EXISTS "update_own_kelas" ON kelas;
DROP POLICY IF EXISTS "delete_own_kelas" ON kelas;
CREATE POLICY "select_own_kelas" ON kelas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_kelas" ON kelas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_kelas" ON kelas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_kelas" ON kelas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- murid
DROP POLICY IF EXISTS "murid_all" ON murid;
DROP POLICY IF EXISTS "select_own_murid" ON murid;
DROP POLICY IF EXISTS "insert_own_murid" ON murid;
DROP POLICY IF EXISTS "update_own_murid" ON murid;
DROP POLICY IF EXISTS "delete_own_murid" ON murid;
CREATE POLICY "select_own_murid" ON murid FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_murid" ON murid FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_murid" ON murid FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_murid" ON murid FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- jadwal_mengajar
DROP POLICY IF EXISTS "jadwal_all" ON jadwal_mengajar;
DROP POLICY IF EXISTS "select_own_jadwal" ON jadwal_mengajar;
DROP POLICY IF EXISTS "insert_own_jadwal" ON jadwal_mengajar;
DROP POLICY IF EXISTS "update_own_jadwal" ON jadwal_mengajar;
DROP POLICY IF EXISTS "delete_own_jadwal" ON jadwal_mengajar;
CREATE POLICY "select_own_jadwal" ON jadwal_mengajar FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_jadwal" ON jadwal_mengajar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_jadwal" ON jadwal_mengajar FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_jadwal" ON jadwal_mengajar FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- absensi
DROP POLICY IF EXISTS "absensi_all" ON absensi;
DROP POLICY IF EXISTS "select_own_absensi" ON absensi;
DROP POLICY IF EXISTS "insert_own_absensi" ON absensi;
DROP POLICY IF EXISTS "update_own_absensi" ON absensi;
DROP POLICY IF EXISTS "delete_own_absensi" ON absensi;
CREATE POLICY "select_own_absensi" ON absensi FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_absensi" ON absensi FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_absensi" ON absensi FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_absensi" ON absensi FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- kbm_harian
DROP POLICY IF EXISTS "kbm_all" ON kbm_harian;
DROP POLICY IF EXISTS "select_own_kbm" ON kbm_harian;
DROP POLICY IF EXISTS "insert_own_kbm" ON kbm_harian;
DROP POLICY IF EXISTS "update_own_kbm" ON kbm_harian;
DROP POLICY IF EXISTS "delete_own_kbm" ON kbm_harian;
CREATE POLICY "select_own_kbm" ON kbm_harian FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_kbm" ON kbm_harian FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_kbm" ON kbm_harian FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_kbm" ON kbm_harian FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- buku_saku
DROP POLICY IF EXISTS "buku_all" ON buku_saku;
DROP POLICY IF EXISTS "select_own_buku_saku" ON buku_saku;
DROP POLICY IF EXISTS "insert_own_buku_saku" ON buku_saku;
DROP POLICY IF EXISTS "update_own_buku_saku" ON buku_saku;
DROP POLICY IF EXISTS "delete_own_buku_saku" ON buku_saku;
CREATE POLICY "select_own_buku_saku" ON buku_saku FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_buku_saku" ON buku_saku FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_buku_saku" ON buku_saku FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_buku_saku" ON buku_saku FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- muhafadhoh
DROP POLICY IF EXISTS "hafal_all" ON muhafadhoh;
DROP POLICY IF EXISTS "select_own_muhafadhoh" ON muhafadhoh;
DROP POLICY IF EXISTS "insert_own_muhafadhoh" ON muhafadhoh;
DROP POLICY IF EXISTS "update_own_muhafadhoh" ON muhafadhoh;
DROP POLICY IF EXISTS "delete_own_muhafadhoh" ON muhafadhoh;
CREATE POLICY "select_own_muhafadhoh" ON muhafadhoh FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_muhafadhoh" ON muhafadhoh FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_muhafadhoh" ON muhafadhoh FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_muhafadhoh" ON muhafadhoh FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- nilai
DROP POLICY IF EXISTS "nilai_all" ON nilai;
DROP POLICY IF EXISTS "select_own_nilai" ON nilai;
DROP POLICY IF EXISTS "insert_own_nilai" ON nilai;
DROP POLICY IF EXISTS "update_own_nilai" ON nilai;
DROP POLICY IF EXISTS "delete_own_nilai" ON nilai;
CREATE POLICY "select_own_nilai" ON nilai FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_nilai" ON nilai FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_nilai" ON nilai FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_nilai" ON nilai FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- bank_soal
DROP POLICY IF EXISTS "soal_all" ON bank_soal;
DROP POLICY IF EXISTS "select_own_bank_soal" ON bank_soal;
DROP POLICY IF EXISTS "insert_own_bank_soal" ON bank_soal;
DROP POLICY IF EXISTS "update_own_bank_soal" ON bank_soal;
DROP POLICY IF EXISTS "delete_own_bank_soal" ON bank_soal;
CREATE POLICY "select_own_bank_soal" ON bank_soal FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bank_soal" ON bank_soal FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bank_soal" ON bank_soal FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bank_soal" ON bank_soal FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- agenda_penting
DROP POLICY IF EXISTS "agenda_all" ON agenda_penting;
DROP POLICY IF EXISTS "select_own_agenda" ON agenda_penting;
DROP POLICY IF EXISTS "insert_own_agenda" ON agenda_penting;
DROP POLICY IF EXISTS "update_own_agenda" ON agenda_penting;
DROP POLICY IF EXISTS "delete_own_agenda" ON agenda_penting;
CREATE POLICY "select_own_agenda" ON agenda_penting FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_agenda" ON agenda_penting FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_agenda" ON agenda_penting FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_agenda" ON agenda_penting FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- pengumuman
DROP POLICY IF EXISTS "pengumuman_all" ON pengumuman;
DROP POLICY IF EXISTS "select_own_pengumuman" ON pengumuman;
DROP POLICY IF EXISTS "insert_own_pengumuman" ON pengumuman;
DROP POLICY IF EXISTS "update_own_pengumuman" ON pengumuman;
DROP POLICY IF EXISTS "delete_own_pengumuman" ON pengumuman;
CREATE POLICY "select_own_pengumuman" ON pengumuman FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pengumuman" ON pengumuman FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pengumuman" ON pengumuman FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pengumuman" ON pengumuman FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- catatan_perilaku
DROP POLICY IF EXISTS "perilaku_all" ON catatan_perilaku;
DROP POLICY IF EXISTS "select_own_catatan_perilaku" ON catatan_perilaku;
DROP POLICY IF EXISTS "insert_own_catatan_perilaku" ON catatan_perilaku;
DROP POLICY IF EXISTS "update_own_catatan_perilaku" ON catatan_perilaku;
DROP POLICY IF EXISTS "delete_own_catatan_perilaku" ON catatan_perilaku;
CREATE POLICY "select_own_catatan_perilaku" ON catatan_perilaku FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_catatan_perilaku" ON catatan_perilaku FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_catatan_perilaku" ON catatan_perilaku FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_catatan_perilaku" ON catatan_perilaku FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- capaian_hafalan
DROP POLICY IF EXISTS "hafalan_all" ON capaian_hafalan;
DROP POLICY IF EXISTS "select_own_capaian_hafalan" ON capaian_hafalan;
DROP POLICY IF EXISTS "insert_own_capaian_hafalan" ON capaian_hafalan;
DROP POLICY IF EXISTS "update_own_capaian_hafalan" ON capaian_hafalan;
DROP POLICY IF EXISTS "delete_own_capaian_hafalan" ON capaian_hafalan;
CREATE POLICY "select_own_capaian_hafalan" ON capaian_hafalan FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_capaian_hafalan" ON capaian_hafalan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_capaian_hafalan" ON capaian_hafalan FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_capaian_hafalan" ON capaian_hafalan FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_murid_user ON murid(user_id);
CREATE INDEX IF NOT EXISTS idx_absensi_murid_tanggal ON absensi(murid_id, tanggal);
CREATE INDEX IF NOT EXISTS idx_nilai_murid ON nilai(murid_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_hari_jam ON jadwal_mengajar(hari, jam_mulai);
CREATE INDEX IF NOT EXISTS idx_catatan_perilaku_murid ON catatan_perilaku(murid_id);
CREATE INDEX IF NOT EXISTS idx_capaian_hafalan_murid ON capaian_hafalan(murid_id);
