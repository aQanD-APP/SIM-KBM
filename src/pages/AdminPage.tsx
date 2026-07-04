import { useState, useEffect } from 'react';
import {
  User, Users, Shield, Plus, Trash2, Pencil, CheckCircle, XCircle,
  BookOpen, Calendar, Search, X, Database, GraduationCap, Megaphone,
  Building2, BarChart3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import type {
  Profile, ShowToast, TahunAjaran, Semester, MataPelajaran, UserRole, KelompokMapel, Ruangan, ActiveTab,
} from '../types';
import DataSiswaPage from './DataSiswaPage';
import DataUstazPage from './DataUstazPage';

type AdminSection = 'master' | 'akademik';
type MasterTab = 'users' | 'tahun' | 'semester' | 'kelas' | 'mapel' | 'ruangan';
type AkademikTab = 'siswa' | 'ustaz';

const PAGE_SIZE = 8;
const SUPABASE_URL = 'https://intkcrhsinezswldmokr.supabase.co';

export default function AdminPage({
  showToast,
  profile,
  setActiveTab,
}: {
  showToast: ShowToast;
  profile: Profile | null;
  setActiveTab?: (tab: ActiveTab) => void;
}) {
  const [section, setSection] = useState<AdminSection>('master');
  const [masterTab, setMasterTab] = useState<MasterTab>('users');
  const [akademikTab, setAkademikTab] = useState<AkademikTab>('siswa');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [semesterList, setSemesterList] = useState<Semester[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [ruanganList, setRuanganList] = useState<Ruangan[]>([]);

  // Form states
  const [userForm, setUserForm] = useState({
    nama_lengkap: '',
    nama_panggilan: '',
    nomor_whatsapp: '',
    role: 'ustaz' as UserRole,
    is_active: true,
    id_login: '',
    password: ''
  });
  const [tahunForm, setTahunForm] = useState({ nama: '', aktif: false });
  const [semesterForm, setSemesterForm] = useState({ nama: '', aktif: false });
  const [kelasForm, setKelasForm] = useState({ nama_kelas: '', tingkat: '1', kode: '' });
  const [mapelForm, setMapelForm] = useState({ nama_mapel: '', kelompok: 'Diniyah' as KelompokMapel, kode: '' });
  const [ruanganForm, setRuanganForm] = useState({ nama_ruangan: '', kode: '', kapasitas: '', keterangan: '' });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) fetchMasterData();
  }, [isAdmin]);

  const fetchMasterData = async () => {
    setLoading(true);
    try {
      const [usersRes, tahunRes, semesterRes, kelasRes, mapelRes, ruanganRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tahun_ajaran').select('*').order('nama'),
        supabase.from('semester').select('*').order('nama'),
        supabase.from('kelas').select('*').eq('is_active', true).order('nama_kelas'),
        supabase.from('mata_pelajaran').select('*').eq('is_active', true).order('nama_mapel'),
        supabase.from('ruangan').select('*').eq('is_active', true).order('nama_ruangan'),
      ]);
      if (usersRes.data) setUsers(usersRes.data as Profile[]);
      if (tahunRes.data) setTahunList(tahunRes.data as TahunAjaran[]);
      if (semesterRes.data) setSemesterList(semesterRes.data as Semester[]);
      if (kelasRes.data) setKelasList(kelasRes.data);
      if (mapelRes.data) setMapelList(mapelRes.data as MataPelajaran[]);
      if (ruanganRes.data) setRuanganList(ruanganRes.data as Ruangan[]);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setLoading(false);
  };

  // Reset search & page when tab changes
  useEffect(() => {
    setSearch('');
    setPage(1);
  }, [masterTab, section]);

  // ========== GENERIC HANDLERS ==========
  const openAdd = () => {
    setEditingId(null);
    if (masterTab === 'users') setUserForm({
      nama_lengkap: '',
      nama_panggilan: '',
      nomor_whatsapp: '',
      role: 'ustaz',
      is_active: true,
      id_login: '',
      password: ''
    });
    if (masterTab === 'tahun') setTahunForm({ nama: '', aktif: false });
    if (masterTab === 'semester') setSemesterForm({ nama: '', aktif: false });
    if (masterTab === 'kelas') setKelasForm({ nama_kelas: '', tingkat: '1', kode: '' });
    if (masterTab === 'mapel') setMapelForm({ nama_mapel: '', kelompok: 'Diniyah', kode: '' });
    if (masterTab === 'ruangan') setRuanganForm({ nama_ruangan: '', kode: '', kapasitas: '', keterangan: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (masterTab === 'users') {
        if (editingId) {
          const { error } = await supabase.from('profiles').update({
            nama_lengkap: userForm.nama_lengkap,
            nama_panggilan: userForm.nama_panggilan,
            nomor_whatsapp: userForm.nomor_whatsapp,
            role: userForm.role,
            is_active: userForm.is_active,
          }).eq('id', editingId);
          if (error) throw error;
          showToast('User diperbarui!', 'success');
        } else {
          // Create new user via edge function
          if (!userForm.id_login || !userForm.password) {
            showToast('ID Login dan Password wajib diisi untuk user baru', 'error');
            setSaving(false);
            return;
          }
          if (userForm.password.length < 6) {
            showToast('Password minimal 6 karakter', 'error');
            setSaving(false);
            return;
          }

          const email = `${userForm.id_login.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.local`;

          const response = await fetch(`${SUPABASE_URL}/functions/v1/create-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: userForm.password,
              nama_lengkap: userForm.nama_lengkap || userForm.id_login,
              nama_panggilan: userForm.nama_panggilan,
              nomor_whatsapp: userForm.nomor_whatsapp,
              role: userForm.role,
              id_login: userForm.id_login.toLowerCase().replace(/[^a-z0-9]/g, ''),
              setup_key: 'simkbm-setup-2024',
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Gagal membuat user');
          }

          showToast('User berhasil dibuat!', 'success');
        }
      } else if (masterTab === 'tahun') {
        const { error } = editingId
          ? await supabase.from('tahun_ajaran').update(tahunForm).eq('id', editingId)
          : await supabase.from('tahun_ajaran').insert(tahunForm);
        if (error) throw error;
        showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
      } else if (masterTab === 'semester') {
        const { error } = editingId
          ? await supabase.from('semester').update(semesterForm).eq('id', editingId)
          : await supabase.from('semester').insert(semesterForm);
        if (error) throw error;
        showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
      } else if (masterTab === 'kelas') {
        const payload = { nama_kelas: kelasForm.nama_kelas, tingkat: kelasForm.tingkat, kode: kelasForm.kode || null, user_id: profile?.id };
        const { error } = editingId
          ? await supabase.from('kelas').update(payload).eq('id', editingId)
          : await supabase.from('kelas').insert(payload);
        if (error) throw error;
        showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
      } else if (masterTab === 'mapel') {
        const payload = { nama_mapel: mapelForm.nama_mapel, kelompok: mapelForm.kelompok, kode: mapelForm.kode || null, user_id: profile?.id };
        const { error } = editingId
          ? await supabase.from('mata_pelajaran').update(payload).eq('id', editingId)
          : await supabase.from('mata_pelajaran').insert(payload);
        if (error) throw error;
        showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
      } else if (masterTab === 'ruangan') {
        const payload = {
          nama_ruangan: ruanganForm.nama_ruangan,
          kode: ruanganForm.kode || null,
          kapasitas: ruanganForm.kapasitas ? Number(ruanganForm.kapasitas) : null,
          keterangan: ruanganForm.keterangan || null,
        };
        const { error } = editingId
          ? await supabase.from('ruangan').update(payload).eq('id', editingId)
          : await supabase.from('ruangan').insert(payload);
        if (error) throw error;
        showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
      }
      setShowModal(false);
      setEditingId(null);
      fetchMasterData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    let table = '';
    if (masterTab === 'mapel') table = 'mata_pelajaran';
    else if (masterTab === 'ruangan') table = 'ruangan';
    else if (masterTab === 'users') table = 'profiles';
    else if (masterTab === 'tahun') table = 'tahun_ajaran';
    else if (masterTab === 'semester') table = 'semester';
    else if (masterTab === 'kelas') table = 'kelas';
    if (!table) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Dihapus', 'info');
    fetchMasterData();
  };

  const openEdit = (item: any) => {
    setEditingId(item.id?.toString() || null);
    if (masterTab === 'users') {
      setUserForm({
        nama_lengkap: item.nama_lengkap || '',
        nama_panggilan: item.nama_panggilan || '',
        nomor_whatsapp: item.nomor_whatsapp || '',
        role: (item.role || 'ustaz') as UserRole,
        is_active: item.is_active ?? true,
        id_login: item.id_login || '',
        password: '',
      });
    } else if (masterTab === 'tahun') {
      setTahunForm({ nama: item.nama, aktif: item.aktif || false });
    } else if (masterTab === 'semester') {
      setSemesterForm({ nama: item.nama, aktif: item.aktif || false });
    } else if (masterTab === 'kelas') {
      setKelasForm({ nama_kelas: item.nama_kelas, tingkat: item.tingkat?.toString() || '1', kode: item.kode || '' });
    } else if (masterTab === 'mapel') {
      setMapelForm({ nama_mapel: item.nama_mapel, kelompok: item.kelompok || 'Diniyah', kode: item.kode || '' });
    } else if (masterTab === 'ruangan') {
      setRuanganForm({
        nama_ruangan: item.nama_ruangan,
        kode: item.kode || '',
        kapasitas: item.kapasitas?.toString() || '',
        keterangan: item.keterangan || '',
      });
    }
    setShowModal(true);
  };

  const toggleUserActive = async (u: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    if (error) { showToast(error.message, 'error'); return; }
    setUsers(prev => prev.map(item => item.id === u.id ? { ...item, is_active: !u.is_active } : item));
    showToast(u.is_active ? 'User dinonaktifkan' : 'User diaktifkan', 'success');
  };

  // ========== FILTERED & PAGED DATA ==========
  const getFilteredList = (): any[] => {
    let list: any[] = [];
    if (masterTab === 'users') list = users;
    else if (masterTab === 'tahun') list = tahunList;
    else if (masterTab === 'semester') list = semesterList;
    else if (masterTab === 'kelas') list = kelasList;
    else if (masterTab === 'mapel') list = mapelList;
    else if (masterTab === 'ruangan') list = ruanganList;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((item: any) => {
        const text = [
          item.nama_lengkap, item.nama_panggilan, item.nama, item.nama_kelas,
          item.nama_mapel, item.nama_ruangan, item.kode, item.kelompok, item.role,
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  };

  const filteredList = getFilteredList();
  const totalPages = Math.ceil(filteredList.length / PAGE_SIZE);
  const pagedList = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ========== RENDER ==========
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </div>
    );
  }

  const masterTabs = [
    { id: 'users' as MasterTab, label: 'User', count: users.length, icon: Users },
    { id: 'tahun' as MasterTab, label: 'Tahun Ajaran', count: tahunList.length, icon: Calendar },
    { id: 'semester' as MasterTab, label: 'Semester', count: semesterList.length, icon: BookOpen },
    { id: 'kelas' as MasterTab, label: 'Kelas', count: kelasList.length, icon: BookOpen },
    { id: 'mapel' as MasterTab, label: 'Mapel', count: mapelList.length, icon: BookOpen },
    { id: 'ruangan' as MasterTab, label: 'Ruangan', count: ruanganList.length, icon: Building2 },
  ];

  const renderModalContent = () => {
    if (masterTab === 'users') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingId && (
            <div className="bg-emerald-50 rounded-xl p-3 mb-2">
              <p className="text-xs text-emerald-700">
                <strong>Info:</strong> ID Login digunakan untuk login. Password minimal 6 karakter.
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Lengkap *</label>
            <input type="text" value={userForm.nama_lengkap} onChange={e => setUserForm(p => ({ ...p, nama_lengkap: e.target.value }))} className="input-field text-sm" placeholder="Nama lengkap" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Panggilan</label>
              <input type="text" value={userForm.nama_panggilan} onChange={e => setUserForm(p => ({ ...p, nama_panggilan: e.target.value }))} className="input-field text-sm" placeholder="Panggilan" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">No. WA</label>
              <input type="text" value={userForm.nomor_whatsapp} onChange={e => setUserForm(p => ({ ...p, nomor_whatsapp: e.target.value }))} className="input-field text-sm" placeholder="08xxx" />
            </div>
          </div>
          {!editingId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">ID Login *</label>
                <input type="text" value={userForm.id_login} onChange={e => setUserForm(p => ({ ...p, id_login: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))} className="input-field text-sm" placeholder="contoh: ustaz1" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password *</label>
                <input type="password" value={userForm.password} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))} className="input-field text-sm" placeholder="Min 6 karakter" required minLength={6} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
              <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as any }))} className="input-field text-sm">
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="ustaz">Ustaz</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select value={userForm.is_active ? 'true' : 'false'} onChange={e => setUserForm(p => ({ ...p, is_active: e.target.value === 'true' }))} className="input-field text-sm">
                <option value="true">Aktif</option>
                <option value="false">Non-aktif</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    if (masterTab === 'tahun') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Tahun Ajaran</label>
            <input type="text" value={tahunForm.nama} onChange={e => setTahunForm(p => ({ ...p, nama: e.target.value }))} className="input-field text-sm" placeholder="2024/2025" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="aktif" checked={tahunForm.aktif} onChange={e => setTahunForm(p => ({ ...p, aktif: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="aktif" className="text-sm text-slate-600">Tahun ajaran aktif</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    if (masterTab === 'semester') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Semester</label>
            <input type="text" value={semesterForm.nama} onChange={e => setSemesterForm(p => ({ ...p, nama: e.target.value }))} className="input-field text-sm" placeholder="Ganjil" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="aktif" checked={semesterForm.aktif} onChange={e => setSemesterForm(p => ({ ...p, aktif: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="aktif" className="text-sm text-slate-600">Semester aktif</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    if (masterTab === 'kelas') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Kelas *</label>
              <input type="text" value={kelasForm.nama_kelas} onChange={e => setKelasForm(p => ({ ...p, nama_kelas: e.target.value }))} className="input-field text-sm" placeholder="1A" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tingkat</label>
              <select value={kelasForm.tingkat} onChange={e => setKelasForm(p => ({ ...p, tingkat: e.target.value }))} className="input-field text-sm">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode</label>
            <input type="text" value={kelasForm.kode} onChange={e => setKelasForm(p => ({ ...p, kode: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    if (masterTab === 'mapel') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Mapel *</label>
              <input type="text" value={mapelForm.nama_mapel} onChange={e => setMapelForm(p => ({ ...p, nama_mapel: e.target.value }))} className="input-field text-sm" placeholder="Fiqih" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelompok</label>
              <select value={mapelForm.kelompok} onChange={e => setMapelForm(p => ({ ...p, kelompok: e.target.value as any }))} className="input-field text-sm">
                <option value="Diniyah">Diniyah</option>
                <option value="Umum">Umum</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Tahfidz">Tahfidz</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode</label>
            <input type="text" value={mapelForm.kode} onChange={e => setMapelForm(p => ({ ...p, kode: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    if (masterTab === 'ruangan') {
      return (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Ruangan *</label>
            <input type="text" value={ruanganForm.nama_ruangan} onChange={e => setRuanganForm(p => ({ ...p, nama_ruangan: e.target.value }))} className="input-field text-sm" placeholder="Kelas A, Musholla..." required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode</label>
              <input type="text" value={ruanganForm.kode} onChange={e => setRuanganForm(p => ({ ...p, kode: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kapasitas</label>
              <input type="number" value={ruanganForm.kapasitas} onChange={e => setRuanganForm(p => ({ ...p, kapasitas: e.target.value }))} className="input-field text-sm" placeholder="Jumlah siswa" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Keterangan</label>
            <input type="text" value={ruanganForm.keterangan} onChange={e => setRuanganForm(p => ({ ...p, keterangan: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }
    return null;
  };

  const renderListItem = (item: any) => {
    if (masterTab === 'users') {
      const u = item as Profile;
      return (
        <div key={u.id} className="card p-3.5 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{u.nama_lengkap || 'User'}</p>
            <div className="flex items-center gap-2">
              <span className={`badge text-[10px] ${u.role === 'admin' ? 'badge-danger' : u.role === 'operator' ? 'badge-warning' : 'badge-success'}`}>{u.role}</span>
              {u.nomor_whatsapp && <span className="text-xs text-slate-400">{u.nomor_whatsapp}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleUserActive(u)} className={`p-1.5 rounded-lg ${u.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}>
              {u.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            </button>
            <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }
    if (masterTab === 'tahun') {
      const t = item as TahunAjaran;
      return (
        <div key={t.id} className="card p-3.5 flex items-center gap-3 group">
          <div className={`w-3 h-3 rounded-full ${t.aktif ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="font-semibold text-slate-800 text-sm flex-1">{t.nama}</span>
          {t.aktif && <span className="badge badge-success text-[10px]">Aktif</span>}
          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (masterTab === 'semester') {
      const s = item as Semester;
      return (
        <div key={s.id} className="card p-3.5 flex items-center gap-3 group">
          <div className={`w-3 h-3 rounded-full ${s.aktif ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="font-semibold text-slate-800 text-sm flex-1">{s.nama}</span>
          {s.aktif && <span className="badge badge-success text-[10px]">Aktif</span>}
          <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    if (masterTab === 'kelas') {
      const k = item;
      return (
        <div key={k.id} className="card p-3.5 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{k.nama_kelas}</p>
            <span className="text-xs text-slate-400">Tingkat {k.tingkat}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => openEdit(k)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(k.id?.toString() || '')} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }
    if (masterTab === 'mapel') {
      const m = item as MataPelajaran;
      return (
        <div key={m.id} className="card p-3.5 flex items-center gap-3 group">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{m.nama_mapel}</p>
            <span className={`badge text-[10px] ${m.kelompok === 'Diniyah' ? 'badge-success' : m.kelompok === 'Umum' ? 'badge-info' : 'badge-warning'}`}>{m.kelompok}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }
    if (masterTab === 'ruangan') {
      const r = item as Ruangan;
      return (
        <div key={r.id} className="card p-3.5 flex items-center gap-3 group">
          <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{r.nama_ruangan}</p>
            <div className="flex items-center gap-2">
              {r.kode && <span className="text-xs text-slate-400">Kode: {r.kode}</span>}
              {r.kapasitas && <span className="text-xs text-slate-400">Kapasitas: {r.kapasitas}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Admin Panel</h2>
        <p className="section-subtitle">Kelola data master dan data akademik</p>
      </div>

      {/* Section Switcher */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setSection('master')}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${section === 'master' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <Database className="w-4 h-4" />
          Master Data
        </button>
        <button
          onClick={() => setSection('akademik')}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all ${section === 'akademik' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200'}`}
        >
          <BarChart3 className="w-4 h-4" />
          Data Akademik
        </button>
      </div>

      {/* Pengumuman Quick Access (always visible) */}
      {setActiveTab && (
        <button
          onClick={() => setActiveTab('pengumuman')}
          className="w-full mb-5 flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-2xl hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-slate-800 text-sm">Pengumuman & Agenda</p>
            <p className="text-xs text-slate-500">Broadcast pengumuman ke seluruh ustaz</p>
          </div>
          <span className="text-amber-600 group-hover:translate-x-1 transition-transform">→</span>
        </button>
      )}

      {section === 'master' ? (
        <>
          {/* Master Data Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {masterTabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setMasterTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${masterTab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${masterTab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari..."
              className="input-field text-sm pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Button */}
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 mb-4 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span>Tambah {masterTabs.find(t => t.id === masterTab)?.label}</span>
          </button>

          {/* List */}
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-16 bg-slate-50 rounded-2xl" />)}</div>
          ) : pagedList.length === 0 ? (
            <EmptyState title="Belum ada data" description="Tambahkan data untuk mulai." />
          ) : (
            <>
              <div className="space-y-2">
                {pagedList.map(item => renderListItem(item))}
              </div>
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </>
      ) : (
        <>
          {/* Data Akademik Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setAkademikTab('siswa')}
              className={`flex items-center gap-2 py-3 px-4 rounded-2xl text-sm font-bold transition-all ${akademikTab === 'siswa' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <GraduationCap className="w-4 h-4" />
              Data Siswa
            </button>
            <button
              onClick={() => setAkademikTab('ustaz')}
              className={`flex items-center gap-2 py-3 px-4 rounded-2xl text-sm font-bold transition-all ${akademikTab === 'ustaz' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              <Users className="w-4 h-4" />
              Data Ustaz
            </button>
          </div>

          {/* Data Akademik Content */}
          {akademikTab === 'siswa' ? <DataSiswaPage showToast={showToast} /> : <DataUstazPage showToast={showToast} />}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? `Edit ${masterTabs.find(t => t.id === masterTab)?.label}` : `Tambah ${masterTabs.find(t => t.id === masterTab)?.label}`}
        size="sm"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
