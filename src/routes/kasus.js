const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

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

router.post('/', auth, async (req, res) => {
  try {
    const { tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude, keterangan } = req.body;
    const [result] = await pool.query(
      `INSERT INTO kasus (tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude, keterangan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tanggal, kecamatan, jenis_penyakit, sektor || 'Hewan', status || 'Aktif', alamat, latitude || null, longitude || null, keterangan]
    );
    const [rows] = await pool.query('SELECT * FROM kasus WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude, keterangan } = req.body;
    const [result] = await pool.query(
      `UPDATE kasus SET tanggal=?, kecamatan=?, jenis_penyakit=?, sektor=?, status=?, alamat=?, latitude=?, longitude=?, keterangan=?
       WHERE id=?`,
      [tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude || null, longitude || null, keterangan, req.params.id]
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
