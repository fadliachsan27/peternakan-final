/* Halaman Pengaturan: sekarang hanya urus ganti password akun sendiri.
   Nomor WhatsApp (global & per wilayah) dan pembagian kecamatan dikelola
   admin utama lewat fitur "Akses Admin". */

document.addEventListener('DOMContentLoaded', () => {
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
});
