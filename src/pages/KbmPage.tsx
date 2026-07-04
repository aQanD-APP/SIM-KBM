import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Pencil, BookOpen, BookMarked, StickyNote,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { Kelas, BukuSaku, Muhafadhoh, KbmHarian, MataPelajaran, ShowToast, Profile } from '../types';
import { getUstazScope } from '../lib/ustazData';

type Tab = 'batas' | 'hafalan' | 'catatan';

type BukuWithKelas = BukuSaku & { kelas?: { nama_kelas: string } };
type HafalWithKelas = Muhafadhoh & { kelas?: { nama_kelas: string } };

export default function KbmPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [tab, setTab] = useState<Tab>('batas');
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [bukuList, setBukuList] = useState<BukuWithKelas[]>([]);
  const [hafalList, setHafalList] = useState<HafalWithKelas[]>([]);
  const [catatanList, setCatatanList] = useState<KbmHarian[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const [bukuForm, setBukuForm] = useState({ kelas_id: '', pelajaran: '', bab_terakhir: '', halaman_terakhir: '', catatan: '' });
  const [hafalForm, setHafalForm] = useState({ tanggal: today, kelas_id: '', materi: '', target_hafalan: '', catatan: '' });
  const [catatanForm, setCatatanForm] = useState({ tanggal: today, catatan: '' });

  const fetchAll = async () => {
    setLoading(true);
    const scope = await getUstazScope(profile);
    const isAdmin = scope.isAdmin;
    const userId = profile?.id ?? '';

    // kelasList & mapelList from scope (string arrays) -> fetch full rows for admins, or filter for ustaz
    const [kr, mr, bukuR, hafalR, catatanR] = await Promise.all([
      supabase.from('kelas').select('*').eq('aktif', true).order('tingkat'),
      supabase.from('mata_pelajaran').select('*').eq('is_active', true).order('nama_mapel'),
      (async () => {
        let q = supabase.from('buku_saku').select('*, kelas(nama_kelas)').order('created_at', { ascending: false });
        if (!isAdmin) q = q.eq('user_id', userId);
        return q;
      })(),
      (async () => {
        let q = supabase.from('muhafadhoh').select('*, kelas(nama_kelas)').order('tanggal', { ascending: false }).limit(50);
        if (!isAdmin) q = q.eq('user_id', userId);
        return q;
      })(),
      (async () => {
        let q = supabase.from('kbm_harian').select('*').is('pelajaran', null).order('tanggal', { ascending: false }).limit(50);
        if (!isAdmin) q = q.eq('user_id', userId);
        return q;
      })(),
    ]);
    if (kr.data) {
      const allKelas = kr.data as Kelas[];
      setKelasList(isAdmin ? allKelas : allKelas.filter(k => scope.kelasList.includes(k.nama_kelas)));
    }
    if (mr.data) {
      const allMapel = mr.data as MataPelajaran[];
      setMapelList(isAdmin ? allMapel : allMapel.filter(m => scope.mapelList.includes(m.nama_mapel)));
    }
    if (bukuR.data) setBukuList(bukuR.data as BukuWithKelas[]);
    if (hafalR.data) setHafalList(hafalR.data as HafalWithKelas[]);
    if (catatanR.data) setCatatanList(catatanR.data as KbmHarian[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ===== BATAS MENGAJAR =====
  const openAddBuku = () => {
    setEditingId(null);
    setBukuForm({ kelas_id: '', pelajaran: '', bab_terakhir: '', halaman_terakhir: '', catatan: '' });
    setShowModal(true);
  };

  const openEditBuku = (b: BukuWithKelas) => {
    setEditingId(b.id);
    setBukuForm({
      kelas_id: String(b.kelas_id), pelajaran: b.pelajaran,
      bab_terakhir: b.bab_terakhir ?? '', halaman_terakhir: b.halaman_terakhir ?? '', catatan: b.catatan ?? '',
    });
    setShowModal(true);
  };

  const handleSaveBuku = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bukuForm.kelas_id || !bukuForm.pelajaran) { showToast('Kelas dan pelajaran wajib diisi', 'error'); return; }
    setSaving(true);
    const payload = {
      kelas_id: Number(bukuForm.kelas_id), pelajaran: bukuForm.pelajaran,
      bab_terakhir: bukuForm.bab_terakhir || null, halaman_terakhir: bukuForm.halaman_terakhir || null,
      catatan: bukuForm.catatan || null,
    };
    const { error } = editingId
      ? await supabase.from('buku_saku').update(payload).eq('id', editingId)
      : await supabase.from('buku_saku').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Batas mengajar diperbarui!' : 'Batas mengajar disimpan!', 'success');
    setShowModal(false); setEditingId(null); fetchAll();
  };

  const deleteBuku = async (id: number) => {
    await supabase.from('buku_saku').delete().eq('id', id);
    setBukuList(prev => prev.filter(b => b.id !== id));
    showToast('Dihapus', 'info');
  };

  // ===== MUHAFADHOH =====
  const openAddHafal = () => {
    setEditingId(null);
    setHafalForm({ tanggal: today, kelas_id: '', materi: '', target_hafalan: '', catatan: '' });
    setShowModal(true);
  };

  const openEditHafal = (h: HafalWithKelas) => {
    setEditingId(h.id);
    setHafalForm({
      tanggal: h.tanggal, kelas_id: String(h.kelas_id),
      materi: h.materi ?? '', target_hafalan: h.target_hafalan ?? '', catatan: h.catatan ?? '',
    });
    setShowModal(true);
  };

  const handleSaveHafal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hafalForm.kelas_id) { showToast('Pilih kelas', 'error'); return; }
    setSaving(true);
    const payload = {
      tanggal: hafalForm.tanggal, kelas_id: Number(hafalForm.kelas_id),
      materi: hafalForm.materi || null, target_hafalan: hafalForm.target_hafalan || null,
      catatan: hafalForm.catatan || null,
    };
    const { error } = editingId
      ? await supabase.from('muhafadhoh').update(payload).eq('id', editingId)
      : await supabase.from('muhafadhoh').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Muhafadhoh diperbarui!' : 'Muhafadhoh dicatat!', 'success');
    setShowModal(false); setEditingId(null); fetchAll();
  };

  const deleteHafal = async (id: number) => {
    await supabase.from('muhafadhoh').delete().eq('id', id);
    setHafalList(prev => prev.filter(h => h.id !== id));
    showToast('Dihapus', 'info');
  };

  // ===== CATATAN LAIN =====
  const openAddCatatan = () => {
    setEditingId(null);
    setCatatanForm({ tanggal: today, catatan: '' });
    setShowModal(true);
  };

  const openEditCatatan = (c: KbmHarian) => {
    setEditingId(c.id);
    setCatatanForm({ tanggal: c.tanggal, catatan: c.catatan ?? '' });
    setShowModal(true);
  };

  const handleSaveCatatan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanForm.catatan) { showToast('Catatan tidak boleh kosong', 'error'); return; }
    setSaving(true);
    const payload = {
      tanggal: catatanForm.tanggal, kelas_id: kelasList[0]?.id ?? null,
      pelajaran: null, materi: null, catatan: catatanForm.catatan, durasi: null, selesai: false,
    };
    const { error } = editingId
      ? await supabase.from('kbm_harian').update({ catatan: catatanForm.catatan, tanggal: catatanForm.tanggal }).eq('id', editingId)
      : await supabase.from('kbm_harian').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Catatan diperbarui!' : 'Catatan disimpan!', 'success');
    setShowModal(false); setEditingId(null); fetchAll();
  };

  const deleteCatatan = async (id: number) => {
    await supabase.from('kbm_harian').delete().eq('id', id);
    setCatatanList(prev => prev.filter(c => c.id !== id));
    showToast('Dihapus', 'info');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const tabs = [
    { id: 'batas' as Tab, label: 'Batas Mengajar', count: bukuList.length, icon: BookOpen },
    { id: 'hafalan' as Tab, label: 'Muhafadhoh', count: hafalList.length, icon: BookMarked },
    { id: 'catatan' as Tab, label: 'Catatan Lain', count: catatanList.length, icon: StickyNote },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Buku Saku Pengajar</h2>
          <p className="section-subtitle">Batas mengajar, muhafadhoh, dan catatan</p>
        </div>
        <button onClick={() => tab === 'batas' ? openAddBuku() : tab === 'hafalan' ? openAddHafal() : openAddCatatan()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${tab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-20 bg-slate-50 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* BATAS MENGAJAR */}
          {tab === 'batas' && (
            bukuList.length === 0 ? <EmptyState title="Belum ada batas mengajar" description="Catat batas materi per kelas di sini." icon={<BookOpen className="w-8 h-8 text-slate-300" />} /> :
            <div className="space-y-3">
              {bukuList.map(b => (
                <div key={b.id} className="card p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-bold text-slate-800 text-sm">{b.pelajaran}</span>
                        {b.kelas && <span className="badge badge-success text-[10px]">{b.kelas.nama_kelas}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {b.bab_terakhir && (
                          <div className="bg-slate-50 rounded-xl px-3 py-2">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5">Bab Terakhir</p>
                            <p className="text-xs font-semibold text-slate-700">{b.bab_terakhir}</p>
                          </div>
                        )}
                        {b.halaman_terakhir && (
                          <div className="bg-slate-50 rounded-xl px-3 py-2">
                            <p className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5">Halaman</p>
                            <p className="text-xs font-semibold text-slate-700">{b.halaman_terakhir}</p>
                          </div>
                        )}
                      </div>
                      {b.catatan && <p className="text-xs text-slate-500 italic mt-2">{b.catatan}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditBuku(b)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteBuku(b.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MUHAFADHOH */}
          {tab === 'hafalan' && (
            hafalList.length === 0 ? <EmptyState title="Belum ada catatan hafalan" description="Catat target dan perkembangan hafalan santri." icon={<BookMarked className="w-8 h-8 text-slate-300" />} /> :
            <div className="space-y-3">
              {hafalList.map(h => (
                <div key={h.id} className="card p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {h.materi && <span className="font-bold text-slate-800 text-sm">{h.materi}</span>}
                        {h.kelas && <span className="badge badge-success text-[10px]">{h.kelas.nama_kelas}</span>}
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5">{formatDate(h.tanggal)}</p>
                      {h.target_hafalan && <p className="text-xs text-slate-600 bg-amber-50 rounded-xl px-3 py-2 mb-1">Target: {h.target_hafalan}</p>}
                      {h.catatan && <p className="text-xs text-slate-500 italic">{h.catatan}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditHafal(h)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteHafal(h.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CATATAN LAIN */}
          {tab === 'catatan' && (
            catatanList.length === 0 ? <EmptyState title="Belum ada catatan" description="Tulis catatan bebas atau pengingat di sini." icon={<StickyNote className="w-8 h-8 text-slate-300" />} /> :
            <div className="space-y-3">
              {catatanList.map(c => (
                <div key={c.id} className="card p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-slate-400 font-semibold">{formatDate(c.tanggal)}</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{c.catatan}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditCatatan(c)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCatatan(c.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={tab === 'batas' ? (editingId ? 'Edit Batas Mengajar' : 'Tambah Batas Mengajar') : tab === 'hafalan' ? (editingId ? 'Edit Muhafadhoh' : 'Catat Muhafadhoh') : (editingId ? 'Edit Catatan' : 'Tambah Catatan')}
        size="sm"
      >
        {tab === 'batas' && (
          <form onSubmit={handleSaveBuku} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
                <select value={bukuForm.kelas_id} onChange={e => setBukuForm(p => ({ ...p, kelas_id: e.target.value }))} className="input-field text-sm" required>
                  <option value="">Pilih</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Pelajaran</label>
                <select value={bukuForm.pelajaran} onChange={e => setBukuForm(p => ({ ...p, pelajaran: e.target.value }))} className="input-field text-sm" required>
                  <option value="">Pilih Pelajaran</option>
                  {mapelList.map(m => <option key={m.id} value={m.nama_mapel}>{m.nama_mapel}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bab Terakhir</label>
                <input type="text" value={bukuForm.bab_terakhir} onChange={e => setBukuForm(p => ({ ...p, bab_terakhir: e.target.value }))} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Halaman</label>
                <input type="text" value={bukuForm.halaman_terakhir} onChange={e => setBukuForm(p => ({ ...p, halaman_terakhir: e.target.value }))} className="input-field text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan (opsional)</label>
              <textarea value={bukuForm.catatan} onChange={e => setBukuForm(p => ({ ...p, catatan: e.target.value }))} className="input-field text-sm resize-none" rows={2} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}</button>
            </div>
          </form>
        )}

        {tab === 'hafalan' && (
          <form onSubmit={handleSaveHafal} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Janji</label>
                <input type="date" value={hafalForm.tanggal} onChange={e => setHafalForm(p => ({ ...p, tanggal: e.target.value }))} className="input-field text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
                <select value={hafalForm.kelas_id} onChange={e => setHafalForm(p => ({ ...p, kelas_id: e.target.value }))} className="input-field text-sm" required>
                  <option value="">Pilih</option>
                  {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Materi / Nadhom Hafalan</label>
              <input type="text" value={hafalForm.materi} onChange={e => setHafalForm(p => ({ ...p, materi: e.target.value }))} className="input-field text-sm" placeholder="cth. Surah Al-Mulk..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Target Hafalan</label>
              <input type="text" value={hafalForm.target_hafalan} onChange={e => setHafalForm(p => ({ ...p, target_hafalan: e.target.value }))} className="input-field text-sm" placeholder="cth. Ayat 1-10..." />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan Santri Belum Hafal</label>
              <textarea value={hafalForm.catatan} onChange={e => setHafalForm(p => ({ ...p, catatan: e.target.value }))} className="input-field text-sm resize-none" rows={2} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}</button>
            </div>
          </form>
        )}

        {tab === 'catatan' && (
          <form onSubmit={handleSaveCatatan} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
              <input type="date" value={catatanForm.tanggal} onChange={e => setCatatanForm(p => ({ ...p, tanggal: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan</label>
              <textarea value={catatanForm.catatan} onChange={e => setCatatanForm(p => ({ ...p, catatan: e.target.value }))} className="input-field text-sm resize-none" rows={5} placeholder="Tulis catatan bebas..." required />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
