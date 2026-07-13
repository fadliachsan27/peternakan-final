CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  role ENUM('admin') DEFAULT 'admin',
  -- wilayah_id: NULL = admin utama/super admin (akses semua kecamatan).
  -- Diisi angka 1-7 untuk akun dokter per wilayah (lihat src/config/wilayah.js)
  -- supaya data yang ditampilkan/diterima otomatis dibatasi hanya untuk
  -- kecamatan-kecamatan di wilayah kerjanya.
  wilayah_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS kasus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  jenis_penyakit VARCHAR(150) NOT NULL,
  sektor ENUM('Hewan', 'Manusia', 'Lingkungan') NOT NULL DEFAULT 'Hewan',
  status ENUM('Aktif', 'Verifikasi', 'Selesai') NOT NULL DEFAULT 'Aktif',
  alamat TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  keterangan TEXT,
  -- Kolom tambahan: diisi otomatis kalau kasus ini berasal dari pengajuan
  -- masyarakat yang disetujui (supaya tabel Kelola Data Kasus bisa
  -- menampilkan info yang sama seperti tabel Pengajuan dari Masyarakat).
  -- Untuk kasus yang diinput manual oleh admin, kolom-kolom ini tetap NULL.
  nama_pelapor VARCHAR(150),
  no_wa VARCHAR(20),
  foto VARCHAR(255),
  kronologis TEXT,
  pengajuan_id INT,
  -- Kolom Identitas Korban/Pasien, sama seperti tabel pengajuan, supaya form
  -- "Tambah Data Kasus" bisa mengisi data selengkap form "Ajukan Data Kasus".
  nama_pasien VARCHAR(150),
  jenis_kelamin ENUM('Laki-laki', 'Perempuan'),
  tanggal_lapor DATETIME,
  korban_kecamatan VARCHAR(100),
  alamat_pelapor TEXT,
  rt VARCHAR(10),
  rw VARCHAR(10),
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
  sektor ENUM('Hewan', 'Manusia', 'Lingkungan') NOT NULL DEFAULT 'Hewan',
  alamat TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  keterangan TEXT,
  status ENUM('Menunggu', 'Disetujui', 'Ditolak') NOT NULL DEFAULT 'Menunggu',
  alasan_penolakan TEXT,
  -- Kolom Identitas Korban/Pasien
  nama_pasien VARCHAR(150),
  jenis_kelamin ENUM('Laki-laki', 'Perempuan'),
  tanggal_lapor DATETIME,
  korban_kecamatan VARCHAR(100),
  alamat_pelapor TEXT,
  rt VARCHAR(10),
  rw VARCHAR(10),
  -- Kolom tambahan bagian Laporan
  foto VARCHAR(255),
  kronologis TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Catatan migrasi: penambahan kolom identitas korban, foto, dan kronologis
-- untuk database yang sudah ada sebelumnya ditangani otomatis oleh
-- scripts/init-db.js (cek information_schema, jadi kompatibel dengan semua
-- versi MySQL/MariaDB, tidak hanya yang mendukung "ADD COLUMN IF NOT EXISTS").

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Nomor WhatsApp admin default (bisa diubah lewat halaman Pengaturan di admin)
INSERT INTO settings (setting_key, setting_value) VALUES
('admin_whatsapp', '6281234567890')
ON DUPLICATE KEY UPDATE setting_key=setting_key;

-- Daftar master "Tindakan" (dikelola lewat halaman admin "Daftar Tindakan").
-- Daftar inilah yang jadi pilihan dropdown saat admin menambahkan tindakan
-- di kolom "Tindakan" pada halaman Pengajuan dari Masyarakat.
CREATE TABLE IF NOT EXISTS tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tindakan (nama) VALUES
('Observasi'),
('Telfon RS'),
('Deliver Obat'),
('Abaikan')
ON DUPLICATE KEY UPDATE nama=nama;

-- Relasi many-to-many: tindakan apa saja yang sudah ditambahkan admin untuk
-- pengajuan tertentu (satu pengajuan bisa punya beberapa tindakan sekaligus).
-- ON DELETE CASCADE supaya kalau pengajuan atau tindakan master dihapus,
-- relasinya otomatis ikut terhapus (tidak menyisakan data yatim).
CREATE TABLE IF NOT EXISTS pengajuan_tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pengajuan_id INT NOT NULL,
  tindakan_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pengajuan_id) REFERENCES pengajuan(id) ON DELETE CASCADE,
  FOREIGN KEY (tindakan_id) REFERENCES tindakan(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_pengajuan_tindakan (pengajuan_id, tindakan_id)
);

-- Default admin: username=admin, password=admin123
INSERT INTO users (username, password, nama) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Administrator')
ON DUPLICATE KEY UPDATE username=username;

-- Sample data (Sukabumi area)
INSERT INTO kasus (tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude, keterangan) VALUES
('2025-01-15', 'Cibadak', 'Leptospirosis', 'Hewan', 'Aktif', 'Desa Cibadak Utara', -6.89450000, 106.78230000, 'Kasus pada ternak sapi'),
('2025-01-20', 'Cicurug', 'Rabies', 'Hewan', 'Verifikasi', 'Kampung Cicurug', -6.78120000, 106.78340000, 'Anjing positif rabies'),
('2025-02-01', 'Sukabumi', 'Avian Influenza', 'Hewan', 'Selesai', 'Peternakan unggas', -6.92770000, 106.92930000, 'Sudah ditangani'),
('2025-02-10', 'Cisaat', 'Brucellosis', 'Hewan', 'Aktif', 'Kandang sapi perah', -6.91230000, 106.86540000, 'Monitoring berkala'),
('2025-02-15', 'Cikembar', 'Antraks', 'Hewan', 'Aktif', 'Peternakan kambing', -6.94560000, 106.81230000, 'Isolasi area');