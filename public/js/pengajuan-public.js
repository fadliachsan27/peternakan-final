document.addEventListener('DOMContentLoaded', () => {
  initMap('map', {
    editable: true,
    onSelect: (lat, lng) => updateCoordDisplay(lat, lng)
  });

  document.getElementById('formPengajuan').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const body = {
        nama_pelapor: document.getElementById('nama_pelapor').value,
        no_wa: document.getElementById('no_wa').value,
        tanggal: document.getElementById('tanggal').value,
        kecamatan: document.getElementById('kecamatan').value,
        jenis_penyakit: document.getElementById('jenis_penyakit').value,
        sektor: document.getElementById('sektor').value,
        alamat: document.getElementById('alamat').value,
        latitude: document.getElementById('latitude').value || null,
        longitude: document.getElementById('longitude').value || null,
        keterangan: document.getElementById('keterangan').value
      };

      const result = await Api.post('/pengajuan', body);
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
