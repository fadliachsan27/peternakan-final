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

module.exports = authMiddleware;
