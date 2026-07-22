/* Halaman "Role": khusus admin utama -- mengelola akun admin dokter per
   wilayah (tambah dokter baru, ubah username/password, atur nomor WA &
   pesebaran kecamatan, nonaktifkan/aktifkan, serta hapus akses). Logic ini
   sebelumnya jadi satu dengan /js/akses-admin.js, sekarang dipisah supaya
   halaman "Role" fokus cuma untuk kelola daftar admin dokter, sedangkan
   Nomor WhatsApp Fallback (Global) & Ganti Password Saya pindah ke halaman
   "Pengaturan" (lihat /js/pengaturan.js). */

let dokterData = [];
let kecamatanMaster = [];
let sektorMaster = []; // daftar sektor + tindakan di dalamnya (fitur "Akses Tindakan")

function formatWhatsappDisplay(no) {
    if (!no) return '-';
    const digits = String(no).replace(/[^0-9]/g, '');
    if (digits.length <= 4) return digits;
    return digits.replace(/(\d{2})(\d{3,4})(\d{3,4})(\d*)/, (m, a, b, c, d) => {
        return [a, b, c, d].filter(Boolean).join('-');
    });
}

/* ============ Daftar dokter ============ */

async function loadDokterList() {
    try {
        dokterData = await Api.get('/akses-admin/dokter');
        renderDokterList();
    } catch (err) {
        showToast('Gagal memuat daftar dokter: ' + err.message, 'error');
        const wrap = document.getElementById('dokterList');
        if (wrap) wrap.innerHTML = '<p class="text-sm text-red-500 text-center py-6">Gagal memuat data dokter</p>';
    }
}

function renderDokterList() {
    const wrap = document.getElementById('dokterList');
    if (!wrap) return;

    if (!dokterData.length) {
        wrap.innerHTML = '<p class="text-sm text-slate-400 text-center py-6">Belum ada dokter. Tambahkan lewat tombol "Tambah Dokter Baru" di atas.</p>';
        return;
    }

    wrap.innerHTML = dokterData.map((w) => {
        const statusBadge = w.aktif
            ? '<span class="inline-block px-2 py-0.5 rounded text-xs font-medium badge-disetujui">Aktif</span>'
            : '<span class="inline-block px-2 py-0.5 rounded text-xs font-medium badge-ditolak">Nonaktif</span>';

        const kecTags = w.kecamatan.length
            ? w.kecamatan.map((k) => `<span class="tindakan-tag tindakan-tag-readonly">${k}</span>`).join('')
            : '<span class="tindakan-tag tindakan-tag-empty">Belum ada kecamatan</span>';

        const sektorTags = (w.sektor_tindakan && w.sektor_tindakan.length)
            ? w.sektor_tindakan.map((s) => `<span class="tindakan-tag">${s}</span>`).join('')
            : '<span class="tindakan-tag tindakan-tag-empty">Belum ada akses tindakan</span>';

        return `
      <div class="dokter-card" style="border:1px solid #eef1f6; border-radius:0.75rem; padding:1rem;">
        <div class="flex items-start justify-between flex-wrap gap-2 mb-2">
          <div>
            <p class="font-semibold text-slate-700">${w.dokter} <span class="text-slate-400 font-normal">&middot; ${w.nama}</span></p>
            <p class="text-xs text-slate-400">Username: <strong>${w.username || '-'}</strong> &middot; WA: ${w.wa ? formatWhatsappDisplay(w.wa) : '<em>belum diatur</em>'}</p>
          </div>
          <div>${statusBadge}</div>
        </div>
        <div class="flex flex-wrap gap-1.5 mb-2">${kecTags}</div>
        <p class="text-xs text-slate-400 mb-1"><i class="ti ti-list-check"></i> Akses Tindakan:</p>
        <div class="flex flex-wrap gap-1.5 mb-3">${sektorTags}</div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-outline text-xs" onclick="bukaModalEditDokter(${w.id})"><i class="ti ti-edit"></i> Edit</button>
          <button type="button" class="btn-outline text-xs" onclick="bukaModalResetPassword(${w.id})"><i class="ti ti-key"></i> Reset Password</button>
          <button type="button" class="btn-outline text-xs" onclick="toggleStatusDokter(${w.id}, ${w.aktif ? 'false' : 'true'})">
            <i class="ti ti-${w.aktif ? 'lock' : 'lock-open'}"></i> ${w.aktif ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
          <button type="button" class="btn-outline text-xs" style="color:var(--c-red);border-color:#fee2e2" onclick="hapusDokter(${w.id})"><i class="ti ti-trash"></i> Hapus</button>
        </div>
      </div>`;
    }).join('');
}

async function loadKecamatanMaster() {
    kecamatanMaster = await Api.get('/akses-admin/kecamatan-master');
}

async function loadSektorMaster() {
    sektorMaster = await Api.get('/akses-admin/sektor-master');
}

/* ============ Modal tambah/edit dokter ============ */

function renderKecamatanCheckboxes(selected, excludeWilayahId) {
    const selectedLower = selected.map((k) => k.toLowerCase());
    return kecamatanMaster.map((k) => {
        const isSelected = selectedLower.includes(k.nama.toLowerCase());
        const dimilikiLain = k.wilayah_id && k.wilayah_id !== excludeWilayahId;
        const disabled = dimilikiLain && !isSelected;
        const label = dimilikiLain
            ? `${k.nama} <span class="text-xs text-slate-400">(${k.dokter})</span>`
            : k.nama;
        return `
      <label class="flex items-center gap-2 text-sm ${disabled ? 'text-slate-300' : 'text-slate-600'}" style="padding:0.25rem 0;">
        <input type="checkbox" value="${k.nama}" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''} class="kecamatan-checkbox">
        ${label}
      </label>`;
    }).join('');
}

// Checkbox "Akses Tindakan": tiap sektor bisa dipilih lebih dari satu
// (tidak eksklusif seperti kecamatan -- beberapa dokter boleh sama-sama
// punya akses sektor yang sama). Diberi <details> supaya admin utama bisa
// intip dulu daftar tindakan di dalam sektor itu sebelum mencentangnya.
function renderSektorCheckboxes(selected) {
    const selectedLower = selected.map((s) => s.toLowerCase());
    return sektorMaster.map((s) => {
        const isSelected = selectedLower.includes(s.nama.toLowerCase());
        const previewItems = s.tindakan.map((t) => `<li>${t}</li>`).join('');
        return `
      <div style="border-bottom:1px solid #f1f5f9; padding:0.4rem 0;">
        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" value="${s.nama}" ${isSelected ? 'checked' : ''} class="sektor-checkbox">
          <span class="font-medium">${s.nama}</span>
          <span class="text-xs text-slate-400">(${s.tindakan.length} tindakan)</span>
        </label>
        <details style="margin:0.25rem 0 0 1.5rem;">
          <summary class="text-xs text-slate-400" style="cursor:pointer;">Lihat daftar tindakan</summary>
          <ul class="text-xs text-slate-500" style="list-style:disc; margin:0.25rem 0 0.25rem 1rem;">${previewItems}</ul>
        </details>
      </div>`;
    }).join('');
}

function buildDokterFormModal({ title, submitLabel, wilayah, onSubmit }) {
    ensureHandoModalRoot();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'dokterFormModal';

    const namaWilayah = wilayah ? wilayah.nama : '';
    const namaDokter = wilayah ? wilayah.dokter : '';
    const username = wilayah ? wilayah.username : '';
    const wa = wilayah ? wilayah.wa : '';
    const selectedKecamatan = wilayah ? wilayah.kecamatan : [];
    const selectedSektor = wilayah ? (wilayah.sektor_tindakan || []) : [];
    const excludeId = wilayah ? wilayah.id : null;

    overlay.innerHTML = `
      <div class="modal-box modal-pop">
        <div class="modal-head">
          <h3>${title}</h3>
          <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <form id="formDokter" class="space-y-3">
            <div>
              <label class="text-sm text-slate-600 block mb-1">Nama Wilayah</label>
              <input type="text" id="inputNamaWilayah" class="form-input" placeholder="Contoh: Wilayah 8" value="${namaWilayah}" required>
            </div>
            <div>
              <label class="text-sm text-slate-600 block mb-1">Nama Dokter</label>
              <input type="text" id="inputNamaDokter" class="form-input" placeholder="Contoh: drh. Nama Dokter" value="${namaDokter}" required>
            </div>
            <div>
              <label class="text-sm text-slate-600 block mb-1">Username Login</label>
              <input type="text" id="inputUsername" class="form-input" placeholder="Contoh: budi" value="${username || ''}" required>
            </div>
            ${!wilayah ? `
            <div>
              <label class="text-sm text-slate-600 block mb-1">Password Awal</label>
              <div class="login-input-wrap" style="background:#fff;">
                <i class="ti ti-lock"></i>
                <input type="password" id="inputPassword" class="form-input"
                  style="border:none;background:transparent;padding-left:0;" minlength="6"
                  placeholder="Minimal 6 karakter" required>
                <button type="button" class="login-eye-toggle" data-toggle-for="inputPassword"
                  aria-label="Tampilkan password">
                  <i class="ti ti-eye"></i>
                </button>
              </div>
            </div>` : ''}
            <div>
              <label class="text-sm text-slate-600 block mb-1">Nomor WhatsApp</label>
              <input type="text" id="inputWa" class="form-input" placeholder="Contoh: 6281234567890" value="${wa || ''}">
            </div>
            <div>
              <label class="text-sm text-slate-600 block mb-1">Pesebaran Kecamatan</label>
              <p class="text-xs text-slate-400 mb-2">Kecamatan yang sudah dipakai wilayah lain tampil abu-abu (nonaktif) &mdash; hapus dulu dari wilayah tersebut kalau mau dipindah. Boleh tidak mencentang kecamatan apa pun dulu kalau semuanya masih terpakai wilayah lain; dokter tetap bisa dibuat dan kecamatannya dipindahkan belakangan.</p>
              <div id="kecamatanCheckboxWrap" style="max-height:220px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:0.5rem; padding:0.5rem 0.75rem;">
                ${renderKecamatanCheckboxes(selectedKecamatan, excludeId)}
              </div>
            </div>
            <div>
              <label class="text-sm text-slate-600 block mb-1"><i class="ti ti-list-check"></i> Akses Tindakan</label>
              <p class="text-xs text-slate-400 mb-2">Pilih sektor/instansi yang tindakannya boleh diakses dokter ini di halaman "Daftar Tindakan". Boleh pilih lebih dari satu sektor sekaligus.</p>
              <div id="sektorCheckboxWrap" style="max-height:260px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:0.5rem; padding:0.5rem 0.75rem;">
                ${renderSektorCheckboxes(selectedSektor)}
              </div>
            </div>
            <button type="submit" id="formDokterSubmit" class="hidden">Simpan</button>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-outline" data-action="cancel">Batal</button>
          <button type="button" class="btn-primary" id="btnSubmitDokter" onclick="document.getElementById('formDokterSubmit').click()">${submitLabel}</button>
        </div>
      </div>`;

    ensureHandoModalRoot().appendChild(overlay);
    bindPasswordEyeToggles(overlay);

    const close = () => { overlay.classList.add('modal-closing'); setTimeout(() => overlay.remove(), 150); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('[data-action="cancel"]').forEach((btn) => { btn.onclick = close; });

    const form = overlay.querySelector('#formDokter');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmitDokter');
        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';

        const kecamatan = Array.from(overlay.querySelectorAll('.kecamatan-checkbox:checked')).map((el) => el.value);
        const sektorTindakan = Array.from(overlay.querySelectorAll('.sektor-checkbox:checked')).map((el) => el.value);
        const payload = {
            nama: document.getElementById('inputNamaWilayah').value.trim(),
            dokter: document.getElementById('inputNamaDokter').value.trim(),
            username: document.getElementById('inputUsername').value.trim(),
            wa: document.getElementById('inputWa').value.trim(),
            kecamatan,
            sektor_tindakan: sektorTindakan
        };
        const passwordInput = document.getElementById('inputPassword');
        if (passwordInput) payload.password = passwordInput.value;

        try {
            await onSubmit(payload);
            close();
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
}

async function bukaModalTambahDokter() {
    await Promise.all([loadKecamatanMaster(), loadSektorMaster()]);
    buildDokterFormModal({
        title: 'Tambah Dokter Baru',
        submitLabel: 'Simpan',
        wilayah: null,
        onSubmit: async (payload) => {
            await Api.post('/akses-admin/dokter', payload);
            await loadDokterList();
            await handoAlert({
                title: 'Dokter Baru Berhasil Dibuat',
                message: 'Akun admin dokter baru sudah bisa dipakai untuk login.',
                type: 'success'
            });
        }
    });
}

async function bukaModalEditDokter(id) {
    await Promise.all([loadKecamatanMaster(), loadSektorMaster()]);
    const wilayah = dokterData.find((w) => w.id === id);
    if (!wilayah) return;
    buildDokterFormModal({
        title: 'Edit Data Dokter',
        submitLabel: 'Simpan Perubahan',
        wilayah,
        onSubmit: async (payload) => {
            await Api.put(`/akses-admin/dokter/${id}`, payload);
            await loadDokterList();
            await handoAlert({
                title: 'Perubahan Berhasil Disimpan',
                message: 'Data dokter berhasil diperbarui.',
                type: 'success'
            });
        }
    });
}

/* ============ Reset password ============ */

function bukaModalResetPassword(id) {
    const wilayah = dokterData.find((w) => w.id === id);
    if (!wilayah) return;

    ensureHandoModalRoot();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-box-sm modal-pop">
        <div class="modal-head">
          <h3>Reset Password: ${wilayah.dokter}</h3>
          <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <form id="formResetPassword" class="space-y-3">
            <div>
              <label class="text-sm text-slate-600 block mb-1">Password Baru</label>
              <div class="login-input-wrap" style="background:#fff;">
                <i class="ti ti-lock"></i>
                <input type="password" id="inputPasswordBaru" class="form-input"
                  style="border:none;background:transparent;padding-left:0;" minlength="6"
                  placeholder="Minimal 6 karakter" required>
                <button type="button" class="login-eye-toggle" data-toggle-for="inputPasswordBaru"
                  aria-label="Tampilkan password">
                  <i class="ti ti-eye"></i>
                </button>
              </div>
            </div>
            <button type="submit" id="formResetPasswordSubmit" class="hidden">Simpan</button>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-outline" data-action="cancel">Batal</button>
          <button type="button" class="btn-primary" onclick="document.getElementById('formResetPasswordSubmit').click()">Simpan Password</button>
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);
    bindPasswordEyeToggles(overlay);

    const close = () => { overlay.classList.add('modal-closing'); setTimeout(() => overlay.remove(), 150); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelectorAll('[data-action="cancel"]').forEach((btn) => { btn.onclick = close; });

    overlay.querySelector('#formResetPassword').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('inputPasswordBaru').value;
        try {
            await Api.put(`/akses-admin/dokter/${id}/password`, { new_password: newPassword });
            close();
            await handoAlert({
                title: 'Perubahan Berhasil Disimpan',
                message: `Password baru untuk ${wilayah.dokter} berhasil disimpan.`,
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

/* ============ Aktifkan/nonaktifkan & hapus ============ */

async function toggleStatusDokter(id, aktifBaru) {
    const wilayah = dokterData.find((w) => w.id === id);
    if (!wilayah) return;

    const ok = await handoConfirm({
        title: aktifBaru ? 'Aktifkan Akses Dokter?' : 'Nonaktifkan Akses Dokter?',
        message: aktifBaru
            ? `Akun ${wilayah.dokter} akan bisa login kembali.`
            : `Akun ${wilayah.dokter} tidak akan bisa login lagi sampai diaktifkan kembali. Data wilayah &amp; kecamatan tetap tersimpan.`,
        type: aktifBaru ? 'success' : 'warning',
        confirmText: aktifBaru ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan'
    });
    if (!ok) return;

    try {
        await Api.put(`/akses-admin/dokter/${id}/status`, { aktif: aktifBaru });
        showToast(aktifBaru ? 'Akses dokter diaktifkan kembali' : 'Akses dokter dinonaktifkan');
        loadDokterList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function hapusDokter(id) {
    const wilayah = dokterData.find((w) => w.id === id);
    if (!wilayah) return;

    const ok = await handoConfirm({
        title: 'Hapus Akses Dokter?',
        message: `Akun login &amp; data wilayah "${wilayah.nama}" (${wilayah.dokter}) akan dihapus permanen. Data kasus/pengajuan yang sudah ada tidak akan ikut terhapus.`,
        confirmText: 'Ya, Hapus',
        type: 'danger'
    });
    if (!ok) return;

    try {
        await Api.delete(`/akses-admin/dokter/${id}`);
        await loadDokterList();
        await handoAlert({
            title: 'Berhasil Dihapus',
            message: `Akses dokter "${wilayah.nama}" (${wilayah.dokter}) sudah dihapus permanen.`,
            type: 'success'
        });
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/* ============ Icon mata untuk lihat/sembunyikan password ============ */

function bindPasswordEyeToggles(root = document) {
    root.querySelectorAll('.login-eye-toggle[data-toggle-for]').forEach((btn) => {
        if (btn.dataset.eyeBound) return;
        btn.dataset.eyeBound = '1';
        btn.addEventListener('click', () => {
            const input = document.getElementById(btn.dataset.toggleFor);
            const icon = btn.querySelector('i');
            if (!input || !icon) return;
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            icon.className = show ? 'ti ti-eye-off' : 'ti ti-eye';
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    bindPasswordEyeToggles();
    loadDokterList();

    const btnTambah = document.getElementById('btnTambahDokter');
    if (btnTambah) btnTambah.addEventListener('click', bukaModalTambahDokter);
});
