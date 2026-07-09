// Mendaftarkan service worker agar aplikasi bisa dipasang (installable)
// dan berjalan sebagai PWA (Progressive Web App).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] Service worker terdaftar:', reg.scope))
      .catch((err) => console.warn('[PWA] Gagal mendaftarkan service worker:', err));
  });
}
