

let imenikFiltered = imenikData;
let imenikInitialized = false;

function initImenik() {
  if (!imenikInitialized) {
    buildAlphaIndex();
    imenikInitialized = true;
  }
  renderImenik(imenikData);
}

function buildAlphaIndex() {
  const alpha = document.getElementById('imenik-alpha');
  if (!alpha) return;
  const letters = [...new Set(imenikData.map(c => {
    const l = c.name.charAt(0).toUpperCase();
    return l;
  }))].sort((a,b) => a.localeCompare(b,'sr'));
  alpha.innerHTML = letters.map(l =>
    `<button onclick="scrollToLetter('${l}')" style="padding:3px 7px;font-size:0.7rem;font-weight:700;border:1px solid var(--border);border-radius:5px;background:var(--light);color:var(--text);cursor:pointer;">${l}</button>`
  ).join('');
}

function scrollToLetter(letter) {
  const el = document.getElementById('imenik-letter-' + letter);
  if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

// Filter contacts for restricted users (e.g., test01 can only see Milos.Avramov)
function getVisibleImenikContacts() {
  const currentUser = (localStorage.getItem(KM_CURRENT_USER) || '').toLowerCase();
  if (currentUser === 'test01') {
    return (typeof imenikData !== 'undefined' ? imenikData : []).filter(c => {
      const username = imenikToUsername(c.ime || c.name || '');
      return username.toLowerCase() === 'milos.avramov';
    });
  }
  return typeof imenikData !== 'undefined' ? imenikData : [];
}

function filterImenik() {
  const q = document.getElementById('imenik-search').value.toLowerCase();
  const visibleData = getVisibleImenikContacts();
  imenikFiltered = q
    ? visibleData.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phones.some(p => p.replace(/[-\s]/g,'').includes(q.replace(/[-\s]/g,''))) ||
        (c.org||'').toLowerCase().includes(q)
      )
    : visibleData;
  document.getElementById('imenik-count').textContent = imenikFiltered.length;
  renderImenik(imenikFiltered);
}

function renderImenik(data) {
  const el = document.getElementById('imenik-list');
  if (!el) return;
  document.getElementById('imenik-count').textContent = data.length;

  if (!data.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:0.88rem;"><div style="font-size:2rem;">👥</div>Nema rezultata.</div>';
    return;
  }

  // Group by first letter
  const groups = {};
  data.forEach(c => {
    const letter = c.name.charAt(0).toUpperCase();
    if (!groups[letter]) groups[letter] = [];
    groups[letter].push(c);
  });

  const sortedLetters = Object.keys(groups).sort((a,b) => a.localeCompare(b,'sr'));

  el.innerHTML = sortedLetters.map(letter => `
    <div id="imenik-letter-${letter}" style="background:var(--light);padding:5px 14px;font-size:0.7rem;font-weight:800;letter-spacing:2px;color:var(--muted);border-bottom:1px solid var(--border);">
      ${letter}
    </div>
    ${groups[letter].map((c, idx) => {
      const globalIdx = getVisibleImenikContacts().indexOf(c);
      const initials = c.name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
      const photoHtml = c.photo
        ? `<img src="${c.photo}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
        : `<div style="width:44px;height:44px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;flex-shrink:0;">${initials}</div>`;
      const phone = c.phones[0] || '';
      return `
        <div class="imenik-card" onclick="openImenikModal(${globalIdx})" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border);background:var(--white);cursor:pointer;">
          ${photoHtml}
          <div style="flex:1;min-width:0;">
            <div class="imenik-name" style="font-weight:700;font-size:0.9rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.name}</div>
            <div class="imenik-phone" style="font-size:0.75rem;color:var(--muted);margin-top:1px;">${phone}</div>
          </div>
          ${phone ? `<a href="tel:${phone.replace(/[-\s]/g,'')}" onclick="event.stopPropagation()" style="width:36px;height:36px;border-radius:50%;background:#27ae60;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:1rem;flex-shrink:0;">📞</a>` : ''}
        </div>`;
    }).join('')}
  `).join('');
}

function openImenikModal(idx) {
  const c = imenikData[idx];
  if (!c) return;
  const photoEl = document.getElementById('im-modal-photo');
  const initials = c.name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
  if (c.photo) {
    photoEl.src = c.photo;
    photoEl.style.display = 'block';
  } else {
    photoEl.src = '';
    photoEl.style.display = 'none';
  }
  document.getElementById('im-modal-name').textContent = c.name;
  document.getElementById('im-modal-org').textContent = c.org || c.note || '';
  document.getElementById('im-modal-phones').innerHTML = c.phones.map(p => `
    <a href="tel:${p.replace(/[-\s]/g,'')}" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--light);border-radius:10px;text-decoration:none;color:var(--text);">
      <span style="font-size:1.1rem;">📞</span>
      <span style="font-weight:600;font-size:0.95rem;">${p}</span>
    </a>
  `).join('');
  const emailEl = document.getElementById('im-modal-email');
  emailEl.innerHTML = c.email ? `<a href="mailto:${c.email}" style="display:flex;align-items:center;gap:10px;padding:11px 14px;background:#fef3f0;border-radius:10px;text-decoration:none;color:#c0392b;margin-top:6px;"><span>✉️</span><span style="font-size:0.85rem;">${c.email}</span></a>` : '';
  document.getElementById('im-modal-note').textContent = c.note && c.note !== c.org ? c.note : '';
  document.getElementById('imenik-modal-bg').style.display = 'flex';
}

function closeImenikModal() {
  document.getElementById('imenik-modal-bg').style.display = 'none';
}

