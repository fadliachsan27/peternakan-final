// ---------------------------------------------------------------------
// Daftar resmi 47 kecamatan di Kabupaten Sukabumi. Dipakai sebagai daftar
// pilihan lengkap di fitur admin "Akses Admin" saat memilih kecamatan mana
// saja yang jadi wilayah kerja seorang dokter, dan untuk validasi supaya
// tidak ada nama kecamatan yang salah ketik/tidak dikenal.
//
// Kalau suatu saat cakupan wilayahnya berubah (pemekaran kecamatan, dsb),
// cukup ubah array ini saja.
// ---------------------------------------------------------------------

const KECAMATAN_MASTER = [
  'Bantargadung', 'Bojonggenteng', 'Caringin', 'Ciambar', 'Cibadak',
  'Cibitung', 'Cicantayan', 'Cicurug', 'Cidadap', 'Cidahu', 'Cidolog',
  'Ciemas', 'Cikakak', 'Cikembar', 'Cikidang', 'Cimanggu', 'Ciracap',
  'Cireunghas', 'Cisaat', 'Cisolok', 'Curugkembar', 'Gegerbitung',
  'Gunungguruh', 'Jampangkulon', 'Jampangtengah', 'Kabandungan',
  'Kadudampit', 'Kalapanunggal', 'Kalibunder', 'Kebonpedes', 'Lengkong',
  'Nagrak', 'Nyalindung', 'Pabuaran', 'Palabuhanratu', 'Parakansalak',
  'Parungkuda', 'Purabaya', 'Sagaranten', 'Simpenan', 'Sukabumi',
  'Sukalarang', 'Sukaraja', 'Surade', 'Tegalbuleud', 'Waluran',
  'Warungkiara'
].sort((a, b) => a.localeCompare(b));

module.exports = { KECAMATAN_MASTER };
