const mysql = require('mysql2/promise');
require('dotenv').config();

async function test() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });
    console.log('Koneksi berhasil! MySQL berjalan.');
    await conn.end();
  } catch (err) {
    console.error('Koneksi gagal:', err);
  }
}

test();
