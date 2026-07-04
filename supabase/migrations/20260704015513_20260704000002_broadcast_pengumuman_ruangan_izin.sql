/*
# Broadcast Pengumuman, Ruangan, dan Izin Mengajar

## Overview
Menambahkan fitur broadcast pengumuman dari Admin ke seluruh ustaz,
tabel ruangan untuk master data, dan tabel izin mengajar untuk ustaz.
Tidak mengubah struktur data lama yang sudah berjalan.

## 1. Pengumuman (Broadcast) - Tabel `pengumuman`
Menambahkan kolom baru pada tabel `pengumuman` yang sudah ada:
- `jenis` (text): Pengumuman | Agenda | Peringatan | Penting
- `prioritas` (text): Normal | Penting | Darurat
- `tanggal_mulai` (date): kapan pengumuman mulai tampil
- `tanggal_selesai` (date): kapan pengumuman berakhir/sembunyi
- `status` (text): Draft | Publish | Arsip
- `lampiran` (text): URL lampiran opsional
- `updated_at` (timestamptz): timestamp update
- `dibuat_oleh` (uuid): admin yang membuat (default auth.uid())

## 2. Ruangan - Tabel `ruangan` (BARU)
Master data ruangan kelas untuk Admin.

## 3. Izin Mengajar - Tabel `izin_mengajar` (BARU)
Pengajuan izin mengajar oleh ustaz.

## 4. Security (RLS)
- `pengumuman`: Admin full CRUD, semua authenticated bisa SELECT (broadcast)
- `ruangan`: Admin full CRUD, semua authenticated bisa SELECT
- `izin_mengajar`: Admin full CRUD + lihat semua, ustaz lihat & kelola milik sendiri
*/

-- =========================================================
-- 1. Pengumuman: tambah kolom broadcast
-- =========================================================
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS jenis text DEFAULT 'Pengumuman';
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS prioritas text DEFAULT 'Normal';
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS tanggal_mulai date;
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS tanggal_selesai date;
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS status text DEFAULT 'Draft';
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS lampiran text;
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE pengumuman ADD COLUMN IF NOT EXISTS dibuat_oleh uuid DEFAULT auth.uid();

-- Backfill: set tanggal_mulai/selesai dari tanggal lama jika null
UPDATE pengumuman
SET tanggal_mulai = tanggal
WHERE tanggal_mulai IS NULL AND tanggal IS NOT NULL;

UPDATE pengumuman
SET tanggal_selesai = tanggal + INTERVAL '30 days'
WHERE tanggal_selesai IS NULL AND tanggal IS NOT NULL;

-- Set status Publish untuk pengumuman lama
UPDATE pengumuman SET status = 'Publish' WHERE status IS NULL OR status = 'Draft';

CREATE INDEX IF NOT EXISTS idx_pengumuman_broadcast
  ON pengumuman (status, tanggal_mulai, tanggal_selesai);

-- =========================================================
-- 2. Ruangan (BARU)
-- =========================================================
CREATE TABLE IF NOT EXISTS ruangan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_ruangan text NOT NULL,
  kode text,
  kapasitas integer,
  keterangan text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ruangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_ruangan" ON ruangan;
CREATE POLICY "admin_all_ruangan" ON ruangan FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "select_all_ruangan" ON ruangan;
CREATE POLICY "select_all_ruangan" ON ruangan FOR SELECT
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ruangan_active ON ruangan (is_active);

-- =========================================================
-- 3. Izin Mengajar (BARU)
-- =========================================================
CREATE TABLE IF NOT EXISTS izin_mengajar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_ustaz text NOT NULL,
  jenis_izin text NOT NULL DEFAULT 'Izin',
  lama_izin text NOT NULL DEFAULT 'hari_ini',
  tanggal_mulai date NOT NULL DEFAULT CURRENT_DATE,
  tanggal_selesai date,
  mata_pelajaran text,
  kelas text,
  guru_pengganti text,
  catatan text,
  status text NOT NULL DEFAULT 'diajukan',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE izin_mengajar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_izin_mengajar" ON izin_mengajar;
CREATE POLICY "admin_all_izin_mengajar" ON izin_mengajar FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "select_own_izin_mengajar" ON izin_mengajar;
CREATE POLICY "select_own_izin_mengajar" ON izin_mengajar FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_izin_mengajar" ON izin_mengajar;
CREATE POLICY "insert_own_izin_mengajar" ON izin_mengajar FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_izin_mengajar" ON izin_mengajar;
CREATE POLICY "update_own_izin_mengajar" ON izin_mengajar FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_izin_mengajar" ON izin_mengajar;
CREATE POLICY "delete_own_izin_mengajar" ON izin_mengajar FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_izin_mengajar_user ON izin_mengajar (user_id);
CREATE INDEX IF NOT EXISTS idx_izin_mengajar_status ON izin_mengajar (status);

-- =========================================================
-- 4. Pengumuman: pastikan policy SELECT untuk semua authenticated
-- =========================================================
DROP POLICY IF EXISTS "select_all_pengumuman" ON pengumuman;
CREATE POLICY "select_all_pengumuman" ON pengumuman FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_all_pengumuman_v2" ON pengumuman;
CREATE POLICY "admin_all_pengumuman_v2" ON pengumuman FOR ALL
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
