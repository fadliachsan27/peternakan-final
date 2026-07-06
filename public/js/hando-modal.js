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
    overlay.querySelector('[data-action="cancel"]').onclick = () => finish(null);
    overlay.querySelector('[data-action="confirm"]').onclick = doConfirm;
    input.addEventListener('input', () => input.classList.remove('input-error'));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) doConfirm();
    });
  });
}