/* Halaman "Daftar Tindakan": mengelola daftar master tindakan (mis. Observasi,
   Telfon RS, dst) yang jadi pilihan dropdown di kolom "Tindakan" pada
   halaman Pengajuan dari Masyarakat.

   Fitur "Akses Tindakan per Dokter": tiap tindakan boleh punya `kategori`
   (nama sektor/instansi, lihat src/config/sektorTindakan.js). Backend
   (GET /api/tindakan) SUDAH otomatis memfilter tindakan sesuai sektor yang
   diakses akun yang sedang login (diatur admin utama lewat halaman "Role")
   -- tindakan "umum" (kategori kosong) selalu ikut tampil untuk semua akun.
   Di sini tinggal dikelompokkan per kategori supaya enak dibaca. */

let tindakanData = [];

async function loadSektorSaya() {
  const wrap = document.getElementById('panelSektorSaya');
  const tagsEl = document.getElementById('sektorSayaTags');
  if (!wrap || !tagsEl) return;

  try {
    const res = await Api.get('/tindakan/sektor-saya');
    const sektor = res && res.sektor;

    if (sektor === null) {
      // Admin utama: tidak dibatasi sektor apa pun.
      wrap.style.display = '';
      tagsEl.innerHTML = '<span class="tindakan-tag tindakan-tag-readonly">Admin Utama &mdash; semua sektor</span>';
      return;
    }

    wrap.style.display = '';
    tagsEl.innerHTML = sektor.length
      ? sektor.map((s) => `<span class="tindakan-tag tindakan-tag-readonly">${s}</span>`).join('')
      : '<span class="tindakan-tag tindakan-tag-empty">Belum ada akses tindakan &mdash; hubungi admin utama lewat menu Role</span>';
  } catch (err) {
    // Diam saja kalau gagal, tidak krusial untuk tampilan utama halaman ini.
  }
}

async function loadTindakan() {
  try {
    tindakanData = await Api.get('/tindakan');
    renderTindakanList();
  } catch (err) {
    showToast(err.message, 'error');
    const wrap = document.getElementById('tindakanList');
    if (wrap) wrap.innerHTML = '<p class="text-sm text-red-500 text-center py-6">Gagal memuat daftar tindakan</p>';
  }
}

function tindakanItemHtml(t) {
  return `
    <div class="tindakan-list-item">
      <span><i class="ti ti-list-check" style="color:var(--accent)"></i> ${t.nama}</span>
      <button type="button" class="icon-btn-circle icon-btn-circle-red" title="Hapus tindakan"
        onclick="hapusTindakan(${t.id}, '${t.nama.replace(/'/g, "\\'")}')">
        <i class="ti ti-trash"></i>
      </button>
    </div>`;
}

function renderTindakanList() {
  const wrap = document.getElementById('tindakanList');
  if (!wrap) return;

  if (!tindakanData.length) {
    wrap.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">Belum ada tindakan yang bisa diakses. Hubungi admin utama lewat menu Role untuk diberi akses sektor tindakan.</p>';
    return;
  }

  // Kelompokkan per kategori/sektor -- tindakan "umum" (kategori kosong)
  // ditampilkan di bagian akhir dengan judul "Umum / Tambahan Manual".
  const grup = new Map();
  const umum = [];
  tindakanData.forEach((t) => {
    if (!t.kategori) { umum.push(t); return; }
    if (!grup.has(t.kategori)) grup.set(t.kategori, []);
    grup.get(t.kategori).push(t);
  });

  let html = '';
  for (const [kategori, items] of grup.entries()) {
    html += `
      <div class="mb-3">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          <i class="ti ti-building-bank" style="color:var(--c-blue)"></i> ${kategori}
        </p>
        <div class="tindakan-list-group">${items.map(tindakanItemHtml).join('')}</div>
      </div>`;
  }
  if (umum.length) {
    html += `
      <div class="mb-1">
        <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          <i class="ti ti-list-check" style="color:var(--accent)"></i> Umum / Tambahan Manual
        </p>
        <div class="tindakan-list-group">${umum.map(tindakanItemHtml).join('')}</div>
      </div>`;
  }

  wrap.innerHTML = html;
}

async function hapusTindakan(id, nama) {
  const ok = await handoConfirm({
    title: 'Hapus Tindakan?',
    message: `Tindakan "${nama}" akan dihapus dari daftar, dan otomatis hilang dari semua pengajuan yang sudah memakainya.`,
    confirmText: 'Ya, Hapus',
    type: 'danger'
  });
  if (!ok) return;

  try {
    await Api.delete(`/tindakan/${id}`);
    showToast('Tindakan berhasil dihapus');
    loadTindakan();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSektorSaya();
  loadTindakan();

  const form = document.getElementById('formTindakan');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = document.getElementById('namaTindakan');
    const nama = input.value.trim();
    if (!nama) return;

    const btn = document.getElementById('btnTambahTindakan');
    btn.disabled = true;
    const originalLabel = btn.innerHTML;
    btn.innerHTML = 'Menyimpan...';

    try {
      await Api.post('/tindakan', { nama });
      input.value = '';
      showToast('Tindakan berhasil ditambahkan');
      loadTindakan();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalLabel;
    }
  });
});
