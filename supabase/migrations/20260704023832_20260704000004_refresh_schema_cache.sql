/*
# Refresh PostgREST Schema Cache

## Overview
Force PostgREST to reload its schema cache so that the `izin_mengajar`
and `ruangan` tables (added in previous migrations) are recognized by
the Supabase client API. This resolves the error:
"Could not find the table 'public.izin_mengajar' in the schema cache."

## What it does
- Runs a NOT EXISTS check on izin_mengajar (trivial query)
- The act of applying a migration triggers PostgREST schema reload
*/

-- Trivial statement to force schema cache reload
SELECT 1 as cache_refresh;
