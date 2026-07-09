const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function init() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
  const statements = schema.split(';').filter(s => s.trim());

  for (const stmt of statements) {
    if (stmt.trim()) await conn.query(stmt);
  }

  // Migrasi kolom baru untuk database yang sudah ada sebelumnya.
  // Dicek dulu lewat information_schema supaya kompatibel dengan semua versi
  // MySQL/MariaDB (tidak semua versi mendukung "ADD COLUMN IF NOT EXISTS").
  const kolomBaru = [
    { name: 'nama_pasien', ddl: "ADD COLUMN nama_pasien VARCHAR(150) AFTER alasan_penolakan" },
    { name: 'jenis_kelamin', ddl: "ADD COLUMN jenis_kelamin ENUM('Laki-laki','Perempuan') AFTER nama_pasien" },
    { name: 'tanggal_lapor', ddl: "ADD COLUMN tanggal_lapor DATETIME AFTER jenis_kelamin" },
    { name: 'korban_kecamatan', ddl: "ADD COLUMN korban_kecamatan VARCHAR(100) AFTER tanggal_lapor" },
    { name: 'alamat_pelapor', ddl: "ADD COLUMN alamat_pelapor TEXT AFTER korban_kecamatan" },
    { name: 'rt', ddl: "ADD COLUMN rt VARCHAR(10) AFTER alamat_pelapor" },
    { name: 'rw', ddl: "ADD COLUMN rw VARCHAR(10) AFTER rt" },
    { name: 'foto', ddl: "ADD COLUMN foto VARCHAR(255) AFTER rw" },
    { name: 'kronologis', ddl: "ADD COLUMN kronologis TEXT AFTER foto" }
  ];

  for (const kolom of kolomBaru) {
    const [cols] = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'pengajuan' AND column_name = ?`,
      [process.env.DB_NAME, kolom.name]
    );
    if (cols[0].cnt === 0) {
      await conn.query(`ALTER TABLE pengajuan ${kolom.ddl}`);
      console.log(`Migrasi: kolom '${kolom.name}' ditambahkan ke tabel pengajuan.`);
    }
  }

  // Migrasi: kolom tanggal_lapor sebelumnya DATE (tanpa jam), sekarang perlu DATETIME
  const [tipeTanggalLapor] = await conn.query(
    `SELECT DATA_TYPE FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'pengajuan' AND column_name = 'tanggal_lapor'`,
    [process.env.DB_NAME]
  );
  if (tipeTanggalLapor.length && tipeTanggalLapor[0].DATA_TYPE === 'date') {
    await conn.query('ALTER TABLE pengajuan MODIFY COLUMN tanggal_lapor DATETIME');
    console.log("Migrasi: kolom 'tanggal_lapor' diubah dari DATE ke DATETIME (kini menyimpan jam juga).");
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