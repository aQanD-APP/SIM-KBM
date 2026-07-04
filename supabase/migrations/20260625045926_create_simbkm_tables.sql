-- ============================================================
-- SIM KBM Ustaz – Full Schema
-- ============================================================

-- KELAS
CREATE TABLE IF NOT EXISTS kelas (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nama_kelas      text NOT NULL,
  tingkat         integer NOT NULL DEFAULT 1,
  aktif           boolean NOT NULL DEFAULT true,
  wali_kelas      text,
  tahun_ajaran_id bigint,
  user_id         uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE kelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kelas_all" ON kelas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MURID
CREATE TABLE IF NOT EXISTS murid (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nama            text NOT NULL,
  kelas_id        bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  nomor_whatsapp  text,
  alamat          text,
  domisili        text,
  status_aktif    boolean NOT NULL DEFAULT true,
  user_id         uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE murid ENABLE ROW LEVEL SECURITY;
CREATE POLICY "murid_all" ON murid FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- JADWAL MENGAJAR
CREATE TABLE IF NOT EXISTS jadwal_mengajar (
  id          bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  hari        text NOT NULL,
  jam_mulai   time NOT NULL,
  jam_selesai time NOT NULL,
  kelas_id    bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  pelajaran   text NOT NULL,
  lokasi      text,
  user_id     uuid NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jadwal_mengajar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jadwal_all" ON jadwal_mengajar FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ABSENSI
CREATE TABLE IF NOT EXISTS absensi (
  id        bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  murid_id  bigint NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  tanggal   date NOT NULL,
  status    text NOT NULL DEFAULT 'Hadir',
  user_id   uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE absensi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "absensi_all" ON absensi FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- KBM HARIAN
CREATE TABLE IF NOT EXISTS kbm_harian (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  tanggal    date NOT NULL,
  kelas_id   bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  pelajaran  text NOT NULL,
  materi     text,
  catatan    text,
  durasi     integer,
  selesai    boolean NOT NULL DEFAULT false,
  user_id    uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE kbm_harian ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kbm_all" ON kbm_harian FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BUKU SAKU
CREATE TABLE IF NOT EXISTS buku_saku (
  id               bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kelas_id         bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  pelajaran        text NOT NULL,
  bab_terakhir     text,
  halaman_terakhir text,
  catatan          text,
  user_id          uuid NOT NULL DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE buku_saku ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buku_all" ON buku_saku FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MUHAFADHOH
CREATE TABLE IF NOT EXISTS muhafadhoh (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kelas_id       bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  tanggal        date NOT NULL,
  materi         text,
  target_hafalan text,
  catatan        text,
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE muhafadhoh ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hafal_all" ON muhafadhoh FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- NILAI
CREATE TABLE IF NOT EXISTS nilai (
  id               bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  murid_id         bigint NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
  pelajaran        text NOT NULL,
  jenis_penilaian  text NOT NULL,
  skor             integer NOT NULL,
  tanggal          date NOT NULL DEFAULT CURRENT_DATE,
  user_id          uuid NOT NULL DEFAULT auth.uid(),
  created_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE nilai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nilai_all" ON nilai FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BANK SOAL
CREATE TABLE IF NOT EXISTS bank_soal (
  id              bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kelas_id        bigint NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  pelajaran       text NOT NULL,
  batasan_materi  text,
  isi_soal        text NOT NULL,
  user_id         uuid NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bank_soal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "soal_all" ON bank_soal FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AGENDA PENTING
CREATE TABLE IF NOT EXISTS agenda_penting (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  judul      text NOT NULL,
  catatan    text,
  jenis      text NOT NULL DEFAULT 'Kegiatan',
  tanggal    date NOT NULL,
  user_id    uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE agenda_penting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda_all" ON agenda_penting FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PENGUMUMAN
CREATE TABLE IF NOT EXISTS pengumuman (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  judul      text NOT NULL,
  isi        text NOT NULL,
  kategori   text NOT NULL DEFAULT 'Umum',
  tanggal    date NOT NULL DEFAULT CURRENT_DATE,
  user_id    uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pengumuman ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pengumuman_all" ON pengumuman FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
