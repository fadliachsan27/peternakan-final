// Status "korban/pasien berbeda dengan pelapor". Default-nya false: data
// identitas korban akan otomatis memakai data pelapor dari kartu Detail
// Laporan. Kalau pengguna klik tombol & mengisi modal, datanya disimpan di
// identitasKorbanData dan dipakai saat submit menggantikan data pelapor.
let korbanBerbeda = false;
let identitasKorbanData = {
  nama_pasien: '',
  jenis_kelamin: '',
  tanggal_lapor: '',
  korban_kecamatan: '',
  alamat_pelapor: '',
  rt: '',
  rw: ''
};

function openIdentitasKorbanModal() {
  document.getElementById('modal_nama_pasien').value = identitasKorbanData.nama_pasien;
  document.getElementById('modal_jenis_kelamin').value = identitasKorbanData.jenis_kelamin;
  document.getElementById('modal_tanggal_lapor').value = identitasKorbanData.tanggal_lapor;
  document.getElementById('modal_korban_kecamatan').value = identitasKorbanData.korban_kecamatan;
  document.getElementById('modal_alamat_pelapor').value = identitasKorbanData.alamat_pelapor;
  document.getElementById('modal_rt').value = identitasKorbanData.rt;
  document.getElementById('modal_rw').value = identitasKorbanData.rw;
  document.getElementById('modalIdentitasKorban').classList.remove('hidden');
}

function closeIdentitasKorbanModal() {
  document.getElementById('modalIdentitasKorban').classList.add('hidden');
}

function saveIdentitasKorbanModal() {
  const namaPasien = document.getElementById('modal_nama_pasien').value.trim();
  const jenisKelamin = document.getElementById('modal_jenis_kelamin').value;
  const tanggalLapor = document.getElementById('modal_tanggal_lapor').value;
  const korbanKecamatan = document.getElementById('modal_korban_kecamatan').value.trim();

  if (!namaPasien || !jenisKelamin || !tanggalLapor || !korbanKecamatan) {
    showToast('Nama pasien, jenis kelamin, tanggal melapor, dan kecamatan korban wajib diisi', 'error');
    return;
  }

  identitasKorbanData = {
    nama_pasien: namaPasien,
    jenis_kelamin: jenisKelamin,
    tanggal_lapor: tanggalLapor,
    korban_kecamatan: korbanKecamatan,
    alamat_pelapor: document.getElementById('modal_alamat_pelapor').value.trim(),
    rt: document.getElementById('modal_rt').value.trim(),
    rw: document.getElementById('modal_rw').value.trim()
  };
  korbanBerbeda = true;
  updateIdentitasKorbanButton();
  closeIdentitasKorbanModal();
}

function updateIdentitasKorbanButton() {
  const label = document.getElementById('btnIdentitasKorbanLabel');
  const status = document.getElementById('identitasKorbanStatus');
  if (korbanBerbeda) {
    label.textContent = `Edit Data Korban (${identitasKorbanData.nama_pasien})`;
    status.textContent = 'Data korban/pasien berbeda dengan pelapor, sudah diisi lewat form di atas.';
  } else {
    label.textContent = 'Korban Beda dengan Pelapor?';
    status.textContent = 'Data korban/pasien akan memakai data pelapor di bawah ini. Klik tombol di atas kalau korban/pasien berbeda dengan pelapor.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initMap('map', {
    editable: true,
    onSelect: (lat, lng) => updateCoordDisplay(lat, lng)
  });

  // Begitu alamat diisi (berhenti mengetik / pindah field), peta otomatis
  // pindah ke lokasi tsb dan titik lokasinya langsung muncul. Pengguna
  // masih bisa klik peta secara manual untuk mengoreksi titiknya.
  attachAddressGeocoding('alamat');

  // Kecamatan (Detail Laporan) & Kecamatan (Asal Korban): dropdown
  // pencarian dari API Wilayah Indonesia, bukan ketik manual lagi.
  initKecamatanSearchDropdown('kecamatan');
  initKecamatanSearchDropdown('modal_korban_kecamatan');

  // "Nama Dokter" otomatis terisi begitu kecamatan dipilih (lihat
  // public/js/wilayah.js -> bindDokterAutoFill). Nilai ini cuma buat
  // ditampilkan ke pelapor, keputusan akhir tetap dihitung ulang di
  // server supaya tidak bisa dimanipulasi dari form.
  bindDokterAutoFill('kecamatan', 'sektor');

  document.getElementById('formPengajuan').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      if (!getGejalaSelectedCodes().length) {
        showToast('Pilih minimal 1 gejala', 'error');
        return;
      }
      const fd = new FormData();

      // Detail Laporan
      fd.append('nama_pelapor', document.getElementById('nama_pelapor').value);
      fd.append('no_wa', document.getElementById('no_wa').value);
      fd.append('tanggal', document.getElementById('tanggal').value);
      fd.append('kecamatan', document.getElementById('kecamatan').value);
      fd.append('jenis_hewan', document.getElementById('jenis_hewan').value);
      fd.append('gejala', document.getElementById('gejala').value || '[]');
      fd.append('sektor', document.getElementById('sektor').value);
      fd.append('alamat', document.getElementById('alamat').value);
      fd.append('latitude', document.getElementById('latitude').value || '');
      fd.append('longitude', document.getElementById('longitude').value || '');
      fd.append('kronologis', document.getElementById('kronologis').value);

      // Identitas Korban / Pasien: kalau korban berbeda dengan pelapor, pakai
      // data dari modal. Kalau sama, otomatis diisi dari data pelapor di atas.
      if (korbanBerbeda) {
        fd.append('nama_pasien', identitasKorbanData.nama_pasien);
        fd.append('jenis_kelamin', identitasKorbanData.jenis_kelamin);
        fd.append('tanggal_lapor', identitasKorbanData.tanggal_lapor);
        fd.append('korban_kecamatan', identitasKorbanData.korban_kecamatan);
        fd.append('alamat_pelapor', identitasKorbanData.alamat_pelapor);
        fd.append('rt', identitasKorbanData.rt);
        fd.append('rw', identitasKorbanData.rw);
      } else {
        fd.append('nama_pasien', document.getElementById('nama_pelapor').value);
        fd.append('jenis_kelamin', '');
        fd.append('tanggal_lapor', document.getElementById('tanggal').value);
        fd.append('korban_kecamatan', document.getElementById('kecamatan').value);
        fd.append('alamat_pelapor', document.getElementById('alamat').value);
        fd.append('rt', '');
        fd.append('rw', '');
      }

      const fotoInput = document.getElementById('foto');
      if (fotoInput.files[0]) {
        fd.append('foto', fotoInput.files[0]);
      }

      const result = await Api.upload('/pengajuan', fd);
      showToast('Pengajuan berhasil dikirim!');

      if (result.whatsapp_url) {
        setTimeout(async () => {
          const ok = await handoConfirm({
            title: 'Pengajuan Tersimpan',
            message: 'Buka WhatsApp untuk menghubungi admin terkait laporan Anda?',
            confirmText: 'Buka WhatsApp',
            type: 'success'
          });
          // Catatan: sengaja pakai window.location.href (navigasi di tab yang
          // sama), BUKAN window.open(..., '_blank'). window.open gampang
          // diblokir browser (terutama di HP) kalau langsung disusul
          // window.location.href ke halaman lain -- browser menganggap
          // halaman asal "ditinggalkan" jadi tab barunya dibatalkan, hasilnya
          // WA kelihatan tidak kebuka sama sekali.
          window.location.href = ok ? result.whatsapp_url : '/';
        }, 500);
      } else {
        setTimeout(() => { window.location.href = '/'; }, 800);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});