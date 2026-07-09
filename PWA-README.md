# PWA (Progressive Web App) - Sudah Ditambahkan ✅

Project ini sekarang sudah dilengkapi konfigurasi PWA lengkap, siap untuk
dianalisis/dikemas menjadi aplikasi native lewat **https://www.pwabuilder.com**.

## Apa saja yang ditambahkan

| File/Folder | Fungsi |
|---|---|
| `public/manifest.json` | Web App Manifest — nama, ikon, warna tema, shortcut, mode `standalone` |
| `public/sw.js` | Service Worker — app-shell caching, dukungan offline, cache-first untuk aset statis, network-first untuk halaman & API |
| `public/offline.html` | Halaman fallback saat benar-benar tidak ada koneksi & cache |
| `public/icons/*.png` | Ikon PWA (48–512px) + versi *maskable* untuk Android adaptive icon |
| `public/favicon.ico` | Favicon multi-resolusi (16/32/48) |
| `public/js/pwa-register.js` | Script pendaftaran service worker |
| Semua file `.html` (index, pengajuan, admin/*) | Ditambahkan `<link rel="manifest">`, meta `theme-color`, ikon, dan pemanggilan `pwa-register.js` |

Ikon dibuat baru bertema **peternakan/zoonosis** (siluet kepala sapi di dalam
perisai + garis pulse merah = simbol "kewaspadaan dini"), menggunakan warna
biru `#2563eb` yang sudah jadi warna aksen aplikasi ini.

## Cara pakai PWABuilder

PWABuilder menganalisis **URL yang sudah online (harus HTTPS)**, bukan file
mentah. Langkah-langkahnya:

1. **Deploy dulu** aplikasi ini ke hosting yang mendukung Node.js + MySQL
   dengan HTTPS aktif (contoh: Railway, Render, VPS + Nginx + Let's Encrypt,
   dsb). PWA tidak akan terpasang (installable) tanpa HTTPS, kecuali di
   `localhost` saat development.
2. Buka **https://www.pwabuilder.com**
3. Masukkan URL situs yang sudah live, misal `https://domainanda.com`
4. PWABuilder akan otomatis mendeteksi `manifest.json` dan `sw.js`, lalu
   memberi skor PWA (manifest, service worker, security).
5. Klik **Package for Store** untuk generate paket **Android (APK/AAB)**,
   **Windows (MSIX)**, atau **iOS**.

## Uji coba lokal dulu (opsional, sebelum deploy)

```bash
npm install
npm run init-db      # jika DB belum dibuat
npm start
```

Buka `http://localhost:3000` di Chrome → buka DevTools → tab **Application**
→ cek bagian **Manifest** dan **Service Workers** untuk memastikan keduanya
terbaca tanpa error. Service worker & instalasi PWA tetap berfungsi di
`localhost` walau belum HTTPS (pengecualian khusus browser untuk development).

## Catatan tentang caching

- **Halaman admin** ikut di-precache sesuai permintaan, agar app-shell-nya
  bisa dibuka dari home screen. Tapi semua panggilan ke `/api/**` (termasuk
  login & data admin) **selalu** diarahkan ke jaringan (tidak pernah
  di-cache) — jadi data sensitif tidak tersimpan offline, hanya tampilan
  halamannya saja yang bisa dibuka saat offline.
- Jika Anda mengubah CSS/JS di kemudian hari dan perubahan tidak muncul
  karena ter-cache, naikkan nomor `CACHE_VERSION` di `public/sw.js` (misal
  dari `'v1'` ke `'v2'`) agar service worker memaksa cache lama dihapus.
- Ikon dasar untuk generate ulang tersedia di `public/manifest.json`
  (referensi path `/icons/`). Jika ingin mengganti logo, ganti semua file
  di folder `public/icons/` dengan ukuran yang sama.
