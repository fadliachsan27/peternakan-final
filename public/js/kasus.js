let kasusData = [];
let currentStatusFilter = 'Semua';

// Status "korban/pasien berbeda dengan pelapor" untuk modal Tambah/Edit Data
// Kasus. Default-nya false: data identitas korban otomatis memakai data
// pelapor di section Pelapor. Kalau admin klik tombol & mengisi modal,
// datanya disimpan di identitasKorbanData dan dipakai saat submit.
let korbanBerbeda = false;
let identitasKorbanData = {
  nama_pasien: '',
  jenis_kelamin: '',
  tanggal_lapor: '',
  korban_kecamatan: '',
  alamat_pelapor: '',
  rt: '',
  rw: ''
};

function openIdentitasKorbanModal() {
  document.getElementById('modal_nama_pasien').value = identitasKorbanData.nama_pasien;
  document.getElementById('modal_jenis_kelamin').value = identitasKorbanData.jenis_kelamin;
  document.getElementById('modal_tanggal_lapor').value = identitasKorbanData.tanggal_lapor;
  document.getElementById('modal_korban_kecamatan').value = identitasKorbanData.korban_kecamatan;
  document.getElementById('modal_alamat_pelapor').value = identitasKorbanData.alamat_pelapor;
  document.getElementById('modal_rt').value = identitasKorbanData.rt;
  document.getElementById('modal_rw').value = identitasKorbanData.rw;
  document.getElementById('modalIdentitasKorban').classList.remove('hidden');
}

function closeIdentitasKorbanModal() {
  document.getElementById('modalIdentitasKorban').classList.add('hidden');
}

function saveIdentitasKorbanModal() {
  const namaPasien = document.getElementById('modal_nama_pasien').value.trim();
  const jenisKelamin = document.getElementById('modal_jenis_kelamin').value;
  const tanggalLapor = document.getElementById('modal_tanggal_lapor').value;
  const korbanKecamatan = document.getElementById('modal_korban_kecamatan').value.trim();

  if (!namaPasien || !jenisKelamin || !tanggalLapor || !korbanKecamatan) {
    showToast('Nama pasien, jenis kelamin, tanggal melapor, dan kecamatan korban wajib diisi', 'error');
    return;
  }

  identitasKorbanData = {
    nama_pasien: namaPasien,
    jenis_kelamin: jenisKelamin,
    tanggal_lapor: tanggalLapor,
    korban_kecamatan: korbanKecamatan,
    alamat_pelapor: document.getElementById('modal_alamat_pelapor').value.trim(),
    rt: document.getElementById('modal_rt').value.trim(),
    rw: document.getElementById('modal_rw').value.trim()
  };
  korbanBerbeda = true;
  updateIdentitasKorbanButton();
  closeIdentitasKorbanModal();
}

function updateIdentitasKorbanButton() {
  const label = document.getElementById('btnIdentitasKorbanLabel');
  const status = document.getElementById('identitasKorbanStatus');
  if (korbanBerbeda) {
    label.textContent = `Edit Data Korban (${identitasKorbanData.nama_pasien})`;
    status.textContent = 'Data korban/pasien berbeda dengan pelapor, sudah diisi lewat form di atas.';
  } else {
    label.textContent = 'Korban Beda dengan Pelapor?';
    status.textContent = 'Data korban/pasien akan memakai data pelapor di bawah ini. Klik tombol di atas kalau korban/pasien berbeda dengan pelapor.';
  }
}

// Parsing string waktu "YYYY-MM-DD HH:MM:SS" dari database sebagai jam
// Jakarta (WIB), supaya perhitungan selisih waktu konsisten & akurat.
function parseJakartaTime(str) {
  if (!str) return null;
  const iso = String(str).replace(' ', 'T') + '+07:00';
  const ms = new Date(iso).getTime();
  return isNaN(ms) ? null : ms;
}

// Ubah selisih milidetik menjadi teks singkat seperti "2 hari 3 jam" atau
// "45 menit", supaya mudah dibaca di kolom tabel.
function formatDurasi(ms) {
  if (ms < 0) ms = 0;
  const totalMenit = Math.floor(ms / 60000);
  if (totalMenit < 1) return "< 1 menit";

  const hari = Math.floor(totalMenit / 1440);
  const jam = Math.floor((totalMenit % 1440) / 60);
  const menit = totalMenit % 60;

  const bagian = [];
  if (hari) bagian.push(`${hari} hari`);
  if (jam) bagian.push(`${jam} jam`);
  if (menit && !hari) bagian.push(`${menit} menit`);

  return bagian.join(" ");
}

// Kolom "Keterangan": kalau kasus sudah Selesai, tampilkan sudah berapa lama
// sejak diselesaikan (updated_at). Kalau masih Aktif/Verifikasi, tampilkan
// sudah berapa lama berlangsung sejak kasus dibuat (created_at).
function keteranganWaktuCellKasus(k) {
  const createdMs = parseJakartaTime(k.created_at);
  if (!createdMs) return k.keterangan ? `<span class="text-xs">${k.keterangan}</span>` : '-';

  if (k.status === 'Selesai') {
    const updatedMs = parseJakartaTime(k.updated_at) || Date.now();
    const selisih = Date.now() - updatedMs;
    return `<span class="text-xs text-slate-500">Selesai ${formatDurasi(selisih)} yang lalu</span>`;
  }

  const selisih = Date.now() - createdMs;
  return `<span class="text-xs text-amber-600 font-medium">Berlangsung ${formatDurasi(selisih)}</span>`;
}

function fotoCellKasus(k) {
  if (!k.foto) return "-";
  return `<button onclick="handoImagePreview('${k.foto}', 'Foto Kasus')" class="btn-pill btn-pill-purple">
    <i class="ti ti-photo"></i> Lihat
  </button>`;
}

function kronologisCellKasus(k) {
  if (!k.kronologis) return "-";
  const singkat = k.kronologis.length > 60 ? k.kronologis.slice(0, 60) + "..." : k.kronologis;
  return `<span class="text-xs" title="${k.kronologis.replace(/"/g, '&quot;')}">${singkat}</span>`;
}

// Kolom "Tindakan" di Data Kasus: murni tampilan data (read-only), diambil
// dari tindakan yang sudah ditambahkan admin di halaman Pengajuan untuk
// pengajuan asal kasus ini. Tidak ada dropdown/tombol tambah di sini --
// kalau mau ubah tindakan, dilakukan dari halaman Pengajuan.
function tindakanCellKasus(k) {
  const list = k.tindakan_list ? String(k.tindakan_list).split('||').filter(Boolean) : [];
  if (!list.length) return '<span class="text-slate-400">-</span>';
  return `<div class="tindakan-tags">${list.map(nama => `<span class="tindakan-tag tindakan-tag-readonly">${nama}</span>`).join('')}</div>`;
}

// Kolom "Pelapor": kalau kasus ini punya data pelapor (baik diinput manual
// maupun berasal dari pengajuan warga yang disetujui), tampilkan tombol
// untuk melihat detail identitas pelapor & korban/pasien.
function pelaporCellKasus(k) {
  if (!k.nama_pelapor) return '-';
  return `<button onclick="showPelaporDetailKasus(${k.id})" class="icon-btn-circle" title="Lihat detail pelapor">
    <i class="ti ti-user"></i>
  </button>`;
}

// Popup detail pelapor untuk data kasus: identitas pelapor + korban/pasien +
// tombol hubungi WA (kalau nomornya ada).
function showPelaporDetailKasus(id) {
  const k = kasusData.find(x => x.id === id);
  if (!k) return;

  const alamatBagian = [k.alamat_pelapor, k.rt ? `RT ${k.rt}` : "", k.rw ? `RW ${k.rw}` : ""]
    .filter(Boolean).join(", ");

  const baris = (label, value) => `
    <div class="flex justify-between gap-3 py-1.5 border-b border-slate-100 text-sm">
      <span class="text-slate-400">${label}</span>
      <span class="text-slate-700 font-medium text-right">${value || "-"}</span>
    </div>`;

  const bodyHtml = `
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Pelapor</h4>
      ${baris('Nama Pelapor', k.nama_pelapor)}
      ${baris('No. WhatsApp', k.no_wa)}
    </div>
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Identitas Korban / Pasien</h4>
      ${baris('Nama Pasien', k.nama_pasien)}
      ${baris('Jenis Kelamin', k.jenis_kelamin)}
      ${baris('Tanggal Melapor', k.tanggal_lapor ? formatDateTime(k.tanggal_lapor) : '-')}
      ${baris('Kecamatan Asal', k.korban_kecamatan)}
      ${baris('Alamat Lengkap', alamatBagian)}
    </div>
    ${k.no_wa ? `<a href="https://wa.me/${k.no_wa}" target="_blank" class="btn-primary w-full flex items-center justify-center gap-2 mt-2">
      <i class="uil uil-whatsapp"></i> Hubungi via WhatsApp
    </a>` : ''}
  `;

  handoInfo({ title: 'Detail Pelapor', bodyHtml });
}

// Filter tab "Semua/Aktif/Verifikasi/Selesai" di atas tabel.
function setStatusFilter(status) {
  currentStatusFilter = status;
  document.querySelectorAll('#statusFilterTabs .filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  const mobileSelect = document.getElementById('statusFilterSelectMobile');
  if (mobileSelect && mobileSelect.value !== status) mobileSelect.value = status;
  renderTable();
}

async function loadKasus() {
  try {
    kasusData = await Api.get('/kasus');
    renderTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tableKasus');

  const rows = currentStatusFilter === 'Semua'
    ? kasusData
    : kasusData.filter(k => k.status === currentStatusFilter);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="14" class="text-center text-slate-400 py-8">Belum ada data</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((k, i) => `
    <tr class="tr-accordion">
      <td data-label="No" class="row-detail">${i + 1}</td>
      <td data-label="Tanggal">${formatDate(k.tanggal)}</td>
      <td data-label="Pelapor" class="row-detail">${pelaporCellKasus(k)}</td>
      <td data-label="Kecamatan"><span class="td-value-with-caret">${k.kecamatan}<i class="ti ti-chevron-down tr-accordion-caret"></i></span></td>
      <td data-label="Gejala" class="row-detail">${k.jenis_penyakit}</td>
      <td data-label="Sektor" class="row-detail">${k.sektor}</td>
      <td data-label="Status">${statusBadge(k.status)}</td>
      <td data-label="Alamat" class="max-w-[150px] truncate row-detail">${k.alamat || '-'}</td>
      <td data-label="Koordinat" class="text-xs font-mono row-detail">${k.latitude ? `${parseFloat(k.latitude).toFixed(4)}, ${parseFloat(k.longitude).toFixed(4)}` : '-'}</td>
      <td data-label="Foto" class="row-detail">${fotoCellKasus(k)}</td>
      <td data-label="Kronologis" class="max-w-[150px] truncate row-detail">${kronologisCellKasus(k)}</td>
      <td data-label="Tindakan" class="row-detail">${tindakanCellKasus(k)}</td>
      <td data-label="Aksi">
        <button onclick="editKasus(${k.id})" class="icon-btn-circle icon-btn-circle-slate mr-2" title="Edit Data">
          <i class="ti ti-edit"></i>
        </button>
        <button onclick="deleteKasus(${k.id})" class="icon-btn-circle icon-btn-circle-red" title="Hapus Data">
          <i class="ti ti-trash"></i>
        </button>
      </td>
      <td data-label="Keterangan" class="row-detail">${keteranganWaktuCellKasus(k)}</td>
    </tr>
  `).join('');

  // Di layar HP, baris cuma menampilkan ringkasan (Tanggal, Kecamatan, Status,
  // Aksi); tap barisnya untuk membuka/menutup detail lain (Pelapor, Gejala,
  // Sektor, Alamat, dst). Tap pada tombol Edit/Hapus TIDAK ikut membuka/tutup
  // baris -- supaya aksinya tetap langsung berfungsi seperti biasa.
  tbody.querySelectorAll('tr.tr-accordion').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('label')) return;
      tr.classList.toggle('tr-open');
    });
  });
}

function forceModalStyles() {
  const overlay = document.getElementById('modal');
  if (!overlay) return;
  const box = overlay.querySelector('.modal-box');
  const head = overlay.querySelector('.modal-head');
  const body = overlay.querySelector('.modal-body');

  const set = (el, styles) => {
    if (!el) return;
    Object.entries(styles).forEach(([prop, val]) => el.style.setProperty(prop, val, 'important'));
  };

  set(overlay, {
    position: 'fixed', inset: '0', 'z-index': '99999',
    background: 'rgba(15,23,42,0.85)',
    'backdrop-filter': 'none', '-webkit-backdrop-filter': 'none',
    display: overlay.classList.contains('hidden') ? 'none' : 'flex',
    'align-items': 'center', 'justify-content': 'center', padding: '1rem'
  });
  set(box, {
    background: '#ffffff', 'background-color': '#ffffff',
    'border-radius': '0.6rem', 'max-width': '640px', width: '95%',
    'max-height': '90vh', display: 'flex', 'flex-direction': 'column',
    'box-shadow': '0 25px 60px -10px rgba(0,0,0,0.55)',
    isolation: 'auto', opacity: '1'
  });
  set(head, { background: '#ffffff', 'background-color': '#ffffff' });
  set(body, { background: '#ffffff', 'background-color': '#ffffff' });
}

function openModal(id = null) {
  document.getElementById('modal').classList.remove('hidden');
  forceModalStyles();
  const modalIcon = id ? 'ti-edit' : 'ti-clipboard-plus';
  document.getElementById('modalTitle').innerHTML = `<i class="ti ${modalIcon}" style="color:var(--c-blue);margin-right:.4rem"></i>${id ? 'Edit Data Kasus' : 'Tambah Data Kasus'}`;
  document.getElementById('editId').value = id || '';

  if (id) {
    const k = kasusData.find(x => x.id === id);
    document.getElementById('tanggal').value = k.tanggal.split('T')[0];
    document.getElementById('kecamatan').value = k.kecamatan;
    document.getElementById('jenis_penyakit').value = k.jenis_penyakit;
    document.getElementById('sektor').value = k.sektor;
    document.getElementById('status').value = k.status;
    document.getElementById('alamat').value = k.alamat || '';
    document.getElementById('latitude').value = k.latitude || '';
    document.getElementById('longitude').value = k.longitude || '';

    document.getElementById('nama_pelapor').value = k.nama_pelapor || '';
    document.getElementById('no_wa').value = k.no_wa || '';
    document.getElementById('kronologis').value = k.kronologis || '';

    // Identitas Korban / Pasien: kalau nama pasien beda dari nama pelapor,
    // anggap datanya memang diisi terpisah lewat modal (tandai "berbeda").
    // Kalau sama (atau belum ada data pasien sama sekali), anggap datanya
    // otomatis mengikuti pelapor seperti default form ini.
    if (k.nama_pasien && k.nama_pasien !== k.nama_pelapor) {
      korbanBerbeda = true;
      identitasKorbanData = {
        nama_pasien: k.nama_pasien || '',
        jenis_kelamin: k.jenis_kelamin || '',
        tanggal_lapor: k.tanggal_lapor ? String(k.tanggal_lapor).split('T')[0].split(' ')[0] : '',
        korban_kecamatan: k.korban_kecamatan || '',
        alamat_pelapor: k.alamat_pelapor || '',
        rt: k.rt || '',
        rw: k.rw || ''
      };
    } else {
      korbanBerbeda = false;
      identitasKorbanData = { nama_pasien: '', jenis_kelamin: '', tanggal_lapor: '', korban_kecamatan: '', alamat_pelapor: '', rt: '', rw: '' };
    }
    updateIdentitasKorbanButton();

    document.getElementById('foto').value = '';
    const preview = document.getElementById('fotoExistingPreview');
    const img = document.getElementById('fotoExistingImg');
    if (k.foto) {
      img.src = k.foto;
      preview.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
    }
  } else {
    document.getElementById('formKasus').reset();
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
    document.getElementById('fotoExistingPreview').classList.add('hidden');

    korbanBerbeda = false;
    identitasKorbanData = { nama_pasien: '', jenis_kelamin: '', tanggal_lapor: '', korban_kecamatan: '', alamat_pelapor: '', rt: '', rw: '' };
    updateIdentitasKorbanButton();
  }

  setTimeout(() => {
    forceModalStyles();
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);
    initMap('mapModal', {
      editable: true,
      onSelect: (la, ln) => updateCoordDisplay(la, ln)
    });
    if (lat && lng) {
      updateCoordDisplay(lat, lng);
      flyToMarker(lat, lng);
    }

    // Alamat -> peta otomatis. Ketika admin mengetik/mengubah alamat,
    // peta langsung pindah & kasih titik lokasi. Admin tetap bisa ubah
    // manual lewat klik peta kalau titiknya kurang tepat.
    attachAddressGeocoding('alamat');
  }, 300);
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  const overlay = document.getElementById('modal');
  if (overlay) overlay.style.setProperty('display', 'none', 'important');
}

function editKasus(id) { openModal(id); }

async function deleteKasus(id) {
  const ok = await handoConfirm({
    title: 'Hapus Data Kasus?',
    message: 'Data yang sudah dihapus tidak dapat dikembalikan.',
    confirmText: 'Ya, Hapus',
    type: 'danger'
  });
  if (!ok) return;
  try {
    await Api.delete(`/kasus/${id}`);
    loadKasus();
    await handoAlert({
      title: 'Hapus Berhasil',
      message: 'Data kasus berhasil dihapus.',
      type: 'success'
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('formKasus').addEventListener('submit', async (e) => {
  e.preventDefault();

  const fd = new FormData();

  // Pelapor
  fd.append('nama_pelapor', document.getElementById('nama_pelapor').value);
  fd.append('no_wa', document.getElementById('no_wa').value);

  // Detail Laporan
  fd.append('tanggal', document.getElementById('tanggal').value);
  fd.append('kecamatan', document.getElementById('kecamatan').value);
  fd.append('jenis_penyakit', document.getElementById('jenis_penyakit').value);
  fd.append('sektor', document.getElementById('sektor').value);
  fd.append('status', document.getElementById('status').value);
  fd.append('alamat', document.getElementById('alamat').value);
  fd.append('latitude', document.getElementById('latitude').value || '');
  fd.append('longitude', document.getElementById('longitude').value || '');
  fd.append('kronologis', document.getElementById('kronologis').value);

  // Identitas Korban / Pasien: kalau korban berbeda dengan pelapor, pakai
  // data dari modal. Kalau sama, otomatis diisi dari data pelapor di atas.
  if (korbanBerbeda) {
    fd.append('nama_pasien', identitasKorbanData.nama_pasien);
    fd.append('jenis_kelamin', identitasKorbanData.jenis_kelamin);
    fd.append('tanggal_lapor', identitasKorbanData.tanggal_lapor);
    fd.append('korban_kecamatan', identitasKorbanData.korban_kecamatan);
    fd.append('alamat_pelapor', identitasKorbanData.alamat_pelapor);
    fd.append('rt', identitasKorbanData.rt);
    fd.append('rw', identitasKorbanData.rw);
  } else {
    fd.append('nama_pasien', document.getElementById('nama_pelapor').value);
    fd.append('jenis_kelamin', '');
    fd.append('tanggal_lapor', document.getElementById('tanggal').value);
    fd.append('korban_kecamatan', document.getElementById('kecamatan').value);
    fd.append('alamat_pelapor', document.getElementById('alamat').value);
    fd.append('rt', '');
    fd.append('rw', '');
  }

  const fotoInput = document.getElementById('foto');
  if (fotoInput.files[0]) fd.append('foto', fotoInput.files[0]);

  try {
    const id = document.getElementById('editId').value;
    if (id) {
      await Api.uploadPut(`/kasus/${id}`, fd);
      closeModal();
      loadKasus();
      await handoAlert({
        title: 'Perubahan Disimpan',
        message: 'Data kasus berhasil diperbarui.',
        type: 'success'
      });
    } else {
      await Api.upload('/kasus', fd);
      closeModal();
      loadKasus();
      await handoAlert({
        title: 'Data Ditambahkan',
        message: 'Data kasus baru berhasil ditambahkan.',
        type: 'success'
      });
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
});

async function exportExcel() {
  try {
    await Api.download('/stats/export', 'data_kasus_peternakan.xlsx');
    showToast('Export berhasil');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function downloadTemplate() {
  try {
    await Api.download('/stats/template', 'template_import_kasus.xlsx');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function importExcel(input) {
  if (!input.files[0]) return;
  const fd = new FormData();
  fd.append('file', input.files[0]);
  try {
    const result = await Api.upload('/stats/import', fd);
    loadKasus();
    await handoAlert({
      title: 'Data Berhasil Ditambahkan',
      message: result.message,
      type: 'success'
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
  input.value = '';
}

loadKasus();

// Kecamatan di form Tambah/Edit Data Kasus & Identitas Korban/Pasien: kalau
// yang login admin wilayah (dokter), dropdown dibatasi hanya kecamatan di
// wilayah kerjanya -- kalau admin utama, tetap dapat daftar lengkap.
const kecamatanWilayahAdmin = getWilayahKecamatanUser();
initKecamatanSearchDropdown('kecamatan', kecamatanWilayahAdmin);
initKecamatanSearchDropdown('modal_korban_kecamatan', kecamatanWilayahAdmin);