/*
# Force PostgREST Schema Cache Reload for izin_mengajar

Some Supabase projects require an explicit DDL statement on the table
to trigger PostgREST to reload its schema cache. This migration
adds a COMMENT on the izin_mengajar table to force the reload.
*/

COMMENT ON TABLE izin_mengajar IS 'Pengajuan izin mengajar oleh ustaz - broadcast ke koordinator';
COMMENT ON TABLE ruangan IS 'Master data ruangan kelas untuk admin';
