// Endpoint publik (tanpa login) yang mengembalikan pemetaan kecamatan ->
// nama dokter penanggung jawab wilayah, berdasarkan data yang dikelola
// admin utama lewat fitur "Akses Admin". Dipakai oleh public/js/wilayah.js
// untuk auto-isi field "Nama Dokter" di form Ajukan Data (publik) dan form
// Tambah/Edit Data Kasus (admin), supaya datanya selalu sinkron dengan
// pembagian wilayah terbaru tanpa perlu hardcode di frontend.
const express = require('express');
const wilayahStore = require('../config/wilayahStore');

const router = express.Router();

router.get('/', (req, res) => {
  const list = wilayahStore.getAll()
    .map((w) => ({ dokter: w.dokter, kecamatan: w.kecamatan }));
  res.json(list);
});

module.exports = router;
