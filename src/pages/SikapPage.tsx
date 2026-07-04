import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, Users, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import EmptyState from '../components/EmptyState';
import type { Murid, Sikap, ShowToast, Profile } from '../types';
import { getUstazScope } from '../lib/ustazData';

const SIKAP_FIELDS = [
  { key: 'disiplin', label: 'Disiplin', color: 'emerald' },
  { key: 'adab', label: 'Adab', color: 'amber' },
  { key: 'kerajinan', label: 'Kerajinan', color: 'sky' },
  { key: 'kejujuran', label: 'Kejujuran', color: 'rose' },
  { key: 'tanggung_jawab', label: 'Tanggung Jawab', color: 'slate' },
] as const;

export default function SikapPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [sikapList, setSikapList] = useState<Sikap[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [filterKelas, setFilterKelas] = useState('');
  const [selectedMurid, setSelectedMurid] = useState<string>('');
  const [sikapForm, setSikapForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    disiplin: 80,
    adab: 80,
    kerajinan: 80,
    kejujuran: 80,
    tanggung_jawab: 80,
    catatan: '',
  });

  const kelasOptions = useMemo(
    () => [...new Set(muridList.map(m => m.kelas).filter(Boolean))].sort(),
    [muridList]
  );

  const muridFiltered = useMemo(
    () => muridList.filter(m => !filterKelas || m.kelas === filterKelas),
    [muridList, filterKelas]
  );

  const fetchData = async () => {
    setLoading(true);
    const scope = await getUstazScope(profile);
    let muridQuery = supabase.from('murid').select('*').eq('status_aktif', true).order('nama');
    if (!scope.isAdmin && scope.kelasList.length > 0) {
      muridQuery = muridQuery.in('kelas', scope.kelasList);
    }
    const { data: muridData } = await muridQuery;
    if (muridData) setMuridList(muridData as Murid[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedMurid) loadSikap(selectedMurid);
    else setSikapList([]);
  }, [selectedMurid]);

  const loadSikap = async (muridId: string) => {
    const isAdmin = profile?.role === 'admin';
    let q = supabase.from('sikap')
      .select('*')
      .eq('murid_id', muridId);
    if (!isAdmin) q = q.eq('user_id', profile?.id ?? '');
    const { data } = await q.order('tanggal', { ascending: false });
    if (data) setSikapList(data as Sikap[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMurid) { showToast('Pilih santri terlebih dahulu', 'error'); return; }
    setSaving(true);
    const payload = {
      murid_id: selectedMurid,
      tanggal: sikapForm.tanggal,
      disiplin: sikapForm.disiplin,
      adab: sikapForm.adab,
      kerajinan: sikapForm.kerajinan,
      kejujuran: sikapForm.kejujuran,
      tanggung_jawab: sikapForm.tanggung_jawab,
      catatan: sikapForm.catatan || null,
    };
    const { error } = editingId
      ? await supabase.from('sikap').update(payload).eq('id', editingId)
      : await supabase.from('sikap').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Penilaian sikap diperbarui!' : 'Penilaian sikap disimpan!', 'success');
    resetForm();
    loadSikap(selectedMurid);
  };

  const openEdit = (s: Sikap) => {
    setEditingId(s.id);
    setSikapForm({
      tanggal: s.tanggal,
      disiplin: s.disiplin || 80,
      adab: s.adab || 80,
      kerajinan: s.kerajinan || 80,
      kejujuran: s.kejujuran || 80,
      tanggung_jawab: s.tanggung_jawab || 80,
      catatan: s.catatan || '',
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setSikapForm({
      tanggal: new Date().toISOString().split('T')[0],
      disiplin: 80, adab: 80, kerajinan: 80, kejujuran: 80, tanggung_jawab: 80,
      catatan: '',
    });
  };

  const handleDelete = async (id: string) => {
    await supabase.from('sikap').delete().eq('id', id);
    setSikapList(prev => prev.filter(s => s.id !== id));
    showToast('Dihapus', 'info');
  };

  const selectedMuridData = muridList.find(m => m.id === selectedMurid);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50';
    if (score >= 80) return 'text-sky-600 bg-sky-50';
    if (score >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  const averageScore = (s: Sikap) => {
    const scores = [s.disiplin, s.adab, s.kerajinan, s.kejujuran, s.tanggung_jawab].filter(v => v != null) as number[];
    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Penilaian Sikap</h2>
        <p className="section-subtitle">Nilai karakter santri: disiplin, adab, kerajinan, kejujuran, tanggung jawab</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Filter & Select */}
        <div className="space-y-4">
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pilih Kelas</label>
            <select
              className="input-field text-sm"
              value={filterKelas}
              onChange={e => { setFilterKelas(e.target.value); setSelectedMurid(''); }}
            >
              <option value="">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Pilih Santri</label>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-9 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : muridFiltered.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Tidak ada santri</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {muridFiltered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMurid(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all border ${selectedMurid === m.id ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'}`}
                  >
                    {m.nama}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Form & History */}
        <div className="lg:col-span-2 space-y-4">
          {selectedMurid ? (
            <>
              {/* Form */}
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-4 text-sm">
                  Penilaian Sikap: <span className="text-emerald-600">{selectedMuridData?.nama}</span>
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
                    <input
                      type="date"
                      value={sikapForm.tanggal}
                      onChange={e => setSikapForm(p => ({ ...p, tanggal: e.target.value }))}
                      className="input-field text-sm"
                      required
                    />
                  </div>

                  {/* Sikap Scores */}
                  <div className="space-y-3">
                    {SIKAP_FIELDS.map(field => (
                      <div key={field.key} className="flex items-center gap-3">
                        <label className="text-xs font-semibold text-slate-600 w-32">{field.label}</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sikapForm[field.key]}
                          onChange={e => setSikapForm(p => ({ ...p, [field.key]: Number(e.target.value) }))}
                          className="flex-1 accent-emerald-600"
                        />
                        <span className={`w-12 text-center text-xs font-bold rounded-lg py-1 ${getScoreColor(sikapForm[field.key])}`}>
                          {sikapForm[field.key]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Average */}
                  <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-600">Rata-rata</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {((sikapForm.disiplin + sikapForm.adab + sikapForm.kerajinan + sikapForm.kejujuran + sikapForm.tanggung_jawab) / 5).toFixed(1)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan</label>
                    <textarea
                      rows={2}
                      className="input-field text-sm resize-none"
                      placeholder="Catatan tambahan..."
                      value={sikapForm.catatan}
                      onChange={e => setSikapForm(p => ({ ...p, catatan: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    {editingId && (
                      <button type="button" onClick={resetForm} className="btn-secondary text-sm">
                        Batal Edit
                      </button>
                    )}
                    <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" />
                      {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
                    </button>
                  </div>
                </form>
              </div>

              {/* History */}
              <div className="card p-5">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Histori Penilaian Sikap
                </h3>
                {sikapList.length === 0 ? (
                  <EmptyState title="Belum ada penilaian" description="Belum ada penilaian sikap tercatat." />
                ) : (
                  <div className="space-y-3">
                    {sikapList.map(s => {
                      const avg = averageScore(s);
                      return (
                        <div key={s.id} className="bg-slate-50 rounded-xl p-4 group">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-500 font-medium">
                              {new Date(s.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${avg >= 80 ? 'text-emerald-600' : avg >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                {avg.toFixed(1)}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-white text-slate-400 hover:text-emerald-600">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-white text-slate-400 hover:text-rose-500">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Score bars */}
                          <div className="space-y-2">
                            {SIKAP_FIELDS.map(field => {
                              const value = s[field.key] ?? 0;
                              return (
                                <div key={field.key} className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 w-24">{field.label}</span>
                                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                      style={{ width: `${value}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-semibold text-slate-600 w-6 text-right">{value}</span>
                                </div>
                              );
                            })}
                          </div>

                          {s.catatan && (
                            <p className="text-xs text-slate-500 italic mt-2 pt-2 border-t border-slate-200">{s.catatan}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card border-dashed border-slate-200 p-12 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400 font-medium">
                Pilih kelas dan santri di sebelah kiri untuk mengelola penilaian sikap
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
