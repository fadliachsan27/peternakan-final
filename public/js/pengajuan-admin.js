let pengajuanData = [];

async function loadPengajuan() {

  try {

    pengajuanData = await Api.get('/pengajuan');

    renderTable(pengajuanData);
    highlightFromUrl();

  } catch (err) {

    showToast(err.message, 'error');

  }

}

function highlightFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('highlight');
  if (!id) return;

  const row = document.getElementById(`pengajuan-row-${id}`);
  if (!row) return;

  row.scrollIntoView({ behavior: 'smooth', block: 'center' });
  row.classList.add('row-highlight');
  setTimeout(() => row.classList.remove('row-highlight'), 4000);

  // Bersihkan parameter dari URL supaya highlight tidak muncul lagi kalau halaman di-refresh
  params.delete('highlight');
  const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
  window.history.replaceState({}, '', newUrl);
}

// Parsing string waktu "YYYY-MM-DD HH:MM:SS" dari database sebagai jam
// Jakarta (WIB), sama seperti cara backend menghitungnya di endpoint
// pending-notif, supaya hasil selisih waktunya konsisten & akurat.
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
  // menit hanya ditampilkan kalau durasinya masih di bawah 1 hari, supaya
  // teksnya tidak kepanjangan untuk durasi yang sudah lama.
  if (menit && !hari) bagian.push(`${menit} menit`);

  return bagian.join(" ");
}

// Info kolom "Pengajuan":
// - Kalau masih "Menunggu": "Belum diproses (X dari waktu pengajuan)" --
//   dihitung dari waktu pengajuan masuk (created_at) sampai sekarang.
// - Kalau sudah diproses (Disetujui/Ditolak): "Sudah diproses X yang lalu" --
//   dihitung dari waktu statusnya diubah (updated_at) sampai sekarang.
function waktuProsesCell(p) {
  const createdMs = parseJakartaTime(p.created_at);
  if (!createdMs) return "-";

  if (p.status === "Menunggu") {
    const selisih = Date.now() - createdMs;
    return `<span class="text-xs text-amber-600 font-medium">Belum diproses (${formatDurasi(selisih)} dari pengajuan)</span>`;
  }

  const updatedMs = parseJakartaTime(p.updated_at) || Date.now();
  const selisih = Date.now() - updatedMs;
  return `<span class="text-xs text-slate-500">Sudah diproses ${formatDurasi(selisih)} yang lalu</span>`;
}

function waNotif(p) {

  if (p.status === "Menunggu") return "-";

  const baseUrl = window.location.origin;
  let pesan = "";

  if (p.status === "Disetujui") {

    // Kalau sudah ada tindakan yang ditambahkan admin (lewat kolom
    // "Tindakan"), sertakan daftarnya di pesan WA supaya pelapor tahu
    // tindak lanjut apa saja yang akan/sedang dilakukan.
    const tindakanList = p.tindakan_list ? String(p.tindakan_list).split('||').filter(Boolean) : [];
    const tindakanBagian = tindakanList.length
      ? `\n\nTindakan yang akan dilakukan:\n${tindakanList.map(t => `- ${t}`).join('\n')}`
      : "";

    pesan =
      `Halo ${p.nama_pelapor}, Saya Admin Peternakan.

Laporan yang Anda kirim telah Disetujui oleh Kami.
Detail:
Tanggal : ${formatDate(p.tanggal)}
Kecamatan : ${p.kecamatan}
Jenis Penyakit : ${p.jenis_penyakit}${tindakanBagian}

Anda bisa memantau perkembangan data zoonosis di dashboard publik kami:
${baseUrl}/index.html

Terima kasih atas partisipasi Anda.

Admin Peternakan`;

  } else {

    // Pengajuan yang ditolak TIDAK menyertakan info tindakan sama sekali,
    // karena tindak lanjut cuma relevan untuk pengajuan yang disetujui.
    pesan =
      `Halo ${p.nama_pelapor}, Saya Admin Peternakan.

Mohon Maaf.

Laporan Anda DITOLAK oleh Kami.
Alasan Penolakan:${p.alasan_penolakan}

Silakan lakukan perbaikan lalu ajukan kembali laporan Anda di sini:
${baseUrl}/pengajuan.html

Admin Peternakan`;

  }

  return `
    <a href="https://wa.me/${p.no_wa}?text=${encodeURIComponent(pesan)}"
       target="_blank"
       class="text-green-600 text-xl">
       <i class="uil uil-whatsapp"></i>
    </a>
    `;
}

// Popup detail pelapor: identitas pelapor + korban/pasien + tombol hubungi WA
function showPelaporDetail(id) {
  const p = pengajuanData.find(x => x.id === id);
  if (!p) return;

  const alamatBagian = [p.alamat_pelapor, p.rt ? `RT ${p.rt}` : "", p.rw ? `RW ${p.rw}` : ""]
    .filter(Boolean).join(", ");

  const baris = (label, value) => `
    <div class="flex justify-between gap-3 py-1.5 border-b border-slate-100 text-sm">
      <span class="text-slate-400">${label}</span>
      <span class="text-slate-700 font-medium text-right">${value || "-"}</span>
    </div>`;

  const bodyHtml = `
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Pelapor</h4>
      ${baris('Nama Pelapor', p.nama_pelapor)}
      ${baris('No. WhatsApp', p.no_wa)}
    </div>
    <div class="mb-3">
      <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1">Identitas Korban / Pasien</h4>
      ${baris('Nama Pasien', p.nama_pasien)}
      ${baris('Jenis Kelamin', p.jenis_kelamin)}
      ${baris('Tanggal Melapor', p.tanggal_lapor ? formatDateTime(p.tanggal_lapor) : '-')}
      ${baris('Kecamatan Asal', p.korban_kecamatan)}
      ${baris('Alamat Lengkap', alamatBagian)}
    </div>
    <a href="https://wa.me/${p.no_wa}" target="_blank" class="btn-primary w-full flex items-center justify-center gap-2 mt-2">
      <i class="uil uil-whatsapp"></i> Hubungi via WhatsApp
    </a>
  `;

  handoInfo({ title: 'Detail Pelapor', bodyHtml });
}

function pelaporCell(p) {
  return `<button onclick="showPelaporDetail(${p.id})" class="icon-btn-circle" title="Lihat detail pelapor">
    <i class="ti ti-user"></i>
  </button>`;
}

function fotoCell(p) {
  if (!p.foto) return "-";
  return `<button onclick="handoImagePreview('${p.foto}', 'Foto Laporan')" class="btn-pill btn-pill-purple">
    <i class="ti ti-photo"></i> Lihat
  </button>`;
}

function kronologisCell(p) {
  if (!p.kronologis) return "-";
  const singkat = p.kronologis.length > 60 ? p.kronologis.slice(0, 60) + "..." : p.kronologis;
  return `<span class="text-xs" title="${p.kronologis.replace(/"/g, '&quot;')}">${singkat}</span>`;
}

// Kolom "Tindakan": tampilkan langsung tag-tag tindakan yang sudah
// ditambahkan (supaya kelihatan isinya tanpa perlu klik dulu), plus tombol
// kecil untuk kelola (tambah/hapus) lewat popup.
function tindakanTagsHtml(namaList) {
  if (!namaList.length) {
    return '<span class="tindakan-tag tindakan-tag-empty">Belum ada</span>';
  }
  return namaList.map(nama => `<span class="tindakan-tag">${nama}</span>`).join('');
}

function tindakanCell(p) {
  const list = p.tindakan_list ? String(p.tindakan_list).split('||').filter(Boolean) : [];

  return `<div class="tindakan-cell-wrap">
    <div class="tindakan-tags">${tindakanTagsHtml(list)}</div>
    <button type="button" class="tindakan-edit-btn" title="Kelola tindakan" onclick="openTindakanModal(${p.id})">
      <i class="ti ti-pencil"></i>
    </button>
  </div>`;
}

function renderTable(rows) {

  const tbody = document.getElementById("tablePengajuan");

  if (!rows.length) {

    tbody.innerHTML = '<tr><td colspan="13" class="text-center py-10">Belum ada data</td></tr>';

    return;

  }

  tbody.innerHTML = rows.map((p, i) => `

<tr id="pengajuan-row-${p.id}">

<td data-label="No">${i + 1}</td>

<td data-label="Tanggal">${formatDate(p.tanggal)}</td>

<td data-label="Pelapor">${pelaporCell(p)}</td>

<td data-label="Kecamatan">${p.kecamatan}</td>

<td data-label="Jenis">${p.jenis_penyakit}</td>

<td data-label="Alamat">${p.alamat || "-"}</td>

<td data-label="Koordinat">${p.latitude ? `${parseFloat(p.latitude).toFixed(4)}, ${parseFloat(p.longitude).toFixed(4)}` : "-"}</td>

<td data-label="Foto">${fotoCell(p)}</td>

<td data-label="Kronologis">${kronologisCell(p)}</td>

<td data-label="Status">${statusBadge(p.status)}</td>

<td data-label="Aksi">

${p.status === "Menunggu" ?

      `<div class="inline-flex items-center gap-2">
<button onclick="approve(${p.id})" class="btn-pill btn-pill-green">
<i class="ti ti-check"></i> Setujui
</button>

<button onclick="reject(${p.id})" class="btn-pill btn-pill-red">
<i class="ti ti-x"></i> Tolak
</button>
</div>`

      : waNotif(p)}

</td>

<td data-label="Tindakan">${tindakanCell(p)}</td>

<td data-label="Pengajuan">${waktuProsesCell(p)}</td>

</tr>

`).join("");

}

/* ============ POPUP "Tindakan" per pengajuan ============
   Menampilkan daftar tindakan yang sudah ditambahkan untuk satu pengajuan,
   plus dropdown untuk menambahkan tindakan baru (dari daftar master yang
   dikelola di halaman "Daftar Tindakan") dan tombol hapus di tiap item. */
function openTindakanModal(pengajuanId) {
  ensureHandoModalRoot();

  const overlay = document.createElement('div');
  overlay.id = 'handoModalOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box modal-box-sm modal-pop">
      <div class="modal-head">
        <h3><i class="ti ti-list-check" style="color:var(--accent);margin-right:.4rem"></i>Daftar Tindakan</h3>
        <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
      </div>
      <div class="modal-body">
        <div id="tindakanModalList" class="tindakan-modal-list">
          <p class="text-sm text-slate-400 text-center py-4">Memuat...</p>
        </div>
        <div id="tindakanModalAdd"></div>
      </div>
    </div>`;

  document.getElementById('handoModalRoot').appendChild(overlay);

  const finish = () => closeHandoModal();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(); });
  overlay.querySelector('[data-action="cancel"]').onclick = finish;

  refreshTindakanModal(pengajuanId);
}

async function refreshTindakanModal(pengajuanId) {
  const listEl = document.getElementById('tindakanModalList');
  const addEl = document.getElementById('tindakanModalAdd');
  if (!listEl || !addEl) return; // modal sudah ditutup sebelum data selesai dimuat

  try {

    const [applied, master] = await Promise.all([
      Api.get(`/pengajuan/${pengajuanId}/tindakan`),
      Api.get('/tindakan')
    ]);

    listEl.innerHTML = applied.length
      ? applied.map(a => `
        <div class="tindakan-modal-item">
          <span>- ${a.nama}</span>
          <button type="button" class="tindakan-remove-btn" title="Hapus tindakan ini"
            onclick="removeTindakanDariPengajuan(${pengajuanId}, ${a.relasi_id})">
            <i class="ti ti-x"></i>
          </button>
        </div>`).join('')
      : '<p class="text-sm text-slate-400 text-center py-3">Belum ada tindakan ditambahkan</p>';

    const appliedIds = new Set(applied.map(a => a.tindakan_id));
    const tersedia = master.filter(t => !appliedIds.has(t.id));

    if (!tersedia.length) {
      addEl.innerHTML = `<p class="text-xs text-slate-400 text-center mt-3">${master.length
        ? 'Semua tindakan sudah ditambahkan'
        : 'Belum ada daftar tindakan. Tambahkan dulu lewat menu "Daftar Tindakan".'
        }</p>`;
      return;
    }

    addEl.innerHTML = `
      <div class="flex items-center gap-2 mt-3">
        <select id="tindakanSelect" class="form-input" style="flex:1">
          ${tersedia.map(t => `<option value="${t.id}">${t.nama}</option>`).join('')}
        </select>
        <button type="button" id="btnTambahTindakanModal" class="btn-primary" style="white-space:nowrap">
          <i class="ti ti-plus"></i> Tambah
        </button>
      </div>`;

    document.getElementById('btnTambahTindakanModal').onclick = async () => {
      const select = document.getElementById('tindakanSelect');
      const tindakanId = select.value;
      if (!tindakanId) return;

      const btn = document.getElementById('btnTambahTindakanModal');
      btn.disabled = true;

      try {
        await Api.post(`/pengajuan/${pengajuanId}/tindakan`, { tindakan_id: tindakanId });
        await refreshTindakanModal(pengajuanId);
        loadPengajuan(); // supaya angka badge di tabel utama ikut ter-update
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
      }
    };

  } catch (err) {
    listEl.innerHTML = `<p class="text-sm text-red-500 text-center py-4">${err.message}</p>`;
    addEl.innerHTML = '';
  }
}

async function removeTindakanDariPengajuan(pengajuanId, relasiId) {
  try {
    await Api.delete(`/pengajuan/${pengajuanId}/tindakan/${relasiId}`);
    await refreshTindakanModal(pengajuanId);
    loadPengajuan(); // supaya angka badge di tabel utama ikut ter-update
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function approve(id) {

  const ok = await handoConfirm({
    title: "Setujui Pengajuan Ini?",
    message: "Data akan otomatis ditambahkan ke Data Kasus dan pelapor akan menerima notifikasi.",
    confirmText: "Ya, Setujui",
    type: "success"
  });
  if (!ok) return;

  try {

    await Api.put(`/pengajuan/${id}/approve`);

    showToast("Pengajuan disetujui");

    loadPengajuan();

  } catch (err) {

    showToast(err.message, "error");

  }

}

async function reject(id) {

  const alasan = await handoPrompt({
    title: "Tolak Pengajuan",
    message: "Jelaskan alasan penolakan agar pelapor bisa memperbaiki datanya.",
    placeholder: "Contoh: Koordinat lokasi tidak valid, mohon perbaiki.",
    confirmText: "Tolak Pengajuan",
    type: "danger"
  });

  if (alasan === null) return;

  try {

    await Api.put(`/pengajuan/${id}/reject`, {

      alasan

    });

    showToast("Pengajuan ditolak");

    loadPengajuan();

  } catch (err) {

    showToast(err.message, "error");

  }

}

loadPengajuan();