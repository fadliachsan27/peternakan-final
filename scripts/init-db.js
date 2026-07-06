const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
  const statements = schema.split(';').filter(s => s.trim());

  for (const stmt of statements) {
    if (stmt.trim()) await conn.query(stmt);
  }

  // Migrasi untuk database yang sudah pernah dibuat sebelum kolom ini ada
  // (CREATE TABLE IF NOT EXISTS di atas tidak menambah kolom baru ke tabel lama).
  const [cols] = await conn.query(
    `SELECT COUNT(*) as total FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pengajuan' AND COLUMN_NAME = 'alasan_penolakan'`,
    [process.env.DB_NAME || 'peternakan_db']
  );
  if (cols[0].total === 0) {
    await conn.query('ALTER TABLE pengajuan ADD COLUMN alasan_penolakan TEXT');
    console.log('Migrasi: kolom alasan_penolakan berhasil ditambahkan ke tabel pengajuan.');
  }

  // Rapikan data lama: nomor WA yang masih diawali 0 diubah ke 62 supaya link wa.me di admin berfungsi
  const [waFixResult] = await conn.query(
    `UPDATE pengajuan SET no_wa = CONCAT('62', SUBSTRING(no_wa, 2)) WHERE no_wa LIKE '0%'`
  );
  if (waFixResult.affectedRows > 0) {
    console.log(`Migrasi: ${waFixResult.affectedRows} nomor WA pelapor lama dirapikan dari awalan 0 ke 62.`);
  }

  const hash = await bcrypt.hash('admin123', 10);
  await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'admin']);

  console.log('Database berhasil diinisialisasi!');
  console.log('Login admin: username=admin, password=admin123');
  await conn.end();
}

init().catch(err => {
  console.error('Gagal inisialisasi database:', err.message || err.code || '(pesan error kosong, lihat detail di bawah)');
  if (err.errors && err.errors.length) {
    // AggregateError (umum terjadi saat Node gagal konek ke "localhost" lewat IPv6 & IPv4 sekaligus)
    console.error('Detail error:');
    err.errors.forEach((e, i) => console.error(`  [${i}]`, e.code || e.message || e));
  } else {
    console.error('Detail error:', err);
  }
  console.error('\nKemungkinan penyebab:');
  console.error('  1. MySQL/MariaDB belum berjalan (cek XAMPP/Laragon).');
  console.error('  2. DB_HOST di .env "localhost" tapi MySQL cuma dengar di 127.0.0.1 -> coba ganti DB_HOST=127.0.0.1');
  console.error('  3. DB_USER / DB_PASSWORD di .env salah.');
  process.exit(1);
});