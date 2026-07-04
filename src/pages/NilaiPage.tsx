import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Trash2, BarChart3, FileText, Share2, Save, Calendar, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUstazScope } from '../lib/ustazData';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { generatePDF, shareWA } from '../lib/pdf';
import type { Murid, Penilaian, DetailNilai, Profile, ShowToast } from '../types';

type Tab = 'input' | 'riwayat' | 'rapor';
type JenisUjian = 'Ulangan' | 'Ujian Tulis' | 'Ujian Lisan' | 'Baca Kitab' | 'Tugas' | 'Hafalan' | 'Praktik' | 'Lainnya';

const JENIS_UJIAN: JenisUjian[] = ['Ulangan', 'Ujian Tulis', 'Ujian Lisan', 'Baca Kitab', 'Tugas', 'Hafalan', 'Praktik', 'Lainnya'];

const NAMA_PENILAIAN_OPTIONS = [
  'Ulangan Harian', 'Ulangan Tengah Semester (UTS)', 'Ulangan Akhir Semester (UAS)',
  'Ujian Tulis', 'Ujian Lisan', 'Baca Kitab', 'Tugas Harian', 'Tugas Mingguan',
  'Hafalan Juz 1', 'Hafalan Juz 2', 'Hafalan Juz 3', 'Hafalan Juz 5',
  'Hafalan Juz 10', 'Hafalan Juz 30', 'Praktik', 'Lainnya',
];

export default function NilaiPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [tab, setTab] = useState<Tab>('input');
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [kelasOptions, setKelasOptions] = useState<string[]>([]);
  const [mapelOptions, setMapelOptions] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [penilaianList, setPenilaianList] = useState<Penilaian[]>([]);
  const [detailNilaiMap, setDetailNilaiMap] = useState<Record<string, DetailNilai[]>>({});
  const [selectedPenilaian, setSelectedPenilaian] = useState<string>('');

  const [inputMapel, setInputMapel] = useState('');
  const [inputJenis, setInputJenis] = useState<JenisUjian>('Ulangan');
  const [inputNama, setInputNama] = useState('');
  const [inputBobot, setInputBobot] = useState(100);
  const [inputTanggal, setInputTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [batchNilai, setBatchNilai] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    const scope = await getUstazScope(profile);
    setKelasOptions(scope.kelasList);
    setMapelOptions(scope.mapelList);
    if (scope.kelasList.length) setSelectedKelas(scope.kelasList[0]);
    if (scope.mapelList.length) setInputMapel(scope.mapelList[0]);

    const { data: muridData } = await supabase.from('murid').select('*').eq('status_aktif', true).order('nama');
    let murid = (muridData ?? []) as Murid[];
    if (!scope.isAdmin && scope.kelasList.length > 0) {
      murid = murid.filter(m => scope.kelasList.includes(m.kelas || ''));
    }
    setMuridList(murid);
    setLoading(false);
  };

  const muridFiltered = useMemo(
    () => muridList.filter(m => m.kelas === selectedKelas),
    [muridList, selectedKelas]
  );

  useEffect(() => {
    if (selectedKelas) loadPenilaianKelas(selectedKelas);
  }, [selectedKelas]);

  const loadPenilaianKelas = async (kelas: string) => {
    let query = supabase.from('penilaian').select('*').eq('kelas', kelas).order('tanggal', { ascending: false });
    if (profile?.role !== 'admin') {
      query = query.eq('user_id', profile?.id ?? '');
    }
    const { data } = await query;
    if (data) {
      setPenilaianList(data as Penilaian[]);
      const ids = (data || []).map(p => p.id);
      if (ids.length > 0) {
        const { data: detailData } = await supabase.from('detail_nilai').select('*').in('penilaian_id', ids);
        if (detailData) {
          const map: Record<string, DetailNilai[]> = {};
          (detailData as DetailNilai[]).forEach(d => {
            if (d.penilaian_id) {
              if (!map[d.penilaian_id]) map[d.penilaian_id] = [];
              map[d.penilaian_id].push(d);
            }
          });
          setDetailNilaiMap(map);
        }
      } else {
        setDetailNilaiMap({});
      }
    }
  };

  const openInputModal = () => {
    setInputMapel(mapelOptions[0] || '');
    setInputJenis('Ulangan');
    setInputNama('');
    setInputBobot(100);
    setInputTanggal(today);
    const init: Record<string, string> = {};
    muridFiltered.forEach(m => { init[m.id] = ''; });
    setBatchNilai(init);
    setShowModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMapel || !inputNama) {
      showToast('Lengkapi mata pelajaran dan nama penilaian', 'error');
      return;
    }
    const entries = Object.entries(batchNilai).filter(([, v]) => v !== '');
    if (!entries.length) {
      showToast('Isi minimal satu nilai', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: penilaianData, error: penilaianError } = await supabase
        .from('penilaian')
        .insert([{
          kelas: selectedKelas,
          mapel: inputMapel,
          nama_penilaian: inputNama,
          jenis: inputJenis,
          bobot: inputBobot,
          tanggal: inputTanggal,
        }])
        .select()
        .maybeSingle();

      if (penilaianError) throw penilaianError;
      if (!penilaianData) throw new Error('Gagal membuat penilaian');

      const detailRecords = entries.map(([muridId, skor]) => ({
        penilaian_id: penilaianData.id,
        murid_id: muridId,
        nilai: Number(skor),
      }));

      const { error: detailError } = await supabase.from('detail_nilai').insert(detailRecords);
      if (detailError) throw detailError;

      showToast('Nilai disimpan!', 'success');
      setShowModal(false);
      loadPenilaianKelas(selectedKelas);
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deletePenilaian = async (id: string) => {
    await supabase.from('detail_nilai').delete().eq('penilaian_id', id);
    await supabase.from('penilaian').delete().eq('id', id);
    setPenilaianList(prev => prev.filter(p => p.id !== id));
    showToast('Penilaian dihapus', 'info');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const getSkorColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 70 ? 'text-amber-600' : 'text-rose-600';
  const getSkorBg = (s: number) => s >= 80 ? 'bg-emerald-50' : s >= 70 ? 'bg-amber-50' : 'bg-rose-50';

  const exportRekapPDF = () => {
    if (!selectedPenilaian) return;
    const penilaian = penilaianList.find(p => p.id === selectedPenilaian);
    if (!penilaian) return;
    const details = detailNilaiMap[selectedPenilaian] || [];
    const headers = ['No', 'Nama', 'Nilai'];
    const body = details.map((d, i) => {
      const murid = muridList.find(m => m.id === d.murid_id);
      return [i + 1, murid?.nama || '-', d.nilai || 0];
    });
    generatePDF(
      `${penilaian.nama_penilaian} - ${penilaian.mapel} (${penilaian.kelas})`,
      headers, body,
      [`Tanggal: ${formatDate(penilaian.tanggal)}`, `Jenis: ${penilaian.jenis}`, `Bobot: ${penilaian.bobot}%`]
    );
  };

  const shareRekapWA = () => {
    if (!selectedPenilaian) return;
    const penilaian = penilaianList.find(p => p.id === selectedPenilaian);
    if (!penilaian) return;
    const details = detailNilaiMap[selectedPenilaian] || [];
    let text = `*HASIL ${penilaian.nama_penilaian}*\n\n`;
    text += `Mata Pelajaran: ${penilaian.mapel}\n`;
    text += `Kelas: ${penilaian.kelas}\n`;
    text += `Tanggal: ${formatDate(penilaian.tanggal)}\n\n`;
    text += `*Daftar Nilai:*\n`;
    details.forEach((d, i) => {
      const murid = muridList.find(m => m.id === d.murid_id);
      text += `${i + 1}. ${murid?.nama || '-'}: ${d.nilai}\n`;
    });
    shareWA(text);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Penilaian</h2>
          <p className="section-subtitle">Input dan kelola nilai santri</p>
        </div>
        {tab === 'input' && (
          <button onClick={openInputModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Input Nilai</span>
          </button>
        )}
      </div>

      <div className="tab-switcher mb-5">
        <button onClick={() => setTab('input')} className={`tab-btn ${tab === 'input' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          Input Nilai
        </button>
        <button onClick={() => setTab('riwayat')} className={`tab-btn ${tab === 'riwayat' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          Riwayat
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {kelasOptions.map(k => (
          <button key={k} onClick={() => setSelectedKelas(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border flex-shrink-0 transition-all ${selectedKelas === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
          >
            {k}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-20 bg-slate-50 rounded-2xl" />)}</div>
      ) : tab === 'input' ? (
        penilaianList.length === 0 ? (
          <EmptyState title="Belum ada penilaian" description="Klik Input Nilai untuk menambahkan nilai santri." icon={<BarChart3 className="w-8 h-8 text-slate-300" />} />
        ) : (
          <div className="space-y-3">
            {penilaianList.map(p => {
              const details = detailNilaiMap[p.id] || [];
              const avg = details.length > 0 ? details.reduce((s, d) => s + (d.nilai || 0), 0) / details.length : 0;
              return (
                <div key={p.id} className="card p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-800 text-sm">{p.nama_penilaian}</span>
                        <span className="badge badge-info text-[10px]">{p.jenis}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{p.mapel}</span>
                        <span>{formatDate(p.tanggal)}</span>
                        <span>Bobot: {p.bobot}%</span>
                      </div>
                      {details.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-xs text-slate-500">Rata-rata:</span>
                          <span className={`text-sm font-bold ${avg >= 80 ? 'text-emerald-600' : avg >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {avg.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-400">({details.length} siswa)</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelectedPenilaian(p.id)} className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600 transition-colors">
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deletePenilaian(p.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {selectedPenilaian === p.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-2 mb-3">
                        <button onClick={exportRekapPDF} className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                          <FileText className="w-3 h-3" /> Export PDF
                        </button>
                        <button onClick={shareRekapWA} className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                          <Share2 className="w-3 h-3" /> Share WA
                        </button>
                        <button onClick={() => setSelectedPenilaian('')} className="ml-auto text-xs text-slate-400 hover:text-slate-600">
                          Tutup
                        </button>
                      </div>
                      <div className="space-y-2">
                        {details.map(d => {
                          const murid = muridList.find(m => m.id === d.murid_id);
                          return (
                            <div key={d.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getSkorBg(d.nilai || 0)}`}>
                                <span className={`font-bold text-sm ${getSkorColor(d.nilai || 0)}`}>{d.nilai}</span>
                              </div>
                              <span className="text-sm font-medium text-slate-700">{murid?.nama || '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="card p-5">
          <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Riwayat Penilaian
          </h3>
          {penilaianList.length === 0 ? (
            <EmptyState title="Belum ada riwayat" />
          ) : (
            <div className="space-y-2">
              {penilaianList.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{p.nama_penilaian}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{p.mapel}</span>
                      <span>{formatDate(p.tanggal)}</span>
                    </div>
                  </div>
                  <span className="badge badge-info text-[10px]">{p.jenis}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Input Nilai Santri" size="lg">
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mata Pelajaran</label>
              <select value={inputMapel} onChange={e => setInputMapel(e.target.value)} className="input-field text-sm" required>
                <option value="">Pilih</option>
                {mapelOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Penilaian</label>
              <select value={inputJenis} onChange={e => setInputJenis(e.target.value as JenisUjian)} className="input-field text-sm">
                {JENIS_UJIAN.map(j => <option key={j}>{j}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Penilaian</label>
              <select value={inputNama} onChange={e => setInputNama(e.target.value)} className="input-field text-sm" required>
                <option value="">Pilih Penilaian</option>
                {NAMA_PENILAIAN_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Bobot (%)</label>
              <input type="number" min="0" max="100" value={inputBobot} onChange={e => setInputBobot(Number(e.target.value))} className="input-field text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
            <input type="date" value={inputTanggal} onChange={e => setInputTanggal(e.target.value)} className="input-field text-sm" required />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Nilai Santri (0-100, kosongkan jika tidak ada)</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {muridFiltered.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{m.nama}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={batchNilai[m.id] ?? ''}
                    onChange={e => setBatchNilai(prev => ({ ...prev, [m.id]: e.target.value }))}
                    className="input-field text-sm w-20 text-center"
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
