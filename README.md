# Web Peternakan

Sistem Kewaspadaan Dini Zoonosis berbasis web dengan dashboard monitoring, peta sebaran (Leaflet), CRUD data kasus, import/export Excel, dan dual role (publik + admin).

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript, Tailwind CSS (template Tailfox)
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Peta:** Leaflet.js + OpenStreetMap
- **Grafik:** Chart.js
- **Excel:** SheetJS (xlsx)

## Fitur

1. **Visual Monitoring** — Widget ringkasan, grafik tren bulanan, distribusi penyakit, tabel kasus terbaru
2. **Peta Sebaran** — Marker interaktif per lokasi kasus dengan koordinat
3. **CRUD Data Kasus** — Input manual dengan pilih titik lokasi di peta
4. **Import/Export Excel** — Template Excel, upload bulk, export data
5. **Dual Role** — Halaman publik (read-only + form pengajuan) dan admin (full access)
6. **Pengajuan Masyarakat** — Form publik + redirect WhatsApp admin + approval admin
7. **Pembagian Wilayah Kerja Dokter** — 7 akun admin/dokter, masing-masing hanya melihat & mengelola data kasus/pengajuan dari kecamatan di wilayah kerjanya. Admin utama (`admin`) tetap bisa melihat semua wilayah.

## Instalasi

### 1. Persyaratan

- Node.js 18+
- MySQL 8+ (atau MariaDB)

### 2. Setup

```bash
cd peternakan
npm install
copy .env.example .env
```

Edit file `.env` sesuai konfigurasi MySQL Anda:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password_anda
DB_NAME=peternakan_db
ADMIN_WHATSAPP=6281234567890
```

### 3. Inisialisasi Database

```bash
npm run init-db
```

> **Deploy di Railway (atau hosting lain yang cuma punya akses Query Console,
> tanpa bisa jalankan `npm run init-db`)?** Cukup copy-paste seluruh isi file
> **`database/railway-setup.sql`** ke Query Console database MySQL kamu lalu
> Run sekali. Satu file itu sudah mencakup semua tabel, migrasi kolom, login
> admin utama, dan 7 akun dokter wilayah sekaligus — tidak perlu jalankan
> apa pun lagi. Aman dijalankan berkali-kali dan tidak akan menghapus data
> yang sudah ada.

### 4. Jalankan Server

```bash
npm start
```

Buka browser:
- **Publik:** http://localhost:3000
- **Admin login:** http://localhost:3000/admin/login.html

**Login default:** `admin` / `admin123` (admin utama, bisa akses semua wilayah)

### 5. Login Admin per Wilayah (Dokter)

Setelah `npm run init-db`, otomatis dibuat 7 akun admin/dokter per wilayah kerja. Semua pakai password default `dokter123` (disarankan diganti lewat halaman **Pengaturan → Ganti Password** setelah login pertama kali):

| Username | Dokter | Wilayah | Kecamatan |
|----------|--------|---------|-----------|
| `reyhan` | drh. Reyhan Firdaus | Wilayah 1 | Sukalarang, Sukaraja, Sukabumi, Cisaat, Kadudampit, Gunungguruh, Kebonpedes, Cireunghas, Gegerbitung |
| `utari` | drh. Utari Wardiani | Wilayah 2 | Cibadak, Cikidang, Cikembar, Ciambar, Nagrak, Cicantayan, Caringin |
| `kodrat` | drh. Kodrat ZB | Wilayah 3 | Cicurug, Cidahu, Parungkuda, Parakansalak, Bojonggenteng, Kalapanunggal, Kabandungan |
| `fahmi` | drh. Fahmi | Wilayah 4 | Warungkiara, Bantargadung, Simpenan, Palabuhanratu, Cikakak, Cisolok |
| `supika` | drh. Muhamad Supika | Wilayah 5 | Purabaya, Nyalindung, Jampangtengah, Lengkong |
| `pilar` | drh. Pilar Patria | Wilayah 6 | Ciemas, Ciracap, Waluran, Surade, Cibitung, Jampangkulon, Kalibunder, Cimanggu |
| `madya` | drh. Madya Adi Waskita | Wilayah 7 | Sagaranten, Curugkembar, Cidadap, Pabuaran, Cidolog, Tegalbuleud |

Setiap admin wilayah hanya akan melihat, menambah, mengubah, dan menghapus data kasus/pengajuan dari kecamatan di wilayahnya sendiri saja — data dari kecamatan lain otomatis tidak ditampilkan maupun tidak bisa diakses (langsung ditolak oleh API), termasuk lewat export/import Excel. Laporan yang masuk lewat form publik juga otomatis diarahkan lewat WhatsApp ke dokter wilayah yang sesuai dengan kecamatan pelapor.

Pembagian wilayah & kecamatan bisa diubah lewat `src/config/wilayah.js`, lalu jalankan ulang `npm run init-db` untuk menyinkronkan akun.

## Struktur Folder

```
peternakan/
├── public/           # Frontend (HTML, JS, CSS, assets template)
├── src/routes/       # API routes
├── database/         # SQL schema
├── scripts/          # Init database
└── server.js         # Entry point
```

## API Endpoints

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | /api/auth/login | - | Login admin |
| PUT | /api/auth/password | Admin | Ganti password akun sendiri |
| GET | /api/kasus | Admin | List kasus (otomatis difilter sesuai wilayah kerja) |
| POST | /api/kasus | Admin | Tambah kasus (kecamatan wajib di wilayah kerja) |
| PUT | /api/kasus/:id | Admin | Update kasus |
| DELETE | /api/kasus/:id | Admin | Hapus kasus |
| GET | /api/stats/dashboard | Opsional | Data dashboard (publik = semua wilayah, admin login = difilter sesuai wilayah) |
| GET | /api/stats/export | Admin | Export Excel (difilter sesuai wilayah) |
| GET | /api/stats/template | Admin | Download template |
| POST | /api/stats/import | Admin | Import Excel (baris di luar wilayah otomatis dilewati) |
| POST | /api/pengajuan | - | Submit pengajuan publik |
| GET | /api/pengajuan | Admin | List pengajuan (difilter sesuai wilayah) |
| PUT | /api/pengajuan/:id/approve | Admin | Setujui pengajuan |
| PUT | /api/pengajuan/:id/reject | Admin | Tolak pengajuan |

## Format Excel Import

Kolom yang didukung:

| Tanggal | Kecamatan | Jenis Penyakit | Sektor | Status | Alamat | Latitude | Longitude | Keterangan |
|---------|-----------|----------------|--------|--------|--------|----------|-----------|------------|

Download template dari halaman admin **Data Kasus → Template Excel**.

## Koordinat Peta

Saat menambah/edit data, klik pada peta untuk menentukan titik lokasi. Koordinat akan otomatis terisi di bawah peta dan tersimpan ke database.

Pusat peta default: area Sukabumi (-6.9277, 106.9293).
