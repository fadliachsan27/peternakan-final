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
const pool = require('./src/config/db');

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Web Peternakan API running' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Halaman publik: http://localhost:${PORT}/`);
  console.log(`Admin login: http://localhost:${PORT}/admin/login.html`);

  // Cek koneksi database saat startup, agar jelas jika penyebab data
  // tidak muncul adalah MySQL belum jalan / .env salah / tabel belum dibuat.
  pool.query('SELECT 1')
    .then(() => console.log('✅ Koneksi database berhasil.'))
    .catch((err) => {
      console.error('❌ Koneksi database GAGAL:', err.code || err.message);
      console.error('   Cek: apakah MySQL sedang berjalan? Apakah .env sudah benar? Sudahkah menjalankan "npm run init-db"?');
    });
});