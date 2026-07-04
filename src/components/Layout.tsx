import {
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  User,
  ChevronRight,
  Heart,
  FileQuestion,
  Home,
  FileText,
  Shield,
  Download,
  GraduationCap,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ActiveTab, Profile } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface LayoutProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  profile?: Profile | null;
  onLogout: () => void;
  children: React.ReactNode;
}

const navItems: { id: ActiveTab; icon: React.ElementType; label: string; adminOnly?: boolean }[] = [
  { id: 'dashboard', icon: Home, label: 'Beranda' },
  { id: 'jadwal', icon: CalendarDays, label: 'Jadwal' },
  { id: 'murid', icon: Users, label: 'Santri' },
  { id: 'absensi', icon: ClipboardCheck, label: 'Absensi' },
  { id: 'jurnal', icon: FileText, label: 'Jurnal' },
  { id: 'nilai', icon: BarChart3, label: 'Nilai' },
  { id: 'sikap', icon: Heart, label: 'Sikap' },
  { id: 'catatan', icon: BookOpen, label: 'Catatan' },
  { id: 'soal', icon: FileQuestion, label: 'Soal' },
  { id: 'izin', icon: FileText, label: 'Izin' },
  { id: 'rapor', icon: GraduationCap, label: 'Rapor' },
  { id: 'admin', icon: Shield, label: 'Admin', adminOnly: true },
];

export default function Layout({ activeTab, setActiveTab, profile, onLogout, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleNav = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);
  const activeLabel = navItems.find(n => n.id === activeTab)?.label ?? '';

  const displayName = profile?.nama_panggilan || profile?.nama_lengkap?.split(' ')[0] || 'Ustaz';

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      {/* Sidebar Desktop */}
      <nav className="hidden md:flex flex-col w-64 bg-white shadow-sm border-r border-slate-100 fixed top-0 bottom-0 left-0 z-40">
        <div className="p-5 bg-emerald-600 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">SIM KBM Ustaz</p>
              <p className="text-[10px] text-emerald-100">V2.0 Multi-Tenant</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`nav-item w-full text-left ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{displayName}</p>
              <p className="text-[10px] text-slate-400">{profile?.role === 'admin' ? 'Administrator' : profile?.role === 'operator' ? 'Operator' : 'Ustaz'}</p>
            </div>
          </div>
          {/* Install App Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={promptInstall}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Instal Aplikasi</span>
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl md:hidden flex flex-col">
            <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6" />
                <span className="font-bold">SIM KBM Ustaz</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
              {filteredNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`nav-item w-full text-left ${isActive ? 'nav-item-active' : 'nav-item-inactive'}`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-100 space-y-2">
              {/* Install App Button - Mobile */}
              {isInstallable && !isInstalled && (
                <button
                  onClick={() => { promptInstall(); setSidebarOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Instal Aplikasi</span>
                </button>
              )}
              <button
                onClick={() => { onLogout(); setSidebarOpen(false); }}
                className="w-full flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 px-4 py-2.5 rounded-xl font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-100 sticky top-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 active:scale-95 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-800 leading-tight">
                <span className="md:hidden">{activeLabel}</span>
                <span className="hidden md:inline">SIM KBM Ustaz</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] z-30 flex justify-around px-1 py-1.5 overflow-x-auto">
        {filteredNavItems.slice(0, 6).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[52px] transition-all ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
            >
              <div className={`p-1.5 rounded-xl mb-0.5 transition-colors ${isActive ? 'bg-emerald-50' : ''}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
              <span className={`text-[9px] leading-none ${isActive ? 'font-bold text-emerald-600' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl min-w-[52px] text-slate-400"
        >
          <div className="p-1.5 rounded-xl mb-0.5">
            <Menu className="w-[18px] h-[18px]" />
          </div>
          <span className="text-[9px] leading-none font-medium">Lainnya</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
