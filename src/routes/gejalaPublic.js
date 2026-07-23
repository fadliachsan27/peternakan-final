// Endpoint publik (tanpa login) yang mengembalikan daftar master "Gejala"
// (dengan pemetaan kemungkinan penyakit zoonosis-nya) dan daftar "Jenis
// Hewan". Dipakai oleh public/js/gejala.js untuk merender dropdown checkbox
// Gejala & dropdown Jenis Hewan di form Ajukan Data Kasus (publik) dan form
// Tambah/Edit Data Kasus (admin), supaya satu-satunya sumber datanya cuma
// di src/config/gejala.js.
const express = require('express');
const { GEJALA_LIST, JENIS_HEWAN_LIST } = require('../config/gejala');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    jenisHewan: JENIS_HEWAN_LIST,
    gejala: GEJALA_LIST
  });
});

module.exports = router;
