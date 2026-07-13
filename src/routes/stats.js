const express = require('express');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const multer = require('multer');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { isKecamatanAllowed, buildKecamatanWhereClause, getWilayahById } = require('../utils/wilayah');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/dashboard', auth.optional, async (req, res) => {
  try {
    const wilayahId = req.user ? req.user.wilayah_id : null;
    const kec = buildKecamatanWhereClause('kecamatan', wilayahId);

    const whereAnd = kec.where ? `AND ${kec.where}` : '';
    const whereOnly = kec.where ? `WHERE ${kec.where}` : '';

    const [[total]] = await pool.query(`SELECT COUNT(*) as count FROM kasus ${kec.where ? `WHERE ${kec.where}` : ''}`, kec.params);
    const [[aktif]] = await pool.query(`SELECT COUNT(*) as count FROM kasus WHERE status = 'Aktif' ${whereAnd}`, kec.params);
    const [[selesai]] = await pool.query(`SELECT COUNT(*) as count FROM kasus WHERE status = 'Selesai' ${whereAnd}`, kec.params);
    const [[verifikasi]] = await pool.query(`SELECT COUNT(*) as count FROM kasus WHERE status = 'Verifikasi' ${whereAnd}`, kec.params);
    const [[kecamatan]] = await pool.query(`SELECT COUNT(DISTINCT kecamatan) as count FROM kasus ${whereOnly}`, kec.params);

    const [tren] = await pool.query(`
      SELECT DATE_FORMAT(tanggal, '%Y-%m') as bulan, COUNT(*) as jumlah
      FROM kasus
      ${whereOnly}
      GROUP BY DATE_FORMAT(tanggal, '%Y-%m')
      ORDER BY bulan
    `, kec.params);

    const [trenGejala] = await pool.query(`
      SELECT DATE_FORMAT(tanggal, '%Y-%m') as bulan, jenis_penyakit, COUNT(*) as jumlah
      FROM kasus
      ${whereOnly}
      GROUP BY DATE_FORMAT(tanggal, '%Y-%m'), jenis_penyakit
      ORDER BY bulan
    `, kec.params);

    const [kecamatanSummary] = await pool.query(`
      SELECT kecamatan, COUNT(*) as jumlah, AVG(latitude) as latitude, AVG(longitude) as longitude
      FROM kasus
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL ${whereAnd}
      GROUP BY kecamatan
      ORDER BY jumlah DESC
    `, kec.params);

    const [distribusi] = await pool.query(`
      SELECT jenis_penyakit, COUNT(*) as jumlah
      FROM kasus
      ${whereOnly}
      GROUP BY jenis_penyakit
      ORDER BY jumlah DESC
    `, kec.params);

    const [sektorStats] = await pool.query(`
      SELECT sektor, COUNT(*) as jumlah
      FROM kasus
      ${whereOnly}
      GROUP BY sektor
    `, kec.params);

    const [terbaru] = await pool.query(`
      SELECT id, tanggal, kecamatan, jenis_penyakit, sektor, status
      FROM kasus
      ${whereOnly}
      ORDER BY tanggal DESC, id DESC
      LIMIT 10
    `, kec.params);

    const [mapData] = await pool.query(`
      SELECT id, kecamatan, jenis_penyakit, status, alamat, latitude, longitude
      FROM kasus
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL ${whereAnd}
    `, kec.params);

    res.json({
      summary: {
        total: total.count,
        aktif: aktif.count,
        selesai: selesai.count,
        verifikasi: verifikasi.count,
        kecamatan: kecamatan.count,
        lastUpdated: new Date().toISOString()
      },
      tren,
      trenGejala,
      distribusi,
      sektorStats,
      terbaru,
      mapData,
      kecamatanSummary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/export', auth, async (req, res) => {
  try {
    const { where, params } = buildKecamatanWhereClause('kecamatan', req.user.wilayah_id);
    const [rows] = await pool.query(
      `SELECT * FROM kasus ${where ? `WHERE ${where}` : ''} ORDER BY tanggal DESC, id DESC`,
      params
    );

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Web Peternakan';
    wb.created = new Date();

    const ws = wb.addWorksheet('Data Kasus', {
      views: [{ state: 'frozen', ySplit: 6 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
    });

    const columns = [
      { header: 'No', key: 'no', width: 6 },
      { header: 'Tanggal', key: 'tanggal', width: 13 },
      { header: 'Kecamatan', key: 'kecamatan', width: 16 },
      { header: 'Jenis Penyakit', key: 'jenis_penyakit', width: 18 },
      { header: 'Sektor', key: 'sektor', width: 12 },
      { header: 'Status', key: 'status', width: 13 },
      { header: 'Alamat', key: 'alamat', width: 26 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 }
    ];
    const colCount = columns.length;

    // ---- Judul laporan ----
    ws.mergeCells(1, 1, 1, colCount);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = 'LAPORAN DATA KASUS ZOONOSIS';
    titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 26;
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6FED' } };
    }

    ws.mergeCells(2, 1, 2, colCount);
    const subtitleCell = ws.getCell(2, 1);
    subtitleCell.value = 'Sistem Kewaspadaan Dini Zoonosis Berbasis One Health \u2014 Web Peternakan';
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FFFFFFFF' } };
    subtitleCell.alignment = { horizontal: 'center' };
    for (let c = 1; c <= colCount; c++) {
      ws.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6FED' } };
    }

    // Pakai timezone Asia/Jakarta secara eksplisit supaya jam yang tertulis di
    // laporan selalu WIB yang benar, apa pun timezone bawaan server hosting.
    const now = new Date();
    const tglUnduh = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    const jamUnduh = now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
    ws.mergeCells(3, 1, 3, colCount);
    const infoCell = ws.getCell(3, 1);
    infoCell.value = `Diunduh pada: ${tglUnduh}, ${jamUnduh}   |   Total Data: ${rows.length}`;
    infoCell.font = { size: 9, italic: true, color: { argb: 'FF64748B' } };
    infoCell.alignment = { horizontal: 'center' };

    ws.getRow(4).height = 6; // baris spasi tipis

    // ---- Header tabel ----
    const headerRowNum = 5;
    columns.forEach((col, i) => {
      const cell = ws.getCell(headerRowNum, i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
      ws.getColumn(i + 1).width = col.width;
    });
    ws.getRow(headerRowNum).height = 20;

    const statusColor = {
      Aktif: { fg: 'FFFEF2F2', font: 'FFB91C1C' },
      Verifikasi: { fg: 'FFFFFBEB', font: 'FF9A5B0F' },
      Selesai: { fg: 'FFECFDF5', font: 'FF15803D' }
    };

    // ---- Baris data ----
    rows.forEach((r, idx) => {
      const rowNum = headerRowNum + 1 + idx;
      const values = [
        idx + 1,
        r.tanggal,
        r.kecamatan,
        r.jenis_penyakit,
        r.sektor,
        r.status,
        r.alamat || '-',
        r.latitude || '-',
        r.longitude || '-'
      ];
      values.forEach((val, i) => {
        const cell = ws.getCell(rowNum, i + 1);
        cell.value = val;
        cell.alignment = { vertical: 'middle', wrapText: i === 6 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (idx % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });

      const statusCell = ws.getCell(rowNum, 6);
      const sc = statusColor[r.status];
      if (sc) {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc.fg } };
        statusCell.font = { bold: true, color: { argb: sc.font } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      ws.getCell(rowNum, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: colCount }
    };

    const buf = await wb.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename=laporan_kasus_peternakan.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/template', auth, async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Template Import');

    const columns = [
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Kecamatan', key: 'kecamatan', width: 16 },
      { header: 'Jenis Penyakit', key: 'jenis_penyakit', width: 18 },
      { header: 'Sektor', key: 'sektor', width: 12 },
      { header: 'Status', key: 'status', width: 13 },
      { header: 'Alamat', key: 'alamat', width: 26 },
      { header: 'Latitude', key: 'latitude', width: 12 },
      { header: 'Longitude', key: 'longitude', width: 12 }
    ];

    // Header di baris 1 (jangan digeser) supaya tetap kompatibel saat file ini
    // diisi lalu diupload kembali lewat fitur Import.
    columns.forEach((col, i) => {
      const cell = ws.getCell(1, i + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
      ws.getColumn(i + 1).width = col.width;
    });
    ws.getRow(1).height = 20;

    const contoh = ['2025-01-15', 'Cibadak', 'Leptospirosis', 'Hewan', 'Aktif', 'Desa Contoh', -6.8945, 106.7823];
    contoh.forEach((val, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = val;
      cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    // Sheet kedua: petunjuk pengisian (terpisah, tidak mengganggu proses import)
    const wsHelp = wb.addWorksheet('Petunjuk');
    wsHelp.getColumn(1).width = 20;
    wsHelp.getColumn(2).width = 60;
    wsHelp.mergeCells(1, 1, 1, 2);
    const helpTitle = wsHelp.getCell(1, 1);
    helpTitle.value = 'Petunjuk Pengisian Template Import';
    helpTitle.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    helpTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    helpTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6FED' } };
    wsHelp.getCell(1, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F6FED' } };
    wsHelp.getRow(1).height = 24;

    const rules = [
      ['Tanggal', 'Format YYYY-MM-DD, contoh: 2025-01-15'],
      ['Kecamatan', 'Nama kecamatan, bebas teks'],
      ['Jenis Penyakit', 'Nama penyakit, bebas teks'],
      ['Sektor', 'Salah satu dari: Hewan'],
      ['Status', 'Salah satu dari: Aktif, Verifikasi, Selesai'],
      ['Alamat', 'Alamat lokasi kasus (opsional)'],
      ['Latitude', 'Koordinat lintang, contoh: -6.8945 (opsional)'],
      ['Longitude', 'Koordinat bujur, contoh: 106.7823 (opsional)']
    ];
    rules.forEach((r, idx) => {
      const rowNum = idx + 3;
      wsHelp.getCell(rowNum, 1).value = r[0];
      wsHelp.getCell(rowNum, 1).font = { bold: true };
      wsHelp.getCell(rowNum, 2).value = r[1];
      wsHelp.getCell(rowNum, 2).alignment = { wrapText: true };
    });
    wsHelp.getCell(2, 1).value = 'Kolom';
    wsHelp.getCell(2, 1).font = { bold: true, color: { argb: 'FF64748B' } };
    wsHelp.getCell(2, 2).value = 'Keterangan Format';
    wsHelp.getCell(2, 2).font = { bold: true, color: { argb: 'FF64748B' } };

    wsHelp.mergeCells(12, 1, 12, 2);
    const helpNote = wsHelp.getCell(12, 1);
    helpNote.value = 'Penting: jangan ubah urutan atau nama kolom di sheet "Template Import", dan jangan sisipkan baris judul di atas header.';
    helpNote.font = { italic: true, color: { argb: 'FFB91C1C' } };
    helpNote.alignment = { wrapText: true };

    const buf = await wb.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', 'attachment; filename=template_import_kasus.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File Excel wajib diupload' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];

    // Cari baris header yang sebenarnya (berisi "Tanggal" & "Kecamatan"), supaya
    // tetap terbaca walau admin tidak sengaja upload file "Unduh Laporan" yang
    // header tabelnya tidak di baris pertama (ada judul di atasnya).
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = rawRows.findIndex(r =>
      Array.isArray(r) &&
      r.some(c => String(c).trim().toLowerCase() === 'tanggal') &&
      r.some(c => String(c).trim().toLowerCase() === 'kecamatan')
    );
    if (headerRowIndex === -1) headerRowIndex = 0;

    const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    if (!rows.length) return res.status(400).json({ error: 'File Excel kosong' });

    let imported = 0;
    let dilewati = 0;
    for (const row of rows) {
      const tanggal = row.Tanggal || row.tanggal;
      const kecamatan = row.Kecamatan || row.kecamatan;
      const jenis = row['Jenis Penyakit'] || row.jenis_penyakit;
      if (!tanggal || !kecamatan || !jenis) { dilewati++; continue; }

      // Admin wilayah (dokter) cuma boleh import data untuk kecamatan di
      // wilayah kerjanya sendiri -- baris lain otomatis dilewati.
      if (!isKecamatanAllowed(kecamatan, req.user.wilayah_id)) { dilewati++; continue; }

      const excelDate = typeof tanggal === 'number'
        ? new Date((tanggal - 25569) * 86400 * 1000).toISOString().split('T')[0]
        : String(tanggal).split('T')[0];

      await pool.query(
        `INSERT INTO kasus (tanggal, kecamatan, jenis_penyakit, sektor, status, alamat, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          excelDate,
          kecamatan,
          jenis,
          row.Sektor || row.sektor || 'Hewan',
          row.Status || row.status || 'Aktif',
          row.Alamat || row.alamat || null,
          row.Latitude || row.latitude || null,
          row.Longitude || row.longitude || null
        ]
      );
      imported++;
    }

    if (imported === 0) {
      return res.status(400).json({
        error: 'Tidak ada data valid ditemukan. Pastikan kolom Tanggal, Kecamatan, dan Jenis Penyakit terisi, dan gunakan file dari tombol "Unduh Template".'
      });
    }

    res.json({
      message: dilewati > 0
        ? `${imported} data berhasil diimport (${dilewati} baris dilewati karena data tidak lengkap)`
        : `${imported} data berhasil diimport`,
      imported
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;