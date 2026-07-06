const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, nama: user.nama, role: user.role },
      process.env.JWT_SECRET || 'peternakan_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, nama: user.nama, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
