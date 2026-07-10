// File ini sudah tidak dipakai lagi -- app sekarang hanya memakai satu
// service worker resmi di /sw.js (didaftarkan oleh /js/pwa-register.js).
// Kalau ada browser yang kadung meng-install versi lama file ini,
// service worker ini akan langsung membersihkan diri sendiri
// (unregister + hapus cache lamanya) supaya tidak lagi bentrok dengan /sw.js.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k === 'peternakan-v1').map((k) => caches.delete(k))))
            .then(() => self.registration.unregister())
            .then(() => self.clients.matchAll())
            .then((clients) => clients.forEach((client) => client.navigate(client.url)))
    );
});