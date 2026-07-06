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

### 4. Jalankan Server

```bash
npm start
```

Buka browser:
- **Publik:** http://localhost:3000
- **Admin login:** http://localhost:3000/admin/login.html

**Login default:** `admin` / `admin123`

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
| GET | /api/kasus | - | List semua kasus |
| POST | /api/kasus | Admin | Tambah kasus |
| PUT | /api/kasus/:id | Admin | Update kasus |
| DELETE | /api/kasus/:id | Admin | Hapus kasus |
| GET | /api/stats/dashboard | - | Data dashboard |
| GET | /api/stats/export | Admin | Export Excel |
| GET | /api/stats/template | Admin | Download template |
| POST | /api/stats/import | Admin | Import Excel |
| POST | /api/pengajuan | - | Submit pengajuan publik |
| GET | /api/pengajuan | Admin | List pengajuan |
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
