

let filteredAkti = [...aktiData];

// ===== INDEKS ČLANOVA (za pretragu po prekršaju/temi kroz sve zakone i odluke) =====
function buildArticleIndex() {
  const idx = [];
  aktiData.forEach(akt => {
    const lines = akt.sadrzaj.split('\n');
    let current = null;
    lines.forEach(line => {
      const clean = line.trim().replace(/\*\*/g, '');
      if (/^Član\s+\d+[a-zšđčćž]?\.?$/i.test(clean)) {
        if (current) idx.push(current);
        current = { aktId: akt.id, aktNaziv: akt.naziv, tip: akt.tip, broj: akt.broj, clan: clean, parts: [] };
      } else if (current && clean) {
        current.parts.push(clean);
      }
    });
    if (current) idx.push(current);
  });
  idx.forEach(a => {
    a.text = a.parts.join(' ');
    a.searchText = (a.aktNaziv + ' ' + a.clan + ' ' + a.text).toLowerCase();
  });
  return idx;
}
const articleIndex = buildArticleIndex();

// Jednostavno "stemovanje" da bi pretraga hvatala i padežne oblike
// (npr. "parkiranje" pronađe i "parkiranja", "parkiranju", "parkiranom"...)
function stemAkt(w) {
  if (w.length <= 5) return w;
  return w.slice(0, Math.max(5, w.length - 3));
}

function searchArticles(query, scope) {
  const qLower = query.toLowerCase().trim();
  const words = qLower.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const stems = words.map(stemAkt);
  const scored = [];
  articleIndex.forEach(a => {
    if (scope && scope !== 'sve' && a.tip !== scope) return;
    let score = 0;
    let hitWords = 0;
    stems.forEach(s => { if (a.searchText.includes(s)) { score++; hitWords++; } });
    if (hitWords === 0) return;
    // bonus: sve reči iz upita su pronađene (relevantniji rezultat)
    if (hitWords === stems.length) score += 2;
    // bonus: cela fraza se pojavljuje kao celina
    if (qLower.length > 2 && a.searchText.includes(qLower)) score += 4;
    // bonus: pogodak u samom nazivu akta (npr. korisnik traži naziv zakona/odluke)
    const nazivLower = a.aktNaziv.toLowerCase();
    stems.forEach(s => { if (nazivLower.includes(s)) score += 3; });
    if (qLower.length > 2 && nazivLower.includes(qLower)) score += 5;
    scored.push({ a, score });
  });
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, 100).map(s => s.a);
}

function escapeHtmlAkt(s) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function highlightSnippet(text, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const stems = words.map(stemAkt);
  const lower = text.toLowerCase();
  let idx = -1;
  stems.forEach(s => {
    const i = lower.indexOf(s);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  });
  if (idx === -1) idx = 0;
  const start = Math.max(0, idx - 50);
  const end = Math.min(text.length, idx + 170);
  let snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  snippet = escapeHtmlAkt(snippet);
  stems.forEach(s => {
    if (!s) return;
    const re = new RegExp('(' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*)', 'gi');
    snippet = snippet.replace(re, '<b style="background:#fde9b8;">$1</b>');
  });
  return snippet;
}

function renderAktiSearchResults(results, query) {
  const el = document.getElementById('akti-list');
  if (!results.length) {
    el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.88rem;">Nema rezultata za „${escapeHtmlAkt(query)}".<br>Pokušajte drugu ključnu reč (npr. naziv prekršaja ili radnje).</div>`;
    return;
  }
  const tipLabel = { zakon: 'Zakon', odluka: 'Odluka' };
  const tipColor = { zakon: '#1a4a8a', odluka: '#8e44ad' };
  el.innerHTML =
    `<div style="font-size:0.7rem;color:var(--muted);padding:2px 2px 8px;">Pronađeno ${results.length} člana/odredbe u zakonima i odlukama</div>` +
    results.map(r => `
      <div onclick="openAkt(${r.aktId}, decodeURIComponent('${encodeURIComponent(r.clan)}'))" style="background:white;border:1px solid var(--border);border-radius:8px;padding:11px 14px;margin-bottom:6px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="background:${tipColor[r.tip]};color:white;font-size:0.62rem;font-weight:800;padding:2px 7px;border-radius:5px;letter-spacing:0.5px;text-transform:uppercase;">${tipLabel[r.tip]}</span>
          <span style="font-size:0.72rem;color:var(--navy);font-weight:700;">${r.clan}</span>
        </div>
        <div style="font-size:0.78rem;color:#0d2240;font-weight:600;margin-bottom:3px;">${r.aktNaziv}</div>
        <div style="font-size:0.78rem;color:#2a3a4a;line-height:1.5;">${highlightSnippet(r.text, query)}</div>
      </div>
    `).join('');
}

function renderAkti(data) {
  const el = document.getElementById('akti-list');
  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:0.88rem;">Nema rezultata pretrage.</div>';
    return;
  }

  // Grupisano po tipu (isti princip kao kod Pelcera)
  const groupOrder = ['zakon', 'odluka'];
  const groupLabel = { zakon: 'Zakoni', odluka: 'Odluke Grada Beograda' };
  const groupColor = { zakon: '#1a4a8a', odluka: '#8e44ad' };
  const groupIcon  = { zakon: '📜', odluka: '⚖️' };

  const groups = {};
  data.forEach(a => {
    if (!groups[a.tip]) groups[a.tip] = [];
    groups[a.tip].push(a);
  });

  const orderedKeys = groupOrder.filter(k => groups[k]);

  el.innerHTML = orderedKeys.map(tip => `
    <div style="margin-bottom:8px;">
      <div style="background:${groupColor[tip]};color:white;padding:7px 12px;border-radius:8px;font-size:0.72rem;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">
        ${groupLabel[tip]}
      </div>
      ${groups[tip].map(a => `
        <div onclick="openAkt(${a.id})" style="background:white;border:1px solid var(--border);border-radius:8px;padding:11px 14px;margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
          <span style="font-size:1.2rem;">${groupIcon[tip]}</span>
          <div style="flex:1;">
            <div style="font-size:0.82rem;font-weight:600;color:var(--navy);line-height:1.4;">${a.naziv}</div>
            <div style="font-size:0.7rem;color:var(--muted);margin-top:2px;">${a.broj}</div>
          </div>
          <span style="color:var(--muted);font-size:1rem;">›</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

let aktiScope = 'sve';

function setAktiScope(scope) {
  aktiScope = scope;
  document.querySelectorAll('.akti-scope-btn').forEach(btn => {
    const active = btn.dataset.scope === scope;
    btn.style.background = active ? 'var(--navy)' : 'white';
    btn.style.color = active ? 'white' : 'var(--text)';
    btn.style.borderColor = active ? 'var(--navy)' : 'var(--border)';
  });
  filterAkti();
}

function filterAkti() {
  const q = document.getElementById('search-input').value.trim();
  const meta = document.getElementById('akti-search-meta');
  const scopeLabel = { sve: 'zakonima i odlukama', zakon: 'zakonima', odluka: 'odlukama' };

  const base = aktiScope === 'sve' ? aktiData : aktiData.filter(a => a.tip === aktiScope);

  if (!q) {
    meta.style.display = 'none';
    renderAkti(base);
    return;
  }

  const results = searchArticles(q, aktiScope);
  meta.style.display = 'block';
  meta.textContent = `Pretraga samo u: ${scopeLabel[aktiScope]}`;
  renderAktiSearchResults(results, q);
}

// ===== PARAGRAF.RS LINK (pretraga po nazivu akta) =====
function getParagrafUrl(akt) {
  return `https://www.paragraf.rs/propisi_frames/trazi.php?q=${encodeURIComponent(akt.naziv)}`;
}

// Inline markdown (**bold**) -> <b>, isti font kao ostatak sadržaja (nasleđuje font iz body { font-family })
function mdInlineAkt(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
}

function formatAktText(text) {
  return text.split('\n').map(line => {
    const raw = line.trim();
    if (!raw) return '<br>';
    const l = raw.replace(/\*\*/g, ''); // čist tekst za prepoznavanje obrasca
    if (/^[IVXLC]+[\s\-]+[A-ZŠĐČĆŽ]/.test(l) || /^[A-ZŠĐČĆŽ0-9\s\-]{6,}$/.test(l)) {
      return `<div style="font-weight:800;color:#0d2240;margin:14px 0 4px;font-size:0.85rem;letter-spacing:1px;border-bottom:2px solid #c8a84b;padding-bottom:4px;">${l}</div>`;
    }
    if (/^Član\s+\d+[a-zšđčćž]?\.?$/i.test(l)) {
      return `<div style="font-weight:700;color:#1a4a8a;margin-top:12px;margin-bottom:2px;font-size:0.85rem;">${l}</div>`;
    }
    if (/^\d+[\.\)]\s/.test(l) || /^-\s/.test(l) || /^•\s/.test(l)) {
      return `<div style="padding-left:14px;color:#2a3a4a;font-size:0.85rem;line-height:1.65;margin:3px 0;">${mdInlineAkt(raw)}</div>`;
    }
    return `<div style="color:#2a3a4a;line-height:1.65;font-size:0.85rem;margin:3px 0;">${mdInlineAkt(raw)}</div>`;
  }).join('');
}

function openAkt(id, targetClan) {
  currentAkt = aktiData.find(a => a.id === id);
  if (!currentAkt) return;
  document.getElementById('modal-title').textContent = currentAkt.naziv;
  document.getElementById('modal-body').innerHTML = formatAktText(currentAkt.broj + '\n\n' + currentAkt.sadrzaj);

  const link = document.getElementById('modal-official-link');
  link.href = getParagrafUrl(currentAkt);
  link.innerHTML = '📖 Otvori kompletan tekst na Paragraf Lex';
  link.style.background = 'linear-gradient(135deg, #c8a84b, #a07830)';
  link.style.color = '#0d2240';

  document.getElementById('modal-bg').classList.add('open');

  if (targetClan) {
    setTimeout(() => {
      const divs = document.querySelectorAll('#modal-body > div');
      for (const d of divs) {
        if (d.textContent.trim() === targetClan) {
          d.scrollIntoView({ block: 'center' });
          const prevBg = d.style.background;
          d.style.background = '#fde9b8';
          d.style.borderRadius = '4px';
          d.style.transition = 'background 1.5s';
          setTimeout(() => { d.style.background = prevBg; }, 2200);
          break;
        }
      }
    }, 60);
  }
}

function closeModal(e) {
  if (e.target === document.getElementById('modal-bg'))
    document.getElementById('modal-bg').classList.remove('open');
}

async function shareAkt(via) {
  if (!currentAkt) return;
  const title = currentAkt.naziv || 'Dokument';
  const text = currentAkt.naziv + '\n' + (currentAkt.broj || '') + '\n\n' + currentAkt.sadrzaj;
  
  // Build Word-compatible HTML
  const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]--></head><body><h1>${title}</h1><p>${(currentAkt.broz || '')}</p><p>${currentAkt.sadrzaj}</p></body></html>`;
  
  const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  const safeName = title.replace(/[^a-zA-Z0-9_\-\u010c\u0107\u0160\u0161\u0110\u0111\u017d\u017e ]/g, '');
  const fileName = safeName + '.doc';
  
  // Try Web Share API with file
  if (navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/msword' })] })) {
    try {
      const file = new File([blob], fileName, { type: 'application/msword' });
      await navigator.share({ title: title, text: title, files: [file] });
      showToast('\u2705 Akt deljen kao Word fajl!');
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error('Share error:', e);
    }
  }
  
  // Fallback: download + text share
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
    showToast('\ud83d\udcc4 Word fajl preuzet. Prilo\u017ei ga u Viberu.');
  } else {
    window.open('mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent('Dokument je preuzet kao Word fajl. Molimo prilo\u017eite ga.'));
    showToast('\ud83d\udcc4 Word fajl preuzet. Prilo\u017ei ga u mailu.');
  }
}

// ===== PODEŠAVANJA =====
function updateSettings() {
  document.getElementById('doc-count').textContent = docs.length + ' doc.';
}

function exportAllData() {
  const data = {
    docs: JSON.parse(localStorage.getItem('bk_docs') || '[]'),
    photos: JSON.parse(localStorage.getItem('bk_photos') || '[]'),
    folders: JSON.parse(localStorage.getItem('bk_folders') || '[]'),
    users: JSON.parse(localStorage.getItem('km_users_v1') || '[]'),
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kmapp-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  showToast('💾 Backup preuzet!');
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.docs) localStorage.setItem('bk_docs', JSON.stringify(data.docs));
        if (data.photos) localStorage.setItem('bk_photos', JSON.stringify(data.photos));
        if (data.folders) localStorage.setItem('bk_folders', JSON.stringify(data.folders));
        showToast('✅ Podaci uvezeni! Osvežite stranicu.');
        setTimeout(() => location.reload(), 1500);
      } catch(err) {
        showToast('❌ Greška u importu fajla');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAll() {
  if (!confirm('Obrisati sve dokumente? Ova akcija ne može biti poništena.')) return;
  docs = [];
  localStorage.setItem('bk_docs', JSON.stringify(docs));
  showToast('🗑️ Svi dokumenti obrisani');
  updateSettings();
}

// ===== TOAST =====
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('km_dark_mode', isDark ? '1' : '0');
  document.getElementById('watermark').style.display = isDark ? 'none' : 'block';
  document.getElementById('watermark-dark').style.display = isDark ? 'block' : 'none';
  const slider = document.getElementById('dark-mode-slider');
  if (slider) {
    slider.style.background = isDark ? 'var(--accent)' : 'var(--border)';
    slider.querySelector('span').style.transform = isDark ? 'translateX(20px)' : 'translateX(0)';
  }
}

function initDarkMode() {
  if (localStorage.getItem('km_dark_mode') === '1') {
    document.body.classList.add('dark-mode');
    document.getElementById('watermark').style.display = 'none';
    document.getElementById('watermark-dark').style.display = 'block';
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = true;
    const slider = document.getElementById('dark-mode-slider');
    if (slider) {
      slider.style.background = 'var(--accent)';
      slider.querySelector('span').style.transform = 'translateX(20px)';
    }
  }
  const userDisplay = document.getElementById('current-user-display');
  if (userDisplay) userDisplay.textContent = getCurrentUser() || 'Korisnik';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== UVOZ WORD FAJLA =====
function importWord(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Reset input so same file can be re-imported
  event.target.value = '';

  const fileName = file.name.replace(/\.(doc|docx)$/i, '');
  showToast('⏳ Učitavanje fajla...');

  // Use mammoth if available, else fallback
  if (typeof mammoth !== 'undefined') {
    const reader = new FileReader();
    reader.onload = function(e) {
      mammoth.convertToHtml({ arrayBuffer: e.target.result })
        .then(function(result) {
          openImportedDoc(fileName, result.value);
        })
        .catch(function() {
          showToast('❌ Greška pri čitanju fajla');
        });
    };
    reader.readAsArrayBuffer(file);
  } else {
    // Fallback: read as text for .doc files
    const reader = new FileReader();
    reader.onload = function(e) {
      // Try to extract readable text from binary
      const raw = e.target.result;
      let text = '';
      if (typeof raw === 'string') {
        // Strip non-printable characters, keep Serbian chars
        text = raw.replace(/[^\x20-\x7E\u00C0-\u024F\u0400-\u04FF\n\r\t]/g, ' ')
                  .replace(/\s{3,}/g, '\n')
                  .trim();
      }
      if (text.length > 20) {
        openImportedDoc(fileName, '<p>' + text.replace(/\n/g, '</p><p>') + '</p>');
      } else {
        showToast('⚠️ Fajl nije čitljiv. Koristite .docx format.');
      }
    };
    reader.readAsBinaryString(file);
  }
}

function openImportedDoc(title, htmlContent) {
  currentDocId = null;
  document.getElementById('doc-title').value = title;
  document.getElementById('doc-editor').innerHTML = htmlContent || '<p></p>';
  document.getElementById('view-list').style.display = 'none';
  document.getElementById('view-editor').style.display = 'flex';
  showToast('✅ Fajl uspešno učitan!');
}

// ===== INIT =====
renderDocs();

// ===== IMENIK =====
