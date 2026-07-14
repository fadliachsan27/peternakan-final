// ---------------------------------------------------------------------
// Helper terpusat untuk nomor WhatsApp tujuan notifikasi.
//
// Ada 2 jenis nomor:
//  1. Nomor GLOBAL (fallback) -- key settings: 'admin_whatsapp'.
//     Dipakai untuk kecamatan yang tidak masuk wilayah dokter manapun.
//     Hanya admin utama (super admin) yang boleh mengubah ini.
//  2. Nomor PER WILAYAH -- key settings: 'wilayah_wa_<id>'.
//     Tiap wilayah/dokter punya nomor sendiri-sendiri, dan mengubah nomor
//     satu wilayah TIDAK memengaruhi nomor wilayah lain maupun nomor
//     global. Kalau belum pernah diubah lewat halaman Pengaturan, nilai
//     awalnya diambil dari src/config/wilayah.js (kolom "wa").
// ---------------------------------------------------------------------

const { WILAYAH } = require('../config/wilayah');

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
  return fromDb || process.env.ADMIN_WHATSAPP || '6281234567890';
}

// Nomor WA milik satu wilayah tertentu (override dari settings, atau
// default bawaan dari config kalau belum pernah diubah).
async function getEffectiveWilayahWhatsapp(pool, wilayahId) {
  const w = WILAYAH.find((x) => x.id === Number(wilayahId));
  if (!w) return null;
  const override = await getSettingValue(pool, `wilayah_wa_${w.id}`);
  return override || w.wa;
}

module.exports = {
  normalizeWhatsapp,
  isValidWhatsapp,
  getSettingValue,
  setSettingValue,
  getEffectiveAdminWhatsapp,
  getEffectiveWilayahWhatsapp
};
