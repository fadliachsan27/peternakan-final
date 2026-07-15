// ---------------------------------------------------------------------
// Helper terpusat untuk nomor WhatsApp tujuan notifikasi.
//
// Ada 2 jenis nomor:
//  1. Nomor GLOBAL (fallback) -- key settings: 'admin_whatsapp'.
//     Dipakai untuk kecamatan yang tidak masuk wilayah dokter manapun.
//     Hanya admin utama (super admin) yang boleh mengubah ini, lewat
//     halaman "Akses Admin".
//  2. Nomor PER WILAYAH -- disimpan langsung di kolom `wa` tabel `wilayah`.
//     Tiap wilayah/dokter punya nomor sendiri-sendiri. Admin utama bisa
//     mengatur nomor semua wilayah lewat fitur "Akses Admin", dan admin
//     dokter/wilayah yang bersangkutan juga bisa mengganti nomor wilayahnya
//     sendiri lewat halaman yang sama (endpoint /settings/wilayah-whatsapp).
// ---------------------------------------------------------------------

const wilayahStore = require('../config/wilayahStore');

function normalizeWhatsapp(raw) {
  let n = String(raw).replace(/[^0-9]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  return n;
}

function isValidWhatsapp(cleaned) {
  return cleaned.length >= 9 && cleaned.length <= 15;
}

async function getSettingValue(pool, key) {
  try {
    const [rows] = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1',
      [key]
    );
    return rows.length ? rows[0].setting_value : null;
  } catch (e) {
    // Tabel settings belum ada (belum init-db terbaru) -> anggap tidak ada override
    return null;
  }
}

async function setSettingValue(pool, key, value) {
  await pool.query(
    `INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = ?`,
    [key, value, value]
  );
}

// Nomor global/fallback yang sedang aktif.
async function getEffectiveAdminWhatsapp(pool) {
  const fromDb = await getSettingValue(pool, 'admin_whatsapp');
  const raw = fromDb || process.env.ADMIN_WHATSAPP || '6281234567890';
  return normalizeWhatsapp(raw);
}

// Nomor WA milik satu wilayah tertentu, langsung dari data wilayah yang
// dikelola admin utama lewat fitur "Akses Admin". Parameter `pool` dipertahankan
// supaya pemanggil lama (auth.js, pengajuan.js) tidak perlu diubah, meski
// tidak dipakai lagi di sini.
async function getEffectiveWilayahWhatsapp(pool, wilayahId) {
  const w = wilayahStore.getAll().find((x) => x.id === Number(wilayahId));
  if (!w || !w.wa) return null;
  return normalizeWhatsapp(w.wa);
}

module.exports = {
  normalizeWhatsapp,
  isValidWhatsapp,
  getSettingValue,
  setSettingValue,
  getEffectiveAdminWhatsapp,
  getEffectiveWilayahWhatsapp
};