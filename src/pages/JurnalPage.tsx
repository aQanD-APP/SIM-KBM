import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, BookOpen, Calendar, Target, Save
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUstazScope } from '../lib/ustazData';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { JurnalKBM, Profile, ShowToast } from '../types';

type FilterTab = 'semua' | 'hari_ini' | 'minggu_ini';

export default function JurnalPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [jurnalList, setJurnalList] = useState<JurnalKBM[]>([]);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('semua');
  const [selectedKelas, setSelectedKelas] = useState<string>('');

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    kelas: '',
    pelajaran: '',
    tanggal: today,
    materi: '',
    target: '',
    realisasi: '',
    metode: '',
    catatan: '',
  });

  useEffect(() => {
    (async () => {
      const scope = await getUstazScope(profile);
      setKelasList(scope.kelasList);
      setMapelList(scope.mapelList);
      fetchJurnal(scope);
    })();
  }, [profile]);

  const fetchJurnal = async (scope?: { isAdmin: boolean; kelasList: string[] }) => {
    setLoading(true);
    let query = supabase.from('jurnal_kbm').select('*').eq('is_active', true).order('tanggal', { ascending: false }).limit(100);
    if (profile?.role !== 'admin') {
      query = query.eq('user_id', profile?.id ?? '');
    }
    const { data, error } = await query;
    if (error) {
      showToast(error.message, 'error');
    } else {
      setJurnalList((data || []) as JurnalKBM[]);
    }
    setLoading(false);
  };

  const filteredJurnal = useMemo(() => {
    let filtered = jurnalList;
    if (filterTab === 'hari_ini') {
      filtered = filtered.filter(j => j.tanggal === today);
    } else if (filterTab === 'minggu_ini') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(j => new Date(j.tanggal) >= weekAgo);
    }
    if (selectedKelas) {
      filtered = filtered.filter(j => j.kelas === selectedKelas);
    }
    return filtered;
  }, [jurnalList, filterTab, selectedKelas, today]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      kelas: kelasList[0] || '',
      pelajaran: mapelList[0] || '',
      tanggal: today,
      materi: '',
      target: '',
      realisasi: '',
      metode: '',
      catatan: '',
    });
    setShowModal(true);
  };

  const openEdit = (j: JurnalKBM) => {
    setEditingId(j.id);
    setForm({
      kelas: j.kelas || '',
      pelajaran: j.pelajaran || '',
      tanggal: j.tanggal,
      materi: j.materi || '',
      target: j.target || '',
      realisasi: j.realisasi || '',
      metode: j.metode || '',
      catatan: j.catatan || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kelas || !form.pelajaran) {
      showToast('Kelas dan pelajaran wajib diisi', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      kelas: form.kelas,
      pelajaran: form.pelajaran,
      tanggal: form.tanggal,
      materi: form.materi || null,
      target: form.target || null,
      realisasi: form.realisasi || null,
      metode: form.metode || null,
      catatan: form.catatan || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('jurnal_kbm').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('jurnal_kbm').insert(payload));
    }

    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast(editingId ? 'Jurnal diperbarui!' : 'Jurnal disimpan!', 'success');
    setShowModal(false);
    setEditingId(null);
    fetchJurnal();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('jurnal_kbm').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setJurnalList(prev => prev.filter(j => j.id !== id));
    showToast('Jurnal dihapus', 'info');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const tabs = [
    { id: 'semua' as FilterTab, label: 'Semua' },
    { id: 'hari_ini' as FilterTab, label: 'Hari Ini' },
    { id: 'minggu_ini' as FilterTab, label: 'Minggu Ini' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Jurnal KBM</h2>
          <p className="section-subtitle">Catatan kegiatan belajar mengajar</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilterTab(t.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${filterTab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <select
          value={selectedKelas}
          onChange={e => setSelectedKelas(e.target.value)}
          className="ml-auto input-field text-xs py-1.5"
        >
          <option value="">Semua Kelas</option>
          {kelasList.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse h-32 bg-slate-50 rounded-2xl" />
          ))}
        </div>
      ) : filteredJurnal.length === 0 ? (
        <EmptyState
          title="Belum ada jurnal"
          description="Tambahkan jurnal KBM untuk mencatat kegiatan mengajar."
          icon={<BookOpen className="w-8 h-8 text-slate-300" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredJurnal.map(j => (
            <div key={j.id} className="card p-4 group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-slate-800 text-sm">{j.pelajaran}</span>
                    <span className="badge badge-success text-[10px]">{j.kelas}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {formatDate(j.tanggal)}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(j)}
                    className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(j.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {j.materi && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mb-1">Materi</p>
                    <p className="text-xs text-slate-700">{j.materi}</p>
                  </div>
                )}
                {j.target && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="w-3 h-3 text-emerald-600" />
                      <p className="text-[10px] text-emerald-600 font-semibold uppercase">Target</p>
                    </div>
                    <p className="text-xs text-slate-700">{j.target}</p>
                  </div>
                )}
                {j.realisasi && (
                  <div className="bg-sky-50 rounded-xl p-3">
                    <p className="text-[10px] text-sky-600 font-semibold uppercase mb-1">Realisasi</p>
                    <p className="text-xs text-slate-700">{j.realisasi}</p>
                  </div>
                )}
              </div>

              {j.catatan && (
                <p className="text-xs text-slate-500 italic mt-3 bg-amber-50 rounded-xl p-3">{j.catatan}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Jurnal KBM' : 'Tambah Jurnal KBM'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas *</label>
              <select
                value={form.kelas}
                onChange={e => setForm(p => ({ ...p, kelas: e.target.value }))}
                className="input-field text-sm"
                required
              >
                <option value="">Pilih Kelas</option>
                {kelasList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pelajaran *</label>
              <select
                value={form.pelajaran}
                onChange={e => setForm(p => ({ ...p, pelajaran: e.target.value }))}
                className="input-field text-sm"
                required
              >
                <option value="">Pilih Pelajaran</option>
                {mapelList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
              className="input-field text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Materi</label>
            <textarea
              value={form.materi}
              onChange={e => setForm(p => ({ ...p, materi: e.target.value }))}
              className="input-field text-sm resize-none"
              rows={2}
              placeholder="Materi yang diajarkan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target</label>
              <textarea
                value={form.target}
                onChange={e => setForm(p => ({ ...p, target: e.target.value }))}
                className="input-field text-sm resize-none"
                rows={2}
                placeholder="Target pembelajaran..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Realisasi</label>
              <textarea
                value={form.realisasi}
                onChange={e => setForm(p => ({ ...p, realisasi: e.target.value }))}
                className="input-field text-sm resize-none"
                rows={2}
                placeholder="Hasil yang tercapai..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Metode</label>
            <input
              type="text"
              value={form.metode}
              onChange={e => setForm(p => ({ ...p, metode: e.target.value }))}
              className="input-field text-sm"
              placeholder="Ceramah, diskusi, praktik, dll"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan</label>
            <textarea
              value={form.catatan}
              onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
              className="input-field text-sm resize-none"
              rows={2}
              placeholder="Catatan tambahan..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
