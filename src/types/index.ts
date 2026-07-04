// Types for SIM KBM Ustaz V2.0 - Multi-Tenant PWA
// All tables use UUID id, have proper FK relationships

// ============ ENUMS ============
export type UserRole = 'admin' | 'operator' | 'ustaz';
export type MuridStatus = 'Aktif' | 'Lulus' | 'Pindah' | 'Keluar' | 'Cuti';
export type KelompokMapel = 'Diniyah' | 'Umum' | 'Bahasa' | 'Tahfidz' | 'Lainnya';
export type Hari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Ahad';
export type StatusAbsensi = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa';
export type JenisPenilaian = 'Ulangan' | 'Ujian Tulis' | 'Ujian Lisan' | 'Tugas' | 'Hafalan' | 'Praktik' | 'Lainnya';
export type KategoriCatatan = 'Umum' | 'Acara' | 'Undangan' | 'Agenda';
export type StatusCatatan = 'Belum Selesai' | 'Selesai';
export type PrioritasPengumuman = 'Normal' | 'Penting' | 'Sangat Penting';
export type StatusWA = 'pending' | 'sent' | 'failed';

// ============ CORE TABLES ============

export interface TahunAjaran {
  id: string;
  nama: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: string;
  nama: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nama_lengkap?: string;
  nama_panggilan?: string;
  email?: string;
  nomor_whatsapp?: string;
  foto?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface Pengaturan {
  id: string;
  user_id: string;
  nama_sekolah?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  website?: string;
  logo?: string;
  tema?: string;
  bahasa?: string;
  zona_waktu?: string;
  created_at: string;
  updated_at: string;
}

// ============ MASTER DATA ============

export interface Kelas {
  id: string;
  user_id: string;
  kode?: string;
  nama_kelas: string;
  tingkat?: string;
  warna?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface MataPelajaran {
  id: string;
  user_id: string;
  kode?: string;
  nama_mapel: string;
  kelompok?: KelompokMapel;
  warna?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface Murid {
  id: string;
  user_id: string;
  kelas_id?: string;
  kelas?: string; // Legacy text field for existing tables
  nis?: string;
  nama: string;
  jenis_kelamin?: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  domisili?: string; // Legacy field
  nama_wali?: string;
  no_hp_wali?: string;
  nomor_whatsapp?: string; // Legacy field
  status?: MuridStatus;
  status_aktif?: boolean; // Legacy field
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

// ============ KBM MODULE ============

export interface Jadwal {
  id: string;
  user_id: string;
  kelas_id: string;
  mapel_id: string;
  semester_id: string;
  tahun_ajaran_id: string;
  hari: Hari;
  jam_mulai: string;
  jam_selesai: string;
  ruangan?: string;
  warna?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
  // Relations
  kelas?: Kelas;
  mapel?: MataPelajaran;
  semester?: Semester;
  tahun_ajaran?: TahunAjaran;
}

export interface JurnalKBM {
  id: string;
  user_id: string;
  jadwal_id?: string;
  kelas?: string;
  pelajaran?: string;
  tanggal: string;
  materi?: string;
  target?: string;
  realisasi?: string;
  metode?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
  // Relations
  jadwal?: Jadwal;
}

export interface Absensi {
  id: string;
  user_id: string;
  jadwal_id?: string;
  murid_id?: string;
  tanggal: string;
  status?: StatusAbsensi;
  keterangan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
  // Relations
  jadwal?: Jadwal;
  murid?: Murid;
}

// ============ PENILAIAN MODULE ============

export interface Penilaian {
  id: string;
  user_id: string;
  kelas?: string;
  mapel?: string;
  nama_penilaian: string;
  jenis?: JenisPenilaian;
  bobot?: number;
  tanggal: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface DetailNilai {
  id: string;
  user_id: string;
  penilaian_id?: string;
  murid_id?: string;
  nilai?: number;
  catatan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
  // Relations
  penilaian?: Penilaian;
  murid?: Murid;
}

export interface Sikap {
  id: string;
  user_id: string;
  murid_id?: string;
  tanggal: string;
  disiplin?: number;
  adab?: number;
  kerajinan?: number;
  kejujuran?: number;
  tanggung_jawab?: number;
  catatan?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
  // Relations
  murid?: Murid;
}

// ============ PRODUKTIVITAS MODULE ============

export interface CatatanGuru {
  id: string;
  user_id: string;
  kategori: KategoriCatatan;
  judul: string;
  isi?: string;
  tanggal_waktu?: string;
  lokasi?: string;
  status: StatusCatatan;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

// ============ INFORMASI & PENDUKUNG ============

export interface Agenda {
  id: string;
  user_id: string;
  judul: string;
  isi?: string;
  tanggal: string;
  jam?: string;
  selesai?: string;
  warna?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface Pengumuman {
  id: string | number;
  user_id: string;
  judul: string;
  isi?: string;
  kategori?: string; // For legacy table compatibility
  jenis?: string; // Pengumuman | Agenda | Peringatan | Penting
  prioritas?: string; // Normal | Penting | Darurat
  aktif?: boolean;
  tanggal?: string; // For legacy table compatibility
  tanggal_mulai?: string;
  tanggal_selesai?: string;
  status?: string; // Draft | Publish | Arsip
  lampiran?: string;
  dibuat_oleh?: string;
  created_at: string;
  updated_at?: string;
  deleted_at?: string;
  is_active?: boolean;
}

export interface Ruangan {
  id: string;
  user_id: string;
  nama_ruangan: string;
  kode?: string;
  kapasitas?: number;
  keterangan?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface IzinMengajar {
  id: string;
  user_id: string;
  nama_ustaz: string;
  jenis_izin: string; // Sakit | Izin | Cuti | Tugas | Lainnya
  lama_izin: string; // hari_ini | beberapa_hari
  tanggal_mulai: string;
  tanggal_selesai?: string;
  mata_pelajaran?: string;
  kelas?: string;
  guru_pengganti?: string;
  catatan?: string;
  status: string; // diajukan | disetujui | ditolak
  created_at: string;
  updated_at?: string;
}

export interface Notifikasi {
  id: string;
  user_id: string;
  judul: string;
  pesan: string;
  dibaca: boolean;
  created_at: string;
}

export interface LogAktivitas {
  id: string;
  user_id?: string;
  aktivitas: string;
  nama_tabel?: string;
  data_id?: string;
  ip_address?: string;
  device?: string;
  created_at: string;
}

// ============ LAIN-LAIN ============

export interface Materi {
  id: string;
  user_id: string;
  kelas_id?: string;
  mapel_id?: string;
  judul: string;
  isi?: string;
  lampiran?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface PresensiGuru {
  id: string;
  user_id: string;
  tanggal: string;
  jam_masuk?: string;
  jam_keluar?: string;
  lokasi?: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
}

export interface Soal {
  id: string;
  user_id: string;
  kelas_id?: string;
  mapel_id?: string;
  judul: string;
  pertanyaan: string;
  jawaban?: string;
  tingkat?: string;
  lampiran?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  is_active: boolean;
}

export interface RaporFinal {
  id: string;
  user_id: string;
  murid_id?: string;
  semester_id?: string;
  tahun_ajaran_id?: string;
  nilai_akhir?: number;
  predikat?: string;
  deskripsi?: string;
  created_at: string;
  updated_at: string;
}

export interface WAQueue {
  id: string;
  user_id: string;
  tujuan_nomor: string;
  pesan: string;
  status: StatusWA;
  jenis?: string;
  created_at: string;
  sent_at?: string;
}

export interface LogPerubahanNilai {
  id: string;
  detail_nilai_id?: string;
  nilai_lama?: number;
  nilai_baru?: number;
  diubah_oleh?: string;
  waktu_ubah: string;
}

// ============ APP TYPES ============

export type ActiveTab =
  | 'dashboard'
  | 'jadwal'
  | 'murid'
  | 'absensi'
  | 'jurnal'
  | 'nilai'
  | 'sikap'
  | 'catatan'
  | 'soal'
  | 'izin'
  | 'rapor'
  | 'pengumuman'
  | 'admin';

export type ShowToast = (message: string, type?: 'success' | 'error' | 'info') => void;

// Form types
export interface MuridFormData {
  nama: string;
  kelas_id?: string;
  nis?: string;
  jenis_kelamin?: 'L' | 'P';
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  nama_wali?: string;
  no_hp_wali?: string;
  status: MuridStatus;
}

export interface JadwalFormData {
  kelas_id: string;
  mapel_id: string;
  semester_id: string;
  tahun_ajaran_id: string;
  hari: Hari;
  jam_mulai: string;
  jam_selesai: string;
  ruangan?: string;
  warna?: string;
}

// ============ LEGACY TYPES (for existing tables) ============

// Legacy: jadwal_mengajar table (text kelas, no FK)
export interface JadwalMengajar {
  id: string;
  hari: string;
  jam_mulai: string;
  jam_selesai: string;
  kelas: string;
  pelajaran: string;
  ruangan?: string;
  catatan?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// Legacy: bank_soal table
export interface BankSoal {
  id: string;
  pelajaran: string;
  kelas: string;
  batasan?: string;
  isi_soal: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// Legacy: agenda_penting table (bigint id)
export interface AgendaPenting {
  id: number;
  judul: string;
  catatan?: string;
  jenis: string;
  tanggal: string;
  user_id: string;
  created_at: string;
}

// Legacy: nilai table
export interface Nilai {
  id: string;
  murid_id: string;
  pelajaran: string;
  jenis_ujian: string;
  skor: number;
  tanggal: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// Legacy: catatan_perilaku table
export interface CatatanPerilaku {
  id: string;
  murid_id: string;
  jenis: 'prestasi' | 'pelanggaran' | 'catatan';
  catatan: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

// Legacy: capaian_hafalan table
export interface CapaianHafalan {
  id: string;
  murid_id: string;
  capaian: string;
  tanggal: string;
  user_id: string;
  created_at: string;
}

// Legacy: buku_saku table (bigint id)
export interface BukuSaku {
  id: number;
  kelas_id?: number;
  pelajaran: string;
  bab_terakhir?: string;
  halaman_terakhir?: string;
  catatan?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  kelas?: { nama_kelas: string };
}

// Legacy: muhafadhoh table (bigint id)
export interface Muhafadhoh {
  id: number;
  kelas_id?: number;
  tanggal: string;
  materi?: string;
  target_hafalan?: string;
  catatan?: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  kelas?: { nama_kelas: string };
}

// Legacy: kbm_harian table (bigint id)
export interface KbmHarian {
  id: number;
  tanggal: string;
  kelas_id?: number;
  pelajaran?: string;
  materi?: string;
  catatan?: string;
  durasi?: number;
  selesai: boolean;
  user_id: string;
  created_at: string;
  updated_at?: string;
}
