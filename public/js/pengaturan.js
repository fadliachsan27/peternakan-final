/* Halaman Pengaturan: nomor WhatsApp admin bisa diubah langsung dari UI, tidak perlu edit kode/.env */

function formatWhatsappDisplay(no) {
    if (!no) return '-';
    // Tampilkan rapi: 62 812-3456-7890
    const digits = String(no).replace(/[^0-9]/g, '');
    if (digits.length <= 4) return digits;
    return digits.replace(/(\d{2})(\d{3,4})(\d{3,4})(\d*)/, (m, a, b, c, d) => {
        return [a, b, c, d].filter(Boolean).join('-');
    });
}

async function loadPengaturan() {
    try {
        const settings = await Api.get('/settings');
        const input = document.getElementById('adminWhatsapp');
        const currentValueEl = document.getElementById('waCurrentValue');

        if (input && settings.admin_whatsapp) {
            input.value = settings.admin_whatsapp;
        }
        if (currentValueEl) {
            currentValueEl.textContent = settings.admin_whatsapp
                ? formatWhatsappDisplay(settings.admin_whatsapp)
                : 'Belum diatur (pakai bawaan sistem)';
        }
    } catch (err) {
        showToast('Gagal memuat pengaturan: ' + err.message, 'error');
        const currentValueEl = document.getElementById('waCurrentValue');
        if (currentValueEl) currentValueEl.textContent = 'Gagal memuat';
    }
}

// Nomor WhatsApp milik wilayah sendiri (khusus akun admin wilayah/dokter).
// Diambil lewat endpoint terpisah supaya selalu nilai TERBARU, bukan nilai
// bawaan dari kode yang mungkin sudah pernah diubah lewat halaman ini.
async function loadWilayahWhatsapp() {
    const panel = document.getElementById('panelWaWilayah');
    if (!panel || panel.style.display === 'none') return;

    const input = document.getElementById('wilayahWhatsapp');
    const currentValueEl = document.getElementById('waWilayahCurrentValue');

    try {
        const result = await Api.get('/settings/wilayah-whatsapp');
        if (input && result.whatsapp) input.value = result.whatsapp;
        if (currentValueEl) {
            currentValueEl.textContent = result.whatsapp
                ? formatWhatsappDisplay(result.whatsapp)
                : 'Belum diatur (pakai bawaan sistem)';
        }
    } catch (err) {
        showToast('Gagal memuat nomor WhatsApp wilayah: ' + err.message, 'error');
        if (currentValueEl) currentValueEl.textContent = 'Gagal memuat';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPengaturan();
    loadWilayahWhatsapp();

    const formPassword = document.getElementById('formPassword');
    if (formPassword) {
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

    const form = document.getElementById('formWhatsapp');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanWa');
        const statusEl = document.getElementById('waStatus');
        const value = document.getElementById('adminWhatsapp').value.trim();

        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';
        statusEl.textContent = '';

        try {
            const result = await Api.put('/settings/admin-whatsapp', { admin_whatsapp: value });
            document.getElementById('adminWhatsapp').value = result.admin_whatsapp;

            const currentValueEl = document.getElementById('waCurrentValue');
            if (currentValueEl) currentValueEl.textContent = formatWhatsappDisplay(result.admin_whatsapp);

            await handoAlert({
                title: 'Tersimpan Berhasil',
                message: `Nomor WhatsApp admin sekarang: ${result.admin_whatsapp}`,
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });

    const formWilayah = document.getElementById('formWilayahWhatsapp');
    if (!formWilayah) return;

    formWilayah.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanWaWilayah');
        const statusEl = document.getElementById('waWilayahStatus');
        const value = document.getElementById('wilayahWhatsapp').value.trim();

        btn.disabled = true;
        const originalLabel = btn.innerHTML;
        btn.innerHTML = 'Menyimpan...';
        statusEl.textContent = '';

        try {
            const result = await Api.put('/settings/wilayah-whatsapp', { whatsapp: value });
            document.getElementById('wilayahWhatsapp').value = result.whatsapp;

            const currentValueEl = document.getElementById('waWilayahCurrentValue');
            if (currentValueEl) currentValueEl.textContent = formatWhatsappDisplay(result.whatsapp);

            await handoAlert({
                title: 'Tersimpan Berhasil',
                message: `Nomor WhatsApp wilayah Anda sekarang: ${result.whatsapp}`,
                type: 'success'
            });
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalLabel;
        }
    });
});