/* Layout bersama: sidebar + topbar untuk halaman publik & admin, meniru desain Peternakan */

const ADMIN_MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', href: '/admin/dashboard.html' },
  { key: 'peta', label: 'Peta Sebaran', icon: 'ti-map-pin', href: '/admin/dashboard.html#peta' },
  { key: 'kasus', label: 'Data Kasus', icon: 'ti-table', href: '/admin/kasus.html' },
  { key: 'notifikasi', label: 'Pengajuan', icon: 'ti-bell', href: '/admin/pengajuan.html', badgeId: 'badgePending' },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'ti-settings', href: '/admin/pengaturan.html' }
];

const PUBLIC_MENU = [
  { key: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard', href: '/' },
  // { key: 'peta', label: 'Peta Sebaran', icon: 'ti-map-pin', href: '/#peta' },
  // { key: 'kasus', label: 'Data Kasus', icon: 'ti-table', href: '/#kasus' },
  { key: 'ajukan', label: 'Ajukan Data', icon: 'ti-square-plus', href: '/pengajuan.html' }
];

const ONE_HEALTH_MENU = [
  // { label: 'Kesehatan Hewan', icon: 'ti-paw', cls: 'oh-green' },
  // { label: 'Kesehatan Manusia', icon: 'ti-activity-heartbeat', cls: 'oh-blue' },
  // { label: 'Lingkungan', icon: 'ti-leaf', cls: 'oh-teal' }
];

function comingSoon(e) {
  e.preventDefault();
  if (typeof showToast === 'function') showToast('Fitur ini sedang dalam pengembangan', 'error');
}

function toggleSidebar() {
  const shell = document.querySelector('.app-shell');
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;

  if (isMobile) {
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('open', sidebar?.classList.contains('open'));
    return;
  }

  const collapsed = shell?.classList.toggle('sidebar-collapsed');
  updateSidebarToggleIcon(collapsed);
  try { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); } catch (e) { }
}

function closeSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar?.classList.remove('open');
  overlay?.classList.remove('open');
}

function updateSidebarToggleIcon(collapsed) {
  const btn = document.getElementById('sidebarToggleBtn');
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (!icon) return;
  icon.className = collapsed ? 'ti ti-layout-sidebar-left-expand' : 'ti ti-layout-sidebar-left-collapse';
}

function restoreSidebarState() {
  const isMobile = window.matchMedia('(max-width: 1024px)').matches;
  if (isMobile) return;
  let collapsed = false;
  try { collapsed = localStorage.getItem('sidebarCollapsed') === '1'; } catch (e) { }
  if (collapsed) {
    document.querySelector('.app-shell')?.classList.add('sidebar-collapsed');
    updateSidebarToggleIcon(true);
  }
}

document.addEventListener('DOMContentLoaded', restoreSidebarState);

window.matchMedia('(max-width: 1024px)').addEventListener('change', (e) => {
  const shell = document.querySelector('.app-shell');
  if (e.matches) {
    shell?.classList.remove('sidebar-collapsed');
  } else {
    closeSidebar();
    restoreSidebarState();
  }
});

function renderSidebar(targetId, { mode = 'public', active = 'dashboard' } = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const menu = mode === 'admin' ? ADMIN_MENU : PUBLIC_MENU;

  const menuHtml = menu.map(m => `
    <a href="${m.href}" ${m.soon ? 'onclick="comingSoon(event)"' : ''} class="side-link ${active === m.key ? 'side-link-active' : ''}" title="${m.label}">
      <i class="ti ${m.icon}"></i>
      <span>${m.label}</span>
      ${m.badgeId ? `<span id="${m.badgeId}" class="side-badge hidden">0</span>` : ''}
    </a>
  `).join('');

  const oneHealthHtml = ONE_HEALTH_MENU.map(o => `
    <a href="#" onclick="comingSoon(event)" class="oh-btn ${o.cls}">
      <i class="ti ${o.icon}"></i><span>${o.label}</span>
    </a>
  `).join('');

  const footer = mode === 'admin'
    ? `<div class="sidebar-footer-admin">
         <p class="text-xs text-slate-400" id="adminName">Admin</p>
         <button onclick="logout()" class="side-logout" title="Keluar"><i class="ti ti-logout"></i> <span>Keluar</span></button>
       </div>`
    : `<a href="/admin/login.html" class="sidebar-footer-public" title="Login Admin">
         <i class="ti ti-shield-lock"></i>
         <span>Login Admin</span>
       </a>`;

  el.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-main">
        <div class="brand-logo">
          <i class="ti ti-map-2"></i>
        </div>
        <div class="sidebar-brand-text">
          <h1>Peternakan</h1>
          <p>Sistem Kewaspadaan Dini Zoonosis<br>Berbasis One Health</p>
        </div>
      </div>
      <button class="sidebar-toggle-btn" id="sidebarToggleBtn" onclick="toggleSidebar()" title="Buka/Tutup Sidebar">
        <i class="ti ti-layout-sidebar-left-collapse"></i>
      </button>
    </div>
    <div class="sidebar-region"><i class="ti ti-building-bank"></i> Kabupaten Sukabumi</div>

    <nav class="sidebar-nav">
      <p class="sidebar-section-title">Menu Utama</p>
      ${menuHtml}
    </nav>

    <div class="sidebar-onehealth">
      <p class="sidebar-section-title"></p>
      ${oneHealthHtml}
    </div>

    <div class="sidebar-tagline">
      <i class="ti ti-shield-check"></i>
      <div>
        <p>Bersama Cegah Zoonosis</p>
        <strong>Untuk Sukabumi Sehat</strong>
      </div>
    </div>

    ${footer}
  `;
}

function renderTopbar(targetId, { mode = 'public' } = {}) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const right = mode === 'admin'
    ? `<button class="topbar-bell"><i class="ti ti-bell"></i></button>
       <div class="topbar-user">
         <div class="topbar-avatar"><i class="ti ti-user"></i></div>
         <div class="topbar-user-info">
           <span id="topbarUserName">drh. Asep Kurnadi</span>
           <small>Dinas Peternakan Kab. Sukabumi</small>
         </div>
         <i class="ti ti-chevron-down text-slate-400"></i>
       </div>`
    : `<a href="/pengajuan.html" class="btn-primary text-sm hidden sm:inline-flex items-center gap-1"><i class="ti ti-square-plus"></i> Ajukan Data</a>
       <a href="/admin/login.html" class="btn-outline text-sm inline-flex items-center gap-1"><i class="ti ti-shield-lock"></i> Admin</a>`;

  el.innerHTML = `
    <div class="topbar-title">
      <span><i class="ti ti-database"></i> SATU DATA</span>
      <span class="dot">&bull;</span>
      <span><i class="ti ti-server-2"></i> SATU SISTEM</span>
      <span class="dot">&bull;</span>
      <span><i class="ti ti-heart-plus"></i> SATU KESEHATAN</span>
      <p class="topbar-subtitle">Deteksi Dini &nbsp;|&nbsp; Respon Cepat &nbsp;|&nbsp; Kolaborasi Lintas Sektor</p>
    </div>
    <div class="topbar-right">${right}</div>
  `;
}

// Automatic preloader dismiss and stagger animations
window.addEventListener('load', () => {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 500);
  }
});

// Fallback in case window load fired before script
setTimeout(() => {
  const preloader = document.getElementById('preloader');
  if (preloader && !preloader.classList.contains('fade-out')) {
    preloader.classList.add('fade-out');
    setTimeout(() => {
      preloader.style.display = 'none';
    }, 500);
  }
}, 2000);