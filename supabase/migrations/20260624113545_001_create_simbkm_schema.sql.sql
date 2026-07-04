-- Murid / Santri
CREATE TABLE IF NOT EXISTS murid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  kelas text NOT NULL,
  domisili text,
  alamat text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Jadwal Mengajar
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hari text NOT NULL,
  jam_mulai text NOT NULL,
  jam_selesai text,
  kelas text NOT NULL,
  pelajaran text NOT NULL,
  ruangan text,
  catatan text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Absensi
CREATE TABLE IF NOT EXISTS absensi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  murid_id uuid NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpha')),
  tanggal text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Buku Saku - Batas Mengajar
CREATE TABLE IF NOT EXISTS buku_saku_batas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas text NOT NULL,
  fan text NOT NULL,
  materi text NOT NULL,
  halaman text,
  target text,
  catatan text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Buku Saku - Tagihan Hafalan
CREATE TABLE IF NOT EXISTS buku_saku_tagihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal text NOT NULL,
  kelas text NOT NULL,
  kitab text NOT NULL,
  target_dari text,
  target_sampai text,
  murid_id uuid REFERENCES murid(id) ON DELETE SET NULL,
  catatan text,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Catatan Perilaku / Sikap
CREATE TABLE IF NOT EXISTS catatan_perilaku (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  murid_id uuid NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  jenis text NOT NULL DEFAULT 'catatan' CHECK (jenis IN ('prestasi', 'pelanggaran', 'catatan')),
  catatan text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Nilai
CREATE TABLE IF NOT EXISTS nilai (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  murid_id uuid NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  pelajaran text NOT NULL,
  jenis_ujian text NOT NULL,
  skor integer NOT NULL CHECK (skor >= 0 AND skor <= 100),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Bank Soal
CREATE TABLE IF NOT EXISTS bank_soal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pelajaran text NOT NULL,
  kelas text NOT NULL,
  batasan text,
  isi_soal text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Capaian Hafalan
CREATE TABLE IF NOT EXISTS capaian_hafalan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  murid_id uuid NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  capaian text NOT NULL,
  tanggal text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE murid ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_mengajar ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE buku_saku_batas ENABLE ROW LEVEL SECURITY;
ALTER TABLE buku_saku_tagihan ENABLE ROW LEVEL SECURITY;
ALTER TABLE catatan_perilaku ENABLE ROW LEVEL SECURITY;
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_soal ENABLE ROW LEVEL SECURITY;
ALTER TABLE capaian_hafalan ENABLE ROW LEVEL SECURITY;

-- Murid Policies
CREATE POLICY "select_own_murid" ON murid FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_murid" ON murid FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_murid" ON murid FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_murid" ON murid FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Jadwal Policies
CREATE POLICY "select_own_jadwal" ON jadwal_mengajar FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_jadwal" ON jadwal_mengajar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_jadwal" ON jadwal_mengajar FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_jadwal" ON jadwal_mengajar FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Absensi Policies
CREATE POLICY "select_own_absensi" ON absensi FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_absensi" ON absensi FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_absensi" ON absensi FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_absensi" ON absensi FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Buku Saku Batas Policies
CREATE POLICY "select_own_sakubatas" ON buku_saku_batas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sakubatas" ON buku_saku_batas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sakubatas" ON buku_saku_batas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sakubatas" ON buku_saku_batas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Buku Saku Tagihan Policies
CREATE POLICY "select_own_sakutagihan" ON buku_saku_tagihan FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sakutagihan" ON buku_saku_tagihan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sakutagihan" ON buku_saku_tagihan FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sakutagihan" ON buku_saku_tagihan FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Catatan Perilaku Policies
CREATE POLICY "select_own_perilaku" ON catatan_perilaku FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_perilaku" ON catatan_perilaku FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_perilaku" ON catatan_perilaku FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_perilaku" ON catatan_perilaku FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Nilai Policies
CREATE POLICY "select_own_nilai" ON nilai FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_nilai" ON nilai FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_nilai" ON nilai FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_nilai" ON nilai FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Bank Soal Policies
CREATE POLICY "select_own_soal" ON bank_soal FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_soal" ON bank_soal FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_soal" ON bank_soal FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_soal" ON bank_soal FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Capaian Hafalan Policies
CREATE POLICY "select_own_capaian" ON capaian_hafalan FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_capaian" ON capaian_hafalan FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_capaian" ON capaian_hafalan FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_capaian" ON capaian_hafalan FOR DELETE TO authenticated USING (auth.uid() = user_id);