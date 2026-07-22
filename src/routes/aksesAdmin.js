// ---------------------------------------------------------------------
// Fitur "Akses Admin": halaman khusus admin utama (super admin, wilayah_id
// NULL) untuk mengelola akun-akun admin dokter per wilayah -- menambah
// dokter baru, mengubah username & password, menonaktifkan/menghapus akses,
// serta mengatur nomor WhatsApp dan pesebaran kecamatan tiap wilayah.
//
// Semua endpoint di FILE INI WAJIB login sebagai admin utama -- admin
// wilayah/dokter tidak boleh mengakses endpoint di file ini sama sekali.
// (Admin wilayah/dokter tetap boleh mengganti nomor WA milik wilayahnya
// SENDIRI, tapi lewat endpoint terpisah: lihat GET/PUT
// /api/settings/wilayah-whatsapp di src/routes/settings.js.)
// ---------------------------------------------------------------------

const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const wilayahStore = require('../config/wilayahStore');
const { KECAMATAN_MASTER } = require('../config/kecamatanMaster');
const { SEKTOR_TINDAKAN, SEKTOR_NAMA_LIST } = require('../config/sektorTindakan');
const { normalizeWhatsapp, isValidWhatsapp } = require('../utils/adminWhatsapp');

const router = express.Router();

// Middleware: hanya admin utama (wilayah_id NULL) yang boleh lewat.
function onlyAdminUtama(req, res, next) {
  if (req.user.wilayah_id) {
    return res.status(403).json({ error: 'Fitur ini khusus admin utama' });
  }
  next();
}

router.use(auth, onlyAdminUtama);

function normalizeKecamatanInput(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = String(item || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// Validasi: semua nama kecamatan harus ada di daftar master, dan belum
// dipakai wilayah lain (kecuali wilayah yang sedang diedit, excludeWilayahId).
function validateKecamatan(kecamatanList, excludeWilayahId) {
  const masterLower = KECAMATAN_MASTER.map((k) => k.toLowerCase());

  for (const k of kecamatanList) {
    if (!masterLower.includes(k.toLowerCase())) {
      return { error: `Kecamatan "${k}" tidak dikenali/tidak ada di daftar kecamatan Kabupaten Sukabumi` };
    }
  }

  const semuaWilayah = wilayahStore.getAll();
  for (const k of kecamatanList) {
    const pemilik = semuaWilayah.find(
      (w) => w.id !== Number(excludeWilayahId) && w.kecamatan.some((kw) => kw.toLowerCase() === k.toLowerCase())
    );
    if (pemilik) {
      return { error: `Kecamatan "${k}" sudah menjadi wilayah kerja ${pemilik.dokter} (${pemilik.nama}). Hapus dulu dari wilayah tersebut sebelum memindahkannya.` };
    }
  }

  return { ok: true };
}

// Bersihkan input daftar sektor (hapus kosong/duplikat), dipakai untuk
// fitur "Akses Tindakan per Dokter" (kolom wilayah.sektor_tindakan).
function normalizeSektorInput(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = String(item || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

// Validasi: semua nama sektor harus ada di daftar master
// (src/config/sektorTindakan.js). Beda dengan kecamatan, sektor BOLEH
// dipakai lebih dari satu dokter sekaligus (mis. beberapa dokter sama-sama
// punya akses sektor "UPTD Peternakan / Puskeswan"), jadi tidak perlu cek
// kepemilikan eksklusif seperti kecamatan.
function validateSektor(sektorList) {
  const masterLower = SEKTOR_NAMA_LIST.map((s) => s.toLowerCase());
  for (const s of sektorList) {
    if (!masterLower.includes(s.toLowerCase())) {
      return { error: `Sektor "${s}" tidak dikenali/tidak ada di daftar sektor tindakan` };
    }
  }
  return { ok: true };
}

// Ambil daftar lengkap sektor beserta tindakan di dalamnya (untuk membangun
// checkbox "Akses Tindakan" di form Tambah/Edit Dokter pada halaman Role).
router.get('/sektor-master', (req, res) => {
  res.json(SEKTOR_TINDAKAN);
});

// Ambil daftar lengkap kecamatan (untuk membangun checkbox di form),
// beserta info kecamatan mana saja yang sudah dipakai wilayah mana.
router.get('/kecamatan-master', (req, res) => {
  const semuaWilayah = wilayahStore.getAll();
  const list = KECAMATAN_MASTER.map((nama) => {
    const pemilik = semuaWilayah.find((w) => w.kecamatan.some((kw) => kw.toLowerCase() === nama.toLowerCase()));
    return { nama, wilayah_id: pemilik ? pemilik.id : null, dokter: pemilik ? pemilik.dokter : null };
  });
  res.json(list);
});

// Daftar semua akun dokter (beserta info wilayah kerjanya).
router.get('/dokter', (req, res) => {
  res.json(wilayahStore.getAll());
});

// Tambah dokter (wilayah kerja) baru.
router.post('/dokter', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { username, password, nama, dokter, wa, kecamatan, sektor_tindakan } = req.body;
    const namaWilayah = String(nama || '').trim();
    const namaDokter = String(dokter || '').trim();
    const usernameClean = String(username || '').trim().toLowerCase();

    if (!namaWilayah) return res.status(400).json({ error: 'Nama wilayah wajib diisi' });
    if (!namaDokter) return res.status(400).json({ error: 'Nama dokter wajib diisi' });
    if (!usernameClean) return res.status(400).json({ error: 'Username wajib diisi' });
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' });
    }

    // Kecamatan BOLEH kosong saat pertama kali membuat dokter -- ini
    // penting terutama kalau seluruh kecamatan yang ada sudah terpakai
    // wilayah lain (checkbox-nya jadi abu-abu/disabled semua di form),
    // sehingga admin utama tidak bisa mencentang apa pun. Alurnya: buat
    // dulu akun dokternya tanpa kecamatan, lalu pindahkan kecamatan yang
    // diinginkan dari wilayah lama lewat menu Edit setelah dihapus dari
    // wilayah lama tersebut.
    const kecamatanList = normalizeKecamatanInput(kecamatan);
    if (kecamatanList.length) {
      const cekKecamatan = validateKecamatan(kecamatanList, null);
      if (cekKecamatan.error) return res.status(400).json({ error: cekKecamatan.error });
    }

    // Akses Tindakan: sektor apa saja yang boleh diakses dokter ini di
    // halaman "Daftar Tindakan". Boleh kosong dulu (belum dikasih akses apa
    // pun), diatur belakangan lewat menu Edit.
    const sektorList = normalizeSektorInput(sektor_tindakan);
    if (sektorList.length) {
      const cekSektor = validateSektor(sektorList);
      if (cekSektor.error) return res.status(400).json({ error: cekSektor.error });
    }

    let waClean = '';
    if (wa && String(wa).trim()) {
      waClean = normalizeWhatsapp(wa);
      if (!isValidWhatsapp(waClean)) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
    }

    const [existingUser] = await conn.query('SELECT id FROM users WHERE username = ?', [usernameClean]);
    if (existingUser.length) {
      return res.status(400).json({ error: 'Username sudah dipakai, gunakan username lain' });
    }

    await conn.beginTransaction();

    const [wilayahResult] = await conn.query(
      'INSERT INTO wilayah (nama, wa, kecamatan, sektor_tindakan) VALUES (?, ?, ?, ?)',
      [namaWilayah, waClean, JSON.stringify(kecamatanList), JSON.stringify(sektorList)]
    );
    const wilayahId = wilayahResult.insertId;

    const hash = await bcrypt.hash(String(password), 10);
    await conn.query(
      'INSERT INTO users (username, password, nama, role, wilayah_id, aktif) VALUES (?, ?, ?, "admin", ?, 1)',
      [usernameClean, hash, namaDokter, wilayahId]
    );

    await conn.commit();
    await wilayahStore.reload();

    res.status(201).json({ success: true, wilayah_id: wilayahId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username sudah dipakai, gunakan username lain' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Ubah data dokter/wilayah: nama wilayah, nama dokter, username, WA, kecamatan.
router.put('/dokter/:id', async (req, res) => {
  try {
    const wilayahId = Number(req.params.id);
    const existing = wilayahStore.getAll().find((w) => w.id === wilayahId);
    if (!existing) return res.status(404).json({ error: 'Wilayah/dokter tidak ditemukan' });
    if (!existing.user_id) return res.status(400).json({ error: 'Wilayah ini belum punya akun dokter yang terhubung' });

    const { username, nama, dokter, wa, kecamatan, sektor_tindakan } = req.body;
    const namaWilayah = String(nama || '').trim();
    const namaDokter = String(dokter || '').trim();
    const usernameClean = String(username || '').trim().toLowerCase();

    if (!namaWilayah) return res.status(400).json({ error: 'Nama wilayah wajib diisi' });
    if (!namaDokter) return res.status(400).json({ error: 'Nama dokter wajib diisi' });
    if (!usernameClean) return res.status(400).json({ error: 'Username wajib diisi' });

    const kecamatanList = normalizeKecamatanInput(kecamatan);
    if (kecamatanList.length) {
      const cekKecamatan = validateKecamatan(kecamatanList, wilayahId);
      if (cekKecamatan.error) return res.status(400).json({ error: cekKecamatan.error });
    }

    // Akses Tindakan: sektor apa saja yang boleh diakses dokter ini di
    // halaman "Daftar Tindakan".
    const sektorList = normalizeSektorInput(sektor_tindakan);
    if (sektorList.length) {
      const cekSektor = validateSektor(sektorList);
      if (cekSektor.error) return res.status(400).json({ error: cekSektor.error });
    }

    let waClean = '';
    if (wa && String(wa).trim()) {
      waClean = normalizeWhatsapp(wa);
      if (!isValidWhatsapp(waClean)) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid' });
    }

    const [dupUser] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [usernameClean, existing.user_id]);
    if (dupUser.length) {
      return res.status(400).json({ error: 'Username sudah dipakai, gunakan username lain' });
    }

    await pool.query('UPDATE wilayah SET nama = ?, wa = ?, kecamatan = ?, sektor_tindakan = ? WHERE id = ?', [
      namaWilayah, waClean, JSON.stringify(kecamatanList), JSON.stringify(sektorList), wilayahId
    ]);
    await pool.query('UPDATE users SET username = ?, nama = ? WHERE id = ?', [usernameClean, namaDokter, existing.user_id]);

    await wilayahStore.reload();

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username sudah dipakai, gunakan username lain' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Reset password dokter (admin utama tidak perlu tahu password lama).
router.put('/dokter/:id/password', async (req, res) => {
  try {
    const wilayahId = Number(req.params.id);
    const existing = wilayahStore.getAll().find((w) => w.id === wilayahId);
    if (!existing) return res.status(404).json({ error: 'Wilayah/dokter tidak ditemukan' });
    if (!existing.user_id) return res.status(400).json({ error: 'Wilayah ini belum punya akun dokter yang terhubung' });

    const { new_password } = req.body;
    if (!new_password || String(new_password).length < 6) {
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });
    }

    const hash = await bcrypt.hash(String(new_password), 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, existing.user_id]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aktifkan / nonaktifkan akses login dokter (data wilayah & kecamatan tetap tersimpan).
router.put('/dokter/:id/status', async (req, res) => {
  try {
    const wilayahId = Number(req.params.id);
    const existing = wilayahStore.getAll().find((w) => w.id === wilayahId);
    if (!existing) return res.status(404).json({ error: 'Wilayah/dokter tidak ditemukan' });
    if (!existing.user_id) return res.status(400).json({ error: 'Wilayah ini belum punya akun dokter yang terhubung' });

    const aktif = !!req.body.aktif;
    await pool.query('UPDATE users SET aktif = ? WHERE id = ?', [aktif ? 1 : 0, existing.user_id]);
    await wilayahStore.reload();

    res.json({ success: true, aktif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hapus akses dokter secara permanen (akun login & wilayah kerjanya
// dihapus). Data kasus/pengajuan yang sudah ada TIDAK ikut terhapus,
// karena kolom kecamatan/nama dokter di data itu disimpan sebagai teks,
// bukan relasi langsung ke akun ini.
router.delete('/dokter/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const wilayahId = Number(req.params.id);
    const existing = wilayahStore.getAll().find((w) => w.id === wilayahId);
    if (!existing) return res.status(404).json({ error: 'Wilayah/dokter tidak ditemukan' });

    await conn.beginTransaction();
    if (existing.user_id) {
      await conn.query('DELETE FROM users WHERE id = ?', [existing.user_id]);
    }
    await conn.query('DELETE FROM wilayah WHERE id = ?', [wilayahId]);
    await conn.commit();

    await wilayahStore.reload();

    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
