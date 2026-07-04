import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, FileText, Calendar, MapPin, CheckCircle,
  Circle, Search, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { CatatanGuru, ShowToast, KategoriCatatan, StatusCatatan, Profile } from '../types';

const KATEGORI_CONFIG: Record<KategoriCatatan, { color: string; bg: string; border: string }> = {
  Umum:     { color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
  Acara:    { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  Undangan: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  Agenda:   { color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-200' },
};

const KATEGORI_LIST: KategoriCatatan[] = ['Umum', 'Acara', 'Undangan', 'Agenda'];
const STATUS_LIST: StatusCatatan[] = ['Belum Selesai', 'Selesai'];

export default function CatatanPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [catatanList, setCatatanList] = useState<CatatanGuru[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState<KategoriCatatan | ''>('');
  const [filterStatus, setFilterStatus] = useState<StatusCatatan | ''>('');

  const now = new Date();
  const defaultDateTime = new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);

  const [form, setForm] = useState({
    kategori: 'Umum' as KategoriCatatan,
    judul: '',
    isi: '',
    tanggal_waktu: defaultDateTime,
    lokasi: '',
    status: 'Belum Selesai' as StatusCatatan,
  });

  useEffect(() => {
    fetchCatatan();
  }, []);

  const fetchCatatan = async () => {
    setLoading(true);
    const isAdmin = profile?.role === 'admin';
    let q = supabase
      .from('catatan_guru')
      .select('*')
      .eq('is_active', true);
    if (!isAdmin) q = q.eq('user_id', profile?.id ?? '');
    const { data, error } = await q.order('tanggal_waktu', { ascending: true });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setCatatanList((data || []) as CatatanGuru[]);
    }
    setLoading(false);
  };

  const filteredCatatan = useMemo(() => {
    return catatanList.filter(c => {
      const matchesSearch = search
        ? c.judul.toLowerCase().includes(search.toLowerCase()) ||
          (c.isi && c.isi.toLowerCase().includes(search.toLowerCase()))
        : true;
      const matchesKategori = filterKategori ? c.kategori === filterKategori : true;
      const matchesStatus = filterStatus ? c.status === filterStatus : true;
      return matchesSearch && matchesKategori && matchesStatus;
    });
  }, [catatanList, search, filterKategori, filterStatus]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      kategori: 'Umum',
      judul: '',
      isi: '',
      tanggal_waktu: defaultDateTime,
      lokasi: '',
      status: 'Belum Selesai',
    });
    setShowModal(true);
  };

  const openEdit = (c: CatatanGuru) => {
    setEditingId(c.id);
    setForm({
      kategori: c.kategori,
      judul: c.judul,
      isi: c.isi || '',
      tanggal_waktu: c.tanggal_waktu ? c.tanggal_waktu.slice(0, 16) : defaultDateTime,
      lokasi: c.lokasi || '',
      status: c.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul) {
      showToast('Judul wajib diisi', 'error');
      return;
    }

    setSaving(true);
    const payload = {
      kategori: form.kategori,
      judul: form.judul,
      isi: form.isi || null,
      tanggal_waktu: form.tanggal_waktu ? new Date(form.tanggal_waktu).toISOString() : null,
      lokasi: form.lokasi || null,
      status: form.status,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('catatan_guru').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('catatan_guru').insert(payload));
    }

    setSaving(false);
    if (error) {
      showToast(error.message, 'error');
      return;
    }

    showToast(editingId ? 'Catatan diperbarui!' : 'Catatan disimpan!', 'success');
    setShowModal(false);
    setEditingId(null);
    fetchCatatan();
  };

  const toggleStatus = async (c: CatatanGuru) => {
    const newStatus = c.status === 'Belum Selesai' ? 'Selesai' : 'Belum Selesai';
    const { error } = await supabase.from('catatan_guru').update({ status: newStatus }).eq('id', c.id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setCatatanList(prev => prev.map(item => item.id === c.id ? { ...item, status: newStatus } : item));
    showToast(newStatus === 'Selesai' ? 'Catatan selesai!' : 'Catatan dibuka kembali', 'success');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('catatan_guru').delete().eq('id', id);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    setCatatanList(prev => prev.filter(c => c.id !== id));
    showToast('Catatan dihapus', 'info');
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (d: string) => new Date(d) >= new Date();

  const stats = useMemo(() => ({
    total: catatanList.length,
    belumSelesai: catatanList.filter(c => c.status === 'Belum Selesai').length,
    selesai: catatanList.filter(c => c.status === 'Selesai').length,
  }), [catatanList]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Catatan Guru</h2>
          <p className="section-subtitle">{stats.belumSelesai} belum selesai, {stats.selesai} selesai</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari catatan..."
            className="input-field text-sm pl-9 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value as KategoriCatatan | '')}
            className="input-field text-xs py-2"
          >
            <option value="">Semua Kategori</option>
            {KATEGORI_LIST.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as StatusCatatan | '')}
            className="input-field text-xs py-2"
          >
            <option value="">Semua Status</option>
            {STATUS_LIST.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 animate-pulse h-24 bg-slate-50 rounded-2xl" />
          ))}
        </div>
      ) : filteredCatatan.length === 0 ? (
        <EmptyState
          title="Belum ada catatan"
          description="Tambahkan catatan untuk mengorganisir kegiatan Anda."
          icon={<FileText className="w-8 h-8 text-slate-300" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredCatatan.map(c => {
            const config = KATEGORI_CONFIG[c.kategori];
            const isDone = c.status === 'Selesai';
            const upcoming = c.tanggal_waktu && isUpcoming(c.tanggal_waktu);

            return (
              <div
                key={c.id}
                className={`card p-4 group ${isDone ? 'opacity-60' : ''} ${upcoming ? 'border-l-4 border-l-emerald-400' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatus(c)}
                    className={`mt-0.5 ${isDone ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'} transition-colors`}
                  >
                    {isDone ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-bold text-sm ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {c.judul}
                      </span>
                      <span className={`badge text-[10px] ${config.bg} ${config.color} border ${config.border}`}>
                        {c.kategori}
                      </span>
                    </div>

                    {c.isi && (
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">{c.isi}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      {c.tanggal_waktu && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(c.tanggal_waktu)}
                        </span>
                      )}
                      {c.lokasi && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {c.lokasi}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit Catatan' : 'Tambah Catatan'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Kategori</label>
            <div className="grid grid-cols-4 gap-2">
              {KATEGORI_LIST.map(k => {
                const config = KATEGORI_CONFIG[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, kategori: k }))}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${form.kategori === k ? `${config.bg} ${config.color} ${config.border} ring-2 ring-offset-1` : 'bg-white text-slate-500 border-slate-200'}`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul *</label>
            <input
              type="text"
              value={form.judul}
              onChange={e => setForm(p => ({ ...p, judul: e.target.value }))}
              className="input-field text-sm"
              placeholder="Judul catatan..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Isi Catatan</label>
            <textarea
              value={form.isi}
              onChange={e => setForm(p => ({ ...p, isi: e.target.value }))}
              className="input-field text-sm resize-none"
              rows={3}
              placeholder="Detail catatan..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal & Waktu</label>
              <input
                type="datetime-local"
                value={form.tanggal_waktu}
                onChange={e => setForm(p => ({ ...p, tanggal_waktu: e.target.value }))}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Lokasi</label>
              <input
                type="text"
                value={form.lokasi}
                onChange={e => setForm(p => ({ ...p, lokasi: e.target.value }))}
                className="input-field text-sm"
                placeholder="Tempat..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_LIST.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, status: s }))}
                  className={`py-2 rounded-xl text-xs font-bold transition-all border ${form.status === s ? (s === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200') : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
