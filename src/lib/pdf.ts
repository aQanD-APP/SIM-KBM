import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function generatePDF(
  title: string,
  headers: string[],
  body: (string | number)[][],
  extraInfo: string[] = []
) {
  const doc = new jsPDF();
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(5, 150, 105);
  doc.text(title, 14, 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  let startY = 26;
  extraInfo.forEach(info => {
    doc.text(info, 14, startY);
    startY += 5;
  });

  (doc as any).autoTable({
    startY: startY + 4,
    head: [headers],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [255, 255, 255],
    },
    styles: {
      fontSize: 8,
      font: 'Helvetica',
      textColor: [51, 65, 85],
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${title.replace(/ /g, '_')}.pdf`);
}

export function generateRaporPDF(
  murid: { nama: string; kelas: string; domisili?: string; alamat?: string },
  absenData: { hadir: number; izin: number; sakit: number; alpha: number; total: number },
  nilaiList: { pelajaran: string; jenis_ujian: string; skor: number }[],
  perilakuList: { catatan: string; jenis: string; created_at?: string }[],
  capaianList: { capaian: string; tanggal: string }[],
  ustadzEmail?: string
) {
  const doc = new jsPDF();

  // Header
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(5, 150, 105);
  doc.text('RAPOR AKADEMIK SANTRI', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Sistem Informasi Manajemen KBM Ustaz', 105, 27, { align: 'center' });

  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Data Diri
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'bold');
  doc.text('DATA SANTRI', 14, 40);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  const dataDiri = [
    ['Nama Lengkap', murid.nama],
    ['Kelas', murid.kelas],
    ['Domisili', murid.domisili || '-'],
    ['Alamat', murid.alamat || '-'],
    ['Pengajar', ustadzEmail?.split('@')[0] || 'Ustaz'],
    ['Tanggal Cetak', new Date().toLocaleDateString('id-ID')],
  ];

  let y = 46;
  dataDiri.forEach(([label, value]) => {
    doc.setFont('Helvetica', 'bold');
    doc.text(`${label}`, 14, y);
    doc.setFont('Helvetica', 'normal');
    doc.text(`: ${value}`, 55, y);
    y += 6;
  });

  // Absensi
  y += 4;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REKAPITULASI KEHADIRAN', 14, y);
  y += 6;

  const absenHeaders = ['Status', 'Jumlah', 'Persentase'];
  const absenBody = [
    ['Hadir', absenData.hadir.toString(), `${absenData.total > 0 ? ((absenData.hadir / absenData.total) * 100).toFixed(1) : 0}%`],
    ['Izin', absenData.izin.toString(), `${absenData.total > 0 ? ((absenData.izin / absenData.total) * 100).toFixed(1) : 0}%`],
    ['Sakit', absenData.sakit.toString(), `${absenData.total > 0 ? ((absenData.sakit / absenData.total) * 100).toFixed(1) : 0}%`],
    ['Alpha', absenData.alpha.toString(), `${absenData.total > 0 ? ((absenData.alpha / absenData.total) * 100).toFixed(1) : 0}%`],
    ['Total', absenData.total.toString(), '100%'],
  ];

  (doc as any).autoTable({
    startY: y,
    head: [absenHeaders],
    body: absenBody,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], fontSize: 9, textColor: [255, 255, 255] },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Nilai
  if (nilaiList.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NILAI UJIAN', 14, y);
    y += 6;

    (doc as any).autoTable({
      startY: y,
      head: [['Mata Pelajaran', 'Jenis Ujian', 'Skor']],
      body: nilaiList.map(n => [n.pelajaran, n.jenis_ujian, n.skor.toString()]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontSize: 9, textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Capaian Hafalan
  if (capaianList.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CAPAIAN HAFALAN', 14, y);
    y += 6;

    (doc as any).autoTable({
      startY: y,
      head: [['Tanggal', 'Capaian']],
      body: capaianList.map(c => [c.tanggal, c.capaian]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontSize: 9, textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Catatan Perilaku
  if (perilakuList.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CATATAN PERILAKU', 14, y);
    y += 6;

    (doc as any).autoTable({
      startY: y,
      head: [['Jenis', 'Tanggal', 'Catatan']],
      body: perilakuList.map(p => [
        p.jenis === 'prestasi' ? 'Prestasi' : p.jenis === 'pelanggaran' ? 'Pelanggaran' : 'Catatan',
        new Date(p.created_at || new Date()).toLocaleDateString('id-ID'),
        p.catatan,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], fontSize: 9, textColor: [255, 255, 255] },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Dokumen ini dihasilkan oleh SIM KBM Ustaz', 105, pageHeight - 10, { align: 'center' });

  doc.save(`Rapor_${murid.nama.replace(/ /g, '_')}.pdf`);
}

export function shareWA(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}
