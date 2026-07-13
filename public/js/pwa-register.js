// Mendaftarkan service worker agar aplikasi bisa dipasang (installable)
// dan berjalan sebagai PWA (Progressive Web App).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service worker terdaftar:', reg.scope);

        // Cek langsung apakah ada versi sw.js baru di server dibanding yang
        // sedang aktif -- ini yang tadinya menyebabkan kode lama "nyangkut"
        // terus walau server sudah di-deploy ulang dengan perbaikan terbaru.
        reg.update().catch(() => {});

        // Kalau ada worker baru yang sudah selesai di-install dan sedang
        // menunggu (biasanya karena tab ini sudah terbuka sebelum update),
        // langsung suruh ambil alih tanpa perlu pengguna tutup-buka tab.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch((err) => console.warn('[PWA] Gagal mendaftarkan service worker:', err));

    // Begitu worker baru resmi mengambil alih kontrol halaman, reload SEKALI
    // supaya semua file (JS/CSS/HTML) yang sedang tampil pasti versi terbaru.
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}
