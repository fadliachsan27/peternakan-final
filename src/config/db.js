const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'peternakan_db',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

// Penting: tanpa listener ini, error koneksi MySQL yang terputus (mis. MySQL
// service restart / idle timeout) akan menjadi "unhandled error" dan MEMATIKAN
// seluruh proses Node.js (ini penyebab umum server tiba-tiba mati / ERR_CONNECTION_REFUSED).
pool.on('error', (err) => {
  console.error('[MySQL Pool Error]', err.code || err.message);
});

module.exports = pool;
