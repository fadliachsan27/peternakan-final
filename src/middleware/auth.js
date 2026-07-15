const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  const token = header.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'peternakan_secret');
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }

  req.user = payload;

  // Cek status aktif LANGSUNG dari database (bukan dari klaim token JWT
  // yang mungkin sudah basi) -- supaya begitu admin utama menonaktifkan
  // atau menghapus akses seorang dokter lewat fitur "Akses Admin", akun
  // itu langsung tertolak di request berikutnya, tidak perlu menunggu
  // token lamanya kedaluwarsa (bisa sampai 24 jam).
  try {
    const [rows] = await pool.query('SELECT aktif FROM users WHERE id = ? LIMIT 1', [payload.id]);
    if (!rows.length || rows[0].aktif === 0) {
      return res.status(401).json({ error: 'Akun ini sudah dinonaktifkan atau dihapus' });
    }
  } catch (e) {
    // Kolom 'aktif' belum ada (database belum dimigrasi/di-init ulang) --
    // abaikan saja pengecekan ini, anggap akun tetap aktif.
  }

  next();
}

// Sama seperti authMiddleware, tapi TIDAK menolak request kalau token tidak
// ada / tidak valid -- dipakai untuk endpoint yang tetap bisa diakses publik
// (mis. statistik dashboard di halaman utama), tapi kalau ternyata ada token
// admin wilayah yang valid, req.user diisi supaya datanya bisa difilter
// sesuai wilayah kerja admin tersebut.
function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'peternakan_secret');
  } catch {
    // token tidak valid/kedaluwarsa -> abaikan saja, tetap perlakukan sebagai publik
  }
  next();
}

module.exports = authMiddleware;
module.exports.optional = optionalAuthMiddleware;
