// [pengajuan.js versi: jam-otomatis-2026-07-09] -- kalau komentar ini TIDAK ada
// di file Anda, berarti file belum tertimpa dengan versi terbaru.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Folder penyimpanan foto pengajuan (dilayani statis lewat express.static(public))
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads', 'pengajuan');
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

// Bersihkan nomor WhatsApp: buang spasi/strip/plus, ubah awalan 0 jadi 62
// (dipakai supaya link wa.me selalu benar walau pelapor mengetik pakai 0 atau 62)
function normalizeWhatsapp(raw) {
  let n = String(raw).replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n;
}

// Gabungkan tanggal yang dipilih pelapor dengan jam SERVER saat ini (bukan jam
// dari perangkat pelapor), supaya "jam melapor" akurat dan tidak bisa dimanipulasi client.
function buildTanggalLaporDenganJamSekarang(tanggalDate) {
  if (!tanggalDate) return null;
  const now = new Date();
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  return `${tanggalDate} ${jam}:${menit}:${detik}`;
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

function handleUploadFoto(req, res, next) {
  uploadFoto.single('foto')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

router.post('/', handleUploadFoto, async (req, res) => {
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
      keterangan,
      // Identitas Korban / Pasien
      nama_pasien,
      jenis_kelamin,
      tanggal_lapor,
      korban_kecamatan,
      alamat_pelapor,
      rt,
      rw,
      // Tambahan bagian Laporan
      kronologis
    } = req.body;

    if (!nama_pelapor || !no_wa || !tanggal || !kecamatan || !jenis_penyakit) {
      return res.status(400).json({
        error: 'Field wajib belum lengkap'
      });
    }

    if (!nama_pasien || !jenis_kelamin || !tanggal_lapor || !korban_kecamatan) {
      return res.status(400).json({
        error: 'Data identitas korban/pasien belum lengkap'
      });
    }

    const noWaBersih = normalizeWhatsapp(no_wa);
    if (noWaBersih.length < 9 || noWaBersih.length > 15) {
      return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
    }

    const foto = req.file ? `/uploads/pengajuan/${req.file.filename}` : null;
    const tanggalLaporFinal = buildTanggalLaporDenganJamSekarang(tanggal_lapor);
    console.log(`[pengajuan] tanggal_lapor diterima dari form: "${tanggal_lapor}" -> disimpan sebagai: "${tanggalLaporFinal}"`);

    const [result] = await pool.query(
      `INSERT INTO pengajuan
      (nama_pelapor,no_wa,tanggal,kecamatan,jenis_penyakit,sektor,alamat,latitude,longitude,keterangan,
       nama_pasien,jenis_kelamin,tanggal_lapor,korban_kecamatan,alamat_pelapor,rt,rw,foto,kronologis)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        keterangan,
        nama_pasien,
        jenis_kelamin,
        tanggalLaporFinal,
        korban_kecamatan,
        alamat_pelapor || null,
        rt || null,
        rw || null,
        foto,
        kronologis || null
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