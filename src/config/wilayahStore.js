// ---------------------------------------------------------------------
// Dulu daftar wilayah kerja dokter (WILAYAH) hardcode di src/config/wilayah.js.
// Sekarang datanya disimpan di database (tabel `wilayah` + `users`) supaya
// bisa dikelola admin utama lewat halaman "Akses Admin" tanpa ubah kode.
//
// Supaya SEMUA kode lain yang sudah ada (src/utils/wilayah.js dan seluruh
// route yang memakainya) tetap bisa membaca datanya secara SINKRON seperti
// sebelumnya (tidak perlu diubah jadi async satu-satu di banyak tempat),
// data dari database di-cache dulu di memori lewat reload(), dan
// dipanggil ulang setiap kali ada perubahan (tambah/ubah/hapus dokter
// lewat fitur Akses Admin) supaya cache selalu sinkron dengan database.
// ---------------------------------------------------------------------

const pool = require('./db');

let cache = [];

function parseKecamatan(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Ambil ulang data wilayah dari database dan simpan ke cache di memori.
// Digabung dengan data akun (username, nama dokter, status aktif) dari
// tabel users yang wilayah_id-nya menunjuk ke wilayah tersebut.
async function reload() {
  const [rows] = await pool.query(
    `SELECT w.id, w.nama, w.wa, w.kecamatan,
            u.id AS user_id, u.username, u.nama AS dokter, u.aktif AS user_aktif
     FROM wilayah w
     LEFT JOIN users u ON u.wilayah_id = w.id
     ORDER BY w.id ASC`
  );

  cache = rows.map((r) => ({
    id: r.id,
    nama: r.nama,
    wa: r.wa || '',
    kecamatan: parseKecamatan(r.kecamatan),
    user_id: r.user_id || null,
    username: r.username || null,
    dokter: r.dokter || '-',
    aktif: r.user_aktif === null || r.user_aktif === undefined ? true : !!r.user_aktif
  }));

  return cache;
}

// Kembalikan data yang sedang di-cache (dipanggil sangat sering dari
// src/utils/wilayah.js, jadi harus sinkron/tidak perlu await).
function getAll() {
  return cache;
}

module.exports = { reload, getAll };
