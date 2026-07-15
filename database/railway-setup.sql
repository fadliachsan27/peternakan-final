-- =====================================================================
-- SATU FILE INI SAJA — copy-paste SEMUA isi file ini ke Query Console
-- database MySQL di Railway, lalu Run/Execute sekali. Selesai.
--
-- File ini sudah menggabungkan:
--   1. Struktur tabel lengkap (kalau database masih kosong/baru)
--   2. Migrasi kolom untuk database yang SUDAH ADA datanya sebelumnya
--      (aman dijalankan berkali-kali & tidak akan menghapus data lama --
--      setiap ALTER TABLE dicek dulu, kolom yang sudah ada dilewati)
--   3. Login admin utama (admin / admin123) — tetap bisa akses SEMUA wilayah
--   4. 7 akun login dokter per wilayah kerja (password default: dokter123)
--
-- Tidak perlu jalankan file/perintah lain (tidak perlu npm run init-db)
-- kalau sudah pakai file ini.
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  role ENUM('admin') DEFAULT 'admin',
  wilayah_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kasus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  jenis_penyakit VARCHAR(150) NOT NULL,
  sektor VARCHAR(100) NOT NULL DEFAULT '-',
  status ENUM('Aktif', 'Verifikasi', 'Selesai') NOT NULL DEFAULT 'Aktif',
  alamat TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pengajuan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama_pelapor VARCHAR(150) NOT NULL,
  no_wa VARCHAR(20) NOT NULL,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  jenis_penyakit VARCHAR(150) NOT NULL,
  sektor VARCHAR(100) NOT NULL DEFAULT '-',
  alamat TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  keterangan TEXT,
  status ENUM('Menunggu', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu',
  alasan_penolakan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pengajuan_tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pengajuan_id INT NOT NULL,
  tindakan_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pengajuan_id) REFERENCES pengajuan(id) ON DELETE CASCADE,
  FOREIGN KEY (tindakan_id) REFERENCES tindakan(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_pengajuan_tindakan (pengajuan_id, tindakan_id)
);

-- ---------------------------------------------------------------------
-- Migrasi kolom untuk database yang SUDAH ADA sebelum update ini.
-- Setiap kolom dicek dulu lewat information_schema (cara ini kompatibel
-- di semua versi MySQL, termasuk yang belum mendukung sintaks
-- "ADD COLUMN IF NOT EXISTS"). Kalau kolomnya sudah ada, dilewati saja
-- (tidak error, tidak menghapus data).
-- ---------------------------------------------------------------------
SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'wilayah_id');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE users ADD COLUMN wilayah_id INT DEFAULT NULL AFTER role', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'nama_pasien');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN nama_pasien VARCHAR(150) AFTER alasan_penolakan', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'jenis_kelamin');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN jenis_kelamin ENUM(''Laki-laki'',''Perempuan'') AFTER nama_pasien', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'tanggal_lapor');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN tanggal_lapor DATETIME AFTER jenis_kelamin', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'korban_kecamatan');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN korban_kecamatan VARCHAR(100) AFTER tanggal_lapor', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'alamat_pelapor');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN alamat_pelapor TEXT AFTER korban_kecamatan', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'rt');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN rt VARCHAR(10) AFTER alamat_pelapor', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'rw');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN rw VARCHAR(10) AFTER rt', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'foto');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN foto VARCHAR(255) AFTER rw', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'pengajuan' AND column_name = 'kronologis');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE pengajuan ADD COLUMN kronologis TEXT AFTER foto', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'nama_pelapor');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN nama_pelapor VARCHAR(150) AFTER keterangan', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'no_wa');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN no_wa VARCHAR(20) AFTER nama_pelapor', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'foto');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN foto VARCHAR(255) AFTER no_wa', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'kronologis');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN kronologis TEXT AFTER foto', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'pengajuan_id');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN pengajuan_id INT AFTER kronologis', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'nama_pasien');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN nama_pasien VARCHAR(150) AFTER pengajuan_id', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'jenis_kelamin');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN jenis_kelamin ENUM(''Laki-laki'',''Perempuan'') AFTER nama_pasien', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'tanggal_lapor');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN tanggal_lapor DATETIME AFTER jenis_kelamin', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'korban_kecamatan');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN korban_kecamatan VARCHAR(100) AFTER tanggal_lapor', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'alamat_pelapor');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN alamat_pelapor TEXT AFTER korban_kecamatan', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'rt');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN rt VARCHAR(10) AFTER alamat_pelapor', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'kasus' AND column_name = 'rw');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE kasus ADD COLUMN rw VARCHAR(10) AFTER rt', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- Kolom tanggal_lapor di tabel pengajuan sebelumnya bertipe DATE (tanpa
-- jam) di versi lama -- pastikan sekarang DATETIME (aman dijalankan
-- berkali-kali, tidak akan error walau tipenya sudah DATETIME).
ALTER TABLE pengajuan MODIFY COLUMN tanggal_lapor DATETIME;

-- Rapikan nomor WA lama yang masih diawali 0 -> 62 (supaya link WhatsApp jalan)
UPDATE pengajuan SET no_wa = CONCAT('62', SUBSTRING(no_wa, 2)) WHERE no_wa LIKE '0%';

-- ---------------------------------------------------------------------
-- Data awal / default
-- ---------------------------------------------------------------------
INSERT INTO settings (setting_key, setting_value) VALUES
('admin_whatsapp', '6281234567890')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

INSERT INTO tindakan (nama) VALUES
('Observasi'), ('Telfon RS'), ('Deliver Obat'), ('Abaikan')
ON DUPLICATE KEY UPDATE nama = nama;

-- Login admin utama (bisa akses SEMUA wilayah/kecamatan): admin / admin123
INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator', 'admin', NULL)
ON DUPLICATE KEY UPDATE username = username;

-- 7 login dokter per wilayah kerja. Password default SEMUA: dokter123
-- (sarankan setiap dokter ganti sendiri lewat menu Pengaturan > Ganti
-- Password setelah login pertama kali).
INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('reyhan', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Reyhan Firdaus', 'admin', 1)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('utari', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Utari Wardiani', 'admin', 2)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('kodrat', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Kodrat ZB', 'admin', 3)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('fahmi', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Fahmi', 'admin', 4)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('supika', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Muhamad Supika', 'admin', 5)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('pilar', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Pilar Patria', 'admin', 6)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

INSERT INTO users (username, password, nama, role, wilayah_id) VALUES
('madya', '$2a$10$pl1bH9Ds9Vwx6TjaJ9r7gufO.KGoqhAVUwzbPm9j77/kgh0d5X8e2', 'drh. Madya Adi Waskita', 'admin', 7)
ON DUPLICATE KEY UPDATE nama = VALUES(nama), wilayah_id = VALUES(wilayah_id);

-- Cek hasil akhir: pastikan admin + 7 dokter wilayah sudah ada
SELECT id, username, nama, role, wilayah_id FROM users ORDER BY (wilayah_id IS NULL) DESC, wilayah_id;
