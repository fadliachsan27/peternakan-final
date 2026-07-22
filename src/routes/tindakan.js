// Route untuk halaman admin "Daftar Tindakan" -- mengelola daftar master
// tindakan (mis. Observasi, Telfon RS, dst) yang dipakai sebagai pilihan
// dropdown di kolom "Tindakan" pada halaman Pengajuan dari Masyarakat.
//
// Fitur "Akses Tindakan per Dokter": tiap baris tindakan boleh punya kolom
// `kategori` (nama SEKTOR, lihat src/config/sektorTindakan.js). Kalau
// `kategori` NULL, tindakan itu "umum" dan selalu tampil untuk SEMUA akun.
// Kalau `kategori` terisi, tindakan itu HANYA tampil untuk dokter yang
// sektor tersebut ada di daftar sektor_tindakan wilayahnya (diatur admin
// utama lewat halaman "Role"). Admin utama (wilayah_id NULL) selalu melihat
// semuanya, karena dialah yang mengelola seluruh daftar master ini.
const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const wilayahStore = require('../config/wilayahStore');

const router = express.Router();

// Ambil daftar sektor yang boleh diakses akun yang sedang login.
// null = admin utama (tidak dibatasi sektor apa pun, lihat semua).
function getSektorAksesUser(user) {
  if (!user || !user.wilayah_id) return null; // admin utama
  const wilayah = wilayahStore.getAll().find((w) => w.id === user.wilayah_id);
  return (wilayah && wilayah.sektor_tindakan) || [];
}

// Ambil semua daftar master tindakan yang boleh diakses akun yang sedang
// login, diurutkan berdasarkan kategori lalu nama supaya gampang
// dikelompokkan per sektor di tampilan.
router.get('/', auth, async (req, res) => {
  try {
    const sektorAkses = getSektorAksesUser(req.user);

    let rows;
    if (sektorAkses === null) {
      // Admin utama: lihat seluruh daftar master tanpa batasan sektor.
      [rows] = await pool.query('SELECT * FROM tindakan ORDER BY (kategori IS NULL) ASC, kategori ASC, nama ASC');
    } else if (!sektorAkses.length) {
      // Dokter belum diberi akses sektor apa pun oleh admin utama -- tetap
      // tampilkan tindakan "umum" (kategori NULL) supaya alur lama (mis.
      // kolom Tindakan di halaman Pengajuan) tidak tiba-tiba kosong total.
      [rows] = await pool.query('SELECT * FROM tindakan WHERE kategori IS NULL ORDER BY nama ASC');
    } else {
      [rows] = await pool.query(
        'SELECT * FROM tindakan WHERE kategori IS NULL OR kategori IN (?) ORDER BY (kategori IS NULL) ASC, kategori ASC, nama ASC',
        [sektorAkses]
      );
    }

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ambil daftar sektor yang jadi akses akun yang sedang login (dipakai
// halaman "Daftar Tindakan" untuk menampilkan info "Akses sektor Anda: ...").
// null di response berarti admin utama (semua sektor).
router.get('/sektor-saya', auth, (req, res) => {
  res.json({ sektor: getSektorAksesUser(req.user) });
});

// Tambah tindakan baru ke daftar master. Ditambahkan lewat form manual di
// halaman "Daftar Tindakan" selalu masuk sebagai tindakan "umum" (kategori
// NULL) supaya otomatis tampil untuk semua akun, tidak terikat sektor mana pun.
router.post('/', auth, async (req, res) => {
  try {
    const { nama } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ error: 'Nama tindakan wajib diisi' });
    }

    const [result] = await pool.query(
      'INSERT INTO tindakan (nama, kategori) VALUES (?, NULL)',
      [nama.trim()]
    );

    const [rows] = await pool.query('SELECT * FROM tindakan WHERE id=?', [result.insertId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Tindakan dengan nama tersebut sudah ada di daftar' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Hapus tindakan dari daftar master. Berkat ON DELETE CASCADE di tabel
// pengajuan_tindakan, tindakan ini otomatis ikut hilang dari semua
// pengajuan yang sebelumnya memakainya.
//
// Tindakan bawaan sebuah sektor (kategori terisi) cuma boleh dihapus admin
// utama -- dokter wilayah tidak boleh menghapusnya sendiri, karena satu
// tindakan sektor bisa jadi dipakai bersama oleh beberapa dokter lain yang
// sektornya sama.
router.delete('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM tindakan WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Tindakan tidak ditemukan' });

    if (rows[0].kategori && req.user.wilayah_id) {
      return res.status(403).json({ error: 'Tindakan bawaan sektor cuma bisa dihapus admin utama' });
    }

    const [result] = await pool.query('DELETE FROM tindakan WHERE id=?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tindakan tidak ditemukan' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
