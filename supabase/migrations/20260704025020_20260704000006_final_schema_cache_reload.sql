/*
# Final Schema Cache Reload

Forces PostgREST to reload its internal schema cache by making
a trivial DDL change on every table the app uses. This ensures
the Supabase client API recognizes all tables and columns.
*/

-- Touch every table the app uses with a COMMENT to force cache reload
COMMENT ON TABLE izin_mengajar IS 'Pengajuan izin mengajar oleh ustaz';
COMMENT ON TABLE ruangan IS 'Master data ruangan kelas';
COMMENT ON TABLE kelas IS 'Master data kelas';
COMMENT ON TABLE pengumuman IS 'Pengumuman broadcast';
COMMENT ON TABLE murid IS 'Master data murid/siswa';
COMMENT ON TABLE jadwal_mengajar IS 'Jadwal mengajar ustaz';
COMMENT ON TABLE absensi IS 'Absensi murid harian';
COMMENT ON TABLE penilaian IS 'Master penilaian';
COMMENT ON TABLE detail_nilai IS 'Detail nilai per murid';
COMMENT ON TABLE sikap IS 'Penilaian sikap murid';
COMMENT ON TABLE jurnal_kbm IS 'Jurnal KBM harian';
COMMENT ON TABLE bank_soal IS 'Bank soal ujian';
COMMENT ON TABLE catatan_guru IS 'Catatan guru';
COMMENT ON TABLE mata_pelajaran IS 'Master mata pelajaran';
COMMENT ON TABLE profiles IS 'Profile pengguna';
COMMENT ON TABLE tahun_ajaran IS 'Master tahun ajaran';
COMMENT ON TABLE semester IS 'Master semester';

-- Notify PostgREST to reload
NOTIFY pgrst, 'reload schema';
