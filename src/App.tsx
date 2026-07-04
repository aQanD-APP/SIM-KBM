import { useState, useEffect, useRef } from 'react';
import { BookOpen, Loader2, Shield, AlertCircle, LogOut } from 'lucide-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import Modal from './components/Modal';
import { useToast } from './hooks/useToast';
import { useBackButton } from './hooks/useBackButton';
import type { ActiveTab, ShowToast, Profile } from './types';

import DashboardPage from './pages/DashboardPage';
import JadwalPage from './pages/JadwalPage';
import MuridPage from './pages/MuridPage';
import AbsensiPage from './pages/AbsensiPage';
import JurnalPage from './pages/JurnalPage';
import NilaiPage from './pages/NilaiPage';
import SikapPage from './pages/SikapPage';
import CatatanPage from './pages/CatatanPage';
import SoalPage from './pages/SoalPage';
import IzinPage from './pages/IzinPage';
import RaporPage from './pages/RaporPage';
import AdminPage from './pages/AdminPage';
import AdminPengumumanPage from './pages/AdminPengumumanPage';

const SUPABASE_URL = 'https://intkcrhsinezswldmokr.supabase.co';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Memuat aplikasi...</span>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Aplikasi Gagal Dimuat</h1>
        <p className="text-slate-600 mb-6">{message}</p>
        <button
          onClick={onRetry}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-200 transition-all"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}

function SetupScreen({ showToast, onComplete }: { showToast: ShowToast; onComplete: () => void }) {
  const [idLogin, setIdLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLogin || !password) {
      showToast('Isi ID Login dan kata sandi', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Kata sandi minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      const email = `${idLogin.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.local`;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nama_lengkap: idLogin,
          role: 'admin',
          setup_key: 'simkbm-setup-2024',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal membuat admin');
      }

      showToast('Admin berhasil dibuat! Silakan login.', 'success');
      onComplete();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Setup Awal</h1>
          <p className="text-slate-500 text-sm mt-1">Buat akun admin pertama</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-amber-200 p-6">
          <div className="bg-amber-50 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Selamat datang! Ini adalah pengaturan pertama kali. Buat akun admin untuk mulai menggunakan aplikasi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Login Admin</label>
              <input
                type="text"
                value={idLogin}
                onChange={e => setIdLogin(e.target.value)}
                className="input-field"
                placeholder="Contoh: admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Membuat...' : 'Buat Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ showToast }: { showToast: ShowToast }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [idLogin, setIdLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const friendlyError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'ID Login/Email atau kata sandi salah.';
    if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi.';
    if (msg.includes('User already registered')) return 'ID Login sudah terdaftar.';
    if (msg.includes('Password should be')) return 'Kata sandi minimal 6 karakter.';
    if (msg.includes('unexpected_failure') || msg.includes('schema')) return 'Server database sedang gangguan, mohon coba lagi nanti.';
    if (msg.includes('500') || msg.includes('Internal Server Error')) return 'Terjadi kesalahan internal pada server autentikasi.';
    if (msg.includes('AbortError') || msg.includes('timeout')) return 'Koneksi timeout. Periksa internet dan coba lagi.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLogin || !password) {
      showToast('Isi ID Login/Email dan kata sandi', 'error');
      return;
    }

    setLoading(true);
    try {
      let email: string;

      if (idLogin.includes('@')) {
        email = idLogin.toLowerCase().trim();
      } else {
        // Lookup email by id_login via edge function (bypasses RLS)
        try {
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/lookup-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_login: idLogin.toLowerCase().trim() }),
          });
          if (resp.ok) {
            const result = await resp.json();
            if (result.email) {
              email = result.email;
            } else {
              showToast('ID Login tidak ditemukan. Gunakan email untuk login.', 'error');
              setLoading(false);
              return;
            }
          } else {
            showToast('Gagal mencari ID Login. Gunakan email untuk login.', 'error');
            setLoading(false);
            return;
          }
        } catch {
          showToast('Koneksi bermasalah. Gunakan email untuk login.', 'error');
          setLoading(false);
          return;
        }
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Akun berhasil dibuat! Silakan login.', 'success');
        setMode('login');
      }
    } catch (err: any) {
      showToast(friendlyError(err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SIM KBM Ustaz</h1>
          <p className="text-slate-500 text-sm mt-1">Manajemen Kelas & Santri</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Login / Email</label>
              <input
                type="text"
                value={idLogin}
                onChange={e => setIdLogin(e.target.value)}
                className="input-field"
                placeholder="ID Login atau alamat email"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sistem Informasi Manajemen KBM Ustaz V2.0
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [error, setError] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const initRef = useRef(false);
  const { toasts, showToast, removeToast } = useToast();

  // Fetch profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        return null;
      }

      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{ id: userId, role: 'ustaz', is_active: true }])
          .select()
          .maybeSingle();

        if (createError) {
          console.error('Profile create error:', createError);
          return null;
        }
        return newProfile as Profile;
      }

      return data as Profile;
    } catch (err) {
      console.error('Profile error:', err);
      return null;
    }
  };

  // Check setup - use auth.admin via edge function would be ideal,
  // but we can check if ANY auth user exists by attempting a dummy sign-in.
  // Simpler: check profiles count. If RLS blocks anon read, assume setup NOT needed
  // (an authenticated user would have created their profile already).
  const checkSetupNeeded = async () => {
    // Setup is handled via database migration — admin user is pre-created.
    // This screen should never appear.
    return false;
  };

  // Initialize
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initApp = async () => {
      try {
        console.log('[APP] Initializing...');
        setAuthLoading(true);
        setError(null);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session?.user) {
          console.log('[APP] User logged in:', session.user.id);
          setUser(session.user);

          // Fetch profile in background
          fetchProfile(session.user.id).then(p => {
            if (p) setProfile(p);
          });

          // Restore tab
          const saved = sessionStorage.getItem('activeTab') as ActiveTab;
          if (saved && ['dashboard', 'jadwal', 'murid', 'absensi', 'jurnal', 'nilai', 'sikap', 'catatan', 'soal', 'izin', 'rapor', 'admin'].includes(saved)) {
            setActiveTab(saved);
          }
        } else {
          console.log('[APP] No session, checking setup');
          const setupNeeded = await checkSetupNeeded();
          setNeedsSetup(setupNeeded);
        }
      } catch (err: any) {
        console.error('[APP] Init error:', err);
        setError(err.message || 'Gagal menginisialisasi');
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Wrap async work in IIFE to avoid deadlock inside onAuthStateChange
      (async () => {
        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (p) setProfile(p);
          setNeedsSetup(false);
          setError(null);
        } else {
          setUser(null);
          setProfile(null);
          setActiveTab('dashboard');
        }
      })();
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Persist tab
  useEffect(() => {
    if (user) sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab, user]);

  const handleTabChange = (tab: ActiveTab) => {
    if (tab !== activeTab) setActiveTab(tab);
  };

  useBackButton({
    activeTab,
    setActiveTab: handleTabChange,
    onExitDialog: () => setShowExitDialog(true),
  });

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    sessionStorage.clear();
    setUser(null);
    setProfile(null);
    setActiveTab('dashboard');
  };

  const handleRetry = () => {
    setError(null);
    initRef.current = false;
    window.location.reload();
  };

  if (error && !authLoading) {
    return (
      <>
        <ErrorScreen message={error} onRetry={handleRetry} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (authLoading) return <LoadingScreen />;

  if (needsSetup) {
    return (
      <>
        <SetupScreen showToast={showToast} onComplete={() => setNeedsSetup(false)} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen showToast={showToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage showToast={showToast} profile={profile} setActiveTab={setActiveTab} />;
      case 'jadwal': return <JadwalPage showToast={showToast} profile={profile} />;
      case 'murid': return <MuridPage showToast={showToast} profile={profile} />;
      case 'absensi': return <AbsensiPage showToast={showToast} profile={profile} />;
      case 'jurnal': return <JurnalPage showToast={showToast} profile={profile} />;
      case 'nilai': return <NilaiPage showToast={showToast} profile={profile} />;
      case 'sikap': return <SikapPage showToast={showToast} profile={profile} />;
      case 'catatan': return <CatatanPage showToast={showToast} profile={profile} />;
      case 'soal': return <SoalPage showToast={showToast} profile={profile} />;
      case 'izin': return <IzinPage showToast={showToast} profile={profile} />;
      case 'rapor': return <RaporPage showToast={showToast} />;
      case 'admin': return <AdminPage showToast={showToast} profile={profile} setActiveTab={setActiveTab} />;
      case 'pengumuman': return <AdminPengumumanPage showToast={showToast} />;
      default: return null;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        profile={profile}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <Modal
        isOpen={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        title="Keluar Aplikasi"
        size="sm"
      >
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2 rounded-xl bg-amber-50">
            <LogOut className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">Apakah Anda ingin keluar dari aplikasi?</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setShowExitDialog(false)} className="btn-secondary text-sm">Batal</button>
          <button
            onClick={() => { setShowExitDialog(false); handleLogout(); }}
            className="text-sm px-5 py-2.5 rounded-xl font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-100 transition-all active:scale-95"
          >
            Ya, Keluar
          </button>
        </div>
      </Modal>
    </>
  );
}
