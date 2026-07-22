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

-- Master data wilayah kerja dokter -- WAJIB ada supaya fitur auto-isi
-- "Nama Dokter" saat pilih kecamatan (lihat public/js/wilayah.js) dan
-- filter kecamatan per akun dokter bisa jalan. id 1-7 di sini SENGAJA
-- disamakan dengan wilayah_id 7 akun dokter yang di-insert di bagian
-- bawah file ini.
CREATE TABLE IF NOT EXISTS wilayah (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  wa VARCHAR(20),
  kecamatan TEXT,
  -- Akses Tindakan: daftar nama SEKTOR (lihat src/config/sektorTindakan.js)
  -- yang tindakannya boleh diakses dokter wilayah ini, JSON array string.
  sektor_tindakan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO wilayah (id, nama, wa, kecamatan) VALUES
  (1, 'Wilayah 1', '6285274463391',
   '["Sukalarang","Sukaraja","Sukabumi","Cisaat","Kadudampit","Gunungguruh","Kebonpedes","Cireunghas","Gegerbitung"]'),
  (2, 'Wilayah 2', '6285719304190',
   '["Cibadak","Cikidang","Cikembar","Ciambar","Nagrak","Cicantayan","Caringin"]'),
  (3, 'Wilayah 3', '6285724978775',
   '["Cicurug","Cidahu","Parungkuda","Parakansalak","Bojonggenteng","Kalapanunggal","Kabandungan"]'),
  (4, 'Wilayah 4', '628115220887',
   '["Warungkiara","Bantargadung","Simpenan","Palabuhanratu","Cikakak","Cisolok"]'),
  (5, 'Wilayah 5', '628557056309',
   '["Purabaya","Nyalindung","Jampangtengah","Lengkong"]'),
  (6, 'Wilayah 6', '6285720624609',
   '["Ciemas","Ciracap","Waluran","Surade","Cibitung","Jampangkulon","Kalibunder","Cimanggu"]'),
  (7, 'Wilayah 7', '6285732055232',
   '["Sagaranten","Curugkembar","Cidadap","Pabuaran","Cidolog","Tegalbuleud"]')
ON DUPLICATE KEY UPDATE
  nama = VALUES(nama),
  kecamatan = VALUES(kecamatan),
  wa = IF(wa IS NULL OR wa = '', VALUES(wa), wa);

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

-- Kolom `kategori` = nama SEKTOR asal tindakan ini (lihat
-- src/config/sektorTindakan.js), NULL kalau tindakan "umum" (selalu tampil
-- untuk semua akun). Unique key gabungan (nama, kategori) karena nama
-- tindakan yang sama bisa dipakai lebih dari satu sektor.
CREATE TABLE IF NOT EXISTS tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  kategori VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tindakan_nama_kategori (nama, kategori)
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

-- Fitur "Akses Tindakan per Dokter": kolom sektor_tindakan di tabel wilayah,
-- dan kolom kategori di tabel tindakan (lihat src/config/sektorTindakan.js).
SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'wilayah' AND column_name = 'sektor_tindakan');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE wilayah ADD COLUMN sektor_tindakan TEXT AFTER kecamatan', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @kolomAda := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'tindakan' AND column_name = 'kategori');
SET @sqlKolom := IF(@kolomAda = 0, 'ALTER TABLE tindakan ADD COLUMN kategori VARCHAR(150) DEFAULT NULL AFTER nama', 'SELECT 1');
PREPARE stmt FROM @sqlKolom; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ganti unique key lama (nama saja) di tabel tindakan jadi gabungan
-- (nama, kategori), supaya nama tindakan yang sama boleh muncul di lebih
-- dari satu sektor. Aman dijalankan berkali-kali.
SET @idxLamaAda := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tindakan' AND index_name = 'nama');
SET @sqlDropIdx := IF(@idxLamaAda > 0, 'ALTER TABLE tindakan DROP INDEX `nama`', 'SELECT 1');
PREPARE stmt FROM @sqlDropIdx; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idxBaruAda := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'tindakan' AND index_name = 'uniq_tindakan_nama_kategori');
SET @sqlAddIdx := IF(@idxBaruAda = 0, 'ALTER TABLE tindakan ADD UNIQUE KEY uniq_tindakan_nama_kategori (nama, kategori)', 'SELECT 1');
PREPARE stmt FROM @sqlAddIdx; EXECUTE stmt; DEALLOCATE PREPARE stmt;


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

-- Seed daftar tindakan baku per sektor (lihat src/config/sektorTindakan.js).
-- Aman dijalankan berkali-kali (ON DUPLICATE KEY UPDATE).
INSERT INTO tindakan (nama, kategori) VALUES
('Verifikasi laporan', 'UPTD Peternakan / Puskeswan'),
('Investigasi lapangan', 'UPTD Peternakan / Puskeswan'),
('Observasi hewan', 'UPTD Peternakan / Puskeswan'),
('Pemeriksaan klinis', 'UPTD Peternakan / Puskeswan'),
('Pengambilan sampel', 'UPTD Peternakan / Puskeswan'),
('Pengiriman sampel ke laboratorium', 'UPTD Peternakan / Puskeswan'),
('Isolasi hewan', 'UPTD Peternakan / Puskeswan'),
('Karantina lokasi', 'UPTD Peternakan / Puskeswan'),
('Pengobatan', 'UPTD Peternakan / Puskeswan'),
('Vaksinasi', 'UPTD Peternakan / Puskeswan'),
('Vaksinasi ring', 'UPTD Peternakan / Puskeswan'),
('Depopulasi (bila diperlukan)', 'UPTD Peternakan / Puskeswan'),
('Disinfeksi kandang', 'UPTD Peternakan / Puskeswan'),
('Edukasi pemilik ternak', 'UPTD Peternakan / Puskeswan'),
('Pelacakan kontak hewan', 'UPTD Peternakan / Puskeswan'),
('Penutupan kasus', 'UPTD Peternakan / Puskeswan'),
('Monitoring lanjutan', 'UPTD Peternakan / Puskeswan'),
('Rujuk ke dokter hewan', 'UPTD Peternakan / Puskeswan'),

('Verifikasi administrasi', 'Dinas Peternakan Kabupaten'),
('Penugasan petugas', 'Dinas Peternakan Kabupaten'),
('Koordinasi lintas sektor', 'Dinas Peternakan Kabupaten'),
('Investigasi epidemiologi', 'Dinas Peternakan Kabupaten'),
('Pengiriman logistik', 'Dinas Peternakan Kabupaten'),
('Distribusi vaksin', 'Dinas Peternakan Kabupaten'),
('Distribusi obat', 'Dinas Peternakan Kabupaten'),
('Pelaporan ke Provinsi', 'Dinas Peternakan Kabupaten'),
('Pelaporan ke iSIKHNAS', 'Dinas Peternakan Kabupaten'),
('Pelaporan ke SIZE', 'Dinas Peternakan Kabupaten'),
('Monitoring kasus', 'Dinas Peternakan Kabupaten'),
('Penetapan status kejadian', 'Dinas Peternakan Kabupaten'),
('Penutupan kasus', 'Dinas Peternakan Kabupaten'),

('Pemeriksaan korban', 'Puskesmas'),
('Pemberian VAR', 'Puskesmas'),
('Pemberian SAR', 'Puskesmas'),
('Pengobatan', 'Puskesmas'),
('Observasi pasien', 'Puskesmas'),
('Edukasi pasien', 'Puskesmas'),
('Pelaporan ke Dinas Kesehatan', 'Puskesmas'),
('Rujuk ke Rumah Sakit', 'Puskesmas'),

('Pemeriksaan pasien', 'Rumah Sakit'),
('Rawat jalan', 'Rumah Sakit'),
('Rawat inap', 'Rumah Sakit'),
('Pemberian VAR', 'Rumah Sakit'),
('Pemberian SAR', 'Rumah Sakit'),
('Isolasi pasien', 'Rumah Sakit'),
('Pemeriksaan laboratorium', 'Rumah Sakit'),
('Pelaporan Dinas Kesehatan', 'Rumah Sakit'),

('Investigasi epidemiologi', 'Dinas Kesehatan'),
('Surveilans kontak', 'Dinas Kesehatan'),
('Koordinasi One Health', 'Dinas Kesehatan'),
('Edukasi masyarakat', 'Dinas Kesehatan'),
('Pelaporan nasional', 'Dinas Kesehatan'),
('Monitoring pasien', 'Dinas Kesehatan'),
('Penutupan kasus', 'Dinas Kesehatan'),

('Koordinasi lintas desa', 'Kecamatan'),
('Penyebaran informasi', 'Kecamatan'),
('Monitoring wilayah', 'Kecamatan'),
('Pendampingan petugas', 'Kecamatan'),

('Verifikasi lokasi', 'Pemerintah Desa'),
('Pendataan ternak', 'Pemerintah Desa'),
('Pendataan korban', 'Pemerintah Desa'),
('Sosialisasi', 'Pemerintah Desa'),
('Penyebaran informasi', 'Pemerintah Desa'),
('Membantu isolasi lokasi', 'Pemerintah Desa'),
('Pendampingan petugas', 'Pemerintah Desa'),

('Penanganan kedaruratan', 'BPBD'),
('Bantuan logistik', 'BPBD'),
('Pengamanan lokasi', 'BPBD'),
('Dukungan operasional', 'BPBD'),

('Pengamanan lokasi', 'Polisi'),
('Pengaturan lalu lintas', 'Polisi'),
('Pendampingan evakuasi', 'Polisi'),
('Penegakan hukum', 'Polisi'),

('Penerimaan sampel', 'Laboratorium Veteriner'),
('Pemeriksaan laboratorium', 'Laboratorium Veteriner'),
('Konfirmasi hasil', 'Laboratorium Veteriner'),
('Pelaporan hasil', 'Laboratorium Veteriner'),

('Mengirim foto', 'Masyarakat / Pelapor'),
('Mengirim video', 'Masyarakat / Pelapor'),
('Mengirim lokasi GPS', 'Masyarakat / Pelapor'),
('Melaporkan kasus', 'Masyarakat / Pelapor'),
('Melakukan observasi', 'Masyarakat / Pelapor'),
('Mengisolasi hewan', 'Masyarakat / Pelapor'),
('Tidak menyentuh bangkai', 'Masyarakat / Pelapor'),
('Menunggu petugas', 'Masyarakat / Pelapor')
ON DUPLICATE KEY UPDATE kategori = VALUES(kategori);

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