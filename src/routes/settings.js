const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const wilayahStore = require('../config/wilayahStore');
const {
    normalizeWhatsapp,
    isValidWhatsapp,
    setSettingValue
} = require('../utils/adminWhatsapp');

const router = express.Router();

// Ambil semua pengaturan (dipakai halaman admin & dipakai internal saat pengajuan masuk)
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nomor WA GLOBAL (fallback untuk kecamatan di luar wilayah manapun).
// Hanya admin utama (super admin, wilayah_id NULL) yang boleh mengubah ini
// -- setiap wilayah punya nomor sendiri (lihat endpoint /wilayah-whatsapp
// di bawah), jadi mengubah nomor global TIDAK akan mengubah nomor wilayah
// siapapun.
router.put('/admin-whatsapp', auth, async (req, res) => {
    try {
        if (req.user.wilayah_id) {
            return res.status(403).json({ error: 'Hanya admin utama yang bisa mengubah nomor WhatsApp global ini' });
        }

        const { admin_whatsapp } = req.body;

        if (!admin_whatsapp || !admin_whatsapp.trim()) {
            return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
        }

        const cleaned = normalizeWhatsapp(admin_whatsapp);

        if (!isValidWhatsapp(cleaned)) {
            return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
        }

        await setSettingValue(pool, 'admin_whatsapp', cleaned);

        res.json({ admin_whatsapp: cleaned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------
// Nomor WA milik WILAYAH SENDIRI -- khusus admin wilayah/dokter, supaya
// mereka bisa mengganti nomor WA kontak wilayahnya sendiri tanpa perlu
// minta bantuan admin utama. Ini SATU-SATUNYA hal yang boleh diubah
// admin wilayah/dokter lewat halaman "Akses Admin" -- data lain (nama
// wilayah, kecamatan, username, tambah/hapus dokter) tetap murni hak
// admin utama (lihat src/routes/aksesAdmin.js).
// ---------------------------------------------------------------------

router.get('/wilayah-whatsapp', auth, (req, res) => {
    if (!req.user.wilayah_id) {
        return res.status(403).json({ error: 'Fitur ini khusus admin wilayah/dokter' });
    }

    const wilayah = wilayahStore.getAll().find((w) => w.id === req.user.wilayah_id);
    if (!wilayah) return res.status(404).json({ error: 'Wilayah tidak ditemukan' });

    res.json({ wa: wilayah.wa || '', nama: wilayah.nama, dokter: wilayah.dokter });
});

router.put('/wilayah-whatsapp', auth, async (req, res) => {
    try {
        if (!req.user.wilayah_id) {
            return res.status(403).json({ error: 'Fitur ini khusus admin wilayah/dokter' });
        }

        const { wa } = req.body;
        if (!wa || !String(wa).trim()) {
            return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
        }

        const cleaned = normalizeWhatsapp(wa);
        if (!isValidWhatsapp(cleaned)) {
            return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
        }

        await pool.query('UPDATE wilayah SET wa = ? WHERE id = ?', [cleaned, req.user.wilayah_id]);
        await wilayahStore.reload();

        res.json({ wa: cleaned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;