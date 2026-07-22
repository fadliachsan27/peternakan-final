// ---------------------------------------------------------------------
// Daftar resmi "Sektor/Instansi" beserta daftar tindakan baku milik
// masing-masing sektor (dipakai fitur "Akses Tindakan per Dokter").
//
// Alurnya:
//   1. Admin utama membuka halaman "Role", lalu untuk tiap dokter memilih
//      satu atau lebih SEKTOR di sini (mis. "UPTD Peternakan / Puskeswan").
//   2. Begitu sebuah sektor dipilih untuk seorang dokter, SEMUA tindakan
//      yang ada di dalam sektor itu otomatis jadi bisa diakses dokter
//      tersebut di halaman "Daftar Tindakan" (tidak perlu dipilih satu-satu).
//   3. Satu dokter boleh punya lebih dari satu sektor sekaligus.
//
// Kalau suatu saat daftarnya berubah (nama sektor baru, tindakan baru/
// dihapus, dsb), cukup ubah array ini saja -- lihat scripts/init-db.js &
// database/schema.sql untuk proses seed otomatis ke tabel `tindakan`.
// ---------------------------------------------------------------------

const SEKTOR_TINDAKAN = [
  {
    nama: 'UPTD Peternakan / Puskeswan',
    tindakan: [
      'Verifikasi laporan',
      'Investigasi lapangan',
      'Observasi hewan',
      'Pemeriksaan klinis',
      'Pengambilan sampel',
      'Pengiriman sampel ke laboratorium',
      'Isolasi hewan',
      'Karantina lokasi',
      'Pengobatan',
      'Vaksinasi',
      'Vaksinasi ring',
      'Depopulasi (bila diperlukan)',
      'Disinfeksi kandang',
      'Edukasi pemilik ternak',
      'Pelacakan kontak hewan',
      'Penutupan kasus',
      'Monitoring lanjutan',
      'Rujuk ke dokter hewan'
    ]
  },
  {
    nama: 'Dinas Peternakan Kabupaten',
    tindakan: [
      'Verifikasi administrasi',
      'Penugasan petugas',
      'Koordinasi lintas sektor',
      'Investigasi epidemiologi',
      'Pengiriman logistik',
      'Distribusi vaksin',
      'Distribusi obat',
      'Pelaporan ke Provinsi',
      'Pelaporan ke iSIKHNAS',
      'Pelaporan ke SIZE',
      'Monitoring kasus',
      'Penetapan status kejadian',
      'Penutupan kasus'
    ]
  },
  {
    nama: 'Puskesmas',
    tindakan: [
      'Pemeriksaan korban',
      'Pemberian VAR',
      'Pemberian SAR',
      'Pengobatan',
      'Observasi pasien',
      'Edukasi pasien',
      'Pelaporan ke Dinas Kesehatan',
      'Rujuk ke Rumah Sakit'
    ]
  },
  {
    nama: 'Rumah Sakit',
    tindakan: [
      'Pemeriksaan pasien',
      'Rawat jalan',
      'Rawat inap',
      'Pemberian VAR',
      'Pemberian SAR',
      'Isolasi pasien',
      'Pemeriksaan laboratorium',
      'Pelaporan Dinas Kesehatan'
    ]
  },
  {
    nama: 'Dinas Kesehatan',
    tindakan: [
      'Investigasi epidemiologi',
      'Surveilans kontak',
      'Koordinasi One Health',
      'Edukasi masyarakat',
      'Pelaporan nasional',
      'Monitoring pasien',
      'Penutupan kasus'
    ]
  },
  {
    nama: 'Kecamatan',
    tindakan: [
      'Koordinasi lintas desa',
      'Penyebaran informasi',
      'Monitoring wilayah',
      'Pendampingan petugas'
    ]
  },
  {
    nama: 'Pemerintah Desa',
    tindakan: [
      'Verifikasi lokasi',
      'Pendataan ternak',
      'Pendataan korban',
      'Sosialisasi',
      'Penyebaran informasi',
      'Membantu isolasi lokasi',
      'Pendampingan petugas'
    ]
  },
  {
    nama: 'BPBD',
    tindakan: [
      'Penanganan kedaruratan',
      'Bantuan logistik',
      'Pengamanan lokasi',
      'Dukungan operasional'
    ]
  },
  {
    nama: 'Polisi',
    tindakan: [
      'Pengamanan lokasi',
      'Pengaturan lalu lintas',
      'Pendampingan evakuasi',
      'Penegakan hukum'
    ]
  },
  {
    nama: 'Laboratorium Veteriner',
    tindakan: [
      'Penerimaan sampel',
      'Pemeriksaan laboratorium',
      'Konfirmasi hasil',
      'Pelaporan hasil'
    ]
  },
  {
    nama: 'Masyarakat / Pelapor',
    tindakan: [
      'Mengirim foto',
      'Mengirim video',
      'Mengirim lokasi GPS',
      'Melaporkan kasus',
      'Melakukan observasi',
      'Mengisolasi hewan',
      'Tidak menyentuh bangkai',
      'Menunggu petugas'
    ]
  }
];

// Daftar nama sektor saja (dipakai untuk validasi input).
const SEKTOR_NAMA_LIST = SEKTOR_TINDAKAN.map((s) => s.nama);

module.exports = { SEKTOR_TINDAKAN, SEKTOR_NAMA_LIST };
