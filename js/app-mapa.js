

let filteredPelceri = [...pelceriData];
let activePelcerKat = 'Све';

function renderPelceri(data) {
  const el = document.getElementById('pelceri-list');
  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.88rem;">Нема резултата претраге.</div>';
    return;
  }

  // Group by kategorija
  const groups = {};
  data.forEach(p => {
    if (!groups[p.kategorija]) groups[p.kategorija] = [];
    groups[p.kategorija].push(p);
  });

  const katColors = {
    'Оглашавање': '#1a4a8a',
    'Башта': '#27ae60',
    'Музика — чл. 4': '#8e44ad',
    'Музика — чл. 8': '#c0392b',
    'Музика — чл. 8а': '#d35400',
    'Музика — чл. 12': '#16a085',
    'Тезге': '#2980b9',
    'Башта — Прекршајни налог': '#1abc9c',
    'Башта — Одступање од решења': '#e67e22',
    'Оглашавање — Прекршајни налог': '#2c3e50',
    'Музика — Прекршајни налог чл. 4': '#7f8c8d',
    'Музика — Прекршајни налог чл. 8': '#c0392b',
    'Музика — Прекршајни налог чл. 12': '#27ae60',
    'Такси': '#f39c12',
    'Чистоћа': '#795548',
  };

  el.innerHTML = Object.entries(groups).map(([kat, items]) => `
    <div style="margin-bottom:8px;">
      <div style="background:${katColors[kat]||'#1a4a8a'};color:white;padding:7px 12px;border-radius:8px;font-size:0.72rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">
        ${kat}
      </div>
      ${items.map(p => `
        <div onclick="openPelcer(${p.id})" style="background:white;border:1px solid var(--border);border-radius:8px;padding:11px 14px;margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <span style="font-size:1.2rem;">📋</span>
          <div style="flex:1;font-size:0.82rem;font-weight:600;color:var(--navy);line-height:1.4;">${p.naziv}</div>
          <span style="color:var(--muted);font-size:1rem;">›</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function filterPelceri() {
  const q = document.getElementById('pelceri-search').value.toLowerCase();
  filteredPelceri = pelceriData.filter(p =>
    p.naziv.toLowerCase().includes(q) ||
    p.kategorija.toLowerCase().includes(q) ||
    p.tekst.toLowerCase().includes(q)
  );
  renderPelceri(filteredPelceri);
}

// Modal for pelcer
let currentPelcer = null;
function openPelcer(id) {
  currentPelcer = pelceriData.find(p => p.id === id);
  if (!currentPelcer) return;
  document.getElementById('modal-title').textContent = currentPelcer.naziv;
  // Format the text
  const formatted = currentPelcer.tekst.split('\n').map(line => {
    const l = line.trim();
    if (!l) return '<br>';
    if (l.startsWith('ПРИМЕР') || l.startsWith('Напомена')) {
      return `<div style="font-weight:800;color:#0d2240;margin:10px 0 6px;font-size:0.82rem;border-bottom:2px solid #c8a84b;padding-bottom:4px;">${l}</div>`;
    }
    if (l.startsWith('—') || l.startsWith('-')) {
      return `<div style="padding-left:12px;color:#2a3a4a;margin:3px 0;font-size:0.82rem;">• ${l.replace(/^[—-]\s*/,'')}</div>`;
    }
    return `<div style="color:#2a3a4a;line-height:1.65;font-size:0.85rem;margin:3px 0;">${l}</div>`;
  }).join('');

  document.getElementById('modal-body').innerHTML = formatted;

  // Update share button and hide official link
  const link = document.getElementById('modal-official-link');
  link.style.display = 'none';

  // Show copy button instead
  let copyBtn = document.getElementById('pelcer-copy-btn');
  if (!copyBtn) {
    copyBtn = document.createElement('button');
    copyBtn.id = 'pelcer-copy-btn';
    copyBtn.style.cssText = 'width:100%;padding:11px;margin-top:14px;background:var(--navy);color:white;border:none;border-radius:8px;font-size:0.85rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;';
    link.parentNode.insertBefore(copyBtn, link);
  }
  copyBtn.style.display = 'flex';
  copyBtn.innerHTML = '📋 Копирај текст';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(currentPelcer.tekst).then(() => {
      copyBtn.innerHTML = '✅ Копирано!';
      setTimeout(() => { copyBtn.innerHTML = '📋 Копирај текст'; }, 2000);
    });
  };

  document.getElementById('modal-bg').classList.add('open');
}

// Override shareAkt to work for pelceri too
const _origShareAkt = shareAkt;
async function shareAkt(via) {
  if (currentPelcer) {
    const title = currentPelcer.naziv || 'Pelcer';
    const text = currentPelcer.tekst || '';
    
    // Build Word-compatible HTML
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--></head><body><h1>${title}</h1><p>${text}</p></body></html>`;
    
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const safeName = title.replace(/[^a-zA-Z0-9_\-\u010c\u0107\u0160\u0161\u0110\u0111\u017d\u017e ]/g, '');
    const fileName = safeName + '.doc';
    
    // Try Web Share API
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/msword' })] })) {
      try {
        const file = new File([blob], fileName, { type: 'application/msword' });
        await navigator.share({ title: title, text: title, files: [file] });
        showToast('\u2705 Pelcer deljen kao Word fajl!');
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    
    // Fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    if (via === 'viber') {
      window.open('viber://forward?text=' + encodeURIComponent(text.substring(0, 7000)));
      showToast('\ud83d\udcc4 Word preuzet. Prilo\u017ei u Viberu.');
    } else {
      window.open('mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent('Pelcer preuzet kao Word. Molimo prilo\u017eite ga.'));
      showToast('\ud83d\udcc4 Word preuzet. Prilo\u017ei u mailu.');
    }
    return;
  }
  _origShareAkt(via);
}

// Reset currentPelcer when modal closes
document.getElementById('modal-bg').addEventListener('click', function(e) {
  if (e.target === this) {
    currentPelcer = null;
    const link = document.getElementById('modal-official-link');
    if (link) link.style.display = 'flex';
    const copyBtn = document.getElementById('pelcer-copy-btn');
    if (copyBtn) copyBtn.style.display = 'none';
  }
});

// ===== KAMERA / FOTOGRAFIJE =====
let photos = JSON.parse(localStorage.getItem('bk_photos') || '[]');
let folders = JSON.parse(localStorage.getItem('bk_folders') || '["Opšte"]');
let currentPhotoIndex = null;

function initFolderSelect() {
  const sel = document.getElementById('folder-select');
  sel.innerHTML = '<option value="Sve">Sve fotografije</option>' +
    folders.map(f => `<option value="${f}">${f}</option>`).join('');
}

function newFolder() {
  const name = prompt('Naziv novog foldera:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  if (folders.includes(trimmed)) {
    showToast('⚠️ Folder već postoji');
    return;
  }
  folders.push(trimmed);
  localStorage.setItem('bk_folders', JSON.stringify(folders));
  initFolderSelect();
  document.getElementById('folder-select').value = trimmed;
  renderPhotos();
  showToast('✅ Folder "' + trimmed + '" kreiran');
}

function handlePhotoCapture(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;
  event.target.value = '';

  const folder = document.getElementById('folder-select').value;
  const targetFolder = folder === 'Sve' ? (folders[0] || 'Opšte') : folder;

  let processed = 0;
  showToast('⏳ Učitavanje ' + files.length + ' fotografije...');

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(e) {
      // Compress image via canvas to keep localStorage size reasonable
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = h * maxDim / w; w = maxDim; }
        else if (h > maxDim) { w = w * maxDim / h; h = maxDim; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);

        photos.unshift({
          id: Date.now() + Math.random(),
          folder: targetFolder,
          data: dataUrl,
          date: new Date().toLocaleDateString('sr-RS', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})
        });

        processed++;
        if (processed === files.length) {
          try {
            localStorage.setItem('bk_photos', JSON.stringify(photos));
            renderPhotos();
            showToast('✅ Sačuvano ' + files.length + ' fotografija u "' + targetFolder + '"');
          } catch (err) {
            photos.shift(); // rollback last if storage full
            showToast('⚠️ Nema dovoljno memorije — obrišite stare fotografije');
          }
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotos() {
  const grid = document.getElementById('photo-grid');
  if (!grid) return;
  const sel = document.getElementById('folder-select');
  const filter = sel ? sel.value : 'Sve';
  const list = filter === 'Sve' ? photos : photos.filter(p => p.folder === filter);

  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:var(--muted);font-size:0.85rem;">
      <div style="font-size:2.5rem;margin-bottom:10px;">📷</div>
      Nema fotografija${filter !== 'Sve' ? ' u folderu "' + filter + '"' : ''}.<br>Slikajte ili dodajte iz galerije.
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => {
    const idx = photos.findIndex(x => x.id === p.id);
    return `<div onclick="openPhotoViewer(${idx})" style="aspect-ratio:1;border-radius:8px;overflow:hidden;cursor:pointer;position:relative;background:#eee;">
      <img src="${p.data}" style="width:100%;height:100%;object-fit:cover;">
    </div>`;
  }).join('');
}

function openPhotoViewer(index) {
  currentPhotoIndex = index;
  const p = photos[index];
  document.getElementById('photo-modal-img').src = p.data;
  document.getElementById('photo-modal-title').textContent = p.folder + ' · ' + p.date;
  document.getElementById('photo-modal-bg').style.display = 'flex';
}

function closePhotoViewer() {
  document.getElementById('photo-modal-bg').style.display = 'none';
  currentPhotoIndex = null;
}

function deletePhoto() {
  if (currentPhotoIndex === null) return;
  if (!confirm('Obrisati ovu fotografiju?')) return;
  photos.splice(currentPhotoIndex, 1);
  localStorage.setItem('bk_photos', JSON.stringify(photos));
  closePhotoViewer();
  renderPhotos();
  showToast('🗑️ Fotografija obrisana');
}

function downloadPhoto() {
  if (currentPhotoIndex === null) return;
  const p = photos[currentPhotoIndex];
  const a = document.createElement('a');
  a.href = p.data;
  a.download = 'foto_' + p.id + '.jpg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('⬇️ Fotografija sačuvana');
}

async function sharePhotoViber() {
  if (currentPhotoIndex === null) return;
  const p = photos[currentPhotoIndex];
  const fileName = 'foto_' + (p.id || 'kmapp') + '.jpg';
  
  // Convert data URL to blob
  const response = await fetch(p.data);
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  
  // Try Web Share API with file
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Fotografija - ' + (p.folder || 'KMapp'),
        files: [file]
      });
      showToast('\u2705 Fotografija deljena!');
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Share error:', e);
    }
  }
  
  // Fallback: download photo
  downloadPhoto();
  showToast('\ud83d\udcf8 Fotografija preuzeta. Otvori Viber i prilo\u017ei je.');
}

async function sharePhotoGmail() {
  if (currentPhotoIndex === null) return;
  const p = photos[currentPhotoIndex];
  const fileName = 'foto_' + (p.id || 'kmapp') + '.jpg';
  
  // Convert data URL to blob
  const response = await fetch(p.data);
  const blob = await response.blob();
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  
  // Try Web Share API with file
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Fotografija - ' + (p.folder || 'KMapp'),
        text: 'Fotografija - ' + (p.folder || 'KMapp'),
        files: [file]
      });
      showToast('\u2705 Fotografija deljena!');
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Share error:', e);
    }
  }
  
  // Fallback: download + mailto
  downloadPhoto();
  window.open('mailto:?subject=' + encodeURIComponent('Fotografija - ' + p.folder) + '&body=' + encodeURIComponent('Fotografija je preuzeta. Molimo prilo\u017eite je kao attachment.'));
  showToast('\ud83d\udcf8 Fotografija preuzeta. Prilo\u017eite je u mailu.');
}

// ===== MAPA =====
// ===== LEAFLET MAP + GPS TRACKING =====
var leafletMap = null;
var tileStandard = null;
var tileSatellite = null;
var mapMarker = null;
var mapCircle = null;

// GPS Tracking state
var trackingActive = false;
var watchId = null;
var trackPolyline = null;
var trackPoints = [];
var trackStartTime = null;
var trackMarker = null;
var trackId = null;
var syncInterval = null;

var wakeLock = null;
function initLeafletMap() {
  if (leafletMap) return;
  leafletMap = L.map('leaflet-map').setView([44.8125, 20.4573], 13);
  tileStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(leafletMap);
  tileSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri',
    maxZoom: 19
  });
  // Load saved track for current user
  loadSavedTrack();
  // Auto-resume tracking if it was active before app was closed
  checkResumeTracking();
  // Fix size after container becomes visible
  setTimeout(function() { if (leafletMap) leafletMap.invalidateSize(); }, 200);
}

function setMapLayer(layer) {
  currentLayer = layer;
  document.getElementById('btn-standard').style.background = layer === 'standard' ? 'var(--accent)' : 'white';
  document.getElementById('btn-standard').style.color = layer === 'standard' ? 'white' : 'var(--text)';
  document.getElementById('btn-satellite').style.background = layer === 'satellite' ? 'var(--accent)' : 'white';
  document.getElementById('btn-satellite').style.color = layer === 'satellite' ? 'white' : 'var(--text)';
  if (!leafletMap) initLeafletMap();
  if (layer === 'satellite') {
    if (tileStandard && leafletMap.hasLayer(tileStandard)) leafletMap.removeLayer(tileStandard);
    if (tileSatellite && !leafletMap.hasLayer(tileSatellite)) tileSatellite.addTo(leafletMap);
  } else {
    if (tileSatellite && leafletMap.hasLayer(tileSatellite)) leafletMap.removeLayer(tileSatellite);
    if (tileStandard && !leafletMap.hasLayer(tileStandard)) tileStandard.addTo(leafletMap);
  }
}

function goTo(lat, lon, name) {
  if (!leafletMap) initLeafletMap();
  leafletMap.setView([lat, lon], 15);
  if (mapMarker) leafletMap.removeLayer(mapMarker);
  mapMarker = L.marker([lat, lon]).addTo(leafletMap);
  if (name) {
    mapMarker.bindPopup(name).openPopup();
    var info = document.getElementById('map-info');
    document.getElementById('map-info-text').textContent = '📍 ' + name;
    info.style.display = 'block';
  }
}

async function searchAddress() {
  var q = document.getElementById('map-search').value.trim();
  if (!q) return;
  showToast('🔍 Tražim adresu...');
  try {
    var query = encodeURIComponent(q + ', Beograd, Srbija');
    var resp = await fetch('https://nominatim.openstreetmap.org/search?q=' + query + '&format=json&limit=1');
    var results = await resp.json();
    if (results.length > 0) {
      var r = results[0];
      var lat = parseFloat(r.lat);
      var lon = parseFloat(r.lon);
      goTo(lat, lon, r.display_name.split(',')[0]);
      showToast('✅ Adresa pronađena!');
    } else {
      showToast('❌ Adresa nije pronađena');
    }
  } catch(e) {
    showToast('❌ Greška u pretrazi');
  }
}

function locateMe() {
  if (!navigator.geolocation) {
    showToast('❌ Geolokacija nije dostupna');
    return;
  }
  showToast('📍 Tražim lokaciju...');
  navigator.geolocation.getCurrentPosition(
    function(pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      if (!leafletMap) initLeafletMap();
      goTo(lat, lon, 'Moja lokacija (' + lat.toFixed(4) + ', ' + lon.toFixed(4) + ')');
      if (mapCircle) leafletMap.removeLayer(mapCircle);
      mapCircle = L.circle([lat, lon], {
        radius: pos.coords.accuracy,
        color: '#27ae60',
        fillColor: '#27ae60',
        fillOpacity: 0.1
      }).addTo(leafletMap);
      showToast('✅ Lokacija pronađena!');
    },
    function() { showToast('❌ Nije moguće dobiti lokaciju'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// ===== GPS TRACKING =====
function toggleTracking() {
  if (trackingActive) {
    stopTracking();
  } else {
    startTracking();
  }
}

// ===== WAKE LOCK: drzi ekran budnim dok traje pracenje =====
async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      console.log("Wake Lock acquired");
      wakeLock.addEventListener("release", function() { console.log("Wake Lock released"); });
    }
  } catch(e) { console.log("Wake Lock error:", e.message); }
}

async function releaseWakeLock() {
  if (wakeLock) {
    try { await wakeLock.release(); wakeLock = null; } catch(e) {}
  }
}

// Auto-resume kad se vrati u app
document.addEventListener("visibilitychange", function() {
  if (!trackingActive) return;
  if (document.visibilityState === "visible") {
    if (!leafletMap) initLeafletMap();
    console.log("App ponovo vidljiva - nastavljam pracenje");
  }
});

function startTracking(resume) {
  if (!navigator.geolocation) {
    showToast('❌ Geolokacija nije dostupna');
    return;
  }
  if (!leafletMap) initLeafletMap();
  trackingActive = true;
  acquireWakeLock();
  if (!resume) {
    trackStartTime = Date.now();
    trackPoints = [];
    trackId = "track_" + Date.now() + "_" + Math.random().toString(36).substr(2,6);
  }
  saveTrackingState();
  syncTrackToBackend(resume ? "sync" : "start");
  syncInterval = setInterval(function() { syncTrackToBackend("sync"); }, 10000);
  
  // Show tracking UI
  document.getElementById('track-info').style.display = 'block';
  document.getElementById('track-status').textContent = '🟢 Praćenje aktivno';
  document.getElementById('track-status').style.color = '#27ae60';
  document.getElementById('btn-track-stop').style.display = 'inline-block';
  document.getElementById('btn-track-pdf').style.display = 'none';
  document.getElementById('btn-track-clear').style.display = 'none';
  document.getElementById('btn-track-stop').style.display = 'inline-block';
  document.getElementById('track-status').textContent = '🟢 Praćenje aktivno';
  document.getElementById('track-status').style.color = '#27ae60';
  document.getElementById('track-info').style.display = 'none';
  document.getElementById('btn-track-clear').style.display = 'none';
  document.getElementById('btn-track').style.background = '#27ae60';
  document.getElementById('btn-track').style.color = 'white';
  document.getElementById('btn-track').style.borderColor = '#27ae60';
  
  // Clear old polyline
  if (trackPolyline) {
    leafletMap.removeLayer(trackPolyline);
    trackPolyline = null;
  }
  if (trackMarker) {
    leafletMap.removeLayer(trackMarker);
    trackMarker = null;
  }
  
  // Start watching position
  watchId = navigator.geolocation.watchPosition(
    function(pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      var point = { lat: lat, lon: lon, t: Date.now() };
      trackPoints.push(point);
      
      // Draw/update polyline
      var latlngs = trackPoints.map(function(p) { return [p.lat, p.lon]; });
      if (trackPolyline) {
        trackPolyline.setLatLngs(latlngs);
      } else {
        trackPolyline = L.polyline(latlngs, { color: '#e74c3c', weight: 4, opacity: 0.8 }).addTo(leafletMap);
      }
      
      // Update marker
      if (trackMarker) leafletMap.removeLayer(trackMarker);
      trackMarker = L.circleMarker([lat, lon], {
        radius: 8,
        color: '#e74c3c',
        fillColor: '#e74c3c',
        fillOpacity: 1
      }).addTo(leafletMap);
      
      // Follow the user
      leafletMap.panTo([lat, lon]);
      
      // Update stats
      updateTrackStats();
      
      // Save to localStorage
      saveTrack();
    },
    function(err) {
      showToast('❌ Greška u praćenju: ' + err.message);
      stopTracking();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
  );
  
  showToast('🟢 Praćenje kretanja aktivno');
}

function stopTracking() {
  trackingActive = false;
  releaseWakeLock();
  if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
  syncTrackToBackend("stop");
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  document.getElementById('track-status').textContent = '⏹ Praćenje zaustavljeno';
  document.getElementById('track-status').style.color = '#e74c3c';
  document.getElementById('btn-track-stop').style.display = 'none';
  document.getElementById('btn-track-pdf').style.display = 'inline-block';
  document.getElementById('btn-track-clear').style.display = 'inline-block';
  document.getElementById('btn-track').style.background = 'white';
  document.getElementById('btn-track').style.color = 'var(--text)';
  document.getElementById('btn-track').style.borderColor = 'var(--border)';
  
  // Save final track
  saveTrack();
  clearTrackingState();
  showToast('⏹ Praćenje zaustavljeno. PDF dostupan.');
}

function updateTrackStats() {
  if (!trackPoints || trackPoints.length < 2) return;
  // Calculate distance
  var dist = 0;
  for (var i = 1; i < trackPoints.length; i++) {
    dist += haversine(trackPoints[i-1].lat, trackPoints[i-1].lon, trackPoints[i].lat, trackPoints[i].lon);
  }
  var elapsed = (Date.now() - trackStartTime) / 1000;
  var min = Math.floor(elapsed / 60);
  var sec = Math.floor(elapsed % 60);
  var distStr = dist < 1000 ? dist.toFixed(0) + 'm' : (dist/1000).toFixed(2) + 'km';
  var timeStr = min > 0 ? min + 'min ' + sec + 's' : sec + 's';
  document.getElementById('track-stats').textContent = distStr + ' · ' + timeStr + ' · ' + trackPoints.length + ' tačaka';
}

function haversine(lat1, lon1, lat2, lon2) {
  var R = 6371000; // meters
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function syncTrackToBackend(action) {
  var username = getCurrentUsername();
  if (!username || !trackId || trackPoints.length === 0) return;
  try {
    fetch(KM_API_BASE + '/syncGpsTrack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action || 'sync',
        trackId: trackId,
        username: username,
        points: trackPoints,
        startTime: trackStartTime,
        endTime: action === 'stop' ? Date.now() : null
      })
    }).catch(function(e) { console.error('Track sync error:', e); });
  } catch(e) { console.error('Track sync error:', e); }
}

function saveTrackingState() {
  var username = getCurrentUsername();
  if (!username || !trackId) return;
  try {
    localStorage.setItem('km_tracking_state_' + username, JSON.stringify({
      trackId: trackId,
      startTime: trackStartTime,
      active: true
    }));
  } catch(e) {}
}

function clearTrackingState() {
  var username = getCurrentUsername();
  if (!username) return;
  try {
    localStorage.removeItem('km_tracking_state_' + username);
  } catch(e) {}
}

function checkResumeTracking() {
  var username = getCurrentUsername();
  if (!username) return;
  try {
    var raw = localStorage.getItem('km_tracking_state_' + username);
    if (!raw) return;
    var state = JSON.parse(raw);
    if (state.active && state.trackId) {
      trackId = state.trackId;
      trackStartTime = state.startTime;
      console.log("Auto-resume tracking:", trackId);
      startTracking(true);
      showToast('▶️ Praćenje automatski nastavljeno');
    }
  } catch(e) { console.error("Resume tracking error:", e); }
}

function saveTrack() {
  var username = getCurrentUsername();
  if (!username || trackPoints.length === 0) return;
  var key = 'km_track_' + username;
  var data = {
    points: trackPoints,
    startTime: trackStartTime,
    date: new Date().toISOString()
  };
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch(e) {}
}

function loadSavedTrack() {
  var username = getCurrentUsername();
  if (!username) return;
  var key = 'km_track_' + username;
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var data = JSON.parse(raw);
    if (data.points && data.points.length > 1) {
      trackPoints = data.points;
      trackStartTime = data.startTime;
      var latlngs = trackPoints.map(function(p) { return [p.lat, p.lon]; });
      trackPolyline = L.polyline(latlngs, { color: '#e74c3c', weight: 4, opacity: 0.8 }).addTo(leafletMap);
      // Fit bounds to show the track
      leafletMap.fitBounds(trackPolyline.getBounds(), { padding: [30, 30] });
      updateTrackStats();
      document.getElementById('btn-track-pdf').style.display = 'inline-block';
      document.getElementById('btn-track-clear').style.display = 'inline-block';
      document.getElementById('btn-track-stop').style.display = 'none';
      document.getElementById('track-status').textContent = '📍 Sačuvana staza';
      document.getElementById('track-status').style.color = 'var(--muted)';
      document.getElementById('track-info').style.display = 'block';
    }
  } catch(e) {}
}

function clearTrack() {
  var username = getCurrentUsername();
  if (!username) return;
  if (trackPolyline) { leafletMap.removeLayer(trackPolyline); trackPolyline = null; }
  if (trackMarker) { leafletMap.removeLayer(trackMarker); trackMarker = null; }
  trackPoints = [];
  trackStartTime = null;
  localStorage.removeItem('km_track_' + username);
  document.getElementById('btn-track-pdf').style.display = 'none';
  showToast('🗑️ Putanja obrisana');
}

function exportTrackPDF() {
  if (!trackPoints || trackPoints.length < 2) {
    showToast('❌ Nema dovoljno tačaka za PDF izveštaj');
    return;
  }
  
  var username = getCurrentUsername() || 'Korisnik';
  var now = new Date();
  var dateStr = now.toLocaleDateString('sr-RS');
  var timeStr = now.toLocaleTimeString('sr-RS');
  
  // Racunanje statistike
  var totalDist = 0;
  for (var i = 1; i < trackPoints.length; i++) {
    totalDist += haversine(trackPoints[i-1].lat, trackPoints[i-1].lon, trackPoints[i].lat, trackPoints[i].lon);
  }
  var distStr = totalDist < 1000 ? totalDist.toFixed(0) + ' m' : (totalDist/1000).toFixed(2) + ' km';
  
  var elapsed = trackStartTime ? (Date.now() - trackStartTime) / 1000 : 0;
  var hours = Math.floor(elapsed / 3600);
  var mins = Math.floor((elapsed % 3600) / 60);
  var secs = Math.floor(elapsed % 60);
  var durStr = hours > 0 ? hours + 'h ' + mins + 'min' : mins + 'min ' + secs + 's';
  
  var avgSpeed = elapsed > 0 ? (totalDist / elapsed * 3.6).toFixed(1) : '0.0';
  
  var startPoint = trackPoints[0];
  var endPoint = trackPoints[trackPoints.length - 1];
  
  // Kreiranje PDF-a
  if (!window.jspdf) {
    // jsPDF nije ucitan - ucitaj ga dinamicki pa ponovi
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function() { exportTrackPDF(); };
    s.onerror = function() { showToast('❌ PDF biblioteka nije dostupna (potreban internet)'); };
    document.head.appendChild(s);
    showToast('⏳ Učitavanje PDF biblioteke...');
    return;
  }
  var { jsPDF } = window.jspdf;
  var doc = new jsPDF('portrait', 'mm', 'a4');
  var pageW = 210, pageH = 297, margin = 15;
  
  // Header - zlatna boja
  doc.setFillColor(193, 154, 58);
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KMapp - Izveštaj o kretanju', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Grad Beograd - Komunalna uprava', margin, 22);
  doc.text(dateStr + ' ' + timeStr, pageW - margin - 40, 22);
  
  // Korisnik
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Korisnik: ' + username, margin, 42);
  
  // Info box
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  var boxY = 48;
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(margin, boxY, pageW - 2*margin, 35, 2, 2, 'FD');
  
  // Statistika u 3 kolone
  var colW = (pageW - 2*margin) / 3;
  var col1 = margin + 8;
  var col2 = margin + colW + 8;
  var col3 = margin + 2*colW + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('UDALJENOST', col1, boxY + 8);
  doc.text('VREME TRAJANJA', col2, boxY + 8);
  doc.text('BROJ TAČAKA', col3, boxY + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(193, 154, 58);
  doc.text(distStr, col1, boxY + 18);
  doc.text(durStr, col2, boxY + 18);
  doc.text(String(trackPoints.length), col3, boxY + 18);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Prosečna brzina: ' + avgSpeed + ' km/h', col1, boxY + 28);
  doc.text('Praćenje: GPS (high accuracy)', col2, boxY + 28);
  
  // Start i kraj
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Podaci o stazi:', margin, boxY + 45);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  var startT = trackStartTime ? new Date(trackStartTime).toLocaleString('sr-RS') : '/';
  var endT = endPoint.t ? new Date(endPoint.t).toLocaleString('sr-RS') : '/';
  doc.text('Početak praćenja: ' + startT, margin, boxY + 52);
  doc.text('Kraj praćenja: ' + endT, margin, boxY + 58);
  doc.text('Start: ' + startPoint.lat.toFixed(6) + ', ' + startPoint.lon.toFixed(6), margin, boxY + 64);
  doc.text('Kraj: ' + endPoint.lat.toFixed(6) + ', ' + endPoint.lon.toFixed(6), margin, boxY + 70);
  
  // Crtanje staze na canvas
  var mapY = boxY + 80;
  var mapW = pageW - 2*margin;
  var mapH = 80;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text('Pregled staze:', margin, mapY - 2);
  
  // Pozadina mape
  doc.setFillColor(240, 243, 245);
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(margin, mapY, mapW, mapH, 2, 2, 'FD');
  
  // Crtanje polyline u PDF
  if (trackPoints.length > 1) {
    var minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (var i = 0; i < trackPoints.length; i++) {
      var p = trackPoints[i];
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
    var latRange = maxLat - minLat || 0.001;
    var lonRange = maxLon - minLon || 0.001;
    var padding = 8;
    var drawW = mapW - 2*padding;
    var drawH = mapH - 2*padding;
    var scale = Math.min(drawW / lonRange, drawH / latRange);
    var offsetX = margin + padding + (drawW - lonRange * scale) / 2;
    var offsetY = mapY + padding + (drawH - latRange * scale) / 2;
    
    // Crtanje linije
    doc.setDrawColor(231, 76, 60);
    doc.setLineWidth(0.8);
    for (var i = 1; i < trackPoints.length; i++) {
      var x1 = offsetX + (trackPoints[i-1].lon - minLon) * scale;
      var y1 = offsetY + (maxLat - trackPoints[i-1].lat) * scale;
      var x2 = offsetX + (trackPoints[i].lon - minLon) * scale;
      var y2 = offsetY + (maxLat - trackPoints[i].lat) * scale;
      doc.line(x1, y1, x2, y2);
    }
    
    // Start tačka (zelena)
    var sx = offsetX + (trackPoints[0].lon - minLon) * scale;
    var sy = offsetY + (maxLat - trackPoints[0].lat) * scale;
    doc.setFillColor(39, 174, 96);
    doc.circle(sx, sy, 1.5, 'F');
    
    // End tačka (crvena)
    var ex = offsetX + (endPoint.lon - minLon) * scale;
    var ey = offsetY + (maxLat - endPoint.lat) * scale;
    doc.setFillColor(231, 76, 60);
    doc.circle(ex, ey, 1.5, 'F');
  }
  
  // Legenda
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.setFillColor(39, 174, 96);
  doc.circle(margin + 5, mapY + mapH + 5, 1, 'F');
  doc.text('Start', margin + 9, mapY + mapH + 6);
  doc.setFillColor(231, 76, 60);
  doc.circle(margin + 25, mapY + mapH + 5, 1, 'F');
  doc.text('Kraj', margin + 29, mapY + mapH + 6);
  
  // Koordinate tablica
  var tableY = mapY + mapH + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text('Koordinate tačaka (' + trackPoints.length + '):', margin, tableY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  
  var rowH = 4;
  var maxRows = Math.floor((pageH - tableY - 15) / rowH);
  var cols = 4;
  var perCol = Math.ceil(Math.min(trackPoints.length, maxRows * cols) / cols);
  var colWidth = (pageW - 2*margin) / cols;
  
  for (var i = 0; i < Math.min(trackPoints.length, perCol * cols); i++) {
    var col = Math.floor(i / perCol);
    var row = i % perCol;
    var x = margin + col * colWidth;
    var y = tableY + 6 + row * rowH;
    var p = trackPoints[i];
    var t = p.t ? new Date(p.t).toLocaleTimeString('sr-RS') : '';
    doc.text((i+1) + '. ' + p.lat.toFixed(5) + ', ' + p.lon.toFixed(5) + ' ' + t, x, y);
  }
  
  if (trackPoints.length > perCol * cols) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('... i još ' + (trackPoints.length - perCol*cols) + ' tačaka', margin, tableY + 6 + perCol * rowH + 2);
  }
  
  // Footer
  doc.setDrawColor(193, 154, 58);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 12, pageW - margin, pageH - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('KMapp · Beograd | Generisano: ' + dateStr + ' ' + timeStr + ' | Korisnik: ' + username, margin, pageH - 7);
  
  // Sacuvaj
  var fileName = 'kmapp-staza-' + now.toISOString().slice(0,10) + '-' + now.getHours() + 'h' + now.getMinutes() + 'm.pdf';
  doc.save(fileName);
  showToast('✅ PDF sačuvan: ' + fileName);
}

// ===== PWA: registracija Service Workera =====

// Version check - forces reload if version mismatch
const KM_VERSION = 'v138';
// Uvek proveri verziju - ako se razlikuje, ocisti sve i reloaduj
(function() {
  var stored = localStorage.getItem('km_version');
  if (stored && stored !== KM_VERSION) {
    console.log('Version mismatch: ' + stored + ' -> ' + KM_VERSION + ', FORCED UPDATE');
    localStorage.setItem('km_version', KM_VERSION);
    
    // Sinhrono brisanje cache-a i SW-a, pa tek reload
    var promises = [];
    if ('caches' in window) {
      promises.push(caches.keys().then(function(names) { 
        return Promise.all(names.map(function(n) { return caches.delete(n); })); 
      }));
    }
    if ('serviceWorker' in navigator) {
      promises.push(navigator.serviceWorker.getRegistrations().then(function(regs) { 
        return Promise.all(regs.map(function(r) { return r.unregister(); })); 
      }));
    }
    Promise.all(promises).then(function() {
      console.log('Cache cleared, SW unregistered, reloading...');
      window.location.reload();
    }).catch(function() {
      window.location.reload();
    });
    return;
  }
  localStorage.setItem('km_version', KM_VERSION);
})();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw3.js?v=138').then(reg => {
      reg.update();
      // Reload when new SW takes over (no session guard - always reload)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        location.reload();
      });
    }).catch(err => {
      console.warn('SW registracija neuspešna:', err);
    });
  });
}



// ===== CLOCK & CALENDAR =====
let calCurrentDate = new Date();

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const days = ['Ned','Pon','Uto','Sre','Cet','Pet','Sub'];
  const months = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Avg','Sep','Okt','Nov','Dec'];
  const dayName = days[now.getDay()];
  const dateStr = now.getDate() + '.' + (now.getMonth()+1) + '.';
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');
  if (timeEl) timeEl.textContent = h + ':' + m;
  if (dateEl) dateEl.textContent = dayName + ' ' + dateStr;
}

function renderCalendar() {
  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  const monthsSr = ['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'];
  const daysSr = ['Pon','Uto','Sre','Cet','Pet','Sub','Ned'];
  
  const titleEl = document.getElementById('kalendar-title');
  if (titleEl) titleEl.textContent = monthsSr[month] + ' ' + year;
  
  const content = document.getElementById('kalendar-content');
  if (!content) return;
  
  const today = new Date();
  const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
  
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay();
  if (startDay === 0) startDay = 7; // Sunday = 7 in our layout
  startDay--; // Make Monday = 0
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:16px;">';
  
  // Day headers
  daysSr.forEach(d => {
    html += '<div style="text-align:center;font-size:0.7rem;font-weight:700;color:var(--muted);padding:6px 0;">' + d + '</div>';
  });
  
  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += '<div></div>';
  }
  
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = isCurrentMonth && d === today.getDate();
    const dayDate = new Date(year, month, d);
    const dayOfWeek = dayDate.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const bg = isToday ? 'background:var(--navy);color:white;' : (isWeekend ? 'background:rgba(0,0,0,0.04);' : 'background:white;');
    const weight = isToday ? 'font-weight:700;' : 'font-weight:500;';
    html += '<div style="text-align:center;padding:10px 0;border-radius:8px;font-size:0.85rem;' + bg + weight + 'border:1px solid var(--border);">' + d + '</div>';
  }
  
  html += '</div>';
  
  // Today info card
  const fullDate = today.toLocaleDateString('sr-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = String(today.getHours()).padStart(2,'0') + ':' + String(today.getMinutes()).padStart(2,'0');
  html += '<div style="background:white;border:1.5px solid var(--border);border-radius:12px;padding:14px;margin-top:8px;">';
  html += '<div style="font-size:0.72rem;color:var(--muted);margin-bottom:4px;">Današnji datum</div>';
  html += '<div style="font-size:0.95rem;font-weight:700;color:var(--text);">' + fullDate + '</div>';
  html += '<div style="font-size:0.82rem;color:var(--muted);margin-top:6px;">Trenutno vreme: <span style="font-weight:700;color:var(--navy);font-variant-numeric:tabular-nums;">' + timeStr + '</span></div>';
  html += '</div>';
  
  content.innerHTML = html;
}

function prevMonth() {
  calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
  renderCalendar();
}

function nextMonth() {
  calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
  renderCalendar();
}

// Update clock every second
updateClock();
setInterval(updateClock, 1000);


// ===== PASSWORD CHANGE =====
function showPasswordChange() {
  const username = localStorage.getItem(KM_CURRENT_USER) || '';
  document.getElementById('pwd-username-display').textContent = username;
  document.getElementById('pwd-old').value = '';
  document.getElementById('pwd-new').value = '';
  document.getElementById('pwd-new2').value = '';
  document.getElementById('pwd-error').style.display = 'none';
  document.getElementById('pwd-change-modal').style.display = 'flex';
}

function closePwdModal() {
  document.getElementById('pwd-change-modal').style.display = 'none';
}

function changePassword() {
  const oldPwd = document.getElementById('pwd-old').value;
  const newPwd = document.getElementById('pwd-new').value;
  const newPwd2 = document.getElementById('pwd-new2').value;
  const errEl = document.getElementById('pwd-error');
  const currentUsername = localStorage.getItem(KM_CURRENT_USER);
  if (!currentUsername) { errEl.textContent = 'Greška: niste prijavljeni.'; errEl.style.display = 'block'; return; }
  if (newPwd.length < 4) { errEl.textContent = 'Nova lozinka mora imati min. 4 karaktera.'; errEl.style.display = 'block'; return; }
  if (newPwd !== newPwd2) { errEl.textContent = 'Nove lozinke se ne poklapaju.'; errEl.style.display = 'block'; return; }
  const normPhone = ph => (ph || '').replace(/[^0-9+]/g, '');
  let users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  let userIdx = users.findIndex(x => x.username.toLowerCase() === currentUsername.toLowerCase());
  if (userIdx >= 0) {
    if (users[userIdx].password !== oldPwd && normPhone(users[userIdx].password) !== normPhone(oldPwd)) {
      errEl.textContent = 'Trenutna lozinka nije tačna.'; errEl.style.display = 'block'; return;
    }
    users[userIdx].password = newPwd;
    localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  } else {
    const imenikUsers = getImenikUsers();
    const imUser = imenikUsers.find(x => x.username.toLowerCase() === currentUsername.toLowerCase());
    if (!imUser) { errEl.textContent = 'Korisnik nije pronađen.'; errEl.style.display = 'block'; return; }
    if (imUser.password !== oldPwd && normPhone(imUser.password) !== normPhone(oldPwd)) {
      errEl.textContent = 'Trenutna lozinka nije tačna.'; errEl.style.display = 'block'; return;
    }
    users.push({ username: imUser.username, password: newPwd, displayName: imUser.displayName, role: 'user', source: 'local', created: Date.now() });
    localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  }
  closePwdModal();
  showToast('✅ Lozinka uspešno promenjena!');
}

// ===== ADMIN PANEL =====
const KM_CUSTOM_AKTI_KEY = 'km_custom_akti';
const ADMIN_USERNAMES = ['admin', 'milos.avramov'];

function getCurrentUserRole() {
  const username = (localStorage.getItem(KM_CURRENT_USER) || '').toLowerCase();
  if (!username) return null;
  if (ADMIN_USERNAMES.includes(username)) return 'admin';
  const users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  const user = users.find(x => x.username.toLowerCase() === username);
  return user ? user.role : 'user';
}

function checkAdminAccess() {
  const role = getCurrentUserRole();
  const el = document.getElementById('acc-admin');
  if (el) el.style.display = (role === 'admin') ? 'block' : 'none';
  if (role === 'admin') { renderAdminAktiList(); renderAdminPelceriList(); adminRenderUsersList(); loadTrackedUsers(); }
}

// ===== TRACKED USERS (ADMIN) =====
async function loadTrackedUsers() {
  const el = document.getElementById('tracked-users-list');
  if (!el) return;
  try {
    const res = await fetch(KM_API_BASE + '/manageTrackedUsers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', requestedBy: getCurrentUsername() })
    });
    const data = await res.json();
    if (!data.success || !data.trackedUsers || data.trackedUsers.length === 0) {
      el.innerHTML = '<div style="color:var(--muted);">Nema praćenih korisnika.</div>';
      return;
    }
    el.innerHTML = data.trackedUsers.map(function(u) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
        '<div style="width:28px;height:28px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;">' + u.charAt(0).toUpperCase() + '</div>' +
        '<span style="font-size:0.82rem;font-weight:600;color:var(--text);">' + u + '</span>' +
        '</div>' +
        '<button onclick="removeTrackedUser(\''+ u +'\')" style="background:#e74c3c;color:white;border:none;border-radius:6px;padding:4px 10px;font-size:0.72rem;cursor:pointer;font-weight:600;">Ukloni</button>' +
        '</div>';
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--danger);">Greška pri učitavanju.</div>';
  }
}

async function addTrackedUser() {
  const input = document.getElementById('track-user-input');
  if (!input || !input.value.trim()) return;
  const username = input.value.trim().toLowerCase();
  input.value = '';
  try {
    const res = await fetch(KM_API_BASE + '/manageTrackedUsers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', username: username, requestedBy: getCurrentUsername() })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Korisnik ' + username + ' se sada prati');
      loadTrackedUsers();
    } else {
      showToast('❌ Greška: ' + (data.error || 'Nepoznata'));
    }
  } catch(e) {
    showToast('❌ Greška pri dodavanju');
  }
}

async function removeTrackedUser(username) {
  try {
    const res = await fetch(KM_API_BASE + '/manageTrackedUsers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', username: username, requestedBy: getCurrentUsername() })
    });
    const data = await res.json();
    if (data.success) {
      showToast('✅ Korisnik ' + username + ' uklonjen iz praćenja');
      loadTrackedUsers();
    }
  } catch(e) {
    showToast('❌ Greška pri uklanjanju');
  }
}

// ===== TRACKED USERS ON MAP =====
var trackedUsersActive = false;
var trackedUsersInterval = null;
var trackedUsersMarkers = {};

async function toggleTrackedUsersMap() {
  if (trackedUsersActive) {
    stopTrackedUsersMap();
  } else {
    startTrackedUsersMap();
  }
}

async function startTrackedUsersMap() {
  if (!leafletMap) initLeafletMap();
  trackedUsersActive = true;
  var btn = document.getElementById('btn-track-users');
  if (btn) { btn.style.background = '#27ae60'; btn.style.color = 'white'; btn.style.borderColor = '#27ae60'; }
  showToast('👥 Učitavam lokacije praćenih korisnika...');
  await refreshTrackedUsersMap();
  trackedUsersInterval = setInterval(refreshTrackedUsersMap, 10000);
}

function stopTrackedUsersMap() {
  trackedUsersActive = false;
  if (trackedUsersInterval) { clearInterval(trackedUsersInterval); trackedUsersInterval = null; }
  var btn = document.getElementById('btn-track-users');
  if (btn) { btn.style.background = 'white'; btn.style.color = 'var(--text)'; btn.style.borderColor = 'var(--border)'; }
  // Clear markers
  Object.keys(trackedUsersMarkers).forEach(function(key) {
    if (trackedUsersMarkers[key]) leafletMap.removeLayer(trackedUsersMarkers[key]);
    delete trackedUsersMarkers[key];
  });
  showToast('⏹ Praćenje korisnika zaustavljeno');
}

async function refreshTrackedUsersMap() {
  try {
    const res = await fetch(KM_API_BASE + '/syncGpsTrack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getActive' })
    });
    const data = await res.json();
    if (!data.success || !data.tracks || data.tracks.length === 0) return;
    
    data.tracks.forEach(function(track) {
      if (track.lastLat === null || track.lastLon === null) return;
      var key = track.username;
      var latlng = [track.lastLat, track.lastLon];
      
      if (trackedUsersMarkers[key]) {
        trackedUsersMarkers[key].setLatLng(latlng);
      } else {
        var icon = L.divIcon({
          className: 'tracked-user-marker',
          html: '<div style="background:#2980b9;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);color:white;font-size:14px;font-weight:bold;">' + track.username.charAt(0).toUpperCase() + '</span></div>',
          iconSize: [32, 32],
          iconAnchor: [16, 32]
        });
        trackedUsersMarkers[key] = L.marker(latlng, { icon: icon }).addTo(leafletMap);
        trackedUsersMarkers[key].bindPopup('<b>' + track.username + '</b><br>Poslednja lokacija<br>' + track.pointCount + ' tačaka');
      }
      trackedUsersMarkers[key].setPopupContent('<b>' + track.username + '</b><br>Poslednja lokacija<br>' + track.pointCount + ' tačaka');
    });
    
    // Remove markers for users no longer active
    var activeUsers = data.tracks.map(function(t) { return t.username; });
    Object.keys(trackedUsersMarkers).forEach(function(key) {
      if (!activeUsers.includes(key)) {
        leafletMap.removeLayer(trackedUsersMarkers[key]);
        delete trackedUsersMarkers[key];
      }
    });
  } catch(e) {
    console.error('Tracked users map error:', e);
  }
}

function checkMapAdminAccess() {
  const role = getCurrentUserRole();
  const isAdmin = (role === 'admin');
  const btnTrack = document.getElementById('btn-track');
  const btnClear = document.getElementById('admin-clear-track');
  const btnTrackUsers = document.getElementById('btn-track-users');
  if (btnTrack) btnTrack.style.display = isAdmin ? '' : 'none';
  if (btnClear) btnClear.style.display = isAdmin ? 'flex' : 'none';
  if (btnTrackUsers) btnTrackUsers.style.display = isAdmin ? '' : 'none';
}

function getCustomAkti() { return JSON.parse(localStorage.getItem(KM_CUSTOM_AKTI_KEY) || '[]'); }
function saveCustomAkti(a) { localStorage.setItem(KM_CUSTOM_AKTI_KEY, JSON.stringify(a)); }

function getNextAktId() {
  let maxId = 0;
  aktiData.forEach(a => { if (a.id > maxId) maxId = a.id; });
  getCustomAkti().forEach(a => { if (a.id > maxId) maxId = a.id; });
  return maxId + 1;
}

function loadCustomAkti() {
  getCustomAkti().forEach(a => { if (!aktiData.find(x => x.id === a.id)) aktiData.push(a); });
}

function adminSaveAkt() {
  const tip = document.getElementById('admin-akt-tip').value;
  const naziv = document.getElementById('admin-akt-naziv').value.trim();
  const broj = document.getElementById('admin-akt-broj').value.trim();
  const sadrzaj = document.getElementById('admin-akt-sadrzaj').value.trim();
  const errEl = document.getElementById('admin-akt-error');
  if (!naziv) { errEl.textContent = 'Unesite naziv akta.'; errEl.style.display = 'block'; return; }
  if (!sadrzaj) { errEl.textContent = 'Unesite sadržaj akta.'; errEl.style.display = 'block'; return; }
  const custom = getCustomAkti();
  const id = getNextAktId();
  custom.push({ id, tip, naziv, broj, sadrzaj });
  saveCustomAkti(custom);
  aktiData.push({ id, tip, naziv, broj, sadrzaj });
  document.getElementById('admin-akt-naziv').value = '';
  document.getElementById('admin-akt-broj').value = '';
  document.getElementById('admin-akt-sadrzaj').value = '';
  errEl.style.display = 'none';
  renderAdminAktiList();
  showToast('✅ Akt sačuvan: ' + naziv);
}

function renderAdminAktiList() {
  const el = document.getElementById('admin-akti-list');
  const custom = getCustomAkti();
  if (!custom.length) { el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:20px;">Nema dodanih akata.</div>'; return; }
  const tipLabel = { zakon: 'Zakon', odluka: 'Odluka' };
  const tipColor = { zakon: '#1a4a8a', odluka: '#8e44ad' };
  el.innerHTML = custom.map(a => '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:white;">' +
    '<span style="background:' + tipColor[a.tip] + ';color:white;font-size:0.62rem;font-weight:800;padding:2px 7px;border-radius:5px;">' + tipLabel[a.tip] + '</span>' +
    '<div style="flex:1;"><div style="font-size:0.8rem;font-weight:600;color:var(--navy);">' + a.naziv + '</div><div style="font-size:0.7rem;color:var(--muted);">' + (a.broj||'') + '</div></div>' +
    '<button onclick="adminDeleteAkt(' + a.id + ')" style="background:var(--danger);color:white;border:none;border-radius:6px;padding:5px 8px;font-size:0.72rem;cursor:pointer;font-weight:600;">Obriši</button></div>'
  ).join('');
}

function adminDeleteAkt(id) {
  if (!confirm('Obrisati ovaj akt?')) return;
  let custom = getCustomAkti().filter(a => a.id !== id);
  saveCustomAkti(custom);
  const idx = aktiData.findIndex(a => a.id === id);
  if (idx >= 0) aktiData.splice(idx, 1);
  renderAdminAktiList();
  showToast('🗑️ Akt obrisan.');
}

// ===== ADMIN PELCERI =====
const KM_CUSTOM_PELCERI_KEY = 'km_custom_pelceri';

function getCustomPelceri() { return JSON.parse(localStorage.getItem(KM_CUSTOM_PELCERI_KEY) || '[]'); }
function saveCustomPelceri(p) { localStorage.setItem(KM_CUSTOM_PELCERI_KEY, JSON.stringify(p)); }

function getNextPelcerId() {
  let maxId = 0;
  pelceriData.forEach(p => { if (p.id > maxId) maxId = p.id; });
  getCustomPelceri().forEach(p => { if (p.id > maxId) maxId = p.id; });
  return maxId + 1;
}

function loadCustomPelceri() {
  getCustomPelceri().forEach(p => { if (!pelceriData.find(x => x.id === p.id)) pelceriData.push(p); });
}

function adminSavePelcer() {
  const kategorija = document.getElementById('admin-pelcer-kategorija').value.trim();
  const naziv = document.getElementById('admin-pelcer-naziv').value.trim();
  const tekst = document.getElementById('admin-pelcer-tekst').value.trim();
  const errEl = document.getElementById('admin-pelcer-error');
  if (!kategorija) { errEl.textContent = 'Unesite kategoriju.'; errEl.style.display = 'block'; return; }
  if (!naziv) { errEl.textContent = 'Unesite naziv pelcera.'; errEl.style.display = 'block'; return; }
  if (!tekst) { errEl.textContent = 'Unesite tekst pelcera.'; errEl.style.display = 'block'; return; }
  const custom = getCustomPelceri();
  const id = getNextPelcerId();
  custom.push({ id, kategorija, naziv, tekst });
  saveCustomPelceri(custom);
  pelceriData.push({ id, kategorija, naziv, tekst });
  document.getElementById('admin-pelcer-kategorija').value = '';
  document.getElementById('admin-pelcer-naziv').value = '';
  document.getElementById('admin-pelcer-tekst').value = '';
  errEl.style.display = 'none';
  renderAdminPelceriList();
  showToast('✅ Pelcer sačuvan: ' + naziv);
}

function renderAdminPelceriList() {
  const el = document.getElementById('admin-pelceri-list');
  if (!el) return;
  const custom = getCustomPelceri();
  if (!custom.length) { el.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:0.82rem;padding:20px;">Nema dodanih pelcera.</div>'; return; }
  el.innerHTML = custom.map(p => 
    '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--border);border-radius:8px;background:var(--white);">' +
    '<span style="background:#1a4a8a;color:white;font-size:0.62rem;font-weight:800;padding:2px 7px;border-radius:5px;">' + p.kategorija.substring(0,15) + '</span>' +
    '<div style="flex:1;min-width:0;"><div style="font-size:0.8rem;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + p.naziv + '</div></div>' +
    '<button onclick="adminDeletePelcer(' + p.id + ')" style="background:var(--danger);color:white;border:none;border-radius:6px;padding:5px 8px;font-size:0.72rem;cursor:pointer;font-weight:600;flex-shrink:0;">Obriši</button></div>'
  ).join('');
}

function adminDeletePelcer(id) {
  if (!confirm('Obrisati ovaj pelcer?')) return;
  let custom = getCustomPelceri().filter(p => p.id !== id);
  saveCustomPelceri(custom);
  const idx = pelceriData.findIndex(p => p.id === id);
  if (idx >= 0) pelceriData.splice(idx, 1);
  renderAdminPelceriList();
  showToast('🗑️ Pelcer obrisan.');
}

// ===== ADMIN: USER MANAGEMENT =====
function adminCreateUser() {
  const u = (document.getElementById('admin-user-username').value || '').trim();
  const p = (document.getElementById('admin-user-password').value || '').trim();
  const errEl = document.getElementById('admin-user-error');

  if (u.length < 3) { errEl.textContent = 'Korisničko ime mora imati min. 3 karaktera!'; errEl.style.display = 'block'; return; }
  if (p.length < 4) { errEl.textContent = 'Lozinka mora imati min. 4 karaktera!'; errEl.style.display = 'block'; return; }

  const users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  if (users.find(x => x.username.toLowerCase() === u.toLowerCase())) {
    errEl.textContent = 'Korisnik već postoji!'; errEl.style.display = 'block'; return;
  }

  users.push({ username: u, password: p, role: 'user', created: Date.now() });
  localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  errEl.style.display = 'none';
  document.getElementById('admin-user-username').value = '';
  document.getElementById('admin-user-password').value = '';
  showToast('✅ Korisnik kreiran: ' + u);
  adminRenderUsersList();
}

function adminDeleteUser(username) {
  if (!confirm('Obrisati korisnika ' + username + '?')) return;
  let users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  users = users.filter(x => x.username !== username);
  localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  showToast('🗑️ Korisnik obrisan: ' + username);
  adminRenderUsersList();
}

function adminRenderUsersList() {
  const el = document.getElementById('admin-users-list');
  if (!el) return;
  const users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  const customUsers = users.filter(u => u.username !== 'admin' && u.username !== 'test01');
  if (!customUsers.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div style="font-size:0.75rem;font-weight:700;color:var(--muted);margin-bottom:6px;margin-top:10px;">Kreirani korisnici:</div>' +
    customUsers.map(u =>
      '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;">' +
      '<div style="flex:1;font-size:0.8rem;font-weight:500;color:var(--text);">' + u.username + '</div>' +
      '<button onclick="adminDeleteUser(\'' + u.username + '\')" style="background:var(--danger);color:white;border:none;border-radius:6px;padding:4px 8px;font-size:0.72rem;cursor:pointer;font-weight:600;">Obriši</button></div>'
    ).join('');
}

async function adminLoadLoginLogs(filter) {
  const el = document.getElementById('admin-login-logs');
  if (!el) return;
  const f = filter || 'today';
  el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Ucitavanje...</div>';
  try {
    const res = await fetch(KM_API_BASE + '/getLoginLogs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: f })
    });
    const data = await res.json();
    
    if (!data.success) {
      el.innerHTML = '<div style="text-align:center;color:var(--danger);padding:16px;">Greska: ' + (data.error || 'Nepoznata') + '</div>';
      return;
    }
    
    const logs = data.logs || [];
    
    if (!logs.length) {
      el.innerHTML = '<div style="text-align:center;color:var(--muted);padding:20px;">Nema prijava.</div>';
      return;
    }
    
    let titleText;
    if (f === 'today') titleText = 'Danas';
    else if (f === 'all') titleText = 'Istorija (svi korisnici)';
    else titleText = f;
    
    el.innerHTML = '<div style="font-size:0.72rem;font-weight:700;color:var(--muted);margin-bottom:8px;">' + titleText + ' \u2014 ' + logs.length + ' korisnik(a)</div>' +
      logs.map(function(entry) {
        var username = entry[0];
        var info = entry[1];
        var d = new Date(info.lastLogin);
        var dateStr = d.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">' +
          '<div style="width:36px;height:36px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">' + username.charAt(0).toUpperCase() + '</div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.82rem;font-weight:600;color:var(--text);">' + username + '</div>' +
          '<div style="font-size:0.7rem;color:var(--muted);">Zadnja prijava: ' + dateStr + ' \u00b7 ' + info.count + 'x</div>' +
          '</div></div>';
      }).join('');
  } catch (e) {
    el.innerHTML = '<div style="color:var(--danger);text-align:center;padding:16px;">Greska pri ucitavanju.</div>';
  }
}

// ===== IN-APP MESSAGE NOTIFICATION TOAST =====
function playMsgSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  } catch(e) { console.log('Audio error:', e); }
}

function showMsgToast(count) {
  let t = document.getElementById('msg-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'msg-toast';
    t.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:var(--navy);color:white;padding:10px 18px;border-radius:20px;font-size:0.85rem;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);z-index:150;display:none;transition:opacity 0.3s;cursor:pointer;';
    document.body.appendChild(t);
  }
  t.textContent = '📬 ' + count + ' nepročitana' + (count > 1 ? ' poruke' : ' poruka');
  t.onclick = function() { t.style.display = 'none'; switchTab('poruke'); };
  t.style.display = 'block';
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.opacity = '0'; setTimeout(function(){ t.style.display = 'none'; }, 300); }, 5000);
}

// Load custom akti on startup
loadCustomAkti();
loadCustomPelceri();
checkAdminAccess();



// ===== ACCORDION TOGGLE =====
function toggleAcc(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('open');
}

// ===== GLOBAL SEARCH =====
function openGlobalSearch() {
  var overlay = document.getElementById('gs-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setTimeout(function() {
    var input = document.getElementById('gs-input');
    if (input) { input.focus(); input.value = ''; gsSearch(''); }
  }, 100);
}

function closeGlobalSearch() {
  var overlay = document.getElementById('gs-overlay');
  if (overlay) overlay.classList.remove('open');
}

function gsSearch(query) {
  var resultsEl = document.getElementById('gs-results');
  if (!resultsEl) return;
  query = (query || '').trim().toLowerCase();
  if (!query || query.length < 2) {
    resultsEl.innerHTML = '<div class="gs-empty">Unesite najmanje 2 karaktera...</div>';
    return;
  }
  var results = [];

  // 1. Search documents (localStorage)
  try {
    var docs = JSON.parse(localStorage.getItem('bk_docs') || '[]');
    docs.forEach(function(d) {
      var text = (d.title || '') + ' ' + (d.type || '') + ' ' + (d.content || '');
      if (text.toLowerCase().indexOf(query) !== -1) {
        results.push({
          icon: '📄',
          title: d.title || d.type || 'Dokument',
          desc: d.type || 'Lokalni dokument',
          badge: 'Dokument',
          action: "switchTab('docs')"
        });
      }
    });
  } catch(e) {}

  // 2. Search imenik contacts
  try {
    imenikData.forEach(function(c) {
      var name = (c.name || '').toLowerCase();
      var phones = (c.phones || []).join(' ');
      var email = (c.email || '').toLowerCase();
      if (name.indexOf(query) !== -1 || phones.toLowerCase().indexOf(query) !== -1 || email.indexOf(query) !== -1) {
        results.push({
          icon: c.photo ? '👤' : '👤',
          title: c.name || 'Kontakt',
          desc: (c.phones || [])[0] || c.email || '',
          badge: 'Kontakt',
          action: "switchTab('imenik')"
        });
      }
    });
  } catch(e) {}

  // 3. Search legal acts (aktiData)
  try {
    aktiData.forEach(function(a) {
      var naziv = (a.naziv || '').toLowerCase();
      var sadrzaj = (a.sadrzaj || '').toLowerCase();
      var broj = (a.broj || '').toLowerCase();
      if (naziv.indexOf(query) !== -1 || broj.indexOf(query) !== -1 || sadrzaj.indexOf(query) !== -1) {
        // Find a relevant snippet
        var snippet = '';
        if (sadrzaj.indexOf(query) !== -1) {
          var idx = sadrzaj.indexOf(query);
          snippet = '...' + (a.sadrzaj || '').substr(Math.max(0, idx - 30), 60) + '...';
        } else {
          snippet = (a.broj || a.tip || '');
        }
        results.push({
          icon: '⚖️',
          title: a.naziv || 'Akt',
          desc: snippet,
          badge: a.tip || 'Akt',
          action: "switchTab('akti')"
        });
      }
    });
  } catch(e) {}

  // 4. Search pelceri
  try {
    var savedPelceri = JSON.parse(localStorage.getItem('km_pelceri') || '[]');
    var allPelceri = (pelceriData || []).concat(savedPelceri);
    allPelceri.forEach(function(p) {
      var text = ((p.kategorija || '') + ' ' + (p.naziv || '') + ' ' + (p.tekst || '')).toLowerCase();
      if (text.indexOf(query) !== -1) {
        results.push({
          icon: '📋',
          title: p.naziv || p.kategorija || 'Pelcer',
          desc: p.kategoria || 'Pelcer',
          badge: 'Pelcer',
          action: "switchTab('pelceri')"
        });
      }
    });
  } catch(e) {}

  // Limit to 30 results
  results = results.slice(0, 30);

  if (results.length === 0) {
    resultsEl.innerHTML = '<div class="gs-empty">Nema rezultata za "' + query + '"</div>';
    return;
  }

  resultsEl.innerHTML = results.map(function(r) {
    return '<div class="gs-result" onclick="' + r.action + '; closeGlobalSearch();">' +
      '<span class="gs-icon">' + r.icon + '</span>' +
      '<div class="gs-info"><div class="gs-title">' + r.title + '</div>' +
      '<div class="gs-desc">' + (r.desc || '') + '</div></div>' +
      '<span class="gs-badge">' + r.badge + '</span></div>';
  }).join('');
}

// ===== AI ASISTENT =====
let aiMessages = [];

function aiPreselect(q) {
  // Pametna preselecija akata na klijentskoj strani pre slanja na server
  // MAX: 6 akata x 3000 chars = ~20KB total (ispod Base44 backend limit)
  var qLow = q.toLowerCase();
  var qWords = qLow.split(/\s+/).filter(function(w){ return w.length > 2; });

  // Prosireni stemming srpskih reci
  var stems = [];
  qWords.forEach(function(w){
    stems.push(w);
    var stem = w;
    if (stem.length > 4) {
      ['nja','nje','nog','nom','ima','nih','anju','anje','anja','nju','nji','ama','ova','ovi','iku','ika','ici','ara','enje','enja','avan','ivan','osti','ost','cu','ci','ka','ke','ko','ku','og','om','im','ima','oga','ome','e','a','u','i','o'].forEach(function(suf){
        if (stem.endsWith(suf) && stem.length - suf.length >= 3) stems.push(stem.slice(0,-suf.length));
      });
    }
  });
  // Dodaj sinonime za ceste pojmove
  var sinonimi = {
    'parkiranj': ['parkirali', 'parkiralist', 'parking', 'parkir', 'parkiran'],
    'parkirali': ['parkiranj', 'parkirali', 'parking', 'parkir'],
    'buka': ['buke', 'buku', 'bukom', 'buci', 'buc', 'zvuk', 'decibel', 'glasn', 'zvucn'],
    'otpad': ['deponij', 'otpada', 'odlaganj', 'otpada', 'smece', 'smeceg'],
    'izliva': ['izliva', 'proliva', 'prosipa', 'prosipanj', 'izlivanj', 'prolivanj'],
    'nepropisn': ['suprotno', 'zabranjen', 'nedozvoljen', 'protivno', 'nepraviln'],
    'komunaln': ['komunaln', 'komunal', 'komunalna', 'komunalne'],
    'saobrac': ['saobracajn', 'saobr', 'promet', 'saobracaj', 'vozilo', 'vozila'],
    'zelenil': ['zelen', 'drvo', 'biljka', 'park', 'zelenila', 'zelenilo', 'drvece'],
    'gradnj': ['gradnj', 'izgradnj', 'gradjevin', 'objekat', 'izgradnj', 'gradnje'],
    'reklam': ['reklamn', 'oglas', 'plakat', 'natpis', 'reklame', 'oglasa', 'plakata'],
    'zivotinj': ['pas', 'kuca', 'ljubimac', 'zivotinj', 'psi', 'psa', 'life'],
    'cistoc': ['cistoc', 'ciscenj', 'cistoca', 'nečistoc', 'otpada', 'odrzavanj'],
    'sneg': ['snežn', 'snež', 'zimsk', 'odrzavanj', 'snežnog', 'led'],
    'voda': ['vodovod', 'vodn', 'kanalizac', 'vode', 'vodu', 'vodom', 'vodov'],
    'rasvet': ['rasvet', 'svetlo', 'osvetljenj', 'rasvete', 'rasvetu', 'svetla'],
    'spomenik': ['spomenic', 'spomen', 'kulturo', 'spomenika', 'spomenici'],
    'decibel': ['decibela', 'decibelu', 'db', 'buke', 'zvuka'],
    'zabranj': ['zabranjeno', 'zabranjena', 'zabranjene', 'zabranjen', 'zabrana'],
    'kazn': ['kazna', 'kazne', 'kaznu', 'kaznom', 'kazniće', 'kaznena', 'kaznene', 'novčana', 'novčanu'],
    'materijaln': ['materijalna', 'materijalne', 'materijalnu', 'materijalnom'],
    'vozilo': ['vozila', 'vozilom', 'automobil', 'automobila', 'auto'],
    'stan': ['stanovanj', 'stanu', 'stamben', 'stana', 'stambene'],
    'ugovor': ['ugovora', 'ugovoru', 'ugovorom', 'ugovorn'],
    'dokument': ['dokumenta', 'dokumente', 'dokumentu', 'dokumenata'],
    'rok': 'roka roku rokom'.split(' '),
    'prijava': ['prijave', 'prijavu', 'prijavom', 'prijava', 'prijavljenj'],
    'dozvola': ['dozvole', 'dozvolu', 'dozvolom', 'dozvol'],
    'placanje': ['placanj', 'uplat', 'naplat', 'placa', 'uplata', 'naplata'],
    'porez': ['poreza', 'porezu', 'porezom', 'porezn', 'taksa', 'takse'],
    'komunaln': ['komunalna', 'komunalne', 'komunalnu', 'komunalnom', 'komunalne'],
    'javno': ['javna', 'javne', 'javnu', 'javnom', 'javna', 'javne']
  };
  qWords.forEach(function(w){
    var sinKey = Object.keys(sinonimi).find(function(k){ return w.indexOf(k) !== -1 || k.indexOf(w) !== -1; });
    if (sinKey) sinonimi[sinKey].forEach(function(s){ stems.push(s); });
  });

  // UVEK traziti kaznene odredbe
  var wantsPenalty = true;
  var clanMatch = q.match(/(?:član|clan|Član|čl\.|cl\.)\s*(\d+[a-z]?)/i);
  var trazeniClan = clanMatch ? clanMatch[1] : null;

  // Detekcija naziva akta u pitanju
  var trazeniAktNaziv = null;
  aktiData.forEach(function(a){
    var nazWords = a.naziv.toLowerCase().replace(/^(odluka o |zakon o |pravilnik o )/,'').split(/\s+/).filter(function(w){ return w.length > 3; });
    var hits = 0;
    nazWords.forEach(function(nw){ if (qLow.indexOf(nw) !== -1) hits++; });
    if (hits > 0 && hits >= Math.ceil(nazWords.length / 2)) trazeniAktNaziv = a.naziv;
  });

  // Scoring akata
  var scored = aktiData.map(function(a){
    var fullText = (a.naziv + ' ' + (a.sadrzaj||'')).toLowerCase();
    var score = 0;
    if (a.tip === 'odluka' || a.naziv.toLowerCase().indexOf('odluka') !== -1) score += 10;
    if (trazeniAktNaziv && a.naziv === trazeniAktNaziv) score += 1000;
    stems.forEach(function(s){ if (s.length > 2 && fullText.indexOf(s) !== -1) score += 2; });
    // UVEK bonus za kaznene/materijalne odredbe
    if (fullText.indexOf('kaznena')!==-1) score += 8;
    if (fullText.indexOf('materijalna')!==-1) score += 8;
    if (fullText.indexOf('kazniće')!==-1) score += 5;
    if (fullText.indexOf('novčana kazna')!==-1) score += 5;
    return { a: a, score: score };
  });

  scored.sort(function(x,y){ return y.score - x.score; });

  // MAX 6 akata (4 odluke + 2 zakona)
  var selected = [];
  var odlukeCount = 0, zakonCount = 0;
  for (var i = 0; i < scored.length && selected.length < 6; i++) {
    if (scored[i].score <= 0) continue;
    var isOdluka = (scored[i].a.tip === 'odluka' || scored[i].a.naziv.toLowerCase().indexOf('odluka') !== -1);
    if (isOdluka && odlukeCount < 4) { selected.push(scored[i].a); odlukeCount++; }
    else if (!isOdluka && zakonCount < 2) { selected.push(scored[i].a); zakonCount++; }
  }

  // Ako je specificiran akt, stavi ga prvog
  if (trazeniAktNaziv && selected.length > 0) {
    selected = selected.filter(function(a){ return a.naziv !== trazeniAktNaziv; });
    var foundAkt = aktiData.find(function(a){ return a.naziv === trazeniAktNaziv; });
    if (foundAkt) selected.unshift(foundAkt);
  }

  // Trim sadrzaj: MAX 3000 chars po aktu, clanovi do 1200 chars
  var MAX_PER_AKT = 3000;
  var MAX_CLAN_LEN = 1200;
  return selected.map(function(a){
    var sadrzaj = a.sadrzaj || '';
    var isTargeted = (trazeniAktNaziv && a.naziv === trazeniAktNaziv);

    var parts = sadrzaj.split(/(?=Član \d)/);
    var relevant = [];
    var penaltyParts = [];

    // UVEK izdvoji kaznene i materijalne odredbe
    parts.forEach(function(p){
      var pl = p.toLowerCase();
      if (pl.indexOf('kaznena')!==-1 || pl.indexOf('kazniće')!==-1 || pl.indexOf('novčana kazna')!==-1 || pl.indexOf('materijalna')!==-1) {
        penaltyParts.push(p);
      }
    });

    if (trazeniClan && isTargeted) {
      // Trazeni clan + kaznene/materijalne odredbe - PUN tekst clana
      var clanPat = 'Član ' + trazeniClan;
      parts.forEach(function(p){
        if (p.toLowerCase().indexOf(clanPat.toLowerCase()) === 0) relevant.push(p.slice(0, MAX_CLAN_LEN));
      });
      // Dodaj sve kaznene/materijalne
      penaltyParts.forEach(function(pp){
        var already = relevant.some(function(r){ return r.slice(0,30) === pp.slice(0,30); });
        if (!already) relevant.push(pp.slice(0, MAX_CLAN_LEN));
      });
    } else {
      // Opsta pretraga: relevantni clanovi po stemovima i sinonimima
      parts.forEach(function(p){
        if (p.length < 5) return;
        if (relevant.join('').length > MAX_PER_AKT) return;
        var pl = p.toLowerCase();
        var hit = false;
        stems.forEach(function(s){ if (s.length > 2 && pl.indexOf(s)!==-1) hit = true; });
        if (hit) relevant.push(p.slice(0, MAX_CLAN_LEN));
      });
      // UVEK dodaj kaznene i materijalne odredbe ako ih vec nema
      penaltyParts.forEach(function(pp){
        var already = relevant.some(function(r){ return r.slice(0,30) === pp.slice(0,30); });
        if (!already && relevant.join('').length < MAX_PER_AKT) relevant.push(pp.slice(0, MAX_CLAN_LEN));
      });
    }

    var trimmed = relevant.length > 0 ? relevant.slice(0, 10).join('\n\n').slice(0, MAX_PER_AKT) : sadrzaj.slice(0, MAX_PER_AKT);
    return { naziv: a.naziv, broj: a.broj, tip: a.tip, sadrzaj: trimmed };
  });
}

function aiSend() {
  const input = document.getElementById('ai-input');
  const q = input.value.trim();
  if (!q) return;
  
  // Add user message
  aiAddMessage(q, 'user');
  input.value = '';
  
  // Add loading indicator
  const loadingId = aiAddMessage('Pretražujem propise...', 'ai-loading');
  
  // Pametna preselecija na klijentskoj strani — smanjuje payload sa 1.5MB na <100KB
  const aktiForSearch = aiPreselect(q);
  
  fetch(KM_API_BASE + '/aiAssistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pitanje: q, akti: aktiForSearch })
  })
  .then(r => r.json())
  .then(data => {
    // Remove loading
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    
    if (data.error) {
      aiAddMessage(data.error, 'ai');
    } else {
      aiAddMessage(data.odgovor, 'ai');
    }
  })
  .catch(err => {
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    aiAddMessage('Greška pri pretrazi. Pokušajte ponovo.', 'ai');
  });
}

function aiAddMessage(text, sender) {
  const area = document.getElementById('ai-chat-area');
  const div = document.createElement('div');
  const id = 'ai-msg-' + Date.now() + '-' + Math.random().toString(36).substr(2,5);
  div.id = id;
  
  if (sender === 'user') {
    div.style.cssText = 'align-self:flex-end;max-width:85%;background:linear-gradient(135deg,var(--navy),var(--blue));color:white;border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:0.88rem;line-height:1.4;';
    div.textContent = text;
  } else if (sender === 'ai-loading') {
    div.style.cssText = 'align-self:flex-start;max-width:85%;background:var(--card);border:1px solid var(--border);border-radius:14px 14px 14px 4px;padding:10px 14px;font-size:0.88rem;color:var(--muted);';
    div.innerHTML = '<span style="animation:blink 1s infinite;">⏳ ' + text + '</span>';
  } else {
    // AI response with markdown support
    div.style.cssText = 'align-self:flex-start;max-width:90%;background:var(--card);border:1px solid var(--border);border-radius:14px 14px 14px 4px;padding:12px 14px;font-size:0.85rem;line-height:1.6;color:var(--text);';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--navy);">$1</b>')
      .replace(/^### (.+)$/gm, '<b style="color:var(--navy);font-size:0.9rem;">$1</b><br>')
      .replace(/^## (.+)$/gm, '<b style="color:var(--navy);font-size:0.95rem;">$1</b><br>')
      .replace(/^# (.+)$/gm, '<b style="color:var(--navy);font-size:1rem;">$1</b><br>')
      .replace(/^\* (.+)$/gm, '• $1')
      .replace(/^- (.+)$/gm, '• $1')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    div.innerHTML = formatted;
  }
  
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return id;
}

// Add blink animation
if (!document.getElementById('ai-blink-style')) {
  const style = document.createElement('style');
  style.id = 'ai-blink-style';
  style.textContent = '@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}';
  document.head.appendChild(style);
}

// ===== Download shared document =====
async function handleSharedDocDownload() {
  const params = new URLSearchParams(window.location.search);
  const dlKey = params.get('dl');
  if (!dlKey) return;
  
  // Force white background regardless of dark mode
  document.documentElement.style.background = '#ffffff';
  document.body.style.cssText = 'margin:0;padding:0;background:#ffffff;font-family:system-ui,sans-serif;color:#333;';
  document.title = 'Preuzimanje dokumenta...';
  document.body.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#ffffff;color:#333;padding:20px;text-align:center;"><div style="font-size:3rem;margin-bottom:20px;">\ud83d\udcc4</div><h2 style="margin:0 0 10px;color:#333;">Preuzimanje Word dokumenta...</h2><p style="color:#666;margin:0 0 20px;">Molimo sa\u010dekajte.</p><div id="dl-status" style="padding:15px 20px;border-radius:8px;background:#f0f0f0;color:#333;font-size:1rem;">U toku...</div></div>';
  
  // Remove dark mode class if present
  document.documentElement.classList.remove('dark');
  document.body.classList.remove('dark');
  
  try {
    const res = await fetch('https://solas-799a3993.base44.app/functions/getSharedDoc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadKey: dlKey })
    });
    const data = await res.json();
    
    if (!data.success) {
      document.getElementById('dl-status').innerHTML = '\u274c Dokument nije prona\u0111en ili je istekao.';
      return;
    }
    
    // Reconstruct blob from base64
    const byteChars = atob(data.fileContent);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/msword' });
    
    // Unique filename with timestamp
    const now = new Date();
    const ts = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
    const safeName = (data.title || 'dokument').replace(/[^a-zA-Z0-9_\-\u010c\u0107\u0160\u0161\u0110\u0111\u017d\u017e ]/g, '').trim();
    const fileName = safeName + '_' + ts + '.doc';
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    
    document.getElementById('dl-status').innerHTML = 'Dokument <b>' + data.title + '</b> je preuzet! Proverite Downloads folder.';
  } catch (e) {
    console.error('Download error:', e);
    document.getElementById('dl-status').innerHTML = 'Gre\u0161ka pri preuzimanju.';
  }
}

// Auto-run on page load
if (new URLSearchParams(window.location.search).get('dl')) {
  handleSharedDocDownload();
}
