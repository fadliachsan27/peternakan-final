// ============ THEME (Dark / Light Mode) ============
// Disisipkan sedini mungkin (inline di <head>) supaya tidak ada "flash"
// warna terang sebelum tema gelap diterapkan. Preferensi disimpan di
// localStorage supaya konsisten di semua halaman & kunjungan berikutnya.
(function () {
  function getStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (e) {
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0b1120' : '#0d3b66');
  }

  const initial = getStoredTheme() || (systemPrefersDark() ? 'dark' : 'light');
  applyTheme(initial);

  window.getCurrentTheme = function () {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  };

  window.setTheme = function (theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
    applyTheme(theme);
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };

  window.toggleTheme = function () {
    window.setTheme(window.getCurrentTheme() === 'dark' ? 'light' : 'dark');
  };

  // Beberapa elemen logo (mis. brand-logo di sidebar) punya versi terang
  // & gelap masing-masing lewat atribut data-logo-light / data-logo-dark.
  // Fungsi ini menyamakan src gambar dengan tema yang sedang aktif.
  window.syncLogos = function () {
    const isDark = window.getCurrentTheme() === 'dark';
    document.querySelectorAll('img[data-logo-light]').forEach(function (img) {
      const wanted = isDark ? img.getAttribute('data-logo-dark') : img.getAttribute('data-logo-light');
      if (wanted && img.getAttribute('src') !== wanted) img.setAttribute('src', wanted);
    });
  };

  document.addEventListener('themechange', window.syncLogos);
  document.addEventListener('DOMContentLoaded', window.syncLogos);
})();
