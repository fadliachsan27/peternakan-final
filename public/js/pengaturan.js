/* Halaman "Pengaturan": untuk admin utama berisi nomor WhatsApp fallback
   global & ganti password akun sendiri. Untuk admin dokter/wilayah, halaman
   yang sama menampilkan versi terbatas: cuma form ganti nomor WhatsApp
   wilayah mereka sendiri (lihat setupPageByRole). Kelola daftar admin
   dokter (tambah/edit/hapus/nonaktifkan) sekarang ada di halaman "Role"
   yang terpisah -- lihat /js/role.js. */

function isWilayahAdminUser() {
    return typeof getUser === 'function' && !!getUser()?.wilayah_id;
}

// Sembunyikan bagian khusus admin utama & tampilkan bagian khusus admin
// wilayah/dokter (atau sebaliknya), sesuai role akun yang sedang login.
function setupPageByRole() {
    const wilayahAdmin = isWilayahAdminUser();

    const panelWaGlobal = document.getElementById('panelWaGlobal');
    const panelWaSaya = document.getElementById('panelWaSaya');
    const panelGantiPassword = document.getElementById('panelGantiPassword');
    const pageTitle = document.getElementById('pageTitle');
    const pageDesc = document.getElementById('pageDesc');

    if (wilayahAdmin) {
        if (panelWaGlobal) panelWaGlobal.classList.add('hidden');
        if (panelGantiPassword) panelGantiPassword.classList.add('hidden');
        if (panelWaSaya) panelWaSaya.classList.remove('hidden');
        if (pageTitle) pageTitle.textContent = 'WhatsApp Saya';
        if (pageDesc) pageDesc.textContent = 'Ganti nomor WhatsApp yang dipakai untuk menerima notifikasi di wilayah kerja Anda.';
    } else {
        if (panelWaSaya) panelWaSaya.classList.add('hidden');
    }
}

function formatWhatsappDisplay(no) {
    if (!no) return '-';
    const digits = String(no).replace(/[^0-9]/g, '');
    if (digits.length <= 4) return digits;
    return digits.replace(/(\d{2})(\d{3,4})(\d{3,4})(\d*)/, (m, a, b, c, d) => {
        return [a, b, c, d].filter(Boolean).join('-');
    });
}

/* ============ Nomor WhatsApp fallback global ============ */

async function loadWaGlobal() {
    try {
        const settings = await Api.get('/settings');
        const input = document.getElementById('adminWhatsapp');
        const currentValueEl = document.getElementById('waCurrentValue');

        if (input && settings.admin_whatsapp) input.value = settings.admin_whatsapp;
        if (currentValueEl) {
            currentValueEl.textContent = settings.admin_whatsapp
                ? formatWhatsappDisplay(settings.admin_whatsapp)
                : 'Belum diatur (pakai bawaan sistem)';
        }
    } catch (err) {
        showToast('Gagal memuat nomor WA global: ' + err.message, 'error');
    }
}

function bindFormWaGlobal() {
    const form = document.getElementById('formWhatsapp');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanWa');
        const value = document.getElementById('adminWhatsapp').value.trim();

        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';

        try {
            const result = await Api.put('/settings/admin-whatsapp', { admin_whatsapp: value });
            document.getElementById('adminWhatsapp').value = result.admin_whatsapp;
            document.getElementById('waCurrentValue').textContent = formatWhatsappDisplay(result.admin_whatsapp);
            await handoAlert({
                title: 'Perubahan Berhasil Disimpan',
                message: 'Nomor WhatsApp fallback global berhasil diperbarui.',
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
}

/* ============ Nomor WhatsApp wilayah sendiri (admin dokter/wilayah) ============ */

async function loadWaSaya() {
    try {
        const data = await Api.get('/settings/wilayah-whatsapp');
        const input = document.getElementById('adminWhatsappSaya');
        const currentValueEl = document.getElementById('waSayaCurrentValue');

        if (input && data.wa) input.value = data.wa;
        if (currentValueEl) {
            currentValueEl.textContent = data.wa
                ? formatWhatsappDisplay(data.wa)
                : 'Belum diatur';
        }
    } catch (err) {
        showToast('Gagal memuat nomor WA wilayah: ' + err.message, 'error');
    }
}

function bindFormWaSaya() {
    const form = document.getElementById('formWhatsappSaya');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanWaSaya');
        const value = document.getElementById('adminWhatsappSaya').value.trim();

        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';

        try {
            const result = await Api.put('/settings/wilayah-whatsapp', { wa: value });
            document.getElementById('adminWhatsappSaya').value = result.wa;
            document.getElementById('waSayaCurrentValue').textContent = formatWhatsappDisplay(result.wa);
            await handoAlert({
                title: 'Perubahan Berhasil Disimpan',
                message: 'Nomor WhatsApp wilayah Anda berhasil diperbarui.',
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
}

/* ============ Ganti password akun sendiri (admin utama) ============ */

function bindFormPasswordSaya() {
    const formPassword = document.getElementById('formPassword');
    if (!formPassword) return;

    formPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanPassword');
        const statusEl = document.getElementById('passwordStatus');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        statusEl.textContent = '';

        if (newPassword !== confirmPassword) {
            showToast('Password baru dan ulangi password baru tidak sama', 'error');
            return;
        }

        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';

        try {
            await Api.put('/auth/password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            formPassword.reset();
            await handoAlert({
                title: 'Password Berhasil Diganti',
                message: 'Gunakan password baru Anda saat login berikutnya.',
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
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
    setupPageByRole();
    bindPasswordEyeToggles();

    if (isWilayahAdminUser()) {
        // Admin dokter/wilayah: cuma fitur ganti nomor WA wilayah sendiri.
        loadWaSaya();
        bindFormWaSaya();
        return;
    }

    // Admin utama: fitur lengkap.
    loadWaGlobal();
    bindFormWaGlobal();
    bindFormPasswordSaya();
});
