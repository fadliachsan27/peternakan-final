let trenChart, distChart;

async function loadDashboard() {
  try {
    const data = await Api.get('/stats/dashboard');

    renderStatTiles(data.summary);

    initMap('map', { summary: data.kecamatanSummary && data.kecamatanSummary.length ? data.kecamatanSummary : null, data: data.mapData });

    renderTrenChart(data.trenGejala);
    renderDistChart(data.distribusi);
    renderTable(data.terbaru);
    renderAlerts(data.terbaru);
  } catch (err) {
    console.error(err);
    showToast('Gagal memuat data dashboard', 'error');
  }
}

function renderStatTiles(summary) {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText('statTotal', summary.total ?? 0);
  setText('statAktif', summary.aktif ?? 0);
  setText('statSelesai', summary.selesai ?? 0);
  setText('statVerifikasi', summary.verifikasi ?? 0);

  const updated = summary.lastUpdated ? new Date(summary.lastUpdated) : new Date();
  const today = new Date();
  const isToday = updated.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }) ===
    today.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  setText('statTerakhir', isToday ? 'Hari Ini' : formatDate(updated));
  setText('statTerakhirSub', updated.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }) +
    ', ' + updated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB');
}

function renderTrenChart(trenGejala) {
  const container = document.getElementById('trenChart');
  if (!container) return;

  const colors = ['#21a678', '#e6483e', '#2f6fed', '#f5951f', '#7d5cf0', '#14b8a6', '#eab308', '#ec4899'];

  const rows = trenGejala || [];
  const labels = [...new Set(rows.map(t => t.bulan))].sort();
  const gejalaList = [...new Set(rows.map(t => t.jenis_penyakit))];

  const pick = (bulan, gejala) => {
    const row = rows.find(t => t.bulan === bulan && t.jenis_penyakit === gejala);
    return row ? row.jumlah : 0;
  };

  const datasets = gejalaList.map((gejala, i) => {
    const color = colors[i % colors.length];
    return {
      label: gejala,
      data: labels.map(b => pick(b, gejala)),
      borderColor: color,
      backgroundColor: color,
      tension: 0.35,
      pointRadius: 3,
      fill: false
    };
  });

  const labelFmt = labels.map(b => {
    const [y, m] = b.split('-');
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'short' });
  });

  if (trenChart) trenChart.destroy();
  trenChart = new Chart(container, {
    type: 'line',
    data: {
      labels: labelFmt,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderDistChart(distribusi) {
  const container = document.getElementById('distChart');
  if (!container) return;

  const colors = ['#e6483e', '#f5951f', '#2f6fed', '#21a678', '#7d5cf0', '#14b8a6'];
  const total = distribusi.reduce((s, d) => s + Number(d.jumlah), 0);

  if (distChart) distChart.destroy();
  distChart = new Chart(container, {
    type: 'doughnut',
    data: {
      labels: distribusi.map(d => d.jenis_penyakit),
      datasets: [{
        data: distribusi.map(d => d.jumlah),
        backgroundColor: colors.slice(0, distribusi.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } }
    }
  });

  const centerTotal = document.getElementById('donutTotal');
  if (centerTotal) centerTotal.textContent = total;

  const legendEl = document.getElementById('distLegend');
  if (legendEl) {
    legendEl.innerHTML = distribusi.map((d, i) => {
      const pct = total ? Math.round((d.jumlah / total) * 100) : 0;
      return `
        <div class="donut-legend-row">
          <span class="lbl"><span class="dot" style="background:${colors[i % colors.length]}"></span>${d.jenis_penyakit}</span>
          <span class="val">${pct}% (${d.jumlah})</span>
        </div>`;
    }).join('');
  }
}

function renderTable(rows) {
  const tbody = document.getElementById('tableTerbaru');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-slate-400 py-6">Belum ada data</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td data-label="Tanggal">${formatDate(r.tanggal)}</td>
      <td data-label="Kecamatan">${r.kecamatan}</td>
      <td data-label="Gejala">${r.jenis_penyakit}</td>
      <td data-label="Sektor">${r.sektor}</td>
      <td data-label="Status">${statusBadge(r.status)}</td>
    </tr>
  `).join('');
}

function renderAlerts(terbaru) {
  const el = document.getElementById('alertList');
  if (!el) return;
  const items = (terbaru || []).slice(0, 3);
  if (!items.length) {
    el.innerHTML = '<div class="alert-item"><span class="alert-sub">Belum ada notifikasi</span></div>';
    return;
  }

  const cfg = {
    Aktif: { icon: 'ti-alert-triangle', cls: 'alert-icon-red', title: (r) => `Peningkatan kasus ${r.jenis_penyakit} di Kecamatan ${r.kecamatan}`, sub: 'Perlu respon cepat' },
    Verifikasi: { icon: 'ti-info-circle', cls: 'alert-icon-orange', title: (r) => `Laporan kasus ${r.jenis_penyakit} di Kecamatan ${r.kecamatan}`, sub: 'Sedang ditindaklanjuti' },
    Selesai: { icon: 'ti-info-circle', cls: 'alert-icon-blue', title: (r) => `Data kasus ${r.jenis_penyakit} di Kecamatan ${r.kecamatan}`, sub: 'Data berhasil diperbarui' }
  };

  el.innerHTML = items.map(r => {
    const c = cfg[r.status] || cfg.Selesai;
    return `
      <div class="alert-item">
        <div class="alert-icon ${c.cls}"><i class="ti ${c.icon}"></i></div>
        <div>
          <p class="alert-title">${c.title(r)}</p>
          <p class="alert-sub">${c.sub}</p>
          <p class="alert-time">${formatDate(r.tanggal)}</p>
        </div>
      </div>`;
  }).join('');
}

loadDashboard();