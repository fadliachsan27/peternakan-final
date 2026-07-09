let kasusData = [];
let currentStatusFilter = 'Semua';

async function loadKasus() {
  try {
    kasusData = await Api.get('/kasus');
    renderTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Dipanggil saat tombol tab filter status (Semua/Aktif/Verifikasi/Selesai) diklik
function setStatusFilter(status) {
  currentStatusFilter = status;
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableKasus');

  const rows = currentStatusFilter === 'Semua'
    ? kasusData
    : kasusData.filter(k => k.status === currentStatusFilter);

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-slate-400 py-8">Belum ada data</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((k, i) => `
    <tr>
      <td data-label="No">${i + 1}</td>
      <td data-label="Tanggal">${formatDate(k.tanggal)}</td>
      <td data-label="Kecamatan">${k.kecamatan}</td>
      <td data-label="Jenis Penyakit">${k.jenis_penyakit}</td>
      <td data-label="Sektor">${k.sektor}</td>
      <td data-label="Status">${statusBadge(k.status)}</td>
      <td data-label="Alamat" class="max-w-[150px] truncate">${k.alamat || '-'}</td>
      <td data-label="Koordinat" class="text-xs font-mono">${k.latitude ? `${parseFloat(k.latitude).toFixed(4)}, ${parseFloat(k.longitude).toFixed(4)}` : '-'}</td>
      <td data-label="Aksi">
        <button onclick="editKasus(${k.id})" class="icon-btn-circle icon-btn-circle-slate mr-2" title="Edit Data">
          <i class="ti ti-edit"></i>
        </button>
        <button onclick="deleteKasus(${k.id})" class="icon-btn-circle icon-btn-circle-red" title="Hapus Data">
          <i class="ti ti-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
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
    document.getElementById('keterangan').value = k.keterangan || '';
    document.getElementById('latitude').value = k.latitude || '';
    document.getElementById('longitude').value = k.longitude || '';
  } else {
    document.getElementById('formKasus').reset();
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';
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
  const body = {
    tanggal: document.getElementById('tanggal').value,
    kecamatan: document.getElementById('kecamatan').value,
    jenis_penyakit: document.getElementById('jenis_penyakit').value,
    sektor: document.getElementById('sektor').value,
    status: document.getElementById('status').value,
    alamat: document.getElementById('alamat').value,
    latitude: document.getElementById('latitude').value || null,
    longitude: document.getElementById('longitude').value || null,
    keterangan: document.getElementById('keterangan').value
  };

  try {
    const id = document.getElementById('editId').value;
    if (id) {
      await Api.put(`/kasus/${id}`, body);
      closeModal();
      loadKasus();
      await handoAlert({
        title: 'Edit Berhasil',
        message: 'Data kasus berhasil diperbarui.',
        type: 'success'
      });
    } else {
      await Api.post('/kasus', body);
      showToast('Data ditambahkan');
      closeModal();
      loadKasus();
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