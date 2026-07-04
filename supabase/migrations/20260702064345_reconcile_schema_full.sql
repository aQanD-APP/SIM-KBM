/*
# Reconcile Schema: Legacy Tables + Compat Columns + RLS + is_admin()

## Overview
The frontend code references several "legacy" tables and columns that don't exist
in the current database. This migration adds them all so the app works without
code changes. It also enables RLS on every table and adds ownership + admin policies.

## 1. New Legacy Tables Created
- `jadwal_mengajar`, `bank_soal`, `buku_saku`, `muhafadhoh`, `kbm_harian`,
  `nilai`, `catatan_perilaku`, `capaian_hafalan`, `agenda_penting`

## 2. Compat Columns Added
- `murid`: + kelas, status_aktif, domisili, nomor_whatsapp
- `kelas`: + aktif
- `penilaian`: + kelas, mapel
- `pengumuman`: + kategori, tanggal
- `jurnal_kbm`: + kelas, pelajaran

## 3. RLS + Policies
- Enable RLS on ALL tables
- Drop ALL existing policies, replace with ownership (user_id = auth.uid()) + admin (is_admin())

## 4. is_admin() + Profile Trigger
*/

-- =========================================================
-- 1. is_admin() function
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
-- 2. Auto-create profile trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nama_lengkap, role, is_active)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ustaz'), true)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 3. Compat columns
-- =========================================================
ALTER TABLE murid ADD COLUMN IF NOT EXISTS kelas text;
ALTER TABLE murid ADD COLUMN IF NOT EXISTS status_aktif boolean DEFAULT true;
ALTER TABLE murid ADD COLUMN IF NOT EXISTS domisili text;
ALTER TABLE murid ADD COLUMN IF NOT EXISTS nomor_whatsapp text;
ALTER TABLE kelas ADD COLUMN IF NOT EXISTS aktif boolean DEFAULT true;
ALTER TABLE penilaian ADD COLUMN IF NOT EXISTS kelas text;
ALTER TABLE penilaian ADD COLUMN IF NOT EXISTS mapel text;
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS kategori text;
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS tanggal date;
ALTER TABLE jurnal_kbm ADD COLUMN IF NOT EXISTS kelas text;
ALTER TABLE jurnal_kbm ADD COLUMN IF NOT EXISTS pelajaran text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_login text UNIQUE;

-- =========================================================
-- 4. Create legacy tables
-- =========================================================
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  hari text, jam_mulai text, jam_selesai text, kelas text, pelajaran text,
  ruangan text, catatan text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bank_soal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pelajaran text, kelas text, batasan text, isi_soal text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS buku_saku (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kelas_id bigint, pelajaran text, bab_terakhir text, halaman_terakhir text, catatan text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS muhafadhoh (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kelas_id bigint, tanggal date, materi text, target_hafalan text, catatan text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS kbm_harian (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kelas_id bigint, tanggal date, pelajaran text, materi text, catatan text,
  durasi integer, selesai boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  murid_id uuid, pelajaran text, jenis_ujian text, skor numeric, tanggal date,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS catatan_perilaku (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  murid_id uuid, jenis text DEFAULT 'catatan', catatan text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS capaian_hafalan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  murid_id uuid, capaian text, tanggal date,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agenda_penting (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  judul text, catatan text, jenis text DEFAULT 'Umum', tanggal date,
  created_at timestamptz DEFAULT now()
);

-- =========================================================
-- 5. Enable RLS on ALL tables
-- =========================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_kbm ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian ENABLE ROW LEVEL SECURITY;
ALTER TABLE detail_nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE sikap ENABLE ROW LEVEL SECURITY;
ALTER TABLE materi ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_perubahan_nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_guru ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahun_ajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE buku_saku ENABLE ROW LEVEL SECURITY;
ALTER TABLE muhafadhoh ENABLE ROW LEVEL SECURITY;
ALTER TABLE kbm_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_perilaku ENABLE ROW LEVEL SECURITY;
ALTER TABLE capaian_hafalan ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_penting ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 6. Drop ALL existing policies
-- =========================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN (
    SELECT polname, polrelid::regclass::text as tbl
    FROM pg_policy
    WHERE polrelid IN (
      'profiles'::regclass, 'pengaturan'::regclass, 'kelas'::regclass,
      'mata_pelajaran'::regclass, 'murid'::regclass, 'jadwal'::regclass,
      'jurnal_kbm'::regclass, 'absensi'::regclass, 'penilaian'::regclass,
      'detail_nilai'::regclass, 'sikap'::regclass, 'materi'::regclass,
      'presensi_guru'::regclass, 'soal'::regclass, 'agenda'::regclass,
      'pengumuman'::regclass, 'notifikasi'::regclass, 'log_aktivitas'::regclass,
      'rapor_final'::regclass, 'wa_queue'::regclass, 'log_perubahan_nilai'::regclass,
      'catatan_guru'::regclass, 'semester'::regclass, 'tahun_ajaran'::regclass
    )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.polname, r.tbl);
  END LOOP;
END;
$$;

-- =========================================================
-- 7. Create fresh policies for all tables
-- =========================================================

-- PROFILES (id = user_id, no user_id column)
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- SEMESTER (shared, no user_id)
CREATE POLICY "admin_all_semester" ON semester FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_semester" ON semester FOR SELECT
  TO authenticated USING (true);

-- TAHUN_AJARAN (shared, no user_id)
CREATE POLICY "admin_all_tahun_ajaran" ON tahun_ajaran FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "read_tahun_ajaran" ON tahun_ajaran FOR SELECT
  TO authenticated USING (true);

-- LOG_PERUBAHAN_NILAI (no user_id, admin only)
CREATE POLICY "admin_all_log_perubahan_nilai" ON log_perubahan_nilai FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- LOG_AKTIVITAS (has user_id but insert-only for non-admin)
CREATE POLICY "admin_all_log_aktivitas" ON log_aktivitas FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_log_aktivitas" ON log_aktivitas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_log_aktivitas" ON log_aktivitas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- All other tables with user_id: 4 ownership policies + 1 admin policy
-- PENGATURAN
CREATE POLICY "admin_all_pengaturan" ON pengaturan FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_pengaturan" ON pengaturan FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pengaturan" ON pengaturan FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pengaturan" ON pengaturan FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pengaturan" ON pengaturan FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- KELAS
CREATE POLICY "admin_all_kelas" ON kelas FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_kelas" ON kelas FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_kelas" ON kelas FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_kelas" ON kelas FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_kelas" ON kelas FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- MATA_PELAJARAN
CREATE POLICY "admin_all_mata_pelajaran" ON mata_pelajaran FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_mata_pelajaran" ON mata_pelajaran FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_mata_pelajaran" ON mata_pelajaran FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_mata_pelajaran" ON mata_pelajaran FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_mata_pelajaran" ON mata_pelajaran FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- MURID
CREATE POLICY "admin_all_murid" ON murid FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_murid" ON murid FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_murid" ON murid FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_murid" ON murid FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_murid" ON murid FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- JADWAL
CREATE POLICY "admin_all_jadwal" ON jadwal FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_jadwal" ON jadwal FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_jadwal" ON jadwal FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_jadwal" ON jadwal FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_jadwal" ON jadwal FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- JURNAL_KBM
CREATE POLICY "admin_all_jurnal_kbm" ON jurnal_kbm FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_jurnal_kbm" ON jurnal_kbm FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_jurnal_kbm" ON jurnal_kbm FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_jurnal_kbm" ON jurnal_kbm FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_jurnal_kbm" ON jurnal_kbm FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ABSENSI
CREATE POLICY "admin_all_absensi" ON absensi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_absensi" ON absensi FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_absensi" ON absensi FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_absensi" ON absensi FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_absensi" ON absensi FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PENILAIAN
CREATE POLICY "admin_all_penilaian" ON penilaian FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_penilaian" ON penilaian FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_penilaian" ON penilaian FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_penilaian" ON penilaian FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_penilaian" ON penilaian FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- DETAIL_NILAI
CREATE POLICY "admin_all_detail_nilai" ON detail_nilai FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_detail_nilai" ON detail_nilai FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_detail_nilai" ON detail_nilai FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_detail_nilai" ON detail_nilai FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_detail_nilai" ON detail_nilai FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SIKAP
CREATE POLICY "admin_all_sikap" ON sikap FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_sikap" ON sikap FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sikap" ON sikap FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sikap" ON sikap FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sikap" ON sikap FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- MATERI
CREATE POLICY "admin_all_materi" ON materi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_materi" ON materi FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_materi" ON materi FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_materi" ON materi FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_materi" ON materi FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PRESENSI_GURU
CREATE POLICY "admin_all_presensi_guru" ON presensi_guru FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_presensi_guru" ON presensi_guru FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_presensi_guru" ON presensi_guru FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_presensi_guru" ON presensi_guru FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_presensi_guru" ON presensi_guru FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- SOAL
CREATE POLICY "admin_all_soal" ON soal FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_soal" ON soal FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_soal" ON soal FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_soal" ON soal FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_soal" ON soal FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AGENDA
CREATE POLICY "admin_all_agenda" ON agenda FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_agenda" ON agenda FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_agenda" ON agenda FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_agenda" ON agenda FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_agenda" ON agenda FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- PENGUMUMAN
CREATE POLICY "admin_all_pengumuman" ON pengumuman FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_pengumuman" ON pengumuman FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_pengumuman" ON pengumuman FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_pengumuman" ON pengumuman FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_pengumuman" ON pengumuman FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NOTIFIKASI
CREATE POLICY "admin_all_notifikasi" ON notifikasi FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_notifikasi" ON notifikasi FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_notifikasi" ON notifikasi FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_notifikasi" ON notifikasi FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_notifikasi" ON notifikasi FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- RAPOR_FINAL
CREATE POLICY "admin_all_rapor_final" ON rapor_final FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_rapor_final" ON rapor_final FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_rapor_final" ON rapor_final FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_rapor_final" ON rapor_final FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_rapor_final" ON rapor_final FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- WA_QUEUE
CREATE POLICY "admin_all_wa_queue" ON wa_queue FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_wa_queue" ON wa_queue FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_wa_queue" ON wa_queue FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_wa_queue" ON wa_queue FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_wa_queue" ON wa_queue FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CATATAN_GURU
CREATE POLICY "admin_all_catatan_guru" ON catatan_guru FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_catatan_guru" ON catatan_guru FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_catatan_guru" ON catatan_guru FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_catatan_guru" ON catatan_guru FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_catatan_guru" ON catatan_guru FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- JADWAL_MENGAJAR
CREATE POLICY "admin_all_jadwal_mengajar" ON jadwal_mengajar FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_jadwal_mengajar" ON jadwal_mengajar FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_jadwal_mengajar" ON jadwal_mengajar FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_jadwal_mengajar" ON jadwal_mengajar FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_jadwal_mengajar" ON jadwal_mengajar FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- BANK_SOAL
CREATE POLICY "admin_all_bank_soal" ON bank_soal FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_bank_soal" ON bank_soal FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_bank_soal" ON bank_soal FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_bank_soal" ON bank_soal FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_bank_soal" ON bank_soal FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- BUKU_SAKU
CREATE POLICY "admin_all_buku_saku" ON buku_saku FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_buku_saku" ON buku_saku FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_buku_saku" ON buku_saku FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_buku_saku" ON buku_saku FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_buku_saku" ON buku_saku FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- MUHAFADHOH
CREATE POLICY "admin_all_muhafadhoh" ON muhafadhoh FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_muhafadhoh" ON muhafadhoh FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_muhafadhoh" ON muhafadhoh FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_muhafadhoh" ON muhafadhoh FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_muhafadhoh" ON muhafadhoh FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- KBM_HARIAN
CREATE POLICY "admin_all_kbm_harian" ON kbm_harian FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_kbm_harian" ON kbm_harian FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_kbm_harian" ON kbm_harian FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_kbm_harian" ON kbm_harian FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_kbm_harian" ON kbm_harian FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- NILAI
CREATE POLICY "admin_all_nilai" ON nilai FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_nilai" ON nilai FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_nilai" ON nilai FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_nilai" ON nilai FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_nilai" ON nilai FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CATATAN_PERILAKU
CREATE POLICY "admin_all_catatan_perilaku" ON catatan_perilaku FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_catatan_perilaku" ON catatan_perilaku FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_catatan_perilaku" ON catatan_perilaku FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_catatan_perilaku" ON catatan_perilaku FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_catatan_perilaku" ON catatan_perilaku FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- CAPAIAN_HAFALAN
CREATE POLICY "admin_all_capaian_hafalan" ON capaian_hafalan FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_capaian_hafalan" ON capaian_hafalan FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_capaian_hafalan" ON capaian_hafalan FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_capaian_hafalan" ON capaian_hafalan FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_capaian_hafalan" ON capaian_hafalan FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- AGENDA_PENTING
CREATE POLICY "admin_all_agenda_penting" ON agenda_penting FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "select_own_agenda_penting" ON agenda_penting FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_agenda_penting" ON agenda_penting FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_agenda_penting" ON agenda_penting FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_agenda_penting" ON agenda_penting FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- 8. Ensure existing auth users have profiles
-- =========================================================
INSERT INTO public.profiles (id, email, nama_lengkap, role, is_active)
SELECT au.id, au.email,
  COALESCE(au.raw_user_meta_data->>'nama_lengkap', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'ustaz'), true
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;
