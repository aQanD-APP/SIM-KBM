import { useState, useEffect, useMemo } from 'react';
import {
  Users, FileText, Download, Calendar, BarChart3, Loader2,
  GraduationCap, Heart, BookOpen,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { generatePDF } from '../lib/pdf';
import type { Murid, Absensi, Penilaian, DetailNilai, Sikap, ShowToast } from '../types';

export default function DataSiswaPage({ showToast }: { showToast: ShowToast }) {
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMuridId, setSelectedMuridId] = useState('');
  const [loading, setLoading] = useState(true);

  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [penilaianList, setPenilaianList] = useState<Penilaian[]>([]);
  const [detailNilaiMap, setDetailNilaiMap] = useState<Record<string, DetailNilai[]>>({});
  const [sikapList, setSikapList] = useState<Sikap[]>([]);

  useEffect(() => {
    fetchMurid();
  }, []);

  const fetchMurid = async () => {
    setLoading(true);
    const { data } = await supabase.from('murid').select('*').eq('status_aktif', true).order('nama');
    if (data) {
      const murid = data as Murid[];
      setMuridList(murid);
      const kelas = [...new Set(murid.map(m => m.kelas).filter((k): k is string => Boolean(k)))].sort();
      setKelasOptions(kelas);
      if (kelas.length) setSelectedKelas(kelas[0]);
    }
    setLoading(false);
  };

  const muridFiltered = useMemo(
    () => muridList.filter(m => !selectedKelas || m.kelas === selectedKelas),
    [muridList, selectedKelas]
  );

  const selectedMurid = muridList.find(m => m.id === selectedMuridId);

  useEffect(() => {
    if (selectedMuridId) fetchRaporData(selectedMuridId);
    else clearData();
  }, [selectedMuridId]);

  const clearData = () => {
    setAbsensiList([]);
    setPenilaianList([]);
    setDetailNilaiMap({});
    setSikapList([]);
  };

  const fetchRaporData = async (muridId: string) => {
    const [a, p, s] = await Promise.all([
      supabase.from('absensi').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
      supabase.from('penilaian').select('*').order('tanggal', { ascending: false }),
      supabase.from('sikap').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
    ]);
    if (a.data) setAbsensiList(a.data as Absensi[]);
    if (p.data) {
      setPenilaianList(p.data as Penilaian[]);
      const ids = (p.data || []).map(x => x.id);
      if (ids.length) {
        const { data: dd } = await supabase.from('detail_nilai').select('*').in('penilaian_id', ids).eq('murid_id', muridId);
        if (dd) {
          const map: Record<string, DetailNilai[]> = {};
          (dd as DetailNilai[]).forEach(d => {
            if (d.penilaian_id) {
              if (!map[d.penilaian_id]) map[d.penilaian_id] = [];
              map[d.penilaian_id].push(d);
            }
          });
          setDetailNilaiMap(map);
        }
      }
    }
    if (s.data) setSikapList(s.data as Sikap[]);
  };

  const absenSummary = useMemo(() => {
    const sum = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
    absensiList.forEach(a => {
      const st = (a.status || 'Hadir') as keyof typeof sum;
      if (st in sum && st !== 'total') sum[st]++;
      sum.total++;
    });
    return sum;
  }, [absensiList]);

  const nilaiRecords = useMemo(() => {
    const records: { pelajaran: string; jenis: string; nilai: number; tanggal: string }[] = [];
    penilaianList.forEach(p => {
      const details = detailNilaiMap[p.id] || [];
      details.forEach(d => {
        records.push({
          pelajaran: p.mapel || p.kelas || '-',
          jenis: p.jenis || p.nama_penilaian || '-',
          nilai: d.nilai || 0,
          tanggal: p.tanggal,
        });
      });
    });
    return records;
  }, [penilaianList, detailNilaiMap]);

  const nilaiAvg = useMemo(() => {
    if (!nilaiRecords.length) return 0;
    return nilaiRecords.reduce((s, n) => s + n.nilai, 0) / nilaiRecords.length;
  }, [nilaiRecords]);

  const sikapAvg = useMemo(() => {
    if (!sikapList.length) return 0;
    const totals = sikapList.map(s => {
      const scores = [s.disiplin, s.adab, s.kerajinan, s.kejujuran, s.tanggung_jawab].filter((v): v is number => v != null);
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [sikapList]);

  const exportPDF = () => {
    if (!selectedMurid) return;
    const headers = ['No', 'Mata Pelajaran', 'Jenis', 'Nilai', 'Tanggal'];
    const body = nilaiRecords.map((n, i) => [i + 1, n.pelajaran, n.jenis, n.nilai, new Date(n.tanggal).toLocaleDateString('id-ID')]);
    generatePDF(
      `Rekap Nilai - ${selectedMurid.nama}`,
      headers, body,
      [`Kelas: ${selectedMurid.kelas || '-'}`, `Rata-rata: ${nilaiAvg.toFixed(1)}`, `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`]
    );
    showToast('PDF berhasil diunduh', 'success');
  };

  const exportExcel = () => {
    if (!selectedMurid) return;
    const rows: string[] = [];
    rows.push('No,Mata Pelajaran,Jenis,Nilai,Tanggal');
    nilaiRecords.forEach((n, i) => {
      rows.push(`${i + 1},"${n.pelajaran}","${n.jenis}",${n.nilai},${new Date(n.tanggal).toLocaleDateString('id-ID')}`);
    });
    const csv = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Nilai_${selectedMurid.nama.replace(/ /g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Excel/CSV berhasil diunduh', 'success');
  };

  const getScoreColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-rose-600';

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
        <h2 className="section-title">Data Siswa</h2>
        <p className="section-subtitle">Rekap absensi, nilai, sikap, dan rapor siswa</p>
      </div>

      {kelasOptions.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {kelasOptions.map(k => (
            <button key={k} onClick={() => { setSelectedKelas(k); setSelectedMuridId(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all ${selectedKelas === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {muridList.length === 0 ? (
        <EmptyState title="Belum ada siswa" description="Tambahkan data siswa terlebih dahulu." icon={<Users className="w-8 h-8 text-slate-300" />} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Siswa List */}
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Pilih Siswa</label>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {muridFiltered.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMuridId(m.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${selectedMuridId === m.id ? 'bg-emerald-600 text-white font-bold border-emerald-600' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'}`}
                >
                  <span className="block truncate">{m.nama}</span>
                  {m.kelas && <span className={`text-[10px] ${selectedMuridId === m.id ? 'text-emerald-100' : 'text-slate-400'}`}>Kelas {m.kelas}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedMurid ? (
              <>
                {/* Header */}
                <div className="card overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{selectedMurid.nama}</p>
                        <p className="text-emerald-100 text-sm">Kelas {selectedMurid.kelas || '-'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{nilaiAvg.toFixed(1)}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Nilai Rata-rata</p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{absenSummary.total > 0 ? Math.round((absenSummary.hadir / absenSummary.total) * 100) : 0}%</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Kehadiran</p>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{sikapAvg.toFixed(1)}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Sikap Rata-rata</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={exportPDF} className="flex-1 flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
                        <Download className="w-4 h-4" /> Export PDF
                      </button>
                      <button onClick={exportExcel} className="flex-1 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors">
                        <FileText className="w-4 h-4" /> Export Excel
                      </button>
                    </div>
                  </div>
                </div>

                {/* Absensi */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-sky-600" /> Rekap Absensi
                  </h3>
                  {absenSummary.total === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada data absensi</p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Hadir', val: absenSummary.hadir, color: 'bg-emerald-50 text-emerald-700' },
                        { label: 'Izin', val: absenSummary.izin, color: 'bg-amber-50 text-amber-700' },
                        { label: 'Sakit', val: absenSummary.sakit, color: 'bg-sky-50 text-sky-700' },
                        { label: 'Alpha', val: absenSummary.alpha, color: 'bg-rose-50 text-rose-700' },
                      ].map(s => (
                        <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.color}`}>
                          <p className="text-lg font-bold">{s.val}</p>
                          <p className="text-[10px] font-semibold">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nilai */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-emerald-600" /> Rekap Nilai
                    <span className="ml-auto badge badge-info text-[10px]">{nilaiRecords.length} nilai</span>
                  </h3>
                  {nilaiRecords.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada nilai tercatat</p>
                  ) : (
                    <div className="space-y-2">
                      {nilaiRecords.slice(0, 10).map((n, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className={`font-bold text-sm ${getScoreColor(n.nilai)}`}>{n.nilai}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{n.pelajaran}</p>
                            <p className="text-[10px] text-slate-400">{n.jenis} • {new Date(n.tanggal).toLocaleDateString('id-ID')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sikap */}
                {sikapList.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4 text-rose-500" /> Nilai Sikap
                      <span className="ml-auto badge badge-success text-[10px]">Rata-rata {sikapAvg.toFixed(1)}</span>
                    </h3>
                    <div className="space-y-2">
                      {sikapList.slice(0, 5).map(s => {
                        const scores = [s.disiplin, s.adab, s.kerajinan, s.kejujuran, s.tanggung_jawab].filter((v): v is number => v != null);
                        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                        return (
                          <div key={s.id} className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500">{new Date(s.tanggal).toLocaleDateString('id-ID')}</span>
                              <span className={`text-sm font-bold ${getScoreColor(avg)}`}>{avg.toFixed(1)}</span>
                            </div>
                            {s.catatan && <p className="text-xs text-slate-500 italic">{s.catatan}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card border-dashed border-slate-200 p-12 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">Pilih siswa untuk melihat rekap data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
