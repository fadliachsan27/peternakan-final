require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Jaring pengaman: cetak error ke console alih-alih membiarkan proses Node
// mati diam-diam (ini yang membuat server "hilang" / ERR_CONNECTION_REFUSED
// tanpa pesan apa pun di layar saat me-refresh halaman).
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

const authRoutes = require('./src/routes/auth');
const kasusRoutes = require('./src/routes/kasus');
const pengajuanRoutes = require('./src/routes/pengajuan');
const statsRoutes = require('./src/routes/stats');
const settingsRoutes = require('./src/routes/settings');
const tindakanRoutes = require('./src/routes/tindakan');
const aksesAdminRoutes = require('./src/routes/aksesAdmin');
const wilayahPublicRoutes = require('./src/routes/wilayahPublic');
const pool = require('./src/config/db');
const wilayahStore = require('./src/config/wilayahStore');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/kasus', kasusRoutes);
app.use('/api/pengajuan', pengajuanRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/tindakan', tindakanRoutes);
app.use('/api/akses-admin', aksesAdminRoutes);
app.use('/api/wilayah-dokter', wilayahPublicRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Web Peternakan API running' });
});

// PENTING: cache data wilayah (dokter, kecamatan, nomor WA) HARUS selesai
// dimuat SEBELUM server mulai menerima request. Sebelumnya wilayahStore.reload()
// dipanggil di dalam app.listen() tanpa "await", jadi server langsung terima
// koneksi sementara cache-nya masih kosong (proses reload masih jalan di
// belakang layar). Di lokal ini nyaris tidak kelihatan karena koneksi ke
// MySQL localhost sangat cepat, cache keburu terisi sebelum ada request yang
// masuk. Di hosting seperti Hostinger/Railway, koneksi ke database lebih
// lambat (dan prosesnya bisa restart saat idle), jadi request pertama ke
// "/api/wilayah-dokter" sering datang duluan sebelum cache terisi -> hasilnya
// array kosong -> nama dokter tidak muncul saat kecamatan dipilih.
// Perbaikan: tunggu (await) proses ini selesai dulu, baru app.listen().
async function start() {
  // Cek koneksi database saat startup, agar jelas jika penyebab data
  // tidak muncul adalah MySQL belum jalan / .env salah / tabel belum dibuat.
  try {
    await pool.query('SELECT 1');
    console.log('✅ Koneksi database berhasil.');
  } catch (err) {
    console.error('❌ Koneksi database GAGAL:', err.code || err.message);
    console.error('   Cek: apakah MySQL sedang berjalan? Apakah .env sudah benar? Sudahkah menjalankan "npm run init-db"?');
  }

  // Muat data wilayah ke cache memori, dengan retry kalau percobaan
  // pertama gagal (mis. database belum benar-benar siap menerima koneksi
  // saat proses Node baru menyala di hosting).
  try {
    const data = await wilayahStore.reloadWithRetry();
    console.log(`✅ Data wilayah dimuat (${data.length} wilayah).`);
  } catch (err) {
    console.error('❌ Gagal memuat data wilayah setelah beberapa percobaan:', err.code || err.message);
    console.error('   Sudahkah menjalankan "npm run init-db" / import database/railway-setup.sql untuk membuat tabel `wilayah`?');
    console.error('   Server tetap dijalankan; endpoint /api/wilayah-dokter akan otomatis mencoba reload ulang saat diakses.');
  }

  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Halaman publik: http://localhost:${PORT}/`);
    console.log(`Admin login: http://localhost:${PORT}/admin/login.html`);
  });
}

start();