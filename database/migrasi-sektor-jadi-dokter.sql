-- ============================================================
-- Migrasi: kolom "sektor" (dulu ENUM Hewan/Manusia/Lingkungan)
-- diubah jadi kolom teks bebas, supaya bisa diisi NAMA DOKTER
-- yang menangani wilayah kecamatan pelapor -- bukan sektor lagi.
--
-- Jalankan SEKALI di setiap database (Hostinger & Railway).
-- Aman dijalankan berkali-kali (tidak akan error kalau diulang).
-- Data lama yang masih bertuliskan "Hewan" dsb tidak dihapus, hanya
-- akan tampil apa adanya di data lama -- data baru otomatis akan
-- terisi nama dokter sesuai kecamatan.
-- ============================================================

ALTER TABLE pengajuan
  MODIFY COLUMN sektor VARCHAR(100) NOT NULL DEFAULT '-';

ALTER TABLE kasus
  MODIFY COLUMN sektor VARCHAR(100) NOT NULL DEFAULT '-';
