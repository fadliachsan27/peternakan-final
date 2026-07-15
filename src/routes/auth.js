const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { getWilayahById } = require('../utils/wilayah');
const { getEffectiveWilayahWhatsapp } = require('../utils/adminWhatsapp');

const router = express.Router();

// Bentuk objek "wilayah" ringkas yang dikirim ke frontend, supaya UI bisa
// menampilkan nama dokter/wilayah dan membatasi pilihan kecamatan di form,
// tanpa perlu request tambahan setelah login. NULL kalau akun ini admin
// utama (super admin) yang tidak dibatasi wilayah tertentu. Nomor "wa" yang
// dikirim sudah nomor TERBARU (kalau dokter wilayah ini pernah mengubahnya
// sendiri lewat halaman Pengaturan, bukan nilai bawaan dari kode lagi).
async function buildWilayahInfo(wilayahId) {
  const w = getWilayahById(wilayahId);
  if (!w) return null;
  const wa = await getEffectiveWilayahWhatsapp(pool, w.id);
  return { id: w.id, nama: w.nama, dokter: w.dokter, wa, kecamatan: w.kecamatan };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = rows[0];

    if (user.aktif === 0) {
      return res.status(403).json({ error: 'Akun ini sudah dinonaktifkan. Hubungi admin utama.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, nama: user.nama, role: user.role, wilayah_id: user.wilayah_id || null },
      process.env.JWT_SECRET || 'peternakan_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        wilayah_id: user.wilayah_id || null,
        wilayah: await buildWilayahInfo(user.wilayah_id)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil ulang data akun yang sedang login LANGSUNG dari database (bukan dari
// klaim token JWT yang mungkin sudah kedaluwarsa/basi kalau nama atau wilayah
// akun ini pernah diubah setelah token diterbitkan). Dipanggil oleh frontend
// (lihat public/js/layout.js -> applyLoggedInUserBadge) setiap halaman admin
// dibuka, supaya nama & wilayah yang tampil di topbar SELALU sinkron dengan
// database, tidak tergantung data localStorage lama dari saat login.
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });

    const user = rows[0];
    res.json({
      user: {
        id: user.id,
        username: user.username,
        nama: user.nama,
        role: user.role,
        wilayah_id: user.wilayah_id || null,
        wilayah: await buildWilayahInfo(user.wilayah_id)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ganti password akun sendiri (dipakai admin utama maupun admin wilayah/dokter).
router.put('/password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Password lama dan password baru wajib diisi' });
    }
    if (String(new_password).length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Akun tidak ditemukan' });

    const valid = await bcrypt.compare(current_password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Password lama tidak sesuai' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);

    res.json({ message: 'Password berhasil diganti' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
