async function loadPengajuan() {

  try {

    const data = await Api.get('/pengajuan');

    renderTable(data);
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

function renderTable(rows) {

  const tbody = document.getElementById("tablePengajuan");

  if (!rows.length) {

    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-10">Belum ada data</td></tr>';

    return;

  }

  tbody.innerHTML = rows.map(p => `

<tr id="pengajuan-row-${p.id}">

<td>${formatDate(p.tanggal)}</td>

<td>${p.nama_pelapor}</td>

<td>
<a href="https://wa.me/${p.no_wa}" target="_blank">
${p.no_wa}
</a>
</td>

<td>${p.kecamatan}</td>

<td>${p.jenis_penyakit}</td>

<td>${p.alamat || "-"}</td>

<td>${p.latitude ? `${parseFloat(p.latitude).toFixed(4)}, ${parseFloat(p.longitude).toFixed(4)}` : "-"}</td>

<td>${statusBadge(p.status)}</td>

<td>

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

<td>${waNotif(p)}</td>

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