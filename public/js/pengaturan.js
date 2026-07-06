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

document.addEventListener('DOMContentLoaded', () => {
    loadPengaturan();

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
});