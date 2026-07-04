/*
# SIM KBM Ustaz V2.0 - Phase 1: New Tables & Profiles

## Overview
Menambahkan tabel baru untuk V2.0 tanpa mengganggu data yang ada.

## New Tables
1. `profiles` - Profil user (admin/ustaz) dengan role
2. `tahun_ajaran` - Tahun ajaran (UUID)
3. `semester` - Semester (UUID)
4. `mata_pelajaran` - Mata pelajaran dengan kelompok
5. `catatan_guru` - Catatan produktivitas guru
6. `notifikasi` - Notifikasi user
7. `log_aktivitas` - Log aktivitas sistem
8. `presensi_guru` - Presensi kehadiran guru
9. `rapor_final` - Rapor final siswa
10. `wa_queue` - Antrian pesan WhatsApp
11. `jurnal_kbm` - Jurnal KBM baru (lebih lengkap)
12. `penilaian` - Header penilaian dengan bobot
13. `detail_nilai` - Detail nilai per siswa
14. `sikap` - Penilaian sikap (disiplin, adab, dll)
15. `materi` - Bank materi ajar
16. `soal` - Bank soal baru

## Security
- Semua tabel dengan user_id menggunakan DEFAULT auth.uid()
- RLS diaktifkan
- Policies: Admin full access, Ustaz own data only

## Notes
1. Tabel lama (kelas, murid, etc) tetap dipertahankan
2. Nanti akan ada migration terpisah untuk migrasi data
*/

-- Helper function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROFILES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_lengkap varchar,
  nama_panggilan varchar,
  email varchar UNIQUE,
  nomor_whatsapp varchar,
  foto text,
  role varchar DEFAULT 'ustaz' CHECK (role IN ('admin', 'operator', 'ustaz')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies profiles
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
CREATE POLICY "read_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "insert_profile" ON profiles;
CREATE POLICY "insert_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_all_profiles" ON profiles;
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- TAHUN AJARAN & SEMESTER
-- ============================================

CREATE TABLE IF NOT EXISTS tahun_ajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama varchar NOT NULL,
  aktif boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS semester (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama varchar NOT NULL,
  aktif boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tahun_ajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_tahun_ajaran" ON tahun_ajaran;
CREATE POLICY "read_tahun_ajaran" ON tahun_ajaran FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "write_tahun_ajaran_admin" ON tahun_ajaran;
CREATE POLICY "write_tahun_ajaran_admin" ON tahun_ajaran FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "read_semester" ON semester;
CREATE POLICY "read_semester" ON semester FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "write_semester_admin" ON semester;
CREATE POLICY "write_semester_admin" ON semester FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- MATA PELAJARAN (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS mata_pelajaran (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kode varchar,
  nama_mapel varchar NOT NULL,
  kelompok varchar CHECK (kelompok IN ('Diniyah', 'Umum', 'Bahasa', 'Tahfidz', 'Lainnya')),
  warna varchar,
  keterangan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_mapel" ON mata_pelajaran;
CREATE POLICY "read_mapel" ON mata_pelajaran FOR SELECT TO authenticated USING (is_active = true OR deleted_at IS NULL);

DROP POLICY IF EXISTS "write_mapel_own" ON mata_pelajaran;
CREATE POLICY "write_mapel_own" ON mata_pelajaran FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_mapel" ON mata_pelajaran;
CREATE POLICY "admin_all_mapel" ON mata_pelajaran FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- JURNAL KBM (NEW - lebih lengkap)
-- ============================================

CREATE TABLE IF NOT EXISTS jurnal_kbm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kelas text NOT NULL,
  pelajaran text NOT NULL,
  tanggal date NOT NULL,
  materi text,
  target text,
  realisasi text,
  metode varchar,
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE jurnal_kbm ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_jurnal_own" ON jurnal_kbm;
CREATE POLICY "read_jurnal_own" ON jurnal_kbm FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_jurnal_own" ON jurnal_kbm;
CREATE POLICY "write_jurnal_own" ON jurnal_kbm FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_jurnal" ON jurnal_kbm;
CREATE POLICY "admin_all_jurnal" ON jurnal_kbm FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- PENILAIAN (NEW dengan bobot)
-- ============================================

CREATE TABLE IF NOT EXISTS penilaian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kelas text NOT NULL,
  mapel text NOT NULL,
  nama_penilaian varchar NOT NULL,
  jenis varchar CHECK (jenis IN ('Ulangan', 'Ujian Tulis', 'Ujian Lisan', 'Tugas', 'Hafalan', 'Praktik', 'Lainnya')),
  bobot numeric DEFAULT 100,
  tanggal date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE penilaian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_penilaian_own" ON penilaian;
CREATE POLICY "read_penilaian_own" ON penilaian FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_penilaian_own" ON penilaian;
CREATE POLICY "write_penilaian_own" ON penilaian FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_penilaian" ON penilaian;
CREATE POLICY "admin_all_penilaian" ON penilaian FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- DETAIL NILAI (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS detail_nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  penilaian_id uuid REFERENCES penilaian(id) ON DELETE CASCADE,
  murid_id uuid REFERENCES murid(id) ON DELETE SET NULL,
  nilai numeric CHECK (nilai >= 0 AND nilai <= 100),
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE detail_nilai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_detail_nilai_own" ON detail_nilai;
CREATE POLICY "read_detail_nilai_own" ON detail_nilai FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_detail_nilai_own" ON detail_nilai;
CREATE POLICY "write_detail_nilai_own" ON detail_nilai FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_detail_nilai" ON detail_nilai;
CREATE POLICY "admin_all_detail_nilai" ON detail_nilai FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_detail_nilai_penilaian_id ON detail_nilai(penilaian_id);
CREATE INDEX IF NOT EXISTS idx_detail_nilai_murid_id ON detail_nilai(murid_id);

-- ============================================
-- SIKAP (NEW - disiplin, adab, kerajinan, kejujuran, tanggung_jawab)
-- ============================================

CREATE TABLE IF NOT EXISTS sikap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  murid_id uuid REFERENCES murid(id) ON DELETE SET NULL,
  tanggal date NOT NULL,
  disiplin numeric CHECK (disiplin >= 0 AND disiplin <= 100),
  adab numeric CHECK (adab >= 0 AND adab <= 100),
  kerajinan numeric CHECK (kerajinan >= 0 AND kerajinan <= 100),
  kejujuran numeric CHECK (kejujuran >= 0 AND kejujuran <= 100),
  tanggung_jawab numeric CHECK (tanggung_jawab >= 0 AND tanggung_jawab <= 100),
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE sikap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_sikap_own" ON sikap;
CREATE POLICY "read_sikap_own" ON sikap FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_sikap_own" ON sikap;
CREATE POLICY "write_sikap_own" ON sikap FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_sikap" ON sikap;
CREATE POLICY "admin_all_sikap" ON sikap FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- CATATAN GURU (Produktivitas)
-- ============================================

CREATE TABLE IF NOT EXISTS catatan_guru (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kategori varchar NOT NULL CHECK (kategori IN ('Umum', 'Acara', 'Undangan', 'Agenda')),
  judul varchar NOT NULL,
  isi text,
  tanggal_waktu timestamptz,
  lokasi varchar,
  status varchar DEFAULT 'Belum Selesai' CHECK (status IN ('Belum Selesai', 'Selesai')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE catatan_guru ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_catatan_guru_own" ON catatan_guru;
CREATE POLICY "read_catatan_guru_own" ON catatan_guru FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_catatan_guru_own" ON catatan_guru;
CREATE POLICY "write_catatan_guru_own" ON catatan_guru FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_catatan_guru" ON catatan_guru;
CREATE POLICY "admin_all_catatan_guru" ON catatan_guru FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_catatan_guru_user_id ON catatan_guru(user_id);
CREATE INDEX IF NOT EXISTS idx_catatan_guru_kategori ON catatan_guru(kategori);

-- ============================================
-- NOTIFIKASI
-- ============================================

CREATE TABLE IF NOT EXISTS notifikasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judul varchar NOT NULL,
  pesan text NOT NULL,
  dibaca boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifikasi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_notifikasi_own" ON notifikasi;
CREATE POLICY "read_notifikasi_own" ON notifikasi FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_notifikasi_own" ON notifikasi;
CREATE POLICY "update_notifikasi_own" ON notifikasi FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LOG AKTIVITAS
-- ============================================

CREATE TABLE IF NOT EXISTS log_aktivitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aktivitas varchar NOT NULL,
  nama_tabel varchar,
  data_id uuid,
  ip_address varchar,
  device text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_log_admin" ON log_aktivitas;
CREATE POLICY "read_log_admin" ON log_aktivitas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- PRESENSI GURU
-- ============================================

CREATE TABLE IF NOT EXISTS presensi_guru (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal date NOT NULL,
  jam_masuk time,
  jam_keluar time,
  lokasi text,
  keterangan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE presensi_guru ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_presensi_own" ON presensi_guru;
CREATE POLICY "read_presensi_own" ON presensi_guru FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_presensi_own" ON presensi_guru;
CREATE POLICY "write_presensi_own" ON presensi_guru FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- MATERI
-- ============================================

CREATE TABLE IF NOT EXISTS materi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kelas text,
  mapel text,
  judul varchar NOT NULL,
  isi text,
  lampiran text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE materi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_materi_own" ON materi;
CREATE POLICY "read_materi_own" ON materi FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_materi_own" ON materi;
CREATE POLICY "write_materi_own" ON materi FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SOAL (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS soal_baru (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kelas text,
  mapel text,
  judul varchar NOT NULL,
  pertanyaan text NOT NULL,
  jawaban text,
  tingkat varchar,
  lampiran text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  is_active boolean DEFAULT true
);

ALTER TABLE soal_baru ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_soal_own" ON soal_baru;
CREATE POLICY "read_soal_own" ON soal_baru FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_soal_own" ON soal_baru;
CREATE POLICY "write_soal_own" ON soal_baru FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_soal" ON soal_baru;
CREATE POLICY "admin_all_soal" ON soal_baru FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- RAPOR FINAL
-- ============================================

CREATE TABLE IF NOT EXISTS rapor_final (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  murid_id uuid REFERENCES murid(id) ON DELETE SET NULL,
  semester_id uuid REFERENCES semester(id) ON DELETE SET NULL,
  tahun_ajaran_id uuid REFERENCES tahun_ajaran(id) ON DELETE SET NULL,
  nilai_akhir numeric,
  predikat varchar,
  deskripsi text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rapor_final ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_rapor_own" ON rapor_final;
CREATE POLICY "read_rapor_own" ON rapor_final FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_rapor_own" ON rapor_final;
CREATE POLICY "write_rapor_own" ON rapor_final FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_rapor" ON rapor_final;
CREATE POLICY "admin_all_rapor" ON rapor_final FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- WA QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS wa_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tujuan_nomor varchar NOT NULL,
  pesan text NOT NULL,
  status varchar DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  jenis varchar,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

ALTER TABLE wa_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_wa_own" ON wa_queue;
CREATE POLICY "read_wa_own" ON wa_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "write_wa_own" ON wa_queue;
CREATE POLICY "write_wa_own" ON wa_queue FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UPDATE EXISTING TABLES: Add updated_at
-- ============================================

-- Add updated_at to tables that don't have it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'murid' AND column_name = 'updated_at') THEN
    ALTER TABLE murid ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jadwal_mengajar' AND column_name = 'updated_at') THEN
    ALTER TABLE jadwal_mengajar ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'absensi' AND column_name = 'updated_at') THEN
    ALTER TABLE absensi ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nilai' AND column_name = 'updated_at') THEN
    ALTER TABLE nilai ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catatan_perilaku' AND column_name = 'updated_at') THEN
    ALTER TABLE catatan_perilaku ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capaian_hafalan' AND column_name = 'updated_at') THEN
    ALTER TABLE capaian_hafalan ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_soal' AND column_name = 'updated_at') THEN
    ALTER TABLE bank_soal ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- ============================================
-- INITIAL DATA
-- ============================================

INSERT INTO tahun_ajaran (nama, aktif) VALUES ('2024/2025', true) ON CONFLICT DO NOTHING;
INSERT INTO semester (nama, aktif) VALUES ('Ganjil', true) ON CONFLICT DO NOTHING;
INSERT INTO semester (nama, aktif) VALUES ('Genap', false) ON CONFLICT DO NOTHING;
