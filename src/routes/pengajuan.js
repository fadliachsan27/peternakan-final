const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Bersihkan nomor WhatsApp: buang spasi/strip/plus, ubah awalan 0 jadi 62
// (dipakai supaya link wa.me selalu benar walau pelapor mengetik pakai 0 atau 62)
function normalizeWhatsapp(raw) {
  let n = String(raw).replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n;
}

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pengajuan ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/public/pending-count', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) as count FROM pengajuan WHERE status='Menunggu'");
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {

    const {
      nama_pelapor,
      no_wa,
      tanggal,
      kecamatan,
      jenis_penyakit,
      sektor,
      alamat,
      latitude,
      longitude,
      keterangan
    } = req.body;

    if (!nama_pelapor || !no_wa || !tanggal || !kecamatan || !jenis_penyakit) {
      return res.status(400).json({
        error: 'Field wajib belum lengkap'
      });
    }

    const noWaBersih = normalizeWhatsapp(no_wa);
    if (noWaBersih.length < 9 || noWaBersih.length > 15) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
    }

    const [result] = await pool.query(
      `INSERT INTO pengajuan
      (nama_pelapor,no_wa,tanggal,kecamatan,jenis_penyakit,sektor,alamat,latitude,longitude,keterangan)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        nama_pelapor,
        noWaBersih,
        tanggal,
        kecamatan,
        jenis_penyakit,
        sektor || 'Hewan',
        alamat,
        latitude || null,
        longitude || null,
        keterangan
      ]
    );

    let waAdmin = process.env.ADMIN_WHATSAPP || "6281234567890";
    try {
      const [settingRows] = await pool.query(
        "SELECT setting_value FROM settings WHERE setting_key='admin_whatsapp' LIMIT 1"
      );
      if (settingRows.length && settingRows[0].setting_value) {
        waAdmin = settingRows[0].setting_value;
      }
    } catch (e) {
      // Kalau tabel settings belum ada (belum jalankan init-db terbaru), tetap pakai fallback .env di atas
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const linkAdmin = `${baseUrl}/admin/pengajuan.html?highlight=${result.insertId}`;

    const pesan = encodeURIComponent(
      `Halo Admin,

Saya ${nama_pelapor} mengirim laporan baru.

Jenis Penyakit : ${jenis_penyakit}
Kecamatan : ${kecamatan}

Mohon dilakukan verifikasi.

Cek & verifikasi langsung di sini:
${linkAdmin}

Terima kasih.`
    );

    const [rows] = await pool.query(
      "SELECT * FROM pengajuan WHERE id=?",
      [result.insertId]
    );

    res.status(201).json({
      ...rows[0],
      whatsapp_url: `https://wa.me/${waAdmin}?text=${pesan}`
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.put('/:id/approve', auth, async (req, res) => {

  try {

    const [pengajuan] = await pool.query(
      "SELECT * FROM pengajuan WHERE id=?",
      [req.params.id]
    );

    if (!pengajuan.length) {
      return res.status(404).json({
        error: 'Pengajuan tidak ditemukan'
      });
    }

    const p = pengajuan[0];

    await pool.query(
      `INSERT INTO kasus
      (tanggal,kecamatan,jenis_penyakit,sektor,status,alamat,latitude,longitude,keterangan)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        p.tanggal,
        p.kecamatan,
        p.jenis_penyakit,
        p.sektor,
        "Verifikasi",
        p.alamat,
        p.latitude,
        p.longitude,
        `Dari pengajuan : ${p.nama_pelapor} - ${p.keterangan || ""}`
      ]
    );

    await pool.query(
      `UPDATE pengajuan
      SET status='Disetujui',
      alasan_penolakan=NULL
      WHERE id=?`,
      [req.params.id]
    );

    const [rows] = await pool.query(
      "SELECT * FROM pengajuan WHERE id=?",
      [req.params.id]
    );

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }

});

router.put('/:id/reject', auth, async (req, res) => {

  try {

    const { alasan } = req.body;

    if (!alasan) {
      return res.status(400).json({
        error: "Alasan penolakan wajib diisi."
      });
    }

    const [result] = await pool.query(
      `UPDATE pengajuan
      SET status='Ditolak',
      alasan_penolakan=?
      WHERE id=?`,
      [alasan, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Pengajuan tidak ditemukan"
      });
    }

    const [rows] = await pool.query(
      "SELECT * FROM pengajuan WHERE id=?",
      [req.params.id]
    );

    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }

});

module.exports = router;