/*
# Create is_admin() helper function

## Overview
Membuat fungsi `is_admin()` yang digunakan oleh RLS policies
untuk mengecek apakah user yang login adalah admin.

## Security
- Fungsi SECURITY DEFINER, STABLE
- Mengecek tabel profiles: role='admin' AND is_active=true
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;
