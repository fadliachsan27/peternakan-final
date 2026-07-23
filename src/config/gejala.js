// Daftar master "Gejala" (jadi checkbox multi-pilih di form Pengajuan
// Masyarakat maupun form Tambah/Edit Data Kasus di admin) beserta pemetaan
// ke "Kemungkinan Penyakit Zoonosis"-nya. Satu-satunya sumber data (dipakai
// lewat endpoint publik /api/gejala, lihat src/routes/gejalaPublic.js),
// supaya form pelapor & tampilan detail admin selalu sinkron.
//
// `code` dipakai sebagai value yang disimpan di kolom `gejala` (JSON array
// of code) pada tabel pengajuan & kasus -- BUKAN labelnya -- supaya kalau
// suatu saat label gejala diubah/diperbaiki redaksinya, data yang sudah
// tersimpan tidak perlu dimigrasikan.
const GEJALA_LIST = [
  { code: 'g01', label: 'Mati mendadak', penyakit: ['Antraks', 'Avian Influenza (unggas)', 'Rabies', 'Leptospirosis (akut)', 'Salmonellosis (septikemia)'] },
  { code: 'g02', label: 'Menggigit manusia tanpa provokasi', penyakit: ['Rabies'] },
  { code: 'g03', label: 'Menggigit hewan lain', penyakit: ['Rabies'] },
  { code: 'g04', label: 'Perubahan perilaku', penyakit: ['Rabies', 'Japanese Encephalitis'] },
  { code: 'g05', label: 'Agresif', penyakit: ['Rabies'] },
  { code: 'g06', label: 'Air liur berlebihan (hipersalivasi)', penyakit: ['Rabies'] },
  { code: 'g07', label: 'Sulit menelan', penyakit: ['Rabies'] },
  { code: 'g08', label: 'Rahang menggantung', penyakit: ['Rabies'] },
  { code: 'g09', label: 'Kejang', penyakit: ['Rabies', 'Japanese Encephalitis', 'Streptococcus suis'] },
  { code: 'g10', label: 'Gemetar', penyakit: ['Rabies', 'Japanese Encephalitis'] },
  { code: 'g11', label: 'Kelumpuhan', penyakit: ['Rabies', 'Japanese Encephalitis', 'Streptococcus suis'] },
  { code: 'g12', label: 'Sulit berjalan / Ataksia', penyakit: ['Japanese Encephalitis', 'Streptococcus suis'] },
  { code: 'g13', label: 'Batuk kronis', penyakit: ['Tuberkulosis Bovine'] },
  { code: 'g14', label: 'Sesak napas', penyakit: ['Avian Influenza', 'Tuberkulosis Bovine'] },
  { code: 'g15', label: 'Keluar lendir dari hidung', penyakit: ['Avian Influenza', 'Psittacosis'] },
  { code: 'g16', label: 'Pembengkakan kepala', penyakit: ['Avian Influenza'] },
  { code: 'g17', label: 'Jengger/Pial kebiruan', penyakit: ['Avian Influenza'] },
  { code: 'g18', label: 'Diare', penyakit: ['Salmonellosis', 'Campylobacteriosis', 'Leptospirosis'] },
  { code: 'g19', label: 'Diare berdarah', penyakit: ['Salmonellosis'] },
  { code: 'g20', label: 'Abortus', penyakit: ['Bruselosis', 'Leptospirosis', 'Q Fever', 'Toksoplasmosis', 'Campylobacteriosis'] },
  { code: 'g21', label: 'Abortus massal', penyakit: ['Bruselosis', 'Q Fever', 'Toksoplasmosis'] },
  { code: 'g22', label: 'Retensi plasenta', penyakit: ['Bruselosis', 'Q Fever'] },
  { code: 'g23', label: 'Anak lahir mati', penyakit: ['Bruselosis', 'Toksoplasmosis', 'Q Fever'] },
  { code: 'g24', label: 'Infertilitas', penyakit: ['Bruselosis'] },
  { code: 'g25', label: 'Produksi susu menurun', penyakit: ['Bruselosis', 'Leptospirosis', 'Tuberkulosis Bovine'] },
  { code: 'g26', label: 'Radang testis (orchitis)', penyakit: ['Bruselosis'] },
  { code: 'g27', label: 'Mata merah', penyakit: ['Leptospirosis'] },
  { code: 'g28', label: 'Mata menguning (ikterus)', penyakit: ['Leptospirosis'] },
  { code: 'g29', label: 'Selaput lendir pucat', penyakit: ['Leptospirosis', 'Fasciolosis'] },
  { code: 'g30', label: 'Urine merah/cokelat', penyakit: ['Leptospirosis'] },
  { code: 'g31', label: 'Perdarahan dari hidung', penyakit: ['Antraks'] },
  { code: 'g32', label: 'Perdarahan dari mulut', penyakit: ['Antraks'] },
  { code: 'g33', label: 'Perdarahan dari anus', penyakit: ['Antraks'] },
  { code: 'g34', label: 'Perdarahan dari vagina', penyakit: ['Antraks'] },
  { code: 'g35', label: 'Darah tidak membeku', penyakit: ['Antraks'] },
  { code: 'g36', label: 'Bangkai cepat membusuk', penyakit: ['Antraks'] },
  { code: 'g37', label: 'Luka pada bibir', penyakit: ['Orf'] },
  { code: 'g38', label: 'Luka pada mulut', penyakit: ['Orf'] },
  { code: 'g39', label: 'Luka pada puting', penyakit: ['Orf'] },
  { code: 'g40', label: 'Keropeng/Kerak kulit', penyakit: ['Orf', 'Dermatofitosis (Ringworm)', 'Skabies'] },
  { code: 'g41', label: 'Lesi melingkar', penyakit: ['Dermatofitosis (Ringworm)'] },
  { code: 'g42', label: 'Rambut rontok', penyakit: ['Dermatofitosis (Ringworm)', 'Skabies'] },
  { code: 'g43', label: 'Gatal hebat', penyakit: ['Skabies'] },
  { code: 'g44', label: 'Kulit menebal', penyakit: ['Skabies'] },
  { code: 'g45', label: 'Benjolan kulit', penyakit: ['Dermatofitosis', 'Skabies'] },
  { code: 'g46', label: 'Penurunan produksi telur', penyakit: ['Avian Influenza'] },
  { code: 'g47', label: 'Telur abnormal', penyakit: ['Avian Influenza'] },
  { code: 'g48', label: 'Kematian unggas mendadak', penyakit: ['Avian Influenza', 'Salmonellosis'] },
  { code: 'g49', label: 'Sayap terkulai', penyakit: ['Avian Influenza'] },
  { code: 'g50', label: 'Diare hijau (unggas)', penyakit: ['Avian Influenza'] },
  { code: 'g51', label: 'Banyak tikus di sekitar kandang', penyakit: ['Leptospirosis'] },
  { code: 'g52', label: 'Banyak nyamuk di sekitar kandang', penyakit: ['Japanese Encephalitis'] },
  { code: 'g53', label: 'Kontak dengan bangkai', penyakit: ['Antraks', 'Rabies'] },
  { code: 'g54', label: 'Riwayat gigitan HPR', penyakit: ['Rabies'] },
  { code: 'g55', label: 'Riwayat kontak dengan hewan sakit', penyakit: ['Semua zoonosis (faktor risiko)'] },
  { code: 'g56', label: 'Riwayat pemasukan hewan baru', penyakit: ['Bruselosis', 'Tuberkulosis Bovine', 'Avian Influenza', 'Antraks'] },
  { code: 'g57', label: 'Belum pernah divaksin', penyakit: ['Rabies', 'Avian Influenza (bila program vaksinasi diterapkan)'] }
];

// Daftar "Jenis Hewan" untuk dropdown di form Pengajuan Masyarakat & form
// Tambah/Edit Data Kasus (kolom kiri, berdampingan dengan Gejala di kolom
// kanan). Catatan: daftar ini adalah asumsi berdasarkan jenis hewan yang
// relevan dengan daftar gejala/penyakit di atas -- silakan sesuaikan
// isinya kalau ada jenis hewan lain yang perlu ditambahkan.
const JENIS_HEWAN_LIST = [
  'Anjing',
  'Kucing',
  'Kera/Primata',
  'Sapi',
  'Kerbau',
  'Kambing',
  'Domba',
  'Babi',
  'Kuda',
  'Unggas (Ayam/Itik/Bebek)',
  'Kelinci',
  'Lainnya'
];

// Ambil daftar nama penyakit (unik, urutan sesuai kemunculan pertama) dari
// sekumpulan kode gejala yang dipilih. Dipakai baik di server (untuk
// menyimpan snapshot "Kemungkinan Penyakit" saat pengajuan/kasus dibuat)
// maupun bisa dipakai ulang logikanya di frontend.
function getPenyakitFromGejalaCodes(codes) {
  if (!Array.isArray(codes)) return [];
  const set = new Set();
  const hasil = [];
  for (const code of codes) {
    const g = GEJALA_LIST.find((x) => x.code === code);
    if (!g) continue;
    for (const p of g.penyakit) {
      if (!set.has(p)) {
        set.add(p);
        hasil.push(p);
      }
    }
  }
  return hasil;
}

// Ambil daftar label gejala (bukan kode) dari sekumpulan kode yang dipilih,
// dipakai untuk mengisi kolom "jenis_penyakit" (dipakai di tabel & pesan WA)
// supaya tetap berupa teks yang enak dibaca seperti sebelumnya.
function getLabelsFromGejalaCodes(codes) {
  if (!Array.isArray(codes)) return [];
  return codes
    .map((code) => {
      const g = GEJALA_LIST.find((x) => x.code === code);
      return g ? g.label : null;
    })
    .filter(Boolean);
}

module.exports = { GEJALA_LIST, JENIS_HEWAN_LIST, getPenyakitFromGejalaCodes, getLabelsFromGejalaCodes };
