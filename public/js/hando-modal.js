/* Modal konfirmasi & prompt bergaya Hando, pengganti confirm()/prompt() bawaan browser */

function ensureHandoModalRoot() {
  let root = document.getElementById('handoModalRoot');
  if (!root) {
    root = document.createElement('div');
    root.id = 'handoModalRoot';
    document.body.appendChild(root);
  }
  return root;
}

function closeHandoModal() {
  const overlay = document.getElementById('handoModalOverlay');
  if (!overlay) return;
  overlay.classList.add('modal-closing');
  setTimeout(() => overlay.remove(), 150);
}

function handoIconFor(type) {
  switch (type) {
    case 'danger': return { icon: 'ti-trash', cls: 'modal-icon-red' };
    case 'success': return { icon: 'ti-circle-check', cls: 'modal-icon-green' };
    case 'info': return { icon: 'ti-info-circle', cls: 'modal-icon-blue' };
    default: return { icon: 'ti-alert-triangle', cls: 'modal-icon-orange' };
  }
}

/**
 * Modal notifikasi sederhana (satu tombol "OK"), untuk pesan seperti "Tersimpan Berhasil".
 * Contoh: await handoAlert({ title: 'Tersimpan Berhasil', message: '...', type: 'success' });
 */
function handoAlert({
  title = 'Berhasil',
  message = '',
  okText = 'OK',
  type = 'success'
} = {}) {
  return new Promise((resolve) => {
    ensureHandoModalRoot();
    const { icon, cls } = handoIconFor(type);
    const overlay = document.createElement('div');
    overlay.id = 'handoModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-box-sm modal-pop">
        <div class="modal-confirm-body">
          <div class="modal-icon-badge ${cls}"><i class="ti ${icon}"></i></div>
          <h3 class="modal-confirm-title">${title}</h3>
          <p class="modal-confirm-text">${message}</p>
        </div>
        <div class="modal-footer" style="justify-content:center">
          <button type="button" class="btn-primary" data-action="ok" style="min-width:120px">${okText}</button>
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);

    const finish = () => { closeHandoModal(); resolve(true); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(); });
    overlay.querySelector('[data-action="ok"]').onclick = finish;
  });
}

/**
 * Ganti untuk: if (!confirm('...')) return;
 * Contoh: if (!(await handoConfirm({ title: 'Hapus data?', message: '...', type: 'danger' }))) return;
 */
function handoConfirm({
  title = 'Konfirmasi',
  message = '',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'warning'
} = {}) {
  return new Promise((resolve) => {
    ensureHandoModalRoot();
    const { icon, cls } = handoIconFor(type);
    const overlay = document.createElement('div');
    overlay.id = 'handoModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-box-sm modal-pop">
        <div class="modal-confirm-body">
          <div class="modal-icon-badge ${cls}"><i class="ti ${icon}"></i></div>
          <h3 class="modal-confirm-title">${title}</h3>
          <p class="modal-confirm-text">${message}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-outline" data-action="cancel">${cancelText}</button>
          <button type="button" class="btn-primary ${type === 'danger' ? 'btn-danger' : ''}" data-action="confirm">${confirmText}</button>
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);

    const finish = (val) => { closeHandoModal(); resolve(val); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
    overlay.querySelector('[data-action="cancel"]').onclick = () => finish(false);
    overlay.querySelector('[data-action="confirm"]').onclick = () => finish(true);
  });
}

/**
 * Modal info generik dengan body HTML bebas (dipakai untuk detail pelapor, dsb).
 * Contoh: handoInfo({ title: 'Detail Pelapor', bodyHtml: '<p>...</p>' });
 */
function handoInfo({
  title = 'Detail',
  bodyHtml = ''
} = {}) {
  return new Promise((resolve) => {
    ensureHandoModalRoot();
    const overlay = document.createElement('div');
    overlay.id = 'handoModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-box-sm modal-pop">
        <div class="modal-head">
          <h3><i class="ti ti-user-circle" style="color:var(--c-blue);margin-right:.4rem"></i>${title}</h3>
          <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-footer" style="justify-content:center">
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);

    const finish = () => { closeHandoModal(); resolve(true); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(); });
    overlay.querySelector('[data-action="cancel"]').onclick = finish;
  });
}

/**
 * Modal preview gambar (dipakai untuk melihat foto lampiran pengajuan).
 * Contoh: handoImagePreview('/uploads/pengajuan/xxx.jpg', 'Foto Laporan');
 */
function handoImagePreview(src, title = 'Foto') {
  return new Promise((resolve) => {
    ensureHandoModalRoot();
    const overlay = document.createElement('div');
    overlay.id = 'handoModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-pop" style="max-width:600px">
        <div class="modal-head">
          <h3><i class="ti ti-photo" style="color:var(--c-blue);margin-right:.4rem"></i>${title}</h3>
          <div style="display:flex;align-items:center;gap:.4rem">
            <button type="button" class="modal-close" data-action="download" title="Unduh Foto"><i class="ti ti-download"></i></button>
            <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
          </div>
        </div>
        <div class="modal-body" style="text-align:center">
          <img src="${src}" alt="${title}" style="max-width:100%;max-height:70vh;border-radius:.5rem" />
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);

    const finish = () => { closeHandoModal(); resolve(true); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(); });
    overlay.querySelector('[data-action="cancel"]').onclick = finish;
    overlay.querySelector('[data-action="download"]').onclick = async (e) => {
      const btn = e.currentTarget;
      const originalIcon = btn.innerHTML;
      const filename = (src.split('/').pop() || 'foto').split('?')[0];
      try {
        btn.innerHTML = '<i class="ti ti-loader-2" style="animation:spin 1s linear infinite"></i>';
        const res = await fetch(src);
        if (!res.ok) throw new Error('Gagal mengambil file: ' + res.status);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (err) {
        console.error('Download gagal, membuka foto di tab baru sebagai alternatif:', err);
        window.open(src, '_blank');
      } finally {
        btn.innerHTML = originalIcon;
      }
    };
  });
}

/**
 * Ganti untuk: const val = prompt('...');
 * Contoh: const alasan = await handoPrompt({ title: 'Alasan Penolakan', placeholder: '...' });
 * Mengembalikan string, atau null jika dibatalkan.
 */
function handoPrompt({
  title = 'Masukkan Data',
  message = '',
  placeholder = '',
  confirmText = 'Kirim',
  cancelText = 'Batal',
  required = true,
  type = 'info'
} = {}) {
  return new Promise((resolve) => {
    ensureHandoModalRoot();
    const overlay = document.createElement('div');
    overlay.id = 'handoModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box modal-box-sm modal-pop">
        <div class="modal-head">
          <h3>${title}</h3>
          <button type="button" class="modal-close" data-action="cancel"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          ${message ? `<p class="modal-confirm-text" style="text-align:left;margin-bottom:.75rem">${message}</p>` : ''}
          <textarea class="form-input" id="handoPromptInput" rows="3" placeholder="${placeholder}"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-outline" data-action="cancel">${cancelText}</button>
          <button type="button" class="btn-primary" data-action="confirm">${confirmText}</button>
        </div>
      </div>`;
    ensureHandoModalRoot().appendChild(overlay);

    const input = overlay.querySelector('#handoPromptInput');
    setTimeout(() => input.focus(), 60);

    const finish = (val) => { closeHandoModal(); resolve(val); };
    const doConfirm = () => {
      const val = input.value.trim();
      if (required && !val) {
        input.classList.add('input-error');
        input.focus();
        return;
      }
      finish(val);
    };

    overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(null); });
    overlay.querySelectorAll('[data-action="cancel"]').forEach(btn => btn.onclick = () => finish(null));
    overlay.querySelector('[data-action="confirm"]').onclick = doConfirm;
    input.addEventListener('input', () => input.classList.remove('input-error'));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doConfirm();
    });
  });
}