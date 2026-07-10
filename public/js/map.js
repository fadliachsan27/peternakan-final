const MAP_CENTER = [-6.9277, 106.9293];
const MAP_ZOOM = 10;

let mapInstance = null;
let markerLayer = null;
let clickMarker = null;
let onCoordChange = null;

function initMap(containerId, options = {}) {
  const { editable = false, onSelect, data = [], summary = null } = options;
  onCoordChange = onSelect;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  mapInstance = L.map(containerId).setView(MAP_CENTER, MAP_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  markerLayer = L.layerGroup().addTo(mapInstance);

  if (summary) {
    renderKecamatanBubbles(summary);
  } else {
    data.forEach(item => {
      if (item.latitude && item.longitude) {
        addDataMarker(item);
      }
    });
  }

  if (editable) {
    mapInstance.on('click', (e) => {
      setClickMarker(e.latlng.lat, e.latlng.lng);
      if (onCoordChange) onCoordChange(e.latlng.lat, e.latlng.lng);
    });
  }

  setTimeout(() => mapInstance.invalidateSize(), 200);
  return mapInstance;
}

function addDataMarker(item) {
  const color = item.status === 'Aktif' ? '#78716c' : item.status === 'Verifikasi' ? '#d97706' : '#64748b';
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">1</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  const marker = L.marker([parseFloat(item.latitude), parseFloat(item.longitude)], { icon })
    .bindPopup(`
      <strong>${item.jenis_penyakit || item.kecamatan}</strong><br>
      ${item.kecamatan || ''}<br>
      <small>${item.alamat || ''}</small><br>
      <em>${item.status || ''}</em>
    `);
  markerLayer.addLayer(marker);
}

function setClickMarker(lat, lng) {
  if (clickMarker) mapInstance.removeLayer(clickMarker);
  clickMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: '',
      html: '<div style="background:#475569;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).addTo(mapInstance);
}

function updateCoordDisplay(lat, lng) {
  const el = document.getElementById('coordDisplay');
  if (el) {
    el.innerHTML = lat && lng
      ? `<strong>Koordinat:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br><small>Klik peta untuk mengubah lokasi</small>`
      : '<em>Belum ada koordinat — klik peta untuk menentukan lokasi</em>';
  }
  const latInput = document.getElementById('latitude');
  const lngInput = document.getElementById('longitude');
  if (latInput) latInput.value = lat ? lat.toFixed(8) : '';
  if (lngInput) lngInput.value = lng ? lng.toFixed(8) : '';
}

function tierColor(count) {
  if (count > 5) return '#e6483e';   // Tinggi
  if (count >= 3) return '#f5951f';  // Sedang
  if (count >= 1) return '#21a678';  // Rendah
  return '#cbd5e1';
}

function renderKecamatanBubbles(summary) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  summary.forEach(item => {
    if (!item.latitude || !item.longitude) return;
    const color = tierColor(item.jumlah);
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)">${item.jumlah}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    const marker = L.marker([parseFloat(item.latitude), parseFloat(item.longitude)], { icon })
      .bindPopup(`<strong>${item.kecamatan}</strong><br>${item.jumlah} kasus tercatat`);
    markerLayer.addLayer(marker);
  });
}

function refreshMapMarkers(data) {
  if (!markerLayer) return;
  markerLayer.clearLayers();
  data.forEach(item => {
    if (item.latitude && item.longitude) addDataMarker(item);
  });
}

function flyToMarker(lat, lng) {
  if (mapInstance && lat && lng) {
    mapInstance.setView([lat, lng], 14);
    setClickMarker(lat, lng);
  }
}

// ---------------------------------------------------------------------
// Geocoding alamat -> koordinat (pakai Nominatim/OpenStreetMap, gratis,
// tanpa API key). Dipasang di input alamat supaya begitu pengguna selesai
// mengetik alamat, peta otomatis pindah ke lokasi tsb dan titik penanda
// muncul, tanpa harus klik peta secara manual.
// ---------------------------------------------------------------------
let _geocodeTimer = null;
let _geocodeController = null;

function attachAddressGeocoding(addressInputId, options = {}) {
  const input = document.getElementById(addressInputId);
  if (!input) return;

  const minLength = options.minLength || 5;
  const debounceMs = options.debounceMs || 900;
  const onFound = options.onFound || null;

  const runGeocode = async () => {
    const query = input.value.trim();
    if (query.length < minLength) return;

    if (_geocodeController) _geocodeController.abort();
    _geocodeController = new AbortController();

    setGeoStatus('Mencari lokasi di peta...');

    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q='
        + encodeURIComponent(query);
      const res = await fetch(url, {
        signal: _geocodeController.signal,
        headers: { 'Accept-Language': 'id' }
      });
      if (!res.ok) throw new Error('Gagal menghubungi layanan peta');
      const results = await res.json();

      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lng = parseFloat(results[0].lon);
        flyToMarker(lat, lng);
        updateCoordDisplay(lat, lng);
        if (onCoordChange) onCoordChange(lat, lng);
        if (onFound) onFound(lat, lng, results[0]);
      } else {
        setGeoStatus('Alamat tidak ditemukan otomatis — klik pada peta untuk menentukan titik lokasi.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setGeoStatus('Gagal mencari lokasi otomatis — klik pada peta untuk menentukan titik lokasi.');
      }
    }
  };

  input.addEventListener('input', () => {
    clearTimeout(_geocodeTimer);
    _geocodeTimer = setTimeout(runGeocode, debounceMs);
  });

  input.addEventListener('blur', () => {
    clearTimeout(_geocodeTimer);
    runGeocode();
  });
}

function setGeoStatus(message) {
  const el = document.getElementById('coordDisplay');
  if (el) el.innerHTML = `<em>${message}</em>`;
}