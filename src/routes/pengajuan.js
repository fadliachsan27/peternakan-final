// [pengajuan.js versi: jam-otomatis-2026-07-09] -- kalau komentar ini TIDAK ada
// di file Anda, berarti file belum tertimpa dengan versi terbaru.
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { isKecamatanAllowed, buildKecamatanWhereClause, findWilayahByKecamatan, getWilayahById } = require('../utils/wilayah');

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

// Ambil jam saat ini yang SELALU mengikuti zona waktu Asia/Jakarta (WIB),
// terlepas dari timezone bawaan mesin/server tempat Node.js berjalan.
// Sebelumnya kode ini pakai new Date().getHours() yang ikut timezone OS
// server (banyak hosting default-nya UTC), jadi jam yang tersimpan bisa
// meleset beberapa jam dari jam asli WIB. Dengan menggeser epoch UTC +7 jam
// lalu membaca komponennya lewat getUTC*, hasilnya selalu WIB yang benar
// apa pun timezone server-nya.
function getWaktuJakarta(date = new Date()) {
  const jakarta = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: jakarta.getUTCFullYear(),
    month: jakarta.getUTCMonth() + 1,
    day: jakarta.getUTCDate(),
    hours: jakarta.getUTCHours(),
    minutes: jakarta.getUTCMinutes(),
    seconds: jakarta.getUTCSeconds()
  };
}

// Gabungkan tanggal yang dipilih pelapor dengan jam SERVER saat ini dalam
// WIB (bukan jam dari perangkat pelapor, dan bukan jam UTC server), supaya
// "jam melapor" akurat dan tidak bisa dimanipulasi client.
function buildTanggalLaporDenganJamSekarang(tanggalDate) {
  if (!tanggalDate) return null;
  // Ambil bagian tanggal saja seandainya input ternyata datetime/ISO string.
  const tanggalOnly = String(tanggalDate).split('T')[0].split(' ')[0];
  const w = getWaktuJakarta();
  const jam = String(w.hours).padStart(2, '0');
  const menit = String(w.minutes).padStart(2, '0');
  const detik = String(w.seconds).padStart(2, '0');
  return `${tanggalOnly} ${jam}:${menit}:${detik}`;
}

// Format lengkap "YYYY-MM-DD HH:MM:SS" untuk WAKTU SEKARANG dalam WIB.
// Dipakai untuk mengisi created_at secara eksplisit saat pengajuan masuk,
// supaya "sudah berapa jam dari pengajuan" nanti dihitung dari jam yang
// benar-benar akurat, bukan ikut timezone default MySQL server (yang sering
// di-set UTC di banyak hosting).
function jakartaTimestampSekarang() {
  const w = getWaktuJakarta();
  const p2 = n => String(n).padStart(2, '0');
  return `${w.year}-${p2(w.month)}-${p2(w.day)} ${p2(w.hours)}:${p2(w.minutes)}:${p2(w.seconds)}`;
}

router.get('/', auth, async (req, res) => {
  try {
    // tindakan_count / tindakan_list: tindakan yang sudah ditambahkan admin
    // untuk pengajuan ini, dipakai untuk menampilkan tag-tag tindakan
    // langsung di kolom "Tindakan" tanpa perlu request tambahan per baris.
    //
    // Kalau yang login admin wilayah (dokter), hanya pengajuan dari
    // kecamatan-kecamatan di wilayah kerjanya yang ditampilkan/terkirim.
    const { where, params } = buildKecamatanWhereClause('p.kecamatan', req.user.wilayah_id);
    const [rows] = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM pengajuan_tindakan pt WHERE pt.pengajuan_id = p.id) AS tindakan_count,
        (SELECT GROUP_CONCAT(t.nama ORDER BY pt.created_at SEPARATOR '||')
         FROM pengajuan_tindakan pt JOIN tindakan t ON t.id = pt.tindakan_id
         WHERE pt.pengajuan_id = p.id) AS tindakan_list
       FROM pengajuan p
       ${where ? `WHERE ${where}` : ''}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/public/pending-count', auth.optional, async (req, res) => {
  try {
    const { where, params } = buildKecamatanWhereClause('kecamatan', req.user ? req.user.wilayah_id : null);
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM pengajuan WHERE status='Menunggu' ${where ? `AND ${where}` : ''}`,
      params
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daftar pengajuan yang masih berstatus "Menunggu", lengkap dengan sudah
// berapa jam sejak pengajuan itu masuk -- dipakai untuk notifikasi admin
// "ada pengajuan dari kecamatan ... sudah ... jam, tolong ditindak lanjuti".
router.get('/pending-notif', auth, async (req, res) => {
  try {
    const { where, params } = buildKecamatanWhereClause('kecamatan', req.user.wilayah_id);
    const [rows] = await pool.query(
      `SELECT id, kecamatan, jenis_penyakit, created_at FROM pengajuan
       WHERE status='Menunggu' ${where ? `AND ${where}` : ''}
       ORDER BY created_at ASC`,
      params
    );

    const nowMs = Date.now(); // epoch UTC asli, selalu benar apa pun timezone server

    const data = rows.map(r => {
      // created_at tersimpan sebagai string polos jam WIB (mis. "2026-07-10 14:23:45"),
      // jadi dijangkarkan eksplisit ke +07:00 supaya selisih waktunya akurat.
      const createdMs = new Date(String(r.created_at).replace(' ', 'T') + '+07:00').getTime();
      const selisihMs = Math.max(0, nowMs - createdMs);
      const jamBerlalu = Math.floor(selisihMs / (1000 * 60 * 60));
      const menitBerlalu = Math.floor(selisihMs / (1000 * 60));
      return {
        id: r.id,
        kecamatan: r.kecamatan,
        jenis_penyakit: r.jenis_penyakit,
        jam_berlalu: jamBerlalu,
        menit_berlalu: menitBerlalu
      };
    });

    res.json(data);
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
      // Identitas Korban / Pasien -- kalau korban/pasien sama dengan pelapor,
      // nama_pasien/tanggal_lapor/korban_kecamatan sudah diisi otomatis oleh
      // frontend dari data pelapor, jadi jenis_kelamin bisa kosong.
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

    if (!nama_pasien || !tanggal_lapor || !korban_kecamatan) {
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
    const createdAtFinal = jakartaTimestampSekarang();
    console.log(`[pengajuan] tanggal_lapor diterima dari form: "${tanggal_lapor}" -> disimpan sebagai: "${tanggalLaporFinal}"`);

    const [result] = await pool.query(
      `INSERT INTO pengajuan
      (nama_pelapor,no_wa,tanggal,kecamatan,jenis_penyakit,sektor,alamat,latitude,longitude,
       nama_pasien,jenis_kelamin,tanggal_lapor,korban_kecamatan,alamat_pelapor,rt,rw,foto,kronologis,created_at)
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
        nama_pasien,
        jenis_kelamin || null,
        tanggalLaporFinal,
        korban_kecamatan,
        alamat_pelapor || null,
        rt || null,
        rw || null,
        foto,
        kronologis || null,
        createdAtFinal
      ]
    );

    // Nomor WA tujuan: utamakan nomor dokter wilayah yang menaungi kecamatan
    // pelapor (supaya laporan langsung ke dokter yang tepat), baru kalau
    // kecamatannya tidak cocok dengan wilayah manapun, pakai nomor admin
    // global dari halaman Pengaturan (fallback).
    const wilayahTujuan = findWilayahByKecamatan(kecamatan);
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
    if (wilayahTujuan && wilayahTujuan.wa) {
      waAdmin = wilayahTujuan.wa;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const linkAdmin = `${baseUrl}/admin/pengajuan.html?highlight=${result.insertId}`;

    const pesan = encodeURIComponent(
      `Halo${wilayahTujuan ? ' ' + wilayahTujuan.dokter : ' Admin'},

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

    if (!isKecamatanAllowed(p.kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({
        error: 'Pengajuan tidak ditemukan'
      });
    }

    await pool.query(
      `INSERT INTO kasus
      (tanggal,kecamatan,jenis_penyakit,sektor,status,alamat,latitude,longitude,keterangan,
       nama_pelapor,no_wa,foto,kronologis,pengajuan_id,
       nama_pasien,jenis_kelamin,tanggal_lapor,korban_kecamatan,alamat_pelapor,rt,rw)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        p.tanggal,
        p.kecamatan,
        p.jenis_penyakit,
        p.sektor,
        "Verifikasi",
        p.alamat,
        p.latitude,
        p.longitude,
        `Dari pengajuan : ${p.nama_pelapor}`,
        p.nama_pelapor,
        p.no_wa,
        p.foto,
        p.kronologis,
        p.id,
        p.nama_pasien,
        p.jenis_kelamin,
        p.tanggal_lapor,
        p.korban_kecamatan,
        p.alamat_pelapor,
        p.rt,
        p.rw
      ]
    );

    await pool.query(
      `UPDATE pengajuan
      SET status='Disetujui',
      alasan_penolakan=NULL,
      updated_at=?
      WHERE id=?`,
      [jakartaTimestampSekarang(), req.params.id]
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

    const [existing] = await pool.query('SELECT kecamatan FROM pengajuan WHERE id=?', [req.params.id]);
    if (!existing.length) {
      return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
    }
    if (!isKecamatanAllowed(existing[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: "Pengajuan tidak ditemukan" });
    }

    const [result] = await pool.query(
      `UPDATE pengajuan
      SET status='Ditolak',
      alasan_penolakan=?,
      updated_at=?
      WHERE id=?`,
      [alasan, jakartaTimestampSekarang(), req.params.id]
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

// ===================== TINDAKAN per Pengajuan =====================
// Daftar tindakan yang sudah ditambahkan admin untuk pengajuan tertentu
// (ditampilkan lewat dropdown/popup di kolom "Tindakan" pada tabel Pengajuan).
router.get('/:id/tindakan', auth, async (req, res) => {
  try {
    const [pengajuan] = await pool.query('SELECT kecamatan FROM pengajuan WHERE id=?', [req.params.id]);
    if (!pengajuan.length || !isKecamatanAllowed(pengajuan[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    const [rows] = await pool.query(
      `SELECT pt.id AS relasi_id, t.id AS tindakan_id, t.nama
       FROM pengajuan_tindakan pt
       JOIN tindakan t ON t.id = pt.tindakan_id
       WHERE pt.pengajuan_id = ?
       ORDER BY pt.created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tambahkan satu tindakan (dipilih dari daftar master) ke pengajuan ini
router.post('/:id/tindakan', auth, async (req, res) => {
  try {
    const { tindakan_id } = req.body;

    if (!tindakan_id) {
      return res.status(400).json({ error: 'Tindakan wajib dipilih' });
    }

    const [pengajuan] = await pool.query('SELECT id, kecamatan FROM pengajuan WHERE id=?', [req.params.id]);
    if (!pengajuan.length || !isKecamatanAllowed(pengajuan[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    await pool.query(
      'INSERT INTO pengajuan_tindakan (pengajuan_id, tindakan_id) VALUES (?, ?)',
      [req.params.id, tindakan_id]
    );

    const [rows] = await pool.query(
      `SELECT pt.id AS relasi_id, t.id AS tindakan_id, t.nama
       FROM pengajuan_tindakan pt
       JOIN tindakan t ON t.id = pt.tindakan_id
       WHERE pt.pengajuan_id = ?
       ORDER BY pt.created_at ASC`,
      [req.params.id]
    );

    res.status(201).json(rows);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Tindakan ini sudah ditambahkan sebelumnya' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Hapus satu tindakan dari pengajuan ini (bukan menghapus dari daftar master)
router.delete('/:id/tindakan/:relasiId', auth, async (req, res) => {
  try {
    const [pengajuan] = await pool.query('SELECT kecamatan FROM pengajuan WHERE id=?', [req.params.id]);
    if (!pengajuan.length || !isKecamatanAllowed(pengajuan[0].kecamatan, req.user.wilayah_id)) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' });
    }

    const [result] = await pool.query(
      'DELETE FROM pengajuan_tindakan WHERE id = ? AND pengajuan_id = ?',
      [req.params.relasiId, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Data tindakan tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;