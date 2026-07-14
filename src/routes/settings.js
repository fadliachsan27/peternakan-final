const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const {
    normalizeWhatsapp,
    isValidWhatsapp,
    setSettingValue,
    getEffectiveWilayahWhatsapp
} = require('../utils/adminWhatsapp');
const { getWilayahById } = require('../utils/wilayah');

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

// Nomor WA MILIK SENDIRI untuk admin wilayah/dokter. Setiap wilayah
// disimpan di key settings terpisah ('wilayah_wa_<id>'), jadi admin
// wilayah A mengubah nomornya sendiri tidak akan pernah mengubah nomor
// wilayah B, C, dst, ataupun nomor global.
router.put('/wilayah-whatsapp', auth, async (req, res) => {
    try {
        if (!req.user.wilayah_id) {
            return res.status(403).json({ error: 'Endpoint ini khusus akun admin wilayah' });
        }

        const wilayah = getWilayahById(req.user.wilayah_id);
        if (!wilayah) {
            return res.status(400).json({ error: 'Wilayah akun ini tidak ditemukan' });
        }

        const { whatsapp } = req.body;

        if (!whatsapp || !whatsapp.trim()) {
            return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
        }

        const cleaned = normalizeWhatsapp(whatsapp);

        if (!isValidWhatsapp(cleaned)) {
            return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
        }

        await setSettingValue(pool, `wilayah_wa_${wilayah.id}`, cleaned);

        res.json({ wilayah_id: wilayah.id, whatsapp: cleaned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nomor WA yang sedang aktif untuk wilayah akun yang login (dipakai
// halaman Pengaturan untuk menampilkan nilai saat ini di form).
router.get('/wilayah-whatsapp', auth, async (req, res) => {
    try {
        if (!req.user.wilayah_id) {
            return res.status(403).json({ error: 'Endpoint ini khusus akun admin wilayah' });
        }
        const whatsapp = await getEffectiveWilayahWhatsapp(pool, req.user.wilayah_id);
        res.json({ wilayah_id: req.user.wilayah_id, whatsapp });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;