const wilayahStore = require('../config/wilayahStore');

// Catatan: WILAYAH di sini SELALU diambil lewat wilayahStore.getAll() (cache
// di memori yang bersumber dari tabel `wilayah` + `users` di database), BUKAN
// lagi dari src/config/wilayah.js yang statis. Cache ini dimuat saat server
// start dan disegarkan otomatis setiap ada perubahan lewat fitur admin
// "Akses Admin" (tambah/ubah/hapus dokter, ubah kecamatan, ubah nomor WA).
function getWilayahAll() {
  return wilayahStore.getAll();
}

function getWilayahById(wilayahId) {
  if (wilayahId === null || wilayahId === undefined) return null;
  return getWilayahAll().find(w => w.id === Number(wilayahId)) || null;
}

// Kembalikan daftar kecamatan untuk wilayah_id tertentu.
// wilayah_id NULL/undefined = admin utama (super admin) -> null artinya
// "tidak dibatasi, boleh akses semua kecamatan".
function getKecamatanList(wilayahId) {
  const w = getWilayahById(wilayahId);
  return w ? w.kecamatan : null;
}

// Versi lowercase+trim, dipakai untuk perbandingan/filter SQL supaya tidak
// sensitif huruf besar/kecil atau spasi berlebih.
function getKecamatanListLower(wilayahId) {
  const list = getKecamatanList(wilayahId);
  return list ? list.map(k => k.trim().toLowerCase()) : null;
}

function normalizeKec(str) {
  return String(str || '').trim().toLowerCase();
}

// Cek apakah suatu nama kecamatan boleh diakses oleh wilayah_id tertentu.
// wilayah_id NULL -> selalu boleh (admin utama/super admin, semua wilayah).
function isKecamatanAllowed(kecamatan, wilayahId) {
  const list = getKecamatanListLower(wilayahId);
  if (!list) return true; // super admin, tidak dibatasi
  return list.includes(normalizeKec(kecamatan));
}

// Cari wilayah yang menaungi suatu kecamatan (dipakai untuk routing WA
// notifikasi pengajuan baru ke dokter yang tepat).
function findWilayahByKecamatan(kecamatan) {
  const target = normalizeKec(kecamatan);
  if (!target) return null;
  return getWilayahAll().find(w => w.kecamatan.some(k => k.trim().toLowerCase() === target)) || null;
}

// Ambil nama dokter penanggung jawab wilayah untuk suatu kecamatan.
// Dipakai untuk mengisi kolom "sektor" (yang sekarang menyimpan NAMA
// DOKTER, bukan sektor Hewan/Manusia/Lingkungan lagi) secara otomatis
// di server -- supaya nilainya selalu konsisten dan tidak bisa
// dimanipulasi dari input form.
function getDokterByKecamatan(kecamatan) {
  const w = findWilayahByKecamatan(kecamatan);
  return w ? w.dokter : '-';
}

// Bangun klausa SQL "kolom IN (?, ?, ...)" beserta parameternya untuk
// membatasi hasil query hanya pada kecamatan milik wilayah_id tertentu.
// Kalau wilayahId NULL (super admin), kembalikan where kosong (tanpa batasan).
function buildKecamatanWhereClause(kolom, wilayahId) {
  const list = getKecamatanListLower(wilayahId);
  if (!list || !list.length) return { where: '', params: [] };
  const placeholders = list.map(() => '?').join(',');
  return {
    where: `LOWER(TRIM(${kolom})) IN (${placeholders})`,
    params: list
  };
}

module.exports = {
  getWilayahAll,
  getWilayahById,
  getKecamatanList,
  getKecamatanListLower,
  isKecamatanAllowed,
  findWilayahByKecamatan,
  getDokterByKecamatan,
  buildKecamatanWhereClause
};
