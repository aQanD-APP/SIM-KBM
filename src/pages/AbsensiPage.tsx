import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck, Save, CheckCircle, AlertCircle, XCircle, Clock,
  FileText, Share2, Calendar, BarChart3, Pencil,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUstazScope } from '../lib/ustazData';
import EmptyState from '../components/EmptyState';
import { generatePDF, shareWA } from '../lib/pdf';
import type { Murid, Absensi, Profile, ShowToast } from '../types';

type Status = 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
type Tab = 'input' | 'rekap';

const STATUS_CONFIG: Record<Status, { active: string; icon: React.ElementType }> = {
  Hadir:  { active: 'bg-emerald-500 border-emerald-500 text-white', icon: CheckCircle },
  Izin:   { active: 'bg-amber-500 border-amber-500 text-white',   icon: Clock },
  Sakit:  { active: 'bg-sky-500 border-sky-500 text-white',       icon: AlertCircle },
  Alpha:  { active: 'bg-rose-500 border-rose-500 text-white',     icon: XCircle },
};

const STATUS_LIST: Status[] = ['Hadir', 'Izin', 'Sakit', 'Alpha'];
const STATUS_COLOR: Record<Status, string> = {
  Hadir: 'bg-emerald-500', Izin: 'bg-amber-500', Sakit: 'bg-sky-500', Alpha: 'bg-rose-500',
};
const STATUS_BADGE: Record<Status, string> = {
  Hadir: 'badge-success', Izin: 'badge-warning', Sakit: 'badge-info', Alpha: 'badge-danger',
};
void STATUS_BADGE;

export default function AbsensiPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [tab, setTab] = useState<Tab>('input');
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [mapelOptions, setMapelOptions] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedMapel, setSelectedMapel] = useState<string>('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rekap state
  const [rekapType, setRekapType] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [rekapBulan, setRekapBulan] = useState(new Date().getMonth() + 1);
  const [rekapTahun, setRekapTahun] = useState(new Date().getFullYear());
  const [rekapData, setRekapData] = useState<Record<string, Record<Status, number>>>({});
  const [rekapLoading, setRekapLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  void today;
  const todayInfo = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    (async () => {
      const scope = await getUstazScope(profile);
      setKelasOptions(scope.kelasList);
      setMapelOptions(scope.mapelList);
      if (scope.kelasList.length) setSelectedKelas(scope.kelasList[0]);
      if (scope.mapelList.length) setSelectedMapel(scope.mapelList[0]);

      const { data } = await supabase.from('murid').select('*').eq('status_aktif', true).order('nama');
      let murid = (data ?? []) as Murid[];
      if (!scope.isAdmin && scope.kelasList.length > 0) {
        murid = murid.filter(m => scope.kelasList.includes(m.kelas || ''));
      }
      setMuridList(murid);
    })();
  }, [profile]);

  const muridFiltered = useMemo(
    () => muridList.filter(m => m.kelas === selectedKelas),
    [muridList, selectedKelas]
  );

  useEffect(() => {
    if (selectedKelas && tab === 'input') loadData(selectedKelas, tanggal);
  }, [selectedKelas, tanggal, tab]);

  const loadData = async (kelas: string, tgl: string) => {
    setLoading(true);
    const muridKelas = muridList.filter(m => m.kelas === kelas);
    const muridIds = muridKelas.map(m => m.id);
    const map: Record<string, Status> = {};
    muridKelas.forEach(m => { map[m.id] = 'Hadir'; });
    if (muridIds.length) {
      const { data } = await supabase.from('absensi').select('*').eq('tanggal', tgl).in('murid_id', muridIds);
      (data ?? []).forEach((a: Absensi) => { if (a.murid_id) map[a.murid_id] = a.status as Status; });
    }
    setAttendance(map);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedKelas || !muridFiltered.length) return;
    setSaving(true);
    const muridIds = muridFiltered.map(m => m.id);
    await supabase.from('absensi').delete().eq('tanggal', tanggal).in('murid_id', muridIds);
    const records = muridFiltered.map(m => ({ murid_id: m.id, tanggal, status: attendance[m.id] ?? 'Hadir' }));
    const { error } = await supabase.from('absensi').insert(records);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Absensi berhasil disimpan!', 'success');
  };

  const loadRekap = async () => {
    if (!selectedKelas) return;
    setRekapLoading(true);
    const muridKelas = muridList.filter(m => m.kelas === selectedKelas);
    const muridIds = muridKelas.map(m => m.id);
    if (!muridIds.length) { setRekapData({}); setRekapLoading(false); return; }

    let query = supabase.from('absensi').select('*').in('murid_id', muridIds);
    if (rekapType === 'bulanan') {
      const start = `${rekapTahun}-${String(rekapBulan).padStart(2, '0')}-01`;
      const end = `${rekapTahun}-${String(rekapBulan).padStart(2, '0')}-31`;
      query = query.gte('tanggal', start).lte('tanggal', end);
    } else {
      const start = `${rekapTahun}-01-01`;
      const end = `${rekapTahun}-12-31`;
      query = query.gte('tanggal', start).lte('tanggal', end);
    }
    const { data } = await query.order('tanggal', { ascending: true });

    const grouped: Record<string, Record<Status, number>> = {};
    muridKelas.forEach(m => {
      grouped[m.id] = { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
    });
    (data ?? []).forEach((a: Absensi) => {
      if (a.murid_id && grouped[a.murid_id]) {
        grouped[a.murid_id][a.status as Status] = (grouped[a.murid_id][a.status as Status] ?? 0) + 1;
      }
    });
    setRekapData(grouped);
    setRekapLoading(false);
  };

  useEffect(() => {
    if (tab === 'rekap' && selectedKelas) loadRekap();
  }, [tab, selectedKelas, rekapType, rekapBulan, rekapTahun]);

  const stats = {
    hadir: Object.values(attendance).filter(s => s === 'Hadir').length,
    izin:  Object.values(attendance).filter(s => s === 'Izin').length,
    sakit: Object.values(attendance).filter(s => s === 'Sakit').length,
    alpha: Object.values(attendance).filter(s => s === 'Alpha').length,
  };

  const exportRekapPDF = () => {
    const periode = rekapType === 'bulanan'
      ? new Date(rekapTahun, rekapBulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : `Tahun ${rekapTahun}`;
    const headers = ['No', 'Nama', 'Hadir', 'Izin', 'Sakit', 'Alpha', '% Hadir'];
    const body = muridFiltered.map((m, i) => {
      const d = rekapData[m.id] ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      const total = d.Hadir + d.Izin + d.Sakit + d.Alpha;
      const pct = total > 0 ? ((d.Hadir / total) * 100).toFixed(1) : '0';
      return [i + 1, m.nama, d.Hadir, d.Izin, d.Sakit, d.Alpha, `${pct}%`];
    });
    generatePDF(`Rekap Absensi ${selectedKelas}`, headers, body, [`Periode: ${periode}`, `Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`]);
  };

  const shareRekapWA = () => {
    const periode = rekapType === 'bulanan'
      ? new Date(rekapTahun, rekapBulan - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : `Tahun ${rekapTahun}`;
    let text = `Assalamu'alaikum warahmatullahi wabarakatuh.\n\nBerikut kami sampaikan laporan absensi santri Kelas ${selectedKelas} untuk periode ${periode}:\n\n`;
    muridFiltered.forEach((m, i) => {
      const d = rekapData[m.id] ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
      const total = d.Hadir + d.Izin + d.Sakit + d.Alpha;
      const pct = total > 0 ? ((d.Hadir / total) * 100).toFixed(0) : '0';
      text += `${i + 1}. ${m.nama} - H:${d.Hadir} I:${d.Izin} S:${d.Sakit} A:${d.Alpha} (${pct}%)\n`;
    });
    text += `\nTerima kasih.\nWassalamu'alaikum warahmatullahi wabarakatuh.`;
    shareWA(text);
  };

  const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Absensi</h2>
        <p className="section-subtitle">Input dan rekapitulasi kehadiran santri</p>
      </div>

      <div className="tab-switcher mb-5">
        <button onClick={() => setTab('input')} className={`tab-btn ${tab === 'input' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>Input Harian</button>
        <button onClick={() => setTab('rekap')} className={`tab-btn ${tab === 'rekap' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>Rekapitulasi</button>
      </div>

      {tab === 'input' && (
        <>
          {/* Header info */}
          <div className="card p-4 mb-4 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-slate-700">{todayInfo}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Kelas</label>
                <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} className="input-field text-sm">
                  <option value="">Pilih Kelas</option>
                  {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pelajaran</label>
                <select value={selectedMapel} onChange={e => setSelectedMapel(e.target.value)} className="input-field text-sm">
                  <option value="">Pilih Pelajaran</option>
                  {mapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="input-field text-sm" />
              </div>
            </div>
          </div>

          {/* Stats */}
          {muridFiltered.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Hadir', val: stats.hadir, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                { label: 'Izin',  val: stats.izin,  color: 'bg-amber-50 text-amber-700 border-amber-100' },
                { label: 'Sakit', val: stats.sakit, color: 'bg-sky-50 text-sky-700 border-sky-100' },
                { label: 'Alpha', val: stats.alpha, color: 'bg-rose-50 text-rose-700 border-rose-100' },
              ].map(s => (
                <div key={s.label} className={`card p-2.5 text-center border ${s.color}`}>
                  <p className="text-xl font-bold">{s.val}</p>
                  <p className="text-[10px] font-semibold">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="card p-4 animate-pulse h-16 bg-slate-50 rounded-2xl" />)}</div>
          ) : !selectedKelas ? (
            <EmptyState title="Pilih kelas" description="Pilih kelas untuk mulai absensi." icon={<ClipboardCheck className="w-8 h-8 text-slate-300" />} />
          ) : muridFiltered.length === 0 ? (
            <EmptyState title="Tidak ada santri" description="Belum ada santri aktif di kelas ini." icon={<ClipboardCheck className="w-8 h-8 text-slate-300" />} />
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {muridFiltered.map((m, i) => {
                  const status = attendance[m.id] ?? 'Hadir';
                  return (
                    <div key={m.id} className="card p-3">
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-600 font-bold text-xs">{i + 1}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm flex-1 min-w-0 truncate">{m.nama}</p>
                        <span className={`badge text-[9px] flex-shrink-0 ${status === 'Hadir' ? 'badge-success' : status === 'Izin' ? 'badge-warning' : status === 'Sakit' ? 'badge-info' : 'badge-danger'}`}>
                          {status}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STATUS_LIST.map(s => {
                          const Icon = STATUS_CONFIG[s].icon;
                          return (
                            <button
                              key={s}
                              onClick={() => setAttendance(prev => ({ ...prev, [m.id]: s }))}
                              className={`py-2 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${status === s ? STATUS_CONFIG[s].active : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                            >
                              <Icon className="w-3 h-3" />
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <button onClick={() => loadData(selectedKelas, tanggal)} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm">
                  <Pencil className="w-4 h-4" /> Edit
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                  <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'rekap' && (
        <>
          {/* Filter Rekap */}
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
                <select value={selectedKelas} onChange={e => setSelectedKelas(e.target.value)} className="input-field text-sm">
                  <option value="">Pilih</option>
                  {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Rekap</label>
                <select value={rekapType} onChange={e => setRekapType(e.target.value as 'bulanan' | 'tahunan')} className="input-field text-sm">
                  <option value="bulanan">Rekap Bulanan</option>
                  <option value="tahunan">Rekap Tahunan</option>
                </select>
              </div>
              {rekapType === 'bulanan' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bulan</label>
                  <select value={rekapBulan} onChange={e => setRekapBulan(Number(e.target.value))} className="input-field text-sm">
                    {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tahun</label>
                <select value={rekapTahun} onChange={e => setRekapTahun(Number(e.target.value))} className="input-field text-sm">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Export & Share */}
          {selectedKelas && muridFiltered.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button onClick={exportRekapPDF} className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
                <FileText className="w-4 h-4" /> Export PDF
              </button>
              <button onClick={shareRekapWA} className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">
                <Share2 className="w-4 h-4" /> Share WhatsApp
              </button>
            </div>
          )}

          {rekapLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-16 bg-slate-50 rounded-2xl" />)}</div>
          ) : !selectedKelas ? (
            <EmptyState title="Pilih kelas" description="Pilih kelas dan periode untuk melihat rekap." icon={<BarChart3 className="w-8 h-8 text-slate-300" />} />
          ) : muridFiltered.length === 0 ? (
            <EmptyState title="Tidak ada santri" description="Belum ada santri di kelas ini." icon={<BarChart3 className="w-8 h-8 text-slate-300" />} />
          ) : (
            <div className="space-y-3">
              {/* Overall percentage */}
              <div className="card p-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-700">Persentase Kehadiran Kelas</span>
                  <span className="text-2xl font-bold text-emerald-700">
                    {(() => {
                      let totalHadir = 0, totalAll = 0;
                      muridFiltered.forEach(m => {
                        const d = rekapData[m.id] ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
                        const t = d.Hadir + d.Izin + d.Sakit + d.Alpha;
                        totalHadir += d.Hadir; totalAll += t;
                      });
                      return totalAll > 0 ? ((totalHadir / totalAll) * 100).toFixed(1) : '0';
                    })()}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(() => {
                      let totalHadir = 0, totalAll = 0;
                      muridFiltered.forEach(m => {
                        const d = rekapData[m.id] ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
                        const t = d.Hadir + d.Izin + d.Sakit + d.Alpha;
                        totalHadir += d.Hadir; totalAll += t;
                      });
                      return totalAll > 0 ? (totalHadir / totalAll) * 100 : 0;
                    })()}%` }}
                  />
                </div>
              </div>

              {/* Per-student rekap */}
              <div className="space-y-2">
                {muridFiltered.map((m, i) => {
                  const d = rekapData[m.id] ?? { Hadir: 0, Izin: 0, Sakit: 0, Alpha: 0 };
                  const total = d.Hadir + d.Izin + d.Sakit + d.Alpha;
                  const pct = total > 0 ? (d.Hadir / total) * 100 : 0;
                  return (
                    <div key={m.id} className="card p-3.5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-slate-600 font-bold text-xs">{i + 1}</span>
                        </div>
                        <p className="font-semibold text-slate-800 text-sm flex-1 min-w-0 truncate">{m.nama}</p>
                        <span className={`badge text-[10px] ${pct >= 80 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-danger'}`}>
                          {pct.toFixed(0)}% Hadir
                        </span>
                      </div>
                      {/* Bar chart */}
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                        {total > 0 && STATUS_LIST.map(s => {
                          const val = d[s];
                          if (val === 0) return null;
                          return (
                            <div
                              key={s}
                              className={STATUS_COLOR[s]}
                              style={{ width: `${(val / total) * 100}%` }}
                              title={`${s}: ${val}`}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {STATUS_LIST.map(s => (
                          <span key={s} className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className={`w-2 h-2 rounded-full ${STATUS_COLOR[s]}`} />
                            {s}: <strong className="text-slate-700">{d[s]}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
