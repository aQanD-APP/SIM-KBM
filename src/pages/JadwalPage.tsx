import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, Pencil, CalendarDays, MapPin, Clock, BookOpen,
  Bell, Megaphone, Timer,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { JadwalMengajar, AgendaPenting, Pengumuman, Kelas, MataPelajaran, Profile, ShowToast } from '../types';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Ahad'];

function getTodayHari(): string {
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
  return HARI.find(h => today.toLowerCase().startsWith(h.toLowerCase())) ?? 'Senin';
}

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function JadwalPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [jadwal, setJadwal] = useState<JadwalMengajar[]>([]);
  const [agendaList, setAgendaList] = useState<AgendaPenting[]>([]);
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [form, setForm] = useState({
    hari: 'Senin', jam_mulai: '14:00', jam_selesai: '15:00',
    kelas: '', pelajaran: '', ruangan: '', catatan: '',
  });

  const todayHari = getTodayHari();
  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    const jadwalQuery = profile?.role === 'admin'
      ? supabase.from('jadwal_mengajar').select('*').order('jam_mulai')
      : supabase.from('jadwal_mengajar').select('*').eq('user_id', profile?.id ?? '').order('jam_mulai');
    const [jr, ar, pr, kr, mr] = await Promise.all([
      jadwalQuery,
      supabase.from('agenda_penting').select('*').order('tanggal', { ascending: true }),
      supabase.from('pengumuman').select('*').order('tanggal', { ascending: false }).limit(3),
      supabase.from('kelas').select('*').eq('is_active', true).order('nama_kelas'),
      supabase.from('mata_pelajaran').select('*').eq('is_active', true).order('nama_mapel'),
    ]);
    if (jr.data) setJadwal(jr.data as JadwalMengajar[]);
    if (ar.data) setAgendaList(ar.data as AgendaPenting[]);
    if (pr.data) setPengumumanList(pr.data as Pengumuman[]);
    if (kr.data) setKelasList(kr.data as Kelas[]);
    if (mr.data) setMapelList(mr.data as MataPelajaran[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // tick every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const todaySchedules = useMemo(
    () => jadwal.filter(j => j.hari === todayHari).sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai)),
    [jadwal, todayHari]
  );

  // Find the next upcoming class today
  const nextClass = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return todaySchedules.find(j => parseTimeToMinutes(j.jam_mulai) > nowMin);
  }, [todaySchedules, now]);

  // Currently ongoing class
  const ongoingClass = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return todaySchedules.find(j => {
      const start = parseTimeToMinutes(j.jam_mulai);
      const end = parseTimeToMinutes(j.jam_selesai);
      return nowMin >= start && nowMin < end;
    });
  }, [todaySchedules, now]);

  // Countdown to next class
  const countdown = useMemo(() => {
    if (!nextClass) return null;
    const [h, m] = nextClass.jam_mulai.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { hours, minutes, seconds };
  }, [nextClass, now]);

  // Upcoming agenda (today and future)
  const upcomingAgenda = useMemo(
    () => agendaList.filter(a => new Date(a.tanggal) >= new Date(today)).slice(0, 3),
    [agendaList, today]
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ hari: 'Senin', jam_mulai: '07:00', jam_selesai: '08:00', kelas: '', pelajaran: '', ruangan: '', catatan: '' });
    setShowModal(true);
  };

  const openEdit = (j: JadwalMengajar) => {
    setEditingId(j.id);
    setForm({
      hari: j.hari, jam_mulai: j.jam_mulai.slice(0, 5), jam_selesai: j.jam_selesai.slice(0, 5),
      kelas: j.kelas, pelajaran: j.pelajaran, ruangan: j.ruangan ?? '', catatan: j.catatan ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kelas || !form.pelajaran) { showToast('Kelas dan pelajaran wajib diisi', 'error'); return; }
    setSaving(true);
    const payload = {
      hari: form.hari, jam_mulai: form.jam_mulai, jam_selesai: form.jam_selesai,
      kelas: form.kelas, pelajaran: form.pelajaran,
      ruangan: form.ruangan || null, catatan: form.catatan || null,
    };
    const { error } = editingId
      ? await supabase.from('jadwal_mengajar').update(payload).eq('id', editingId)
      : await supabase.from('jadwal_mengajar').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Jadwal diperbarui!' : 'Jadwal ditambahkan!', 'success');
    setShowModal(false);
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('jadwal_mengajar').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Jadwal dihapus', 'info');
    setJadwal(prev => prev.filter(j => j.id !== id));
  };

  const grouped = HARI.reduce((acc, h) => { acc[h] = jadwal.filter(j => j.hari === h); return acc; }, {} as Record<string, JadwalMengajar[]>);

  return (
    <div>
      {/* ===== PAPAN PENGUMUMAN ===== */}
      <div className="mb-5 space-y-3">
        {/* Greeting + Today's Schedule */}
        <div className="card overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base leading-tight">Ahlan Ustaz</p>
                <p className="text-[11px] text-emerald-100">
                  {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {ongoingClass ? (
              <div className="bg-white/15 rounded-2xl p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wide">Sedang Berlangsung</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="w-4 h-4 text-emerald-100" />
                  <span className="font-bold text-sm">{ongoingClass.pelajaran}</span>
                  <span className="badge bg-white/20 text-white text-[10px]">{ongoingClass.kelas}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-emerald-100">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ongoingClass.jam_mulai.slice(0, 5)} – {ongoingClass.jam_selesai.slice(0, 5)} WIB</span>
                  {ongoingClass.ruangan && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ongoingClass.ruangan}</span>}
                </div>
              </div>
            ) : nextClass ? (
              <div className="bg-white/15 rounded-2xl p-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-4 h-4 text-emerald-100" />
                  <span className="text-xs font-bold text-emerald-100">Jadwal Mengajar Berikutnya</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                  <BookOpen className="w-4 h-4 text-emerald-100" />
                  <span className="font-bold text-sm">{nextClass.pelajaran}</span>
                  <span className="badge bg-white/20 text-white text-[10px]">{nextClass.kelas}</span>
                  <span className="text-xs text-emerald-100">{nextClass.jam_mulai.slice(0, 5)}–{nextClass.jam_selesai.slice(0, 5)} WIB</span>
                </div>
                {countdown && (
                  <div className="flex items-center gap-2 bg-emerald-800/40 rounded-xl px-3 py-2">
                    <Timer className="w-4 h-4 text-emerald-200" />
                    <span className="text-[11px] font-semibold text-emerald-100">Masuk kelas dalam:</span>
                    <div className="flex items-center gap-1.5 ml-auto font-mono">
                      <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                      <span className="text-xs text-emerald-200">Jam</span>
                      <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                      <span className="text-xs text-emerald-200">Menit</span>
                      <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
                      <span className="text-xs text-emerald-200">Detik</span>
                    </div>
                  </div>
                )}
              </div>
            ) : todaySchedules.length > 0 ? (
              <div className="bg-white/15 rounded-2xl p-3.5 backdrop-blur-sm">
                <p className="text-sm text-emerald-100">Semua jadwal mengajar hari ini telah selesai. Barakallahu fiikum.</p>
              </div>
            ) : (
              <div className="bg-white/15 rounded-2xl p-3.5 backdrop-blur-sm">
                <p className="text-sm text-emerald-100">Tidak ada jadwal mengajar hari ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Agenda + Pengumuman */}
        {(upcomingAgenda.length > 0 || pengumumanList.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcomingAgenda.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Agenda Mendatang</h3>
                </div>
                <div className="space-y-2">
                  {upcomingAgenda.map(a => (
                    <div key={a.id} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-amber-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-amber-700 leading-none">{new Date(a.tanggal).getDate()}</span>
                        <span className="text-[8px] text-amber-500 font-semibold">{new Date(a.tanggal).toLocaleString('id-ID', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{a.judul}</p>
                        <span className="badge badge-warning text-[9px]">{a.jenis}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pengumumanList.length > 0 && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center">
                    <Megaphone className="w-4 h-4 text-sky-600" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700">Pengumuman Terbaru</h3>
                </div>
                <div className="space-y-2">
                  {pengumumanList.map(p => (
                    <div key={p.id} className="bg-slate-50 rounded-xl p-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-700">{p.judul}</span>
                        <span className="badge badge-info text-[9px]">{p.kategori}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{p.isi}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== JADWAL MENGAJAR ===== */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Jadwal Mengajar</h2>
          <p className="section-subtitle">{jadwal.length} jadwal terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse"><div className="h-16 bg-slate-50 rounded-xl" /></div>)}
        </div>
      ) : jadwal.length === 0 ? (
        <EmptyState title="Jadwal kosong" description="Tambahkan jadwal mengajar untuk ditampilkan di sini." icon={<CalendarDays className="w-8 h-8 text-slate-300" />} />
      ) : (
        <div className="space-y-4">
          {HARI.map(hari => {
            const items = grouped[hari];
            if (!items.length) return null;
            const isToday = hari === todayHari;
            return (
              <div key={hari} className={`card overflow-hidden ${isToday ? 'ring-2 ring-emerald-300' : ''}`}>
                <div className={`px-4 py-2.5 flex items-center justify-between ${isToday ? 'bg-emerald-600' : 'bg-slate-50 border-b border-slate-100'}`}>
                  <span className={`font-bold text-sm ${isToday ? 'text-white' : 'text-slate-700'}`}>{hari}</span>
                  {isToday && <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">Hari Ini</span>}
                </div>
                <div className="divide-y divide-slate-50">
                  {items.map(j => (
                    <div key={j.id} className="px-4 py-3 flex items-center gap-3 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{j.pelajaran}</span>
                          <span className="badge badge-success text-[10px]">{j.kelas}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{j.jam_mulai.slice(0, 5)} – {j.jam_selesai.slice(0, 5)} WIB</span>
                          {j.ruangan && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{j.ruangan}</span>}
                          {j.catatan && <span className="text-slate-400 italic truncate max-w-[120px]">{j.catatan}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(j)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(j.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah/Edit Jadwal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingId ? 'Edit Jadwal' : 'Tambah Jadwal'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hari</label>
              <select value={form.hari} onChange={e => setForm(p => ({ ...p, hari: e.target.value }))} className="input-field text-sm">
                {HARI.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelas</label>
              <select value={form.kelas} onChange={e => setForm(p => ({ ...p, kelas: e.target.value }))} className="input-field text-sm" required>
                <option value="">Pilih Kelas</option>
                {kelasList.map(k => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran</label>
            <select value={form.pelajaran} onChange={e => setForm(p => ({ ...p, pelajaran: e.target.value }))} className="input-field text-sm" required>
              <option value="">Pilih Pelajaran</option>
              {mapelList.map(m => <option key={m.id} value={m.nama_mapel}>{m.nama_mapel}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam Mulai</label>
              <input type="time" value={form.jam_mulai} onChange={e => setForm(p => ({ ...p, jam_mulai: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam Selesai</label>
              <input type="time" value={form.jam_selesai} onChange={e => setForm(p => ({ ...p, jam_selesai: e.target.value }))} className="input-field text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ruangan (opsional)</label>
            <input type="text" value={form.ruangan} onChange={e => setForm(p => ({ ...p, ruangan: e.target.value }))} className="input-field text-sm" placeholder="cth. Kelas A, Musholla..." />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan (opsional)</label>
            <textarea value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} className="input-field text-sm resize-none" rows={2} placeholder="Catatan tambahan..." />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : editingId ? 'Perbarui' : 'Simpan'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
