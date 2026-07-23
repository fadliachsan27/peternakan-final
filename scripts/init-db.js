const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { WILAYAH, DEFAULT_WILAYAH_PASSWORD } = require('../src/config/wilayah');
const { SEKTOR_TINDAKAN } = require('../src/config/sektorTindakan');

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
    { name: 'kronologis', ddl: "ADD COLUMN kronologis TEXT AFTER foto" },
    { name: 'jenis_hewan', ddl: "ADD COLUMN jenis_hewan VARCHAR(100) AFTER kronologis" },
    { name: 'gejala', ddl: "ADD COLUMN gejala TEXT AFTER jenis_hewan" },
    { name: 'kemungkinan_penyakit', ddl: "ADD COLUMN kemungkinan_penyakit TEXT AFTER gejala" }
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

  // Migrasi kolom baru di tabel kasus: nama_pelapor, no_wa, foto, kronologis,
  // dan pengajuan_id -- supaya tabel Kelola Data Kasus bisa menampilkan info
  // yang sama seperti tabel Pengajuan dari Masyarakat untuk kasus yang berasal
  // dari pengajuan yang disetujui. Kasus yang diinput manual tetap NULL.
  const kolomBaruKasus = [
    { name: 'nama_pelapor', ddl: "ADD COLUMN nama_pelapor VARCHAR(150) AFTER keterangan" },
    { name: 'no_wa', ddl: "ADD COLUMN no_wa VARCHAR(20) AFTER nama_pelapor" },
    { name: 'foto', ddl: "ADD COLUMN foto VARCHAR(255) AFTER no_wa" },
    { name: 'kronologis', ddl: "ADD COLUMN kronologis TEXT AFTER foto" },
    { name: 'pengajuan_id', ddl: "ADD COLUMN pengajuan_id INT AFTER kronologis" },
    { name: 'nama_pasien', ddl: "ADD COLUMN nama_pasien VARCHAR(150) AFTER pengajuan_id" },
    { name: 'jenis_kelamin', ddl: "ADD COLUMN jenis_kelamin ENUM('Laki-laki','Perempuan') AFTER nama_pasien" },
    { name: 'tanggal_lapor', ddl: "ADD COLUMN tanggal_lapor DATETIME AFTER jenis_kelamin" },
    { name: 'korban_kecamatan', ddl: "ADD COLUMN korban_kecamatan VARCHAR(100) AFTER tanggal_lapor" },
    { name: 'alamat_pelapor', ddl: "ADD COLUMN alamat_pelapor TEXT AFTER korban_kecamatan" },
    { name: 'rt', ddl: "ADD COLUMN rt VARCHAR(10) AFTER alamat_pelapor" },
    { name: 'rw', ddl: "ADD COLUMN rw VARCHAR(10) AFTER rt" },
    { name: 'jenis_hewan', ddl: "ADD COLUMN jenis_hewan VARCHAR(100) AFTER rw" },
    { name: 'gejala', ddl: "ADD COLUMN gejala TEXT AFTER jenis_hewan" },
    { name: 'kemungkinan_penyakit', ddl: "ADD COLUMN kemungkinan_penyakit TEXT AFTER gejala" }
  ];

  for (const kolom of kolomBaruKasus) {
    const [cols] = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'kasus' AND column_name = ?`,
      [process.env.DB_NAME, kolom.name]
    );
    if (cols[0].cnt === 0) {
      await conn.query(`ALTER TABLE kasus ${kolom.ddl}`);
      console.log(`Migrasi: kolom '${kolom.name}' ditambahkan ke tabel kasus.`);
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

  // Migrasi kolom 'wilayah_id' di tabel users (untuk database yang sudah
  // ada sebelum fitur pembagian wilayah dokter ini ditambahkan).
  const [userCols] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'users' AND column_name = 'wilayah_id'`,
    [process.env.DB_NAME]
  );
  if (userCols[0].cnt === 0) {
    await conn.query("ALTER TABLE users ADD COLUMN wilayah_id INT DEFAULT NULL AFTER role");
    console.log("Migrasi: kolom 'wilayah_id' ditambahkan ke tabel users.");
  }

  // Migrasi kolom 'aktif' di tabel users (dipakai fitur admin "Akses Admin"
  // untuk menonaktifkan akses login dokter tanpa menghapus datanya).
  const [aktifCols] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'users' AND column_name = 'aktif'`,
    [process.env.DB_NAME]
  );
  if (aktifCols[0].cnt === 0) {
    await conn.query("ALTER TABLE users ADD COLUMN aktif TINYINT(1) NOT NULL DEFAULT 1 AFTER wilayah_id");
    console.log("Migrasi: kolom 'aktif' ditambahkan ke tabel users.");
  }

  // Migrasi fitur "Akses Tindakan per Dokter": kolom sektor_tindakan di
  // tabel wilayah (sektor apa saja yang boleh diakses dokter itu), dan
  // kolom kategori di tabel tindakan (sektor asal tindakan itu sendiri).
  // Lihat src/config/sektorTindakan.js untuk daftar resminya.
  const [sektorTindakanCols] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'wilayah' AND column_name = 'sektor_tindakan'`,
    [process.env.DB_NAME]
  );
  if (sektorTindakanCols[0].cnt === 0) {
    await conn.query("ALTER TABLE wilayah ADD COLUMN sektor_tindakan TEXT AFTER kecamatan");
    console.log("Migrasi: kolom 'sektor_tindakan' ditambahkan ke tabel wilayah.");
  }

  const [kategoriCols] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.columns
     WHERE table_schema = ? AND table_name = 'tindakan' AND column_name = 'kategori'`,
    [process.env.DB_NAME]
  );
  if (kategoriCols[0].cnt === 0) {
    await conn.query("ALTER TABLE tindakan ADD COLUMN kategori VARCHAR(150) DEFAULT NULL AFTER nama");
    console.log("Migrasi: kolom 'kategori' ditambahkan ke tabel tindakan.");
  }

  // Ganti unique key lama di tabel tindakan (cuma kolom `nama`) jadi
  // gabungan (nama, kategori) -- supaya nama tindakan yang sama boleh
  // dipakai di lebih dari satu sektor (mis. "Pengobatan" ada di sektor UPTD
  // Peternakan maupun Puskesmas). Dicek dulu index-nya benar-benar index
  // satu-kolom (bukan index lain yang kebetulan diawali kolom `nama`)
  // supaya migrasi ini aman dijalankan berkali-kali di database manapun.
  const [idxNamaRows] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'tindakan' AND NON_UNIQUE = 0 AND COLUMN_NAME = 'nama'`,
    [process.env.DB_NAME]
  );
  for (const row of idxNamaRows) {
    const [idxColCount] = await conn.query(
      `SELECT COUNT(*) as total FROM information_schema.statistics
       WHERE table_schema = ? AND table_name = 'tindakan' AND INDEX_NAME = ?`,
      [process.env.DB_NAME, row.INDEX_NAME]
    );
    if (idxColCount[0].total === 1 && row.INDEX_NAME !== 'PRIMARY') {
      await conn.query(`ALTER TABLE tindakan DROP INDEX \`${row.INDEX_NAME}\``);
      console.log(`Migrasi: index unik lama '${row.INDEX_NAME}' (kolom nama saja) di tabel tindakan dihapus.`);
    }
  }

  const [idxGabunganRows] = await conn.query(
    `SELECT COUNT(*) as cnt FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = 'tindakan' AND INDEX_NAME = 'uniq_tindakan_nama_kategori'`,
    [process.env.DB_NAME]
  );
  if (idxGabunganRows[0].cnt === 0) {
    await conn.query('ALTER TABLE tindakan ADD UNIQUE KEY uniq_tindakan_nama_kategori (nama, kategori)');
    console.log("Migrasi: unique key gabungan 'uniq_tindakan_nama_kategori (nama, kategori)' ditambahkan ke tabel tindakan.");
  }

  // Seed daftar tindakan baku per sektor (aman dijalankan berkali-kali --
  // ON DUPLICATE KEY UPDATE berdasarkan unique key (nama, kategori) di atas).
  let seededTindakan = 0;
  for (const sektor of SEKTOR_TINDAKAN) {
    for (const namaTindakan of sektor.tindakan) {
      const [result] = await conn.query(
        `INSERT INTO tindakan (nama, kategori) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE kategori = VALUES(kategori)`,
        [namaTindakan, sektor.nama]
      );
      if (result.affectedRows === 1) seededTindakan++; // baris baru (bukan sekadar update baris lama)
    }
  }
  if (seededTindakan > 0) {
    console.log(`Migrasi: ${seededTindakan} tindakan baku per sektor ditambahkan ke tabel tindakan.`);
  }

  const hash = await bcrypt.hash('admin123', 10);
  await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, 'admin']);

  // Seed tabel `wilayah` HANYA SEKALI dari src/config/wilayah.js (dulu jadi
  // satu-satunya sumber data). Sesudah ini, pembagian wilayah/kecamatan/nomor
  // WA dikelola sepenuhnya lewat fitur admin "Akses Admin" (tersimpan di
  // tabel `wilayah`), jadi seed ini tidak menimpa apa pun kalau tabelnya
  // sudah pernah terisi (mis. sudah pernah diubah admin lewat fitur itu).
  const [wilayahCountRows] = await conn.query('SELECT COUNT(*) as cnt FROM wilayah');
  if (wilayahCountRows[0].cnt === 0) {
    const wilayahHash = await bcrypt.hash(DEFAULT_WILAYAH_PASSWORD, 10);
    for (const w of WILAYAH) {
      // Ambil override nomor WA lama (kalau pernah diubah dokter lewat
      // halaman Pengaturan versi sebelumnya) supaya tidak hilang saat migrasi.
      let wa = w.wa;
      try {
        const [override] = await conn.query(
          'SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1',
          [`wilayah_wa_${w.id}`]
        );
        if (override.length && override[0].setting_value) wa = override[0].setting_value;
      } catch (e) { /* tabel settings mungkin belum ada, abaikan */ }

      await conn.query(
        'INSERT INTO wilayah (id, nama, wa, kecamatan) VALUES (?, ?, ?, ?)',
        [w.id, w.nama, wa, JSON.stringify(w.kecamatan)]
      );

      const [existingUser] = await conn.query('SELECT id FROM users WHERE username = ?', [w.username]);
      if (existingUser.length) {
        await conn.query('UPDATE users SET nama = ?, wilayah_id = ? WHERE username = ?', [w.dokter, w.id, w.username]);
      } else {
        await conn.query(
          'INSERT INTO users (username, password, nama, role, wilayah_id, aktif) VALUES (?, ?, ?, "admin", ?, 1)',
          [w.username, wilayahHash, w.dokter, w.id]
        );
        console.log(`Migrasi: akun dokter '${w.username}' (${w.dokter} - ${w.nama}) dibuat, password default: ${DEFAULT_WILAYAH_PASSWORD}`);
      }
    }
    console.log(`Migrasi: tabel 'wilayah' diisi dari data ${WILAYAH.length} wilayah (sekali saja). Setelah ini kelola lewat fitur admin "Akses Admin".`);

    // Pastikan AUTO_INCREMENT tabel wilayah lanjut dari ID tertinggi yang
    // baru saja di-insert manual di atas, supaya wilayah baru yang ditambah
    // lewat fitur "Akses Admin" tidak bentrok ID dengan yang sudah ada.
    const maxId = Math.max(0, ...WILAYAH.map((w) => w.id));
    await conn.query(`ALTER TABLE wilayah AUTO_INCREMENT = ?`, [maxId + 1]);
  }

  console.log('Database berhasil diinisialisasi!');
  console.log('Login admin utama (semua wilayah): username=admin, password=admin123');
  console.log('Login admin per wilayah (dokter): username sesuai nama dokter, password default=' + DEFAULT_WILAYAH_PASSWORD + ' (disarankan diganti admin utama lewat fitur "Akses Admin").');
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