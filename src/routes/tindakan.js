// Route untuk halaman admin "Daftar Tindakan" -- mengelola daftar master
// tindakan (mis. Observasi, Telfon RS, dst) yang dipakai sebagai pilihan
// dropdown di kolom "Tindakan" pada halaman Pengajuan dari Masyarakat.
const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Ambil semua daftar master tindakan, diurutkan berdasarkan nama
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tindakan ORDER BY nama ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tambah tindakan baru ke daftar master
router.post('/', auth, async (req, res) => {
  try {
    const { nama } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama tindakan wajib diisi' });
    }

    const [result] = await pool.query(
      'INSERT INTO tindakan (nama) VALUES (?)',
      [nama.trim()]
    );

    const [rows] = await pool.query('SELECT * FROM tindakan WHERE id=?', [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Tindakan dengan nama tersebut sudah ada di daftar' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Hapus tindakan dari daftar master. Berkat ON DELETE CASCADE di tabel
// pengajuan_tindakan, tindakan ini otomatis ikut hilang dari semua
// pengajuan yang sebelumnya memakainya.
router.delete('/:id', auth, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM tindakan WHERE id=?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tindakan tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
