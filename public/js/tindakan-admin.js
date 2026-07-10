/* Halaman "Daftar Tindakan": mengelola daftar master tindakan (mis. Observasi,
   Telfon RS, dst) yang jadi pilihan dropdown di kolom "Tindakan" pada
   halaman Pengajuan dari Masyarakat. */

let tindakanData = [];

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

function renderTindakanList() {
  const wrap = document.getElementById('tindakanList');
  if (!wrap) return;

  if (!tindakanData.length) {
    wrap.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">Belum ada tindakan. Tambahkan lewat form di atas.</p>';
    return;
  }

  wrap.innerHTML = tindakanData.map(t => `
    <div class="tindakan-list-item">
      <span><i class="ti ti-list-check" style="color:var(--accent)"></i> ${t.nama}</span>
      <button type="button" class="icon-btn-circle icon-btn-circle-red" title="Hapus tindakan"
        onclick="hapusTindakan(${t.id}, '${t.nama.replace(/'/g, "\\'")}')">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `).join('');
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
