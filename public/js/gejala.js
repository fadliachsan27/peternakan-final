// ---------------------------------------------------------------------
// Dropdown checkbox multi-pilih "Gejala" + dropdown "Jenis Hewan".
//
// Daftarnya diambil dari server (GET /api/gejala, lihat
// src/routes/gejalaPublic.js -> src/config/gejala.js) supaya satu-satunya
// sumber datanya cuma di server, tidak perlu duplikasi/hardcode di sini.
//
// Dipakai di dua tempat: form "Ajukan Data Kasus" (publik) dan form
// "Tambah/Edit Data Kasus" (admin). Kedua halaman itu memakai markup &
// ID elemen yang sama persis:
//   <select id="jenis_hewan">...</select>
//   <div id="gejalaDropdownWrap">
//     <button id="gejalaDropdownTrigger"><span id="gejalaDropdownLabel"></span></button>
//     <div id="gejalaDropdownPanel">
//       <input id="gejalaDropdownSearch">
//       <div id="gejalaDropdownList"></div>
//     </div>
//   </div>
//   <input type="hidden" id="gejala">
// ---------------------------------------------------------------------

let GEJALA_DATA_CACHE = null;
const gejalaDataLoadPromise = fetch('/api/gejala')
  .then((r) => r.json())
  .then((data) => { GEJALA_DATA_CACHE = data; return data; })
  .catch((err) => {
    console.error('[gejala] Gagal memuat daftar gejala dari server:', err.message || err);
    GEJALA_DATA_CACHE = { jenisHewan: [], gejala: [] };
    return GEJALA_DATA_CACHE;
  });

// Kode gejala yang sedang dicentang untuk instance dropdown aktif di
// halaman ini (cukup satu Set karena tiap halaman cuma punya satu form
// gejala aktif dalam satu waktu -- form Ajukan Data publik & form
// Tambah/Edit Data Kasus admin sama-sama begitu).
let gejalaSelectedCodes = new Set();

function getGejalaSelectedCodes() {
  return Array.from(gejalaSelectedCodes);
}

function setGejalaSelectedCodes(codes) {
  gejalaSelectedCodes = new Set(Array.isArray(codes) ? codes : []);
  syncGejalaHiddenInput();
  renderGejalaDropdownLabel();
  const list = document.getElementById('gejalaDropdownList');
  if (list) {
    list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = gejalaSelectedCodes.has(cb.value);
    });
  }
}

function syncGejalaHiddenInput() {
  const hidden = document.getElementById('gejala');
  if (hidden) hidden.value = JSON.stringify(Array.from(gejalaSelectedCodes));
}

function renderGejalaDropdownLabel() {
  const label = document.getElementById('gejalaDropdownLabel');
  if (!label) return;
  const data = GEJALA_DATA_CACHE;
  if (!gejalaSelectedCodes.size) {
    label.textContent = '-- Pilih Gejala (bisa lebih dari satu) --';
    label.classList.add('text-slate-400');
    return;
  }
  label.classList.remove('text-slate-400');
  if (!data) { label.textContent = `${gejalaSelectedCodes.size} gejala dipilih`; return; }
  const labels = data.gejala
    .filter((g) => gejalaSelectedCodes.has(g.code))
    .map((g) => g.label);
  label.textContent = labels.length > 2
    ? `${labels.slice(0, 2).join(', ')}, +${labels.length - 2} lainnya`
    : labels.join(', ');
}

function renderGejalaChecklist(filterText) {
  const list = document.getElementById('gejalaDropdownList');
  if (!list || !GEJALA_DATA_CACHE) return;

  const q = (filterText || '').trim().toLowerCase();
  const items = GEJALA_DATA_CACHE.gejala.filter((g) => !q || g.label.toLowerCase().includes(q));

  if (!items.length) {
    list.innerHTML = '<div class="gejala-dropdown-empty">Gejala tidak ditemukan</div>';
    return;
  }

  list.innerHTML = items.map((g) => `
    <label class="gejala-dropdown-item">
      <input type="checkbox" value="${g.code}" ${gejalaSelectedCodes.has(g.code) ? 'checked' : ''}>
      <span>${g.label}</span>
    </label>
  `).join('');

  list.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      if (cb.checked) gejalaSelectedCodes.add(cb.value);
      else gejalaSelectedCodes.delete(cb.value);
      syncGejalaHiddenInput();
      renderGejalaDropdownLabel();
    });
  });
}

function renderJenisHewanOptions() {
  const select = document.getElementById('jenis_hewan');
  if (!select || !GEJALA_DATA_CACHE) return;
  const current = select.value;
  select.innerHTML = '<option value="">-- Pilih Jenis Hewan --</option>' +
    GEJALA_DATA_CACHE.jenisHewan.map((nama) => `<option value="${nama}">${nama}</option>`).join('');
  if (current) select.value = current;
}

// Panggil ini sekali di setiap halaman yang punya form Gejala/Jenis Hewan
// (setelah DOMContentLoaded). Aman dipanggil meski elemen-elemennya belum
// ada di DOM (mis. dropdown belum ditampilkan) -- akan langsung return.
function initGejalaJenisHewanForm() {
  const trigger = document.getElementById('gejalaDropdownTrigger');
  const panel = document.getElementById('gejalaDropdownPanel');
  const search = document.getElementById('gejalaDropdownSearch');
  const wrap = document.getElementById('gejalaDropdownWrap');
  if (!trigger || !panel) return;

  gejalaDataLoadPromise.then(() => {
    renderJenisHewanOptions();
    renderGejalaChecklist('');
    renderGejalaDropdownLabel();
  });

  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const willOpen = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !willOpen);
    if (willOpen && search) { search.value = ''; renderGejalaChecklist(''); search.focus(); }
  });

  if (search) {
    search.addEventListener('input', () => renderGejalaChecklist(search.value));
  }

  document.addEventListener('click', (e) => {
    if (wrap && !wrap.contains(e.target)) panel.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', initGejalaJenisHewanForm);
