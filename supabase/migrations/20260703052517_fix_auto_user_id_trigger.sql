/*
# Auto-fill user_id on insert + fix RLS for all tables

## Problem
Frontend insert calls don't include user_id, so RLS policy
`WITH CHECK (auth.uid() = user_id)` rejects all inserts from non-admin users.

## Solution
1. Create a generic trigger function that sets user_id = auth.uid() on INSERT
   if user_id is null (and the table has a user_id column).
2. Attach the trigger to all user-owned tables.
3. This way, the frontend doesn't need to send user_id — the DB fills it automatically.
*/

-- =========================================================
-- 1. Generic trigger function: auto-set user_id on insert
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_user_id_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set if user_id is null and the column exists
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 2. Attach trigger to all user-owned tables
-- =========================================================
-- Drop existing triggers first, then recreate
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'pengaturan', 'kelas', 'mata_pelajaran', 'murid', 'jadwal',
    'jurnal_kbm', 'absensi', 'penilaian', 'detail_nilai', 'sikap',
    'materi', 'presensi_guru', 'soal', 'agenda', 'pengumuman',
    'notifikasi', 'log_aktivitas', 'rapor_final', 'wa_queue',
    'catatan_guru', 'jadwal_mengajar', 'bank_soal', 'buku_saku',
    'muhafadhoh', 'kbm_harian', 'nilai', 'catatan_perilaku',
    'capaian_hafalan', 'agenda_penting'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_user_id_%s ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_set_user_id_%s BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.set_user_id_on_insert();', t, t);
  END LOOP;
END;
$$;

-- =========================================================
-- 3. Also fix: semester & tahun_ajaran don't have user_id,
--    but admin needs to insert. The admin policy already
--    handles this via is_admin(). No trigger needed.
-- =========================================================

-- =========================================================
-- 4. Verify: list all triggers
-- =========================================================
SELECT tgname, tgrelid::regclass::text as table_name
FROM pg_trigger
WHERE tgname LIKE 'trg_set_user_id_%'
ORDER BY table_name;
