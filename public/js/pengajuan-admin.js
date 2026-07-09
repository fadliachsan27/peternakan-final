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

function waNotif(p) {

  if (p.status === "Menunggu") return "-";

  const baseUrl = window.location.origin;
  let pesan = "";

  if (p.status === "Disetujui") {

    pesan =
      `Halo ${p.nama_pelapor}, Saya Admin Peternakan.

Laporan yang Anda kirim telah Disetujui oleh Kami.
Detail:
Tanggal : ${formatDate(p.tanggal)}
Kecamatan : ${p.kecamatan}
Jenis Penyakit : ${p.jenis_penyakit}

Anda bisa memantau perkembangan data zoonosis di dashboard publik kami:
${baseUrl}/index.html

Terima kasih atas partisipasi Anda.

Admin Peternakan`;

  } else {

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

function renderTable(rows) {

  const tbody = document.getElementById("tablePengajuan");

  if (!rows.length) {

    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-10">Belum ada data</td></tr>';

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

      `<button onclick="approve(${p.id})"
class="text-green-600 mr-3">
Setujui
</button>

<button onclick="reject(${p.id})"
class="text-red-500">
Tolak
</button>`

      : "-"}

</td>

<td data-label="Pengajuan">${waNotif(p)}</td>

</tr>

`).join("");

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
