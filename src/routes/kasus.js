const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { isKecamatanAllowed, buildKecamatanWhereClause, getWilayahById, getDokterByKecamatan } = require('../utils/wilayah');

const router = express.Router();

// Folder penyimpanan foto kasus (dilayani statis lewat express.static(public))
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'kasus');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const uploadFoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar (JPG/PNG)'));
    }
    cb(null, true);
  }
});

function handleUploadFoto(req, res, next) {
  uploadFoto.single('foto')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

// Bersihkan nomor WhatsApp: buang spasi/strip/plus, ubah awalan 0 jadi 62
function normalizeWhatsapp(raw) {
  if (!raw) return null;
  let n = String(raw).replace(/[^0-9]/g, '');
  if (!n) return null;
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n;
}

router.get('/', auth, async (req, res) => {
  try {
    // tindakan_list: daftar tindakan (dari halaman Pengajuan) yang terkait
    // dengan kasus ini, diambil lewat pengajuan_id (kasus yang berasal dari
    // pengajuan warga yang disetujui). Ini murni data tampilan (read-only) --
    // untuk menambah/menghapus tindakan tetap dilakukan dari halaman
    // Pengajuan, bukan dari sini. Kasus yang diinput manual (pengajuan_id
    // NULL) otomatis dapat NULL juga (tidak ada tindakan terkait).
    //
    // Kalau akun yang login adalah admin wilayah (dokter), hasilnya
    // dibatasi hanya kasus dari kecamatan-kecamatan di wilayah kerjanya.
    // Admin utama (wilayah_id NULL) tetap melihat semua kecamatan.
    const { where, params } = buildKecamatanWhereClause('k.kecamatan', req.user.wilayah_id);
    const [rows] = await pool.query(
      `SELECT k.*,
        (SELECT GROUP_CONCAT(t.nama ORDER BY pt.created_at SEPARATOR '||')
         FROM pengajuan_tindakan pt JOIN tindakan t ON t.id = pt.tindakan_id
         WHERE pt.pengajuan_id = k.pengajuan_id) AS tindakan_list
       FROM kasus k
       ${where ? `WHERE ${where}` : ''}
       ORDER BY k.tanggal DESC, k.id DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT k.*,
        (SELECT GROUP_CONCAT(t.nama ORDER BY pt.created_at SEPARATOR '||')
         FROM pengajuan_tindakan pt JOIN tindakan t ON t.id = pt.tindakan_id
         WHERE pt.pengajuan_id = k.pengajuan_id) AS tindakan_list
       FROM kasus k WHERE k.id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });
    // Kasus di luar wilayah kerja admin ini dianggap "tidak ditemukan"
    // supaya tidak bocor info kasus dari kecamatan lain.
    if (!isKecamatanAllowed(rows[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, handleUploadFoto, async (req, res) => {
  try {
    const {
      tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude,
      nama_pelapor, no_wa, kronologis,
      nama_pasien, jenis_kelamin, tanggal_lapor, korban_kecamatan, alamat_pelapor, rt, rw
    } = req.body;

    // Admin wilayah (dokter) cuma boleh input data kasus untuk kecamatan
    // di wilayah kerjanya sendiri.
    if (!isKecamatanAllowed(kecamatan, req.user.wilayah_id)) {
      const w = getWilayahById(req.user.wilayah_id);
      return res.status(403).json({
        error: `Kecamatan "${kecamatan}" di luar wilayah kerja Anda${w ? ` (${w.nama})` : ''}.`
      });
    }

    const foto = req.file ? `/uploads/kasus/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO kasus
      (tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude,
       nama_pelapor, no_wa, foto, kronologis,
       nama_pasien, jenis_kelamin, tanggal_lapor, korban_kecamatan, alamat_pelapor, rt, rw)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tanggal, kecamatan, jenis_penyakit, getDokterByKecamatan(kecamatan), status || 'Aktif', alamat,
        latitude || null, longitude || null,
        nama_pelapor || null, normalizeWhatsapp(no_wa), foto, kronologis || null,
        nama_pasien || null, jenis_kelamin || null, tanggal_lapor || null,
        korban_kecamatan || null, alamat_pelapor || null, rt || null, rw || null
      ]
    );
    const [rows] = await pool.query('SELECT * FROM kasus WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, handleUploadFoto, async (req, res) => {
  try {
    const {
      tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude,
      nama_pelapor, no_wa, kronologis,
      nama_pasien, jenis_kelamin, tanggal_lapor, korban_kecamatan, alamat_pelapor, rt, rw
    } = req.body;

    const [existingRows] = await pool.query('SELECT foto, kecamatan FROM kasus WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

    // Data kasus yang sedang diedit harus berada di wilayah kerja admin ini,
    // dan kecamatan baru yang dipilih pun tidak boleh dipindah ke luar
    // wilayah kerjanya.
    if (!isKecamatanAllowed(existingRows[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }
    if (!isKecamatanAllowed(kecamatan, req.user.wilayah_id)) {
      const w = getWilayahById(req.user.wilayah_id);
      return res.status(403).json({
        error: `Kecamatan "${kecamatan}" di luar wilayah kerja Anda${w ? ` (${w.nama})` : ''}.`
      });
    }

    const foto = req.file ? `/uploads/kasus/${req.file.filename}` : existingRows[0].foto;

    const [result] = await pool.query(
      `UPDATE kasus SET
        tanggal=?, kecamatan=?, jenis_penyakit=?, sektor=?, status=?, alamat=?, latitude=?, longitude=?,
        nama_pelapor=?, no_wa=?, foto=?, kronologis=?,
        nama_pasien=?, jenis_kelamin=?, tanggal_lapor=?, korban_kecamatan=?, alamat_pelapor=?, rt=?, rw=?
       WHERE id=?`,
      [
        tanggal, kecamatan, jenis_penyakit, getDokterByKecamatan(kecamatan), status, alamat,
        latitude || null, longitude || null,
        nama_pelapor || null, normalizeWhatsapp(no_wa), foto, kronologis || null,
        nama_pasien || null, jenis_kelamin || null, tanggal_lapor || null,
        korban_kecamatan || null, alamat_pelapor || null, rt || null, rw || null,
        req.params.id
      ]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    const [rows] = await pool.query('SELECT * FROM kasus WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const [existingRows] = await pool.query('SELECT kecamatan FROM kasus WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });
    if (!isKecamatanAllowed(existingRows[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Data tidak ditemukan' });
    }

    const [result] = await pool.query('DELETE FROM kasus WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
