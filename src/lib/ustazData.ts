import { supabase } from './supabase';
import type { Profile, Kelas, MataPelajaran } from '../types';

export interface UstazScope {
  kelasList: string[];
  mapelList: string[];
  isAdmin: boolean;
}

export async function getUstazScope(profile: Profile | null): Promise<UstazScope> {
  if (!profile) return { kelasList: [], mapelList: [], isAdmin: false };

  if (profile.role === 'admin') {
    const [kelasRes, mapelRes] = await Promise.all([
      supabase.from('kelas').select('nama_kelas').eq('is_active', true).order('nama_kelas'),
      supabase.from('mata_pelajaran').select('nama_mapel').eq('is_active', true).order('nama_mapel'),
    ]);
    return {
      kelasList: (kelasRes.data as Pick<Kelas, 'nama_kelas'>[] | null)?.map(k => k.nama_kelas).filter(Boolean) ?? [],
      mapelList: (mapelRes.data as Pick<MataPelajaran, 'nama_mapel'>[] | null)?.map(m => m.nama_mapel).filter(Boolean) ?? [],
      isAdmin: true,
    };
  }

  const { data: jadwalData } = await supabase
    .from('jadwal_mengajar')
    .select('kelas, pelajaran')
    .eq('user_id', profile.id);

  const kelasSet = new Set<string>();
  const mapelSet = new Set<string>();
  (jadwalData || []).forEach((j: any) => {
    if (j.kelas) kelasSet.add(j.kelas);
    if (j.pelajaran) mapelSet.add(j.pelajaran);
  });

  if (kelasSet.size === 0) {
    const { data: kelasData } = await supabase.from('kelas').select('nama_kelas').eq('is_active', true).order('nama_kelas');
    (kelasData || []).forEach((k: any) => { if (k.nama_kelas) kelasSet.add(k.nama_kelas); });
  }
  if (mapelSet.size === 0) {
    const { data: mapelData } = await supabase.from('mata_pelajaran').select('nama_mapel').eq('is_active', true).order('nama_mapel');
    (mapelData || []).forEach((m: any) => { if (m.nama_mapel) mapelSet.add(m.nama_mapel); });
  }

  return {
    kelasList: [...kelasSet].sort(),
    mapelList: [...mapelSet].sort(),
    isAdmin: false,
  };
}
