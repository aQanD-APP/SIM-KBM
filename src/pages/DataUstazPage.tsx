import { useState, useEffect, useMemo } from 'react';
import {
  Users, FileText, Calendar, BarChart3, Loader2, BookOpen, TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import type { Profile, JadwalMengajar, JurnalKBM, Penilaian, ShowToast } from '../types';

export default function DataUstazPage({ showToast }: { showToast: ShowToast }) {
  const [ustazList, setUstazList] = useState<Profile[]>([]);
  const [selectedUstazId, setSelectedUstazId] = useState('');
  const [loading, setLoading] = useState(true);

  const [jadwalList, setJadwalList] = useState<JadwalMengajar[]>([]);
  const [jurnalList, setJurnalList] = useState<JurnalKBM[]>([]);
  const [penilaianList, setPenilaianList] = useState<Penilaian[]>([]);
  const [detailCount, setDetailCount] = useState(0);

  useEffect(() => {
    fetchUstaz();
  }, []);

  const fetchUstaz = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('is_active', true).order('nama_lengkap');
    if (error) {
      showToast(error.message, 'error');
    } else if (data) {
      const profiles = (data as Profile[]).filter(p => p.role !== 'admin');
      setUstazList(profiles);
      if (profiles.length) setSelectedUstazId(profiles[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedUstazId) fetchUstazData(selectedUstazId);
    else clearData();
  }, [selectedUstazId]);

  const clearData = () => {
    setJadwalList([]);
    setJurnalList([]);
    setPenilaianList([]);
    setDetailCount(0);
  };

  const fetchUstazData = async (ustazId: string) => {
    const [j, jur, p] = await Promise.all([
      supabase.from('jadwal_mengajar').select('*').eq('user_id', ustazId).order('hari'),
      supabase.from('jurnal_kbm').select('*').eq('user_id', ustazId).eq('is_active', true).order('tanggal', { ascending: false }).limit(50),
      supabase.from('penilaian').select('*').eq('user_id', ustazId).order('tanggal', { ascending: false }),
    ]);
    if (j.data) setJadwalList(j.data as JadwalMengajar[]);
    if (jur.data) setJurnalList(jur.data as JurnalKBM[]);
    if (p.data) {
      setPenilaianList(p.data as Penilaian[]);
      const ids = (p.data || []).map(x => x.id);
      if (ids.length) {
        const { count } = await supabase.from('detail_nilai').select('*', { count: 'exact', head: true }).in('penilaian_id', ids);
        setDetailCount(count || 0);
      } else {
        setDetailCount(0);
      }
    }
  };

  const selectedUstaz = ustazList.find(u => u.id === selectedUstazId);

  const kelasAmpu = useMemo(() => [...new Set(jadwalList.map(j => j.kelas).filter(Boolean))], [jadwalList]);
  const mapelAmpu = useMemo(() => [...new Set(jadwalList.map(j => j.pelajaran).filter(Boolean))], [jadwalList]);

  const jurnalThisMonth = useMemo(() => {
    const now = new Date();
    return jurnalList.filter(j => {
      const d = new Date(j.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [jurnalList]);

  const penilaianThisMonth = useMemo(() => {
    const now = new Date();
    return penilaianList.filter(p => {
      const d = new Date(p.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [penilaianList]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-500">Memuat data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Data Ustaz</h2>
        <p className="section-subtitle">Rekap kehadiran mengajar, jadwal, dan statistik penilaian</p>
      </div>

      {ustazList.length === 0 ? (
        <EmptyState title="Belum ada ustaz" description="Belum ada data ustaz terdaftar." icon={<Users className="w-8 h-8 text-slate-300" />} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Ustaz List */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Pilih Ustaz</label>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {ustazList.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUstazId(u.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${selectedUstazId === u.id ? 'bg-emerald-600 text-white font-bold border-emerald-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'}`}
                >
                  <span className="block truncate">{u.nama_lengkap || u.nama_panggilan || 'Ustaz'}</span>
                  <span className={`text-[10px] ${selectedUstazId === u.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {u.role === 'operator' ? 'Operator' : 'Ustaz'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedUstaz ? (
              <>
                {/* Header */}
                <div className="card overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{selectedUstaz.nama_lengkap || selectedUstaz.nama_panggilan || 'Ustaz'}</p>
                        <p className="text-emerald-100 text-sm">{selectedUstaz.email || ''}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{jadwalList.length}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Total Jadwal</p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{kelasAmpu.length}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Kelas Diampu</p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{mapelAmpu.length}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Mapel Diampu</p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{penilaianList.length}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Total Penilaian</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistik Bulan Ini */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{jurnalThisMonth}</p>
                        <p className="text-xs text-slate-500">Jurnal Bulan Ini</p>
                      </div>
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-800">{penilaianThisMonth}</p>
                        <p className="text-xs text-slate-500">Penilaian Bulan Ini</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Jadwal Mengajar */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Jadwal Mengajar
                    <span className="ml-auto badge badge-info text-[10px]">{jadwalList.length} jadwal</span>
                  </h3>
                  {jadwalList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada jadwal</p>
                  ) : (
                    <div className="space-y-2">
                      {jadwalList.slice(0, 8).map(j => (
                        <div key={j.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xs font-bold text-slate-600">
                            {j.jam_mulai?.slice(0, 5)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{j.pelajaran}</p>
                            <p className="text-[10px] text-slate-400">{j.hari} • {j.kelas}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Jurnal Terakhir */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-violet-600" /> Jurnal Terakhir
                  </h3>
                  {jurnalList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada jurnal</p>
                  ) : (
                    <div className="space-y-2">
                      {jurnalList.slice(0, 5).map(j => (
                        <div key={j.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                          <div className="w-9 h-9 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-violet-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{j.materi || j.pelajaran || 'Jurnal'}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              {j.kelas && ` • ${j.kelas}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Penilaian Terakhir */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-sky-600" /> Penilaian Diinput
                    <span className="ml-auto badge badge-success text-[10px]">{detailCount} nilai</span>
                  </h3>
                  {penilaianList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada penilaian</p>
                  ) : (
                    <div className="space-y-2">
                      {penilaianList.slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                          <div className="w-9 h-9 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-4 h-4 text-sky-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{p.nama_penilaian}</p>
                            <p className="text-[10px] text-slate-400">
                              {p.mapel || p.kelas} • {new Date(p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card border-dashed border-slate-200 p-12 text-center">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Pilih ustaz untuk melihat rekap data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
