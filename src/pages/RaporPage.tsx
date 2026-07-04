import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, Share2, Users, GraduationCap, Award,
  Calendar, TrendingUp, BookOpen, Heart, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import { generateRaporPDF, shareWA } from '../lib/pdf';
import type { Murid, Nilai, Absensi, CatatanPerilaku, CapaianHafalan, Sikap, ShowToast } from '../types';

export default function RaporPage({ showToast }: { showToast: ShowToast }) {
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMuridId, setSelectedMuridId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Rapor data
  const [nilaiList, setNilaiList] = useState<Nilai[]>([]);
  const [absensiList, setAbsensiList] = useState<Absensi[]>([]);
  const [perilakuList, setPerilakuList] = useState<CatatanPerilaku[]>([]);
  const [capaianList, setCapaianList] = useState<CapaianHafalan[]>([]);
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
    else clearRaporData();
  }, [selectedMuridId]);

  const clearRaporData = () => {
    setNilaiList([]);
    setAbsensiList([]);
    setPerilakuList([]);
    setCapaianList([]);
    setSikapList([]);
  };

  const fetchRaporData = async (muridId: string) => {
    const [n, a, p, c, s] = await Promise.all([
      supabase.from('nilai').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
      supabase.from('absensi').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
      supabase.from('catatan_perilaku').select('*').eq('murid_id', muridId).order('created_at', { ascending: false }),
      supabase.from('capaian_hafalan').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
      supabase.from('sikap').select('*').eq('murid_id', muridId).order('tanggal', { ascending: false }),
    ]);
    if (n.data) setNilaiList(n.data as Nilai[]);
    if (a.data) setAbsensiList(a.data as Absensi[]);
    if (p.data) setPerilakuList(p.data as CatatanPerilaku[]);
    if (c.data) setCapaianList(c.data as CapaianHafalan[]);
    if (s.data) setSikapList(s.data as Sikap[]);
  };

  // Compute absensi summary
  const absenSummary = useMemo(() => {
    const sum = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
    absensiList.forEach(a => {
      const st = (a.status || 'Hadir') as keyof typeof sum;
      if (st in sum) sum[st]++;
      sum.total++;
    });
    return sum;
  }, [absensiList]);

  // Compute nilai average
  const nilaiAvg = useMemo(() => {
    if (!nilaiList.length) return 0;
    return nilaiList.reduce((s, n) => s + (n.skor || 0), 0) / nilaiList.length;
  }, [nilaiList]);

  // Compute sikap average
  const sikapAvg = useMemo(() => {
    if (!sikapList.length) return 0;
    const totals = sikapList.map(s => {
      const scores = [s.disiplin, s.adab, s.kerajinan, s.kejujuran, s.tanggung_jawab].filter((v): v is number => v != null);
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    });
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }, [sikapList]);

  const getPredikat = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'E';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  const handleDownloadPDF = () => {
    if (!selectedMurid) return;
    setGenerating(true);
    try {
      generateRaporPDF(
        {
          nama: selectedMurid.nama,
          kelas: selectedMurid.kelas || '-',
          domisili: selectedMurid.domisili,
          alamat: selectedMurid.alamat,
        },
        absenSummary,
        nilaiList.map(n => ({ pelajaran: n.pelajaran, jenis_ujian: n.jenis_ujian, skor: n.skor })),
        perilakuList.map(p => ({ catatan: p.catatan, jenis: p.jenis, created_at: p.created_at })),
        capaianList.map(c => ({ capaian: c.capaian, tanggal: c.tanggal })),
      );
      showToast('Rapor PDF berhasil diunduh', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWA = () => {
    if (!selectedMurid) return;
    const m = selectedMurid;
    let text = `*RAPOR SANTRI*\n\n`;
    text += `Nama: ${m.nama}\n`;
    text += `Kelas: ${m.kelas || '-'}\n`;
    if (m.domisili) text += `Domisili: ${m.domisili}\n`;
    text += `\n*Rekap Kehadiran:*\n`;
    text += `Hadir: ${absenSummary.hadir} | Izin: ${absenSummary.izin} | Sakit: ${absenSummary.sakit} | Alpha: ${absenSummary.alpha}\n`;
    text += `Total: ${absenSummary.total}\n`;
    if (nilaiList.length > 0) {
      text += `\n*Nilai Akademik (Rata-rata: ${nilaiAvg.toFixed(1)} - ${getPredikat(nilaiAvg)}):*\n`;
      nilaiList.forEach(n => {
        text += `${n.pelajaran} (${n.jenis_ujian}): ${n.skor}\n`;
      });
    }
    if (sikapList.length > 0) {
      text += `\n*Penilaian Sikap (Rata-rata: ${sikapAvg.toFixed(1)}):*\n`;
    }
    if (capaianList.length > 0) {
      text += `\n*Capaian Hafalan:*\n`;
      capaianList.forEach(c => {
        text += `${c.tanggal}: ${c.capaian}\n`;
      });
    }
    if (perilakuList.length > 0) {
      text += `\n*Catatan Perilaku:*\n`;
      perilakuList.forEach(p => {
        text += `${p.jenis === 'prestasi' ? 'Prestasi' : p.jenis === 'pelanggaran' ? 'Pelanggaran' : 'Catatan'}: ${p.catatan}\n`;
      });
    }
    shareWA(text);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Rapor Santri</h2>
        <p className="section-subtitle">Rekap nilai, kehadiran, sikap, dan capaian hafalan</p>
      </div>

      {/* Filter Kelas */}
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      ) : muridList.length === 0 ? (
        <EmptyState title="Belum ada santri" description="Tambahkan data santri terlebih dahulu." icon={<Users className="w-8 h-8 text-slate-300" />} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Santri List */}
          <div className="space-y-4">
            <div className="card p-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Pilih Santri</label>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {muridFiltered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMuridId(m.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border ${selectedMuridId === m.id ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'}`}
                  >
                    <span className="block truncate">{m.nama}</span>
                    {m.kelas && <span className={`text-[10px] ${selectedMuridId === m.id ? 'text-emerald-100' : 'text-slate-400'}`}>Kelas {m.kelas}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Rapor Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedMurid ? (
              <>
                {/* Header Card */}
                <div className="card overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg truncate">{selectedMurid.nama}</p>
                        <p className="text-emerald-100 text-sm">
                          Kelas {selectedMurid.kelas || '-'}
                          {selectedMurid.domisili ? ` • ${selectedMurid.domisili}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{nilaiAvg.toFixed(1)}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Nilai Rata-rata</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                          {getPredikat(nilaiAvg)}
                        </span>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">
                          {absenSummary.total > 0 ? Math.round((absenSummary.hadir / absenSummary.total) * 100) : 0}%
                        </p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Kehadiran</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                          {absenSummary.hadir}/{absenSummary.total}
                        </span>
                      </div>
                      <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
                        <p className="text-2xl font-bold">{sikapAvg.toFixed(1)}</p>
                        <p className="text-[10px] text-emerald-100 font-semibold uppercase">Sikap Rata-rata</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20">
                          {getPredikat(sikapAvg)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={generating}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
                      >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {generating ? 'Membuat...' : 'Unduh PDF'}
                      </button>
                      <button
                        onClick={handleShareWA}
                        className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                        Share WA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Nilai Akademik */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Nilai Akademik
                    <span className="ml-auto badge badge-info text-[10px]">{nilaiList.length} nilai</span>
                  </h3>
                  {nilaiList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada nilai tercatat</p>
                  ) : (
                    <div className="space-y-2">
                      {nilaiList.map(n => (
                        <div key={n.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2.5">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getScoreColor(n.skor)}`}>
                            <span className="font-bold text-sm">{n.skor}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">{n.pelajaran}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="badge badge-info text-[9px]">{n.jenis_ujian}</span>
                              <span>{formatDate(n.tanggal)}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-bold ${getScoreColor(n.skor).split(' ')[0]}`}>{getPredikat(n.skor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kehadiran */}
                <div className="card p-4">
                  <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    Rekap Kehadiran
                  </h3>
                  {absenSummary.total === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada data absensi</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2 mb-3">
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
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
                        {absenSummary.total > 0 && [
                          { key: 'hadir', val: absenSummary.hadir, color: 'bg-emerald-500' },
                          { key: 'izin', val: absenSummary.izin, color: 'bg-amber-500' },
                          { key: 'sakit', val: absenSummary.sakit, color: 'bg-sky-500' },
                          { key: 'alpha', val: absenSummary.alpha, color: 'bg-rose-500' },
                        ].map(s => s.val > 0 ? (
                          <div key={s.key} className={s.color} style={{ width: `${(s.val / absenSummary.total) * 100}%` }} />
                        ) : null)}
                      </div>
                    </>
                  )}
                </div>

                {/* Penilaian Sikap */}
                {sikapList.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4 text-rose-500" />
                      Penilaian Sikap
                      <span className="ml-auto badge badge-success text-[10px]">Rata-rata {sikapAvg.toFixed(1)}</span>
                    </h3>
                    <div className="space-y-2">
                      {sikapList.slice(0, 5).map(s => {
                        const scores = [s.disiplin, s.adab, s.kerajinan, s.kejujuran, s.tanggung_jawab].filter((v): v is number => v != null);
                        const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
                        return (
                          <div key={s.id} className="bg-slate-50 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500 font-medium">{formatDate(s.tanggal)}</span>
                              <span className={`text-sm font-bold ${avg >= 80 ? 'text-emerald-600' : avg >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {avg.toFixed(1)}
                              </span>
                            </div>
                            {s.catatan && <p className="text-xs text-slate-500 italic">{s.catatan}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Capaian Hafalan */}
                {capaianList.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-amber-500" />
                      Capaian Hafalan
                      <span className="ml-auto badge badge-warning text-[10px]">{capaianList.length} capaian</span>
                    </h3>
                    <div className="space-y-2">
                      {capaianList.map(c => (
                        <div key={c.id} className="flex items-center gap-3 bg-amber-50 rounded-xl p-3">
                          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Award className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-700">{c.capaian}</p>
                            <p className="text-[10px] text-slate-400">{formatDate(c.tanggal)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Catatan Perilaku */}
                {perilakuList.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      Catatan Perilaku
                      <span className="ml-auto badge badge-info text-[10px]">{perilakuList.length} catatan</span>
                    </h3>
                    <div className="space-y-2">
                      {perilakuList.map(p => (
                        <div key={p.id} className="flex items-start gap-3 bg-slate-50 rounded-xl p-3">
                          <span className={`badge text-[9px] flex-shrink-0 ${p.jenis === 'prestasi' ? 'badge-success' : p.jenis === 'pelanggaran' ? 'badge-danger' : 'badge-info'}`}>
                            {p.jenis === 'prestasi' ? 'Prestasi' : p.jenis === 'pelanggaran' ? 'Pelanggaran' : 'Catatan'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700">{p.catatan}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(p.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="card border-dashed border-slate-200 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">
                  Pilih santri di sebelah kiri untuk melihat rapor lengkap
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
