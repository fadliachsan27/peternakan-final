const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'peternakan_secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
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
