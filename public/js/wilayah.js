// ---------------------------------------------------------------------
// Dropdown pencarian Kecamatan untuk Kabupaten Sukabumi.
//
// Daftarnya disimpan langsung di sini (bukan fetch ke API pihak ketiga
// tiap kali form dibuka) supaya dropdown-nya SELALU muncul instan, tidak
// tergantung koneksi internet/CORS ke server luar yang kadang tidak bisa
// diakses dari browser. Datanya tetap bersumber dari data resmi wilayah
// administrasi Kemendagri (47 kecamatan di Kabupaten Sukabumi) — sumber
// yang sama juga dipakai API-API wilayah Indonesia seperti wilayah.id.
//
// Kalau suatu saat cakupan wilayahnya berubah atau butuh kabupaten/kota
// lain, tinggal ganti isi array KECAMATAN_SUKABUMI di bawah.
// ---------------------------------------------------------------------

const KECAMATAN_SUKABUMI = [
    'Bantargadung', 'Bojonggenteng', 'Caringin', 'Ciambar', 'Cibadak',
    'Cibitung', 'Cicantayan', 'Cicurug', 'Cidadap', 'Cidahu', 'Cidolog',
    'Ciemas', 'Cikakak', 'Cikembar', 'Cikidang', 'Cimanggu', 'Ciracap',
    'Cireunghas', 'Cisaat', 'Cisolok', 'Curugkembar', 'Gegerbitung',
    'Gunungguruh', 'Jampangkulon', 'Jampangtengah', 'Kabandungan',
    'Kadudampit', 'Kalapanunggal', 'Kalibunder', 'Kebonpedes', 'Lengkong',
    'Nagrak', 'Nyalindung', 'Pabuaran', 'Palabuhanratu', 'Parakansalak',
    'Parungkuda', 'Purabaya', 'Sagaranten', 'Simpenan', 'Sukabumi',
    'Sukalarang', 'Sukaraja', 'Surade', 'Tegalbuleud', 'Waluran',
    'Warungkiara'
].sort((a, b) => a.localeCompare(b));

// Ubah <input type="text" id="inputId"> jadi combobox pencarian kecamatan:
// admin/pelapor tinggal ketik, daftar kecamatan yang cocok muncul di bawah
// input, tinggal klik/pilih salah satu (tidak perlu ketik manual lagi).
function initKecamatanSearchDropdown(inputId) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.kecamatanDropdownReady) return;
    input.dataset.kecamatanDropdownReady = '1';

    input.setAttribute('autocomplete', 'off');
    if (!input.placeholder) input.placeholder = 'Ketik untuk mencari kecamatan...';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const list = document.createElement('div');
    Object.assign(list.style, {
        position: 'absolute',
        left: '0',
        right: '0',
        top: '100%',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.5rem',
        marginTop: '4px',
        maxHeight: '220px',
        overflowY: 'auto',
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
        zIndex: '9999',
        display: 'none'
    });
    wrapper.appendChild(list);

    function renderEmptyMessage(message) {
        list.innerHTML = '';
        const msg = document.createElement('div');
        msg.textContent = message;
        Object.assign(msg.style, {
            padding: '0.6rem 0.85rem',
            fontSize: '0.8rem',
            color: '#94a3b8',
            fontStyle: 'italic'
        });
        list.appendChild(msg);
        list.style.display = 'block';
    }

    function renderList(filterText) {
        const q = filterText.trim().toLowerCase();
        const filtered = q
            ? KECAMATAN_SUKABUMI.filter((name) => name.toLowerCase().includes(q))
            : KECAMATAN_SUKABUMI;

        if (!filtered.length) {
            renderEmptyMessage('Kecamatan tidak ditemukan');
            return;
        }

        list.innerHTML = '';
        filtered.forEach((name) => {
            const item = document.createElement('div');
            item.textContent = name;
            Object.assign(item.style, {
                padding: '0.55rem 0.85rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                color: '#334155'
            });
            item.addEventListener('mouseenter', () => { item.style.background = '#f1f5f9'; });
            item.addEventListener('mouseleave', () => { item.style.background = ''; });
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                input.value = name;
                list.style.display = 'none';
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
            list.appendChild(item);
        });
        list.style.display = 'block';
    }

    input.addEventListener('focus', () => renderList(input.value));
    input.addEventListener('input', () => renderList(input.value));
    input.addEventListener('blur', () => {
        setTimeout(() => { list.style.display = 'none'; }, 120);
    });
}