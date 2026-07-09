document.addEventListener('DOMContentLoaded', () => {
  initMap('map', {
    editable: true,
    onSelect: (lat, lng) => updateCoordDisplay(lat, lng)
  });

  document.getElementById('formPengajuan').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();

      // Identitas Korban / Pasien
      fd.append('nama_pasien', document.getElementById('nama_pasien').value);
      fd.append('jenis_kelamin', document.getElementById('jenis_kelamin').value);
      fd.append('tanggal_lapor', document.getElementById('tanggal_lapor').value);
      fd.append('korban_kecamatan', document.getElementById('korban_kecamatan').value);
      fd.append('alamat_pelapor', document.getElementById('alamat_pelapor').value);
      fd.append('rt', document.getElementById('rt').value);
      fd.append('rw', document.getElementById('rw').value);

      // Detail Laporan (tidak berubah)
      fd.append('nama_pelapor', document.getElementById('nama_pelapor').value);
      fd.append('no_wa', document.getElementById('no_wa').value);
      fd.append('tanggal', document.getElementById('tanggal').value);
      fd.append('kecamatan', document.getElementById('kecamatan').value);
      fd.append('jenis_penyakit', document.getElementById('jenis_penyakit').value);
      fd.append('sektor', document.getElementById('sektor').value);
      fd.append('alamat', document.getElementById('alamat').value);
      fd.append('latitude', document.getElementById('latitude').value || '');
      fd.append('longitude', document.getElementById('longitude').value || '');
      fd.append('keterangan', document.getElementById('keterangan').value);
      fd.append('kronologis', document.getElementById('kronologis').value);

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
          if (ok) window.open(result.whatsapp_url, '_blank');
          window.location.href = '/';
        }, 500);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
});
