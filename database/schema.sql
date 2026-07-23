CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(150) NOT NULL,
  role ENUM('admin') DEFAULT 'admin',
  -- wilayah_id: NULL = admin utama/super admin (akses semua kecamatan).
  -- Diisi ID wilayah (lihat tabel `wilayah` di bawah) untuk akun dokter per
  -- wilayah, supaya data yang ditampilkan/diterima otomatis dibatasi hanya
  -- untuk kecamatan-kecamatan di wilayah kerjanya.
  wilayah_id INT DEFAULT NULL,
  -- aktif = 0 berarti akun dinonaktifkan oleh admin utama lewat fitur
  -- "Akses Admin" -- akun ini tidak bisa login lagi sampai diaktifkan ulang,
  -- tapi datanya (nama, wilayah, dsb) tetap tersimpan.
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Master data wilayah kerja dokter (dulunya hardcode di src/config/wilayah.js,
-- sekarang dikelola lewat halaman admin "Akses Admin" supaya admin utama bisa
-- menambah/mengubah wilayah, kecamatan, dan nomor WhatsApp tanpa ubah kode).
CREATE TABLE IF NOT EXISTS wilayah (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  wa VARCHAR(20),
  -- Daftar nama kecamatan disimpan sebagai JSON array string, mis. '["Cibadak","Cikidang"]'
  kecamatan TEXT,
  -- Akses Tindakan: daftar nama SEKTOR (lihat src/config/sektorTindakan.js)
  -- yang tindakannya boleh diakses/dipilih dokter wilayah ini di halaman
  -- "Daftar Tindakan", disimpan sebagai JSON array string, mis.
  -- '["UPTD Peternakan / Puskeswan","Dinas Peternakan Kabupaten"]'.
  -- Satu dokter boleh punya lebih dari satu sektor sekaligus.
  sektor_tindakan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
  -- Jenis Hewan + Gejala (checkbox multi-pilih, disimpan sebagai JSON array
  -- of kode gejala, lihat src/config/gejala.js) + snapshot nama-nama
  -- kemungkinan penyakit zoonosis yang dihitung otomatis dari gejala yang
  -- dipilih (dipisah koma, ditampilkan di detail admin).
  jenis_hewan VARCHAR(100),
  gejala TEXT,
  kemungkinan_penyakit TEXT,
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
  -- Kolom Identitas Korban/Pasien
  nama_pasien VARCHAR(150),
  jenis_kelamin ENUM('Laki-laki', 'Perempuan'),
  tanggal_lapor DATETIME,
  korban_kecamatan VARCHAR(100),
  alamat_pelapor TEXT,
  rt VARCHAR(10),
  rw VARCHAR(10),
  -- Jenis Hewan + Gejala (checkbox multi-pilih, disimpan sebagai JSON array
  -- of kode gejala, lihat src/config/gejala.js) + snapshot nama-nama
  -- kemungkinan penyakit zoonosis yang dihitung otomatis dari gejala yang
  -- dipilih (dipisah koma, ditampilkan di detail admin).
  jenis_hewan VARCHAR(100),
  gejala TEXT,
  kemungkinan_penyakit TEXT,
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
--
-- Kolom `kategori` = nama SEKTOR asal tindakan ini (lihat
-- src/config/sektorTindakan.js), NULL kalau tindakan "umum" yang ditambahkan
-- manual lewat halaman "Daftar Tindakan" (selalu tampil untuk semua akun).
-- Tindakan berkategori sektor cuma tampil untuk dokter yang sektor tersebut
-- ada di kolom wilayah.sektor_tindakan miliknya (fitur "Akses Tindakan").
-- Unique key sengaja gabungan (nama, kategori) karena nama tindakan yang
-- sama bisa muncul di lebih dari satu sektor (mis. "Pengobatan" ada di
-- sektor UPTD Peternakan maupun Puskesmas).
CREATE TABLE IF NOT EXISTS tindakan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(150) NOT NULL,
  kategori VARCHAR(150) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tindakan_nama_kategori (nama, kategori)
);

INSERT INTO tindakan (nama) VALUES
('Observasi'),
('Telfon RS'),
('Deliver Obat'),
('Abaikan')
ON DUPLICATE KEY UPDATE nama=nama;

-- Seed daftar tindakan baku per sektor (lihat src/config/sektorTindakan.js).
-- Dijalankan aman berkali-kali lewat ON DUPLICATE KEY UPDATE.
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