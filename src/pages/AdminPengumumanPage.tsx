import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Megaphone, Search, X, Archive, Send, File as FileEdit, AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import type { Pengumuman, ShowToast } from '../types';

const JENIS_LIST = ['Pengumuman', 'Agenda', 'Peringatan', 'Penting'] as const;
const PRIORITAS_LIST = ['Normal', 'Penting', 'Darurat'] as const;
const STATUS_LIST = ['Draft', 'Publish', 'Arsip'] as const;

const JENIS_STYLE: Record<string, string> = {
  Pengumuman: 'bg-sky-50 text-sky-700 border-sky-100',
  Agenda: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Peringatan: 'bg-amber-50 text-amber-700 border-amber-100',
  Penting: 'bg-rose-50 text-rose-700 border-rose-100',
};

const PRIORITAS_STYLE: Record<string, string> = {
  Normal: 'bg-slate-100 text-slate-600',
  Penting: 'bg-amber-100 text-amber-700',
  Darurat: 'bg-rose-600 text-white',
};

const STATUS_STYLE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Publish: 'bg-emerald-100 text-emerald-700',
  Arsip: 'bg-slate-200 text-slate-500',
};

const PAGE_SIZE = 6;

export default function AdminPengumuman({ showToast }: { showToast: ShowToast }) {
  const [list, setList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterJenis, setFilterJenis] = useState<string>('');
  const [page, setPage] = useState(1);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    judul: '',
    isi: '',
    jenis: 'Pengumuman' as typeof JENIS_LIST[number],
    prioritas: 'Normal' as typeof PRIORITAS_LIST[number],
    tanggal_mulai: today,
    tanggal_selesai: '',
    status: 'Draft' as typeof STATUS_LIST[number],
    lampiran: '',
  });

  const fetchList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pengumuman')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      showToast(error.message, 'error');
    } else {
      setList((data || []) as Pengumuman[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  const filtered = useMemo(() => {
    return list.filter(p => {
      const matchSearch = search
        ? (p.judul?.toLowerCase().includes(search.toLowerCase()) ||
           p.isi?.toLowerCase().includes(search.toLowerCase()))
        : true;
      const matchStatus = filterStatus ? p.status === filterStatus : true;
      const matchJenis = filterJenis ? p.jenis === filterJenis : true;
      return matchSearch && matchStatus && matchJenis;
    });
  }, [list, search, filterStatus, filterJenis]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      judul: '', isi: '', jenis: 'Pengumuman', prioritas: 'Normal',
      tanggal_mulai: today, tanggal_selesai: '', status: 'Draft', lampiran: '',
    });
    setShowModal(true);
  };

  const openEdit = (p: Pengumuman) => {
    setEditingId(String(p.id));
    setForm({
      judul: p.judul || '',
      isi: p.isi || '',
      jenis: (p.jenis as typeof JENIS_LIST[number]) || 'Pengumuman',
      prioritas: (p.prioritas as typeof PRIORITAS_LIST[number]) || 'Normal',
      tanggal_mulai: p.tanggal_mulai || p.tanggal || today,
      tanggal_selesai: p.tanggal_selesai || '',
      status: (p.status as typeof STATUS_LIST[number]) || 'Draft',
      lampiran: p.lampiran || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul || !form.isi) {
      showToast('Judul dan isi wajib diisi', 'error');
      return;
    }
    if (!form.tanggal_mulai) {
      showToast('Tanggal mulai wajib diisi', 'error');
      return;
    }
    setSaving(true);
    const payload = {
      judul: form.judul,
      isi: form.isi,
      jenis: form.jenis,
      prioritas: form.prioritas,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai || null,
      status: form.status,
      lampiran: form.lampiran || null,
      kategori: form.jenis,
      tanggal: form.tanggal_mulai,
    };
    const { error } = editingId
      ? await supabase.from('pengumuman').update(payload).eq('id', editingId)
      : await supabase.from('pengumuman').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Pengumuman diperbarui!' : 'Pengumuman dibuat!', 'success');
    setShowModal(false);
    setEditingId(null);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('pengumuman').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    setList(prev => prev.filter(p => String(p.id) !== id));
    showToast('Pengumuman dihapus', 'info');
  };

  const quickStatus = async (p: Pengumuman, newStatus: string) => {
    const { error } = await supabase.from('pengumuman').update({ status: newStatus }).eq('id', p.id);
    if (error) { showToast(error.message, 'error'); return; }
    setList(prev => prev.map(item => item.id === p.id ? { ...item, status: newStatus } : item));
    showToast(`Status diubah ke ${newStatus}`, 'success');
  };

  const isLive = (p: Pengumuman) => {
    if (p.status !== 'Publish') return false;
    const now = new Date().toISOString().split('T')[0];
    const start = p.tanggal_mulai || p.tanggal;
    if (start && now < start) return false;
    if (p.tanggal_selesai && now > p.tanggal_selesai) return false;
    return true;
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Pengumuman & Agenda</h2>
          <p className="section-subtitle">Broadcast pengumuman ke seluruh ustaz</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Buat Pengumuman</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari pengumuman..."
            className="input-field text-sm pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={filterJenis}
          onChange={e => { setFilterJenis(e.target.value); setPage(1); }}
          className="input-field text-sm py-2 sm:w-36"
        >
          <option value="">Semua Jenis</option>
          {JENIS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="input-field text-sm py-2 sm:w-36"
        >
          <option value="">Semua Status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-24 bg-slate-50 rounded-2xl" />)}</div>
      ) : paged.length === 0 ? (
        <EmptyState
          title="Belum ada pengumuman"
          description="Buat pengumuman untuk broadcast ke seluruh ustaz."
          icon={<Megaphone className="w-8 h-8 text-slate-300" />}
        />
      ) : (
        <>
          <div className="space-y-3">
            {paged.map(p => {
              const live = isLive(p);
              return (
                <div key={p.id} className={`card p-4 group ${live ? 'border-l-4 border-l-emerald-400' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-800 text-sm">{p.judul}</span>
                        {p.jenis && <span className={`badge text-[10px] border ${JENIS_STYLE[p.jenis] ?? 'bg-slate-100 text-slate-600'}`}>{p.jenis}</span>}
                        {p.prioritas && <span className={`badge text-[10px] ${PRIORITAS_STYLE[p.prioritas] ?? 'bg-slate-100 text-slate-600'}`}>{p.prioritas}</span>}
                        {p.status && <span className={`badge text-[10px] ${STATUS_STYLE[p.status] ?? 'bg-slate-100 text-slate-600'}`}>{p.status}</span>}
                        {live && <span className="badge badge-success text-[10px]">Live</span>}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{p.isi}</p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(p.tanggal_mulai)}</span>
                        {p.tanggal_selesai && <span>s/d {formatDate(p.tanggal_selesai)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {p.status !== 'Publish' && (
                        <button onClick={() => quickStatus(p, 'Publish')} title="Terbitkan" className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {p.status === 'Publish' && (
                        <button onClick={() => quickStatus(p, 'Arsip')} title="Arsipkan" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(String(p.id))} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul *</label>
            <input
              type="text"
              value={form.judul}
              onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
              className="input-field text-sm"
              placeholder="Judul pengumuman..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Isi Pengumuman *</label>
            <textarea
              value={form.isi}
              onChange={e => setForm(p => ({ ...p, isi: e.target.value }))}
              className="input-field text-sm resize-none"
              rows={5}
              placeholder="Tulis isi pengumuman..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis</label>
              <select value={form.jenis} onChange={e => setForm(p => ({ ...p, jenis: e.target.value as any }))} className="input-field text-sm">
                {JENIS_LIST.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioritas</label>
              <select value={form.prioritas} onChange={e => setForm(p => ({ ...p, prioritas: e.target.value as any }))} className="input-field text-sm">
                {PRIORITAS_LIST.map(pr => <option key={pr} value={pr}>{pr}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Mulai Tampil *</label>
              <input type="date" value={form.tanggal_mulai} onChange={e => setForm(p => ({ ...p, tanggal_mulai: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal Berakhir</label>
              <input type="date" value={form.tanggal_selesai} onChange={e => setForm(p => ({ ...p, tanggal_selesai: e.target.value }))} className="input-field text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))} className="input-field text-sm">
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lampiran (URL, opsional)</label>
              <input type="text" value={form.lampiran} onChange={e => setForm(p => ({ ...p, lampiran: e.target.value }))} className="input-field text-sm" placeholder="https://..." />
            </div>
          </div>

          {form.status === 'Publish' && (
            <div className="bg-emerald-50 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">
                Pengumuman dengan status <strong>Publish</strong> akan langsung tampil di dashboard seluruh ustaz dalam rentang tanggal yang ditentukan.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { setShowModal(false); setEditingId(null); }} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
              {saving ? <FileEdit className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
