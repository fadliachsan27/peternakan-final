const API_BASE = '/api';

function handleUnauthorized() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (!location.pathname.endsWith('/login.html')) {
    sessionStorage.setItem('loginNotice', 'Sesi login sudah berakhir, silakan masuk lagi.');
    window.location.href = '/admin/login.html';
  }
}

async function parseApiError(res) {
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Sesi login sudah berakhir, silakan masuk lagi.');
  }
  try {
    const data = await res.json();
    return data.error || 'Request gagal';
  } catch {
    return 'Request gagal';
  }
}

const Api = {
  async get(url) {
    const res = await fetch(API_BASE + url, { headers: Api.headers() });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  },

  async post(url, body) {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...Api.headers() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  },

  async put(url, body) {
    const res = await fetch(API_BASE + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...Api.headers() },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  },

  async delete(url) {
    const res = await fetch(API_BASE + url, {
      method: 'DELETE',
      headers: Api.headers()
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  },

  headers() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async download(url, filename) {
    const res = await fetch(API_BASE + url, { headers: Api.headers() });
    if (!res.ok) {
      if (res.status === 401) { handleUnauthorized(); }
      throw new Error('Download gagal');
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },

  async upload(url, formData) {
    const res = await fetch(API_BASE + url, {
      method: 'POST',
      headers: Api.headers(),
      body: formData
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  },

  async uploadPut(url, formData) {
    const res = await fetch(API_BASE + url, {
      method: 'PUT',
      headers: Api.headers(),
      body: formData
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json();
  }
};

function requireAuth() {
  if (!localStorage.getItem('token')) {
    const dest = window.location.pathname + window.location.search;
    sessionStorage.setItem('redirectAfterLogin', dest);
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/index.html';
}

function statusBadge(status) {
  const map = {
    Aktif: 'badge-aktif',
    Verifikasi: 'badge-verifikasi',
    Selesai: 'badge-selesai',
    Menunggu: 'badge-menunggu',
    Disetujui: 'badge-disetujui',
    Ditolak: 'badge-ditolak'
  };
  const cls = map[status] || 'badge-menunggu';
  return `<span class="inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}">${status}</span>`;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '-';
  // Nilai dari server berupa string polos "YYYY-MM-DD HH:MM:SS" tanpa info
  // zona waktu, tapi jam di dalamnya SUDAH WIB (lihat src/routes/pengajuan.js).
  // Supaya tampilannya selalu benar walau dashboard dibuka dari perangkat
  // dengan timezone lain, string ini "dijangkarkan" secara eksplisit sebagai
  // waktu Asia/Jakarta (+07:00) sebelum diformat, alih-alih diserahkan ke
  // asumsi timezone lokal browser.
  let iso = String(d).trim().replace(' ', 'T');
  if (!/[+-]\d{2}:?\d{2}$/.test(iso) && !iso.endsWith('Z')) {
    iso += '+07:00';
  }
  const dateObj = new Date(iso);
  if (isNaN(dateObj.getTime())) return '-';
  return dateObj.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).replace('.', ':') + ' WIB';
}

function showToast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `fixed top-4 right-4 z-[9999] px-4 py-3 rounded shadow-lg text-sm text-white ${type === 'error' ? 'bg-red-600' : 'bg-slate-600'}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}