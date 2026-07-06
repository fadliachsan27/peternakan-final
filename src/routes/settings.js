const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

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

// Bersihkan nomor WhatsApp: buang spasi/strip/plus, ubah awalan 0 jadi 62
function normalizeWhatsapp(raw) {
    let n = String(raw).replace(/[^0-9]/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return n;
}

router.put('/admin-whatsapp', auth, async (req, res) => {
    try {
        const { admin_whatsapp } = req.body;

        if (!admin_whatsapp || !admin_whatsapp.trim()) {
            return res.status(400).json({ error: 'Nomor WhatsApp wajib diisi' });
        }

        const cleaned = normalizeWhatsapp(admin_whatsapp);

        if (cleaned.length < 9 || cleaned.length > 15) {
            return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
        }

        await pool.query(
            `INSERT INTO settings (setting_key, setting_value) VALUES ('admin_whatsapp', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
            [cleaned, cleaned]
        );

        res.json({ admin_whatsapp: cleaned });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;