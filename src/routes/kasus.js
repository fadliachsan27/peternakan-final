const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

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

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kasus ORDER BY tanggal DESC, id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM kasus WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });
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

    const foto = req.file ? `/uploads/kasus/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO kasus
      (tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude,
       nama_pelapor, no_wa, foto, kronologis,
       nama_pasien, jenis_kelamin, tanggal_lapor, korban_kecamatan, alamat_pelapor, rt, rw)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        tanggal, kecamatan, jenis_penyakit, sektor || 'Hewan', status || 'Aktif', alamat,
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

    const [existingRows] = await pool.query('SELECT foto FROM kasus WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

    const foto = req.file ? `/uploads/kasus/${req.file.filename}` : existingRows[0].foto;

    const [result] = await pool.query(
      `UPDATE kasus SET
        tanggal=?, kecamatan=?, jenis_penyakit=?, sektor=?, status=?, alamat=?, latitude=?, longitude=?,
        nama_pelapor=?, no_wa=?, foto=?, kronologis=?,
        nama_pasien=?, jenis_kelamin=?, tanggal_lapor=?, korban_kecamatan=?, alamat_pelapor=?, rt=?, rw=?
       WHERE id=?`,
      [
        tanggal, kecamatan, jenis_penyakit, sektor, status, alamat,
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
    const [result] = await pool.query('DELETE FROM kasus WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Data tidak ditemukan' });
    res.json({ message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
