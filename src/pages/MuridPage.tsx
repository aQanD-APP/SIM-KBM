import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, Users, Phone, MapPin, Search, X, Filter, CheckCircle, XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUstazScope } from '../lib/ustazData';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { Murid, Profile, ShowToast } from '../types';

export default function MuridPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState<string>('all');

  const [form, setForm] = useState({
    nama: '',
    kelas: '',
    domisili: '',
    alamat: '',
    nomor_whatsapp: '',
    status_aktif: true,
  });

  const [kelasList, setKelasList] = useState<string[]>([]);

  // Fetch data murid dari Supabase
  const fetchMurid = async () => {
    setLoading(true);
    try {
      const scope = await getUstazScope(profile);
      setKelasList(scope.kelasList);

      const { data, error } = await supabase
        .from('murid')
        .select('*')
        .order('nama');

      if (error) throw error;
      if (data) {
        let muridData = data as Murid[];
        if (!scope.isAdmin && scope.kelasList.length > 0) {
          muridData = muridData.filter(m => scope.kelasList.includes(m.kelas || ''));
        }
        setMuridList(muridData);
      }
    } catch (error: any) {
      showToast(error.message || 'Gagal mengambil data murid', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMurid();
  }, []);

  // Ambil daftar kelas dari tabel kelas
  const kelasOptions = useMemo(
    () => kelasList.length > 0 ? kelasList : [...new Set(muridList.map(m => m.kelas).filter(Boolean))].sort(),
    [kelasList, muridList]
  );

  // Filter & Pencarian Data Murid
  const filteredMuridList = useMemo(() => {
    return muridList.filter(m => {
      const matchesSearch = 
        m.nama.toLowerCase().includes(search.toLowerCase()) ||
        (m.domisili && m.domisili.toLowerCase().includes(search.toLowerCase()));
      const matchesKelas = filterKelas === 'all' || m.kelas === filterKelas;
      return matchesSearch && matchesKelas;
    });
  }, [muridList, search, filterKelas]);

  // Reset Form state
  const resetForm = () => {
    setEditingId(null);
    setForm({
      nama: '',
      kelas: '',
      domisili: '',
      alamat: '',
      nomor_whatsapp: '',
      status_aktif: true,
    });
  };

  // Buka modal untuk mode Edit
  const openEdit = (murid: any) => {
    setEditingId(murid.id);
    setForm({
      nama: murid.nama || '',
      kelas: murid.kelas || '',
      domisili: murid.domisili || '',
      alamat: murid.alamat || '',
      nomor_whatsapp: murid.nomor_whatsapp || '',
      status_aktif: murid.status_aktif !== undefined ? murid.status_aktif : true,
    });
    setShowModal(true);
  };

  // Handler Tambah & Edit Data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.kelas) {
      showToast('Nama dan Kelas wajib diisi!', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Mode Update
        const { error } = await supabase
          .from('murid')
          .update({
            nama: form.nama,
            kelas: form.kelas,
            domisili: form.domisili,
            alamat: form.alamat,
            nomor_whatsapp: form.nomor_whatsapp,
            status_aktif: form.status_aktif,
          })
          .eq('id', editingId);

        if (error) throw error;
        showToast('Data santri berhasil diperbarui', 'success');
      } else {
        // Mode Insert New
        const { error } = await supabase
          .from('murid')
          .insert([form]);

        if (error) throw error;
        showToast('Santri baru berhasil ditambahkan', 'success');
      }

      setShowModal(false);
      resetForm();
      fetchMurid();
    } catch (error: any) {
      showToast(error.message || 'Gagal menyimpan data', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handler Hapus Data
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase
        .from('murid')
        .delete()
        .eq('id', deletingId);

      if (error) throw error;
      showToast('Data santri berhasil dihapus', 'success');
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchMurid();
    } catch (error: any) {
      showToast(error.message || 'Gagal menghapus data', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Santri</h1>
            <p className="text-xs text-slate-500 mt-0.5">Total: {filteredMuridList.length} Santri</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center justify-center gap-2 text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          Tambah Santri
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri atau domisili..."
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Semua Kelas</option>
            {kelasOptions.map(kelas => (
              <option key={kelas} value={kelas}>Kelas {kelas}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 font-medium">Memuat data santri...</p>
        </div>
      ) : filteredMuridList.length === 0 ? (
        <EmptyState
          title="Tidak ada data santri"
          description={search || filterKelas !== 'all' ? "Tidak ada hasil yang cocok dengan filter pencarian Anda." : "Belum ada data santri yang ditambahkan."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMuridList.map((murid: any) => (
            <div key={murid.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all group relative">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1">{murid.nama}</h3>
                    {murid.status_aktif === false ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-600">
                        <XCircle className="w-3 h-3" /> Non-aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 mt-0.5">Kelas {murid.kelas}</p>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(murid)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Ubah Data"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingId(murid.id); setShowDeleteModal(true); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Hapus Data"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 space-y-2 text-xs text-slate-600">
                {murid.nomor_whatsapp && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{murid.nomor_whatsapp}</span>
                  </div>
                )}
                {murid.domisili && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="line-clamp-1">{murid.domisili}</span>
                  </div>
                )}
                {murid.alamat && (
                  <p className="text-slate-400 italic line-clamp-2 mt-1 pl-5">"{murid.alamat}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingId ? 'Ubah Data Santri' : 'Tambah Santri Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={form.nama}
              onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Masukkan nama lengkap..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas *</label>
              <select
                required
                value={form.kelas}
                onChange={e => setForm(p => ({ ...p, kelas: e.target.value }))}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Pilih Kelas</option>
                {kelasOptions.map(kelas => <option key={kelas} value={kelas}>{kelas}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status Aktif</label>
              <select
                value={form.status_aktif ? 'true' : 'false'}
                onChange={e => setForm(p => ({ ...p, status_aktif: e.target.value === 'true' }))}
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="true">Aktif</option>
                <option value="false">Non-aktif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">No. WhatsApp (Opsional)</label>
            <input
              type="tel"
              value={form.nomor_whatsapp}
              onChange={e => setForm(p => ({ ...p, nomor_whatsapp: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="08xx..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Domisili (Opsional)</label>
            <input
              type="text"
              value={form.domisili}
              onChange={e => setForm(p => ({ ...p, domisili: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              placeholder="Kota/Kecamatan asal..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Alamat Lengkap (Opsional)</label>
            <textarea
              value={form.alamat}
              onChange={e => setForm(p => ({ ...p, alamat: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              rows={2}
              placeholder="Alamat lengkap rumah..."
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setShowModal(false); resetForm(); }}
              className="btn-secondary flex-1 text-sm py-2.5"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 text-sm py-2.5"
            >
              {saving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingId(null); }}
        title="Hapus Data Santri"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menghapus data santri ini? Tindakan ini bersifat permanen dan data riwayat absensi atau nilai yang terikat mungkin akan ikut terpengaruh.
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setDeletingId(null); }}
              className="btn-secondary flex-1 text-sm"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all flex-1 text-sm"
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
