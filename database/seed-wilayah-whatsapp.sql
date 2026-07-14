-- ============================================================
-- Seed / reset nomor WhatsApp per wilayah dokter.
-- Jalankan file ini SEKALI lewat phpMyAdmin (tab SQL) atau
-- client MySQL lain yang Anda pakai untuk database production.
--
-- Ini menegaskan nomor tiap wilayah LANGSUNG di database (tabel
-- settings), supaya tidak tergantung nilai bawaan di kode maupun
-- kemungkinan ada data lama yang salah nyangkut dari waktu bug
-- "nomor ke-global-an" kemarin.
--
-- Nomor per wilayah disimpan di key terpisah: wilayah_wa_<id>.
-- Mengubah salah satu key TIDAK memengaruhi key wilayah lain,
-- karena masing-masing baris berdiri sendiri.
-- ============================================================

INSERT INTO settings (setting_key, setting_value) VALUES
  ('wilayah_wa_1', '6285274463391'),  -- Wilayah 1 - drh. Reyhan Firdaus
  ('wilayah_wa_2', '6285719304190'),  -- Wilayah 2 - drh. Utari Wardiani
  ('wilayah_wa_3', '6285724978775'),  -- Wilayah 3 - drh. Kodrat ZB
  ('wilayah_wa_4', '628115220887'),   -- Wilayah 4 - drh. Fahmi
  ('wilayah_wa_5', '628557056309'),   -- Wilayah 5 - drh. Muhamad Supika
  ('wilayah_wa_6', '6285720624609'),  -- Wilayah 6 - drh. Pilar Patria
  ('wilayah_wa_7', '6285732055232')   -- Wilayah 7 - drh. Madya Adi Waskita
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Nomor GLOBAL (fallback, dipakai HANYA kalau ada kecamatan yang tidak
-- masuk wilayah manapun di atas -- seharusnya tidak pernah kepakai kalau
-- semua kecamatan Kabupaten Sukabumi sudah tercakup 7 wilayah di atas).
-- Ganti nilainya kalau admin utama (username: admin) mau pakai nomor lain.
INSERT INTO settings (setting_key, setting_value) VALUES
  ('admin_whatsapp', '6281234567890')
ON DUPLICATE KEY UPDATE setting_value = setting_value; -- tidak menimpa kalau sudah ada