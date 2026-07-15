// Endpoint publik (tanpa login) yang mengembalikan pemetaan kecamatan ->
// nama dokter penanggung jawab wilayah, berdasarkan data yang dikelola
// admin utama lewat fitur "Akses Admin". Dipakai oleh public/js/wilayah.js
// untuk auto-isi field "Nama Dokter" di form Ajukan Data (publik) dan form
// Tambah/Edit Data Kasus (admin), supaya datanya selalu sinkron dengan
// pembagian wilayah terbaru tanpa perlu hardcode di frontend.
const express = require('express');
const wilayahStore = require('../config/wilayahStore');

const router = express.Router();

router.get('/', async (req, res) => {
  // Jaring pengaman: kalau proses baru menyala (mis. hosting yang
  // me-restart/tidur-kan proses Node saat idle) dan cache di memori masih
  // kosong, coba muat ulang dulu dari database sebelum menjawab, supaya
  // tidak balikin array kosong (yang bikin dropdown "Nama Dokter" kosong).
  if (!wilayahStore.isLoaded()) {
    try {
      await wilayahStore.reload();
    } catch (err) {
      console.error('[wilayah-dokter] Gagal reload cache saat request:', err.code || err.message);
    }
  }

  const list = wilayahStore.getAll()
    .map((w) => ({ dokter: w.dokter, kecamatan: w.kecamatan }));
  res.json(list);
});

module.exports = router;
