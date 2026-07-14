// ---------------------------------------------------------------------
// Master data pembagian WILAYAH KERJA dokter hewan (drh.) di Kabupaten
// Sukabumi. Satu wilayah = satu akun admin/dokter, dan setiap wilayah
// hanya menaungi beberapa kecamatan tertentu.
//
// Dipakai untuk:
//  - Menentukan kecamatan mana saja yang boleh dilihat/diisi oleh akun
//    admin tertentu (lihat src/utils/wilayah.js).
//  - Seed akun login dokter tiap wilayah (lihat scripts/init-db.js).
//  - Menentukan nomor WhatsApp tujuan saat ada pengajuan baru masuk dari
//    kecamatan tertentu (lihat src/routes/pengajuan.js).
//
// Kalau suatu saat pembagian wilayah/kecamatan berubah, atau ada dokter
// baru, cukup ubah array WILAYAH di bawah ini -- tidak perlu ubah logic
// di tempat lain.
// ---------------------------------------------------------------------

const WILAYAH = [
  {
    id: 1,
    nama: 'Wilayah 1',
    username: 'reyhan',
    dokter: 'drh. Reyhan Firdaus',
    wa: '6285274463391',
    kecamatan: [
      'Sukalarang', 'Sukaraja', 'Sukabumi', 'Cisaat', 'Kadudampit',
      'Gunungguruh', 'Kebonpedes', 'Cireunghas', 'Gegerbitung'
    ]
  },
  {
    id: 2,
    nama: 'Wilayah 2',
    username: 'utari',
    dokter: 'drh. Utari Wardiani',
    wa: '6285719304190',
    kecamatan: [
      'Cibadak', 'Cikidang', 'Cikembar', 'Ciambar', 'Nagrak',
      'Cicantayan', 'Caringin'
    ]
  },
  {
    id: 3,
    nama: 'Wilayah 3',
    username: 'kodrat',
    dokter: 'drh. Kodrat ZB',
    wa: '6285724978775',
    kecamatan: [
      'Cicurug', 'Cidahu', 'Parungkuda', 'Parakansalak',
      'Bojonggenteng', 'Kalapanunggal', 'Kabandungan'
    ]
  },
  {
    id: 4,
    nama: 'Wilayah 4',
    username: 'fahmi',
    dokter: 'drh. Fahmi',
    wa: '628115220887',
    kecamatan: [
      'Warungkiara', 'Bantargadung', 'Simpenan', 'Palabuhanratu',
      'Cikakak', 'Cisolok'
    ]
  },
  {
    id: 5,
    nama: 'Wilayah 5',
    username: 'supika',
    dokter: 'drh. Muhamad Supika',
    wa: '628557056309',
    kecamatan: [
      'Purabaya', 'Nyalindung', 'Jampangtengah', 'Lengkong'
    ]
  },
  {
    id: 6,
    nama: 'Wilayah 6',
    username: 'pilar',
    dokter: 'drh. Pilar Patria',
    wa: '6285720624609',
    kecamatan: [
      'Ciemas', 'Ciracap', 'Waluran', 'Surade', 'Cibitung',
      'Jampangkulon', 'Kalibunder', 'Cimanggu'
    ]
  },
  {
    id: 7,
    nama: 'Wilayah 7',
    username: 'madya',
    dokter: 'drh. Madya Adi Waskita',
    wa: '6285732055232',
    kecamatan: [
      'Sagaranten', 'Curugkembar', 'Cidadap', 'Pabuaran', 'Cidolog',
      'Tegalbuleud'
    ]
  }
];

// Password default akun dokter (bisa/sebaiknya diganti sendiri lewat
// halaman Pengaturan > Ganti Password setelah login pertama kali).
const DEFAULT_WILAYAH_PASSWORD = 'dokter123';

module.exports = { WILAYAH, DEFAULT_WILAYAH_PASSWORD };