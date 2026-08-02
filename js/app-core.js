
// ===== STATE =====
let docs = [];
try { docs = JSON.parse(localStorage.getItem('bk_docs') || '[]'); } catch(e) { docs = []; }
let currentDocId = null;
let currentAkt = null;

// ===== UGRADJENI DOKUMENTI (uvek vidljivi, ne brišu se) =====
const ugradeniDocs = [
  {
    id: 'template_sluzb_beleska',
    title: 'Službena beleška',
    date: '13.12.2025.',
    icon: '📋',
    content: `<div style="text-align:center;font-size:0.8rem;color:#555;margin-bottom:16px;">
Република Србија<br>
<b>Град Београд</b><br>
Градска управа града Београда<br>
Секретаријат за инспекцију, надзор и комуникацију<br>
Сектор за послове комуналне милиције<br><br>
Број: 357-177330/2025&nbsp;&nbsp;&nbsp;&nbsp;Датум: 13.12.2025.
</div>
<div style="text-align:center;font-weight:800;font-size:1rem;margin:18px 0 14px;letter-spacing:2px;">СЛУЖБЕНА БЕЛЕШКА</div>
<p>Дана 13.12.2025. године у 22:50 часова у градској општини Града Београда - Чукарица ул. Петра Лековића броја 12. патрола комуналне милиције у саставу Аврамов Милош вођа патроле, члан патроле, а у вези ометања комуналног милиционара у примени овлашћења.</p>
<br><br>
<div style="text-align:right;">КОМУНАЛНИ МИЛИЦИОНАР:</div>
<br>
<div style="text-align:right;">Аврамов Милош<br>_________________________</div>
<br>
<div>КОМУНАЛНИ МИЛИЦИОНАР:</div>
<div>________________________</div>`
  },
  {
    id: 'template_foto_dok',
    title: 'Фото документација',
    date: '09.04.2026.',
    icon: '📷',
    content: `<div style="text-align:center;font-size:0.8rem;color:#555;margin-bottom:16px;">
Република Србија<br>
<b>Град Београд</b><br>
Градска управа града Београда<br>
Секретаријат за инспекцију, надзор и комуникацију<br>
Сектор за послове Комуналне милиције<br><br>
Број: 357-966/2026-ХТ-02&nbsp;&nbsp;&nbsp;&nbsp;Датум: 09.04.2026. године
</div>
<div style="text-align:center;font-weight:800;font-size:1rem;margin:18px 0 14px;letter-spacing:2px;">Ф О Т О&nbsp;&nbsp;Д О К У М Е Н Т А Ц И Ј А</div>
<p><b>Ф-1</b> &nbsp;Приказује непрописно паркирано моторно возило на површини јавне намене улици - улица којом се крећу возила јавног превоза у улици Сарајевска бр. пп40 ГО Савски венац</p>
<br>
<p><b>Ф-2</b> &nbsp;Приказује регистрациону налепницу непрописно паркираног моторног возила</p>
<br><br>
<div style="text-align:right;">Комунални милиционар:</div>
<br>
<div style="text-align:right;">Милош Аврамов<br>__________________</div>`
  }
];

// ===== ACCORDION =====
function toggleAccordion(id) {
  const panel = document.getElementById(id);
  const arrow = document.getElementById(id + '-arrow');
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  panel.style.flexDirection = 'column';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

// ===== TABS =====
function switchTab(name) {
  // Gate: dok korisnik nije prijavljen, dozvoljen je samo ekran za prijavu
  if (name !== 'login' && !isLoggedIn()) {
    name = 'login';
  }
  // Prikaži ili sakrij nav bar
  var navEl = document.querySelector('nav');
  if (navEl) {
    navEl.style.display = (name === 'login') ? 'none' : 'flex';
  }
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  document.querySelectorAll('[id^="tab-"]').forEach(b => b.classList.remove('active'));
  const screen = document.getElementById('screen-' + name);
  if (screen) {
    screen.classList.add('active');
    screen.style.display = 'flex';
  }
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (name === 'akti') filterAkti();
  if (name === 'podesavanja') { updateSettings(); renderAdminAktiList(); }
  if (name === 'pelceri') renderPelceri(pelceriData);
  if (name === 'kamera') { initFolderSelect(); renderPhotos(); }
  if (name === 'imenik') initImenik();
  if (name === 'kalendar') renderCalendar();
  if (name === 'poruke') porukeView('conversations');
  if (name === 'mapa') { checkMapAdminAccess(); setTimeout(function() { initLeafletMap(); }, 100); }
  if (name === 'login') {
    setTimeout(() => { const el = document.getElementById('login-username'); if (el) el.focus(); }, 50);
  }
  // Highlight active item in side menu
  document.querySelectorAll('.side-menu-item').forEach(function(item) {
    item.classList.remove('side-menu-active');
  });
  closeMoreGrid();
}

function toggleMoreGrid() { toggleSideMenu(); }
function closeMoreGrid() { closeSideMenu(); }

function toggleSideMenu() {
  var overlay = document.getElementById('side-menu-overlay');
  var menu = document.getElementById('side-menu');
  if (!overlay || !menu) return;
  var isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    menu.classList.add('open');
    overlay.classList.add('open');
  }
}
function openSideMenu() {
  var overlay = document.getElementById('side-menu-overlay');
  var menu = document.getElementById('side-menu');
  if (overlay) overlay.classList.add('open');
  if (menu) menu.classList.add('open');
}
function closeSideMenu() {
  var overlay = document.getElementById('side-menu-overlay');
  var menu = document.getElementById('side-menu');
  if (overlay) overlay.classList.remove('open');
  if (menu) menu.classList.remove('open');
}

// ===== PORUKE / CHAT =====
const KM_API_BASE = 'https://solas-799a3993.base44.app/functions';
const VAPID_PUBLIC_KEY = 'BMtr4Ap8lezXKUgEy3o3EKSzcl4WIUXgffpbfyVWE6YQH7AvfO_eCY-f1MiaBfJhuTnw_ZkqVbGTVAps3PxqujQ';
let porukeCurrentView = 'conversations';
let porukeInbox = [];
let porukeSent = [];
let porukePollTimer = null;

function getCurrentUsername() {
  return localStorage.getItem(KM_CURRENT_USER) || '';
}

function getDisplayName() {
  return localStorage.getItem(KM_DISPLAY_NAME) || localStorage.getItem(KM_CURRENT_USER) || '';
}

async function porukeFetchInbox() {
  const username = getCurrentUsername();
  if (!username) return [];
  try {
    const res = await fetch(KM_API_BASE + '/getInbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    return (data.messages || []).filter(m => !m.deleted);
  } catch (e) {
    console.error('getInbox error:', e);
    return [];
  }
}

async function porukeFetchSent() {
  const username = getCurrentUsername();
  if (!username) return [];
  try {
    const res = await fetch(KM_API_BASE + '/getSent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    return (data.messages || []).filter(m => !m.deleted);
  } catch (e) {
    console.error('getSent error:', e);
    return [];
  }
}

async function porukeCheckNew() {
  const username = getCurrentUsername();
  if (!username) return;
  try {
    const reqBody = { username };
    // Check for pending login log (set by doLogin)
    const _pendingLog = localStorage.getItem('km_pendingLoginLog');
    if (_pendingLog) {
      reqBody.logLogin = true;
      reqBody.device = _pendingLog;
    }
    const res = await fetch(KM_API_BASE + '/checkNew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    const data = await res.json();
    const count = data.count || 0;
    // Clear pending login log flag
    if (localStorage.getItem('km_pendingLoginLog')) {
      localStorage.removeItem('km_pendingLoginLog');
    }
    const badge = document.getElementById('poruke-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
    if (count > 0) {
      showMsgToast(count);
      const lastSeen = parseInt(sessionStorage.getItem('_km_last_msg_count') || '0');
      if (count > lastSeen) {
        playMsgSound();
        // System notification with sender info
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const inboxRes = await fetch(KM_API_BASE + '/getInbox', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username })
            });
            const inboxData = await inboxRes.json();
            const unread = (inboxData.messages || []).filter(m => !m.read);
            if (unread.length > 0) {
              const latest = unread[unread.length - 1];
              const senderName = latest.senderName || latest.sender || 'Nepoznato';
              const preview = latest.text ? latest.text.substring(0, 80) : 'Nova poruka';
              new Notification('KMapp - ' + senderName, {
                body: preview + (count > 1 ? ' (+' + (count-1) + ' više)' : ''),
                icon: 'icons/icon-192.png',
                tag: 'kmapp-msg',
                renotify: true,
                data: { url: location.href }
              });
            }
          } catch(e) {}
        }
      }
    }
    sessionStorage.setItem('_km_last_msg_count', count);
  } catch (e) {
    console.error('checkNew error:', e);
  }
}

function porukeStartPolling() {
  if (porukePollTimer) return;
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(function(perm) {
      if (perm === 'granted') {
        setTimeout(subscribeToPush, 500);
      }
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    setTimeout(subscribeToPush, 500);
  }
  porukeCheckNew();
  porukePollTimer = setInterval(porukeCheckNew, 15000);
}

// ===== PUSH NOTIFICATIONS =====
async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push not supported on this device');
    return;
  }
  // Ne pokusavaj ako nema dozvolu za notifikacije
  if ('Notification' in window && Notification.permission === 'denied') {
    console.log('Push notifications denied by user - skipping');
    return;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    console.log('Push notification permission not requested yet - skipping');
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes
      });
      console.log('New push subscription created');
    }
    const username = getCurrentUsername();
    if (!username) {
      console.log('No username - cannot save push subscription');
      return;
    }
    // Serialize subscription safely (toJSON handles ArrayBuffer -> base64)
    const subData = sub.toJSON ? sub.toJSON() : {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime,
      keys: { p256dh: '', auth: '' }
    };
    const res = await fetch(KM_API_BASE + '/savePushSubscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, subscription: subData })
    });
    const data = await res.json();
    if (data.success) {
      console.log('Push subscription saved for', username);
      showToast('🔔 Push notifikacije aktivne');
    } else {
      console.log('Push subscription save failed:', data);
    }
  } catch(e) {
    console.log('Push subscription error (non-critical):', e.message || e);
    // Ne prikazuj grešku korisniku - push je opcionalno
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

let porukeSentRefreshTimer = null;

function porukeView(view) {
  porukeCurrentView = view;
  // Auto-refresh sent messages every 30s when viewing sent tab
  if (porukeSentRefreshTimer) { clearInterval(porukeSentRefreshTimer); porukeSentRefreshTimer = null; }
  if (view === 'sent') {
    porukeSentRefreshTimer = setInterval(async () => {
      if (porukeCurrentView === 'sent') {
        porukeSent = await porukeFetchSent();
        porukeRenderSent();
      } else {
        clearInterval(porukeSentRefreshTimer);
        porukeSentRefreshTimer = null;
      }
    }, 30000);
  }
  if (view === 'conversations') {
    porukeSentRefreshTimer = setInterval(async () => {
      if (porukeCurrentView === 'conversations') {
        porukeRenderConversations();
      } else {
        if (porukeSentRefreshTimer) { clearInterval(porukeSentRefreshTimer); porukeSentRefreshTimer = null; }
      }
    }, 30000);
  }
  const tabs = ['conversations', 'inbox', 'sent', 'compose'];
  tabs.forEach(t => {
    const btn = document.getElementById('poruke-tab-' + t);
    if (!btn) return;
    if (t === view) {
      btn.style.background = 'var(--navy)';
      btn.style.color = 'white';
      btn.style.border = 'none';
    } else {
      btn.style.background = 'white';
      btn.style.color = 'var(--text)';
      btn.style.border = '1.5px solid var(--border)';
    }
  });
  if (view === 'conversations') porukeRenderConversations();
  else if (view === 'inbox') porukeRenderInbox();
  else if (view === 'sent') porukeRenderSent();
  else if (view === 'compose') porukeRenderCompose();
}

async function porukeRenderConversations() {
  const content = document.getElementById('poruke-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 0;">Ucitavanje...</div>';
  
  const [inbox, sent] = await Promise.all([porukeFetchInbox(), porukeFetchSent()]);
  porukeInbox = inbox;
  porukeSent = sent;
  
  const username = getCurrentUsername();
  // Group messages by conversation partner
  const conversations = {};
  
  function getPartner(msg) {
    if (msg.sender === username) return msg.recipient;
    return msg.sender;
  }
  
  [...inbox, ...sent].filter(m => !isMsgDeleted(m.id)).forEach(msg => {
    const partner = getPartner(msg);
    if (!partner) return;
    if (!conversations[partner]) conversations[partner] = [];
    conversations[partner].push(msg);
  });
  
  // Sort each conversation by date and get last message
  const convList = Object.keys(conversations).map(partner => {
    const msgs = conversations[partner].sort((a, b) => new Date(a.created_date || a.createdAt || 0) - new Date(b.created_date || b.createdAt || 0));
    const lastMsg = msgs[msgs.length - 1];
    const unreadCount = msgs.filter(m => m.recipient === username && !m.read).length;
    let displayName = partner;
    let partnerPhoto = null;
    if (typeof imenikData !== 'undefined') {
      const contact = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === partner);
      if (contact) {
        displayName = contact.ime || contact.name || partner;
        if (contact.photo) partnerPhoto = contact.photo;
      }
    }
    return { partner, displayName, partnerPhoto, msgs, lastMsg, unreadCount };
  });
  
  // Sort conversations by last message date
  convList.sort((a, b) => new Date(b.lastMsg.created_date || b.lastMsg.createdAt || 0) - new Date(a.lastMsg.created_date || a.lastMsg.createdAt || 0));
  
  if (convList.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:60px 20px;"><div style="font-size:2.5rem;margin-bottom:12px;">\ud83d\udcac</div>Nemate razgovora</div>';
    return;
  }
  
  let html = '';
  convList.forEach(c => {
    const dt = new Date(c.lastMsg.created_date || c.lastMsg.createdAt || Date.now());
    const time = dt.toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const lastText = porukePreviewText(c.lastMsg.text || '');
    const isMyLast = c.lastMsg.sender === username;
    const initial = c.displayName.charAt(0).toUpperCase();
    const avatar = c.partnerPhoto
      ? '<img src="' + c.partnerPhoto + '" style="width:42px;height:42px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
      : '<div style="width:42px;height:42px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;flex-shrink:0;">' + initial + '</div>';
    
    html += '<div onclick="porukeOpenThread(\'' + c.partner + '\', \'' + c.displayName.replace(/'/g, "\\\'") + '\')" style="display:flex;gap:10px;padding:12px;border-bottom:1px solid var(--border);cursor:pointer;' + (c.unreadCount > 0 ? 'background:#f0f6ff;' : '') + '" onmouseover="this.style.background=\'#e8f0fe\'" onmouseout="this.style.background=\'' + (c.unreadCount > 0 ? '#f0f6ff' : 'transparent') + '\'">' +
      avatar +
      '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
      '<div style="font-weight:' + (c.unreadCount > 0 ? '700' : '500') + ';font-size:0.9rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + c.displayName + '</div>' +
      '<div style="font-size:0.68rem;color:var(--muted);flex-shrink:0;">' + time + '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;">' +
      '<div style="font-size:0.82rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">' + (isMyLast ? '\u2192 ' : '') + lastText + '</div>' +
      (c.unreadCount > 0 ? '<div style="background:var(--navy);color:white;border-radius:50%;min-width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:0.68rem;font-weight:700;margin-left:6px;">' + c.unreadCount + '</div>' : '') +
      '</div>' +
      '</div>' +
      '</div>';
  });
  
  content.innerHTML = html;
}

// Local message deletion (hides from UI, stores deleted IDs)
function getDeletedMsgIds() {
  return JSON.parse(localStorage.getItem('km_deleted_msgs') || '[]');
}
function isMsgDeleted(id) {
  return getDeletedMsgIds().includes(id);
}
async function porukeDeleteMessage(msgId) {
  if (!confirm('Obrisati ovu poruku?')) return;
  // Call backend to soft-delete
  try {
    await fetch(KM_API_BASE + '/deleteMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId })
    });
  } catch (e) { console.error('Delete error:', e); }
  // Also store locally for immediate UI update
  const deleted = getDeletedMsgIds();
  if (!deleted.includes(msgId)) {
    deleted.push(msgId);
    localStorage.setItem('km_deleted_msgs', JSON.stringify(deleted));
  }
  // Remove from local arrays
  porukeInbox = porukeInbox.filter(m => m.id !== msgId);
  porukeSent = porukeSent.filter(m => m.id !== msgId);
  // Re-render current thread
  if (porukeThreadPartner) {
    porukeOpenThread(porukeThreadPartner, porukeThreadName);
  }
  showToast('🗑️ Poruka obrisana.');
}
function porukeDeleteConversation(partner) {
  if (!confirm('Obrisati sve poruke iz ovog razgovora?')) return;
  const username = getCurrentUsername();
  const allMsgs = [...porukeInbox, ...porukeSent]
    .filter(m => (m.sender === partner && m.recipient === username) || (m.recipient === partner && m.sender === username));
  const deleted = getDeletedMsgIds();
  allMsgs.forEach(m => {
    if (!deleted.includes(m.id)) deleted.push(m.id);
  });
  localStorage.setItem('km_deleted_msgs', JSON.stringify(deleted));
  porukeInbox = porukeInbox.filter(m => !allMsgs.find(x => x.id === m.id));
  porukeSent = porukeSent.filter(m => !allMsgs.find(x => x.id === m.id));
  porukeView('conversations');
  showToast('🗑️ Razgovor obrisan.');
}

function porukeOpenThread(partner, displayName) {
  const content = document.getElementById('poruke-content');
  if (!content) return;
  
  // Merge inbox and sent for this partner, sorted by date
  const username = getCurrentUsername();
  const allMsgs = [...porukeInbox, ...porukeSent]
    .filter(m => !isMsgDeleted(m.id) && ((m.sender === partner && m.recipient === username) || (m.recipient === partner && m.sender === username)))
    .sort((a, b) => new Date(a.created_date || a.createdAt || 0) - new Date(b.created_date || b.createdAt || 0));
  
  let partnerPhoto = null;
  if (typeof imenikData !== 'undefined') {
    const contact = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === partner);
    if (contact && contact.photo) partnerPhoto = contact.photo;
  }
  
  const initial = displayName.charAt(0).toUpperCase();
  const avatar = partnerPhoto
    ? '<img src="' + partnerPhoto + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">'
    : '<div style="width:32px;height:32px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">' + initial + '</div>';
  
  let html = '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;margin-bottom:8px;border-bottom:2px solid var(--navy);">' +
    '<button onclick="porukeView(\'conversations\')" style="background:none;border:none;color:var(--navy);font-size:0.82rem;cursor:pointer;">\u2190</button>' +
    avatar +
    '<div style="flex:1;font-weight:700;font-size:0.92rem;color:var(--text);">' + displayName + '</div>' +
    '<button onclick="porukeDeleteConversation(\'' + partner + '\')" style="background:none;border:none;color:var(--danger);font-size:1.1rem;cursor:pointer;padding:4px 8px;" title="Obri\u0161i razgovor">\ud83d\uddd1\ufe0f</button>' +
    '</div>';
  
  // Chat bubbles
  html += '<div style="display:flex;flex-direction:column;gap:6px;">';
  let lastDate = '';
  allMsgs.forEach(msg => {
    const dt = new Date(msg.created_date || msg.createdAt || Date.now());
    const dateStr = dt.toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = dt.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' });
    const isMe = msg.sender === username;
    const msgText = porukeFormatMessage(msg.text || '');
    const readMark = isMe ? (msg.read ? ' <span style="color:#43a047;font-size:0.7rem;">\u2713\u2713</span>' : ' <span style="color:#aaa;font-size:0.7rem;">\u2713</span>') : '';
    
    // Date separator
    if (dateStr !== lastDate) {
      html += '<div style="text-align:center;font-size:0.7rem;color:var(--muted);margin:10px 0 6px;">' + dateStr + '</div>';
      lastDate = dateStr;
    }
    
    // Bubble
    if (isMe) {
      html += '<div style="align-self:flex-end;max-width:78%;position:relative;">' +
        '<div style="background:var(--navy);color:white;border-radius:14px 14px 4px 14px;padding:8px 12px;margin-left:auto;">' +
        '<div style="font-size:0.85rem;line-height:1.4;white-space:pre-wrap;word-break:break-word;">' + msgText + '</div>' +
        '<div style="text-align:right;font-size:0.65rem;margin-top:2px;opacity:0.8;">' + time + readMark + '</div>' +
        '</div>' +
        '<button onclick="porukeDeleteMessage(\'' + msg.id + '\')" style="position:absolute;top:-4px;left:-4px;background:var(--danger);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:0.6rem;cursor:pointer;display:none;" class="msg-delete-btn">' + '\u00d7' + '</button>' +
        '</div>';
    } else {
      html += '<div style="align-self:flex-start;max-width:78%;position:relative;">' +
        '<div style="background:white;color:var(--text);border:1.5px solid var(--border);border-radius:14px 14px 14px 4px;padding:8px 12px;">' +
        '<div style="font-size:0.85rem;line-height:1.4;white-space:pre-wrap;word-break:break-word;">' + msgText + '</div>' +
        '<div style="font-size:0.65rem;color:var(--muted);margin-top:2px;">' + time + '</div>' +
        '</div>' +
        '<button onclick="porukeDeleteMessage(\'' + msg.id + '\')" style="position:absolute;top:-4px;right:-4px;background:var(--danger);color:white;border:none;border-radius:50%;width:18px;height:18px;font-size:0.6rem;cursor:pointer;display:none;" class="msg-delete-btn">' + '\u00d7' + '</button>' +
        '</div>';
    }
  });
  html += '</div>';
  
  // Quick reply box
  html += '<div style="position:sticky;bottom:0;background:white;border-top:1px solid var(--border);padding:10px;margin-top:10px;display:flex;gap:8px;">' +
    '<button onclick="porukeThreadAttach(\'' + partner + '\', \'' + displayName.replace(/'/g, "\\\'") + '\')" style="background:white;border:1.5px solid var(--border);border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:1.1rem;">\ud83d\udcc1</button>' +
    '<input id="thread-quick-reply" type="text" placeholder="Odgovori..." style="flex:1;padding:10px;border:1.5px solid var(--border);border-radius:20px;font-size:0.85rem;outline:none;" onkeydown="if(event.key===\'Enter\')porukeThreadReply(\'' + partner + '\', \'' + displayName.replace(/'/g, "\\\'") + '\')">' +
    '<button onclick="porukeThreadReply(\'' + partner + '\', \'' + displayName.replace(/'/g, "\\\'") + '\')" style="background:var(--navy);color:white;border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;font-size:1.1rem;">\u2192</button>' +
    '</div>';
  
  content.innerHTML = html;
  content.scrollTop = content.scrollHeight;
  
  // Long-press to show delete buttons on messages
  (function() {
    const bubbles = content.querySelectorAll('.msg-delete-btn');
    let pressTimer = null;
    let deleteMode = false;
    function toggleDeleteMode() {
      deleteMode = !deleteMode;
      bubbles.forEach(b => { b.style.display = deleteMode ? 'flex' : 'none'; });
      if (deleteMode) {
        showToast('Dodirni \u00d7 da obri\u0161e\u0161 poruku');
      }
    }
    content.querySelectorAll('[style*="position:relative"]').forEach(bubble => {
      bubble.addEventListener('touchstart', function(e) {
        pressTimer = setTimeout(() => { toggleDeleteMode(); }, 600);
      });
      bubble.addEventListener('touchend', function() { clearTimeout(pressTimer); });
      bubble.addEventListener('touchmove', function() { clearTimeout(pressTimer); });
      bubble.addEventListener('contextmenu', function(e) { e.preventDefault(); toggleDeleteMode(); });
    });
  })();
  
  // Mark received messages as read
  const unreadFromPartner = allMsgs.filter(m => m.sender === partner && !m.read);
  unreadFromPartner.forEach(m => {
    fetch(KM_API_BASE + '/markAsRead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: m.id })
    }).then(() => { m.read = true; }).catch(() => {});
  });
  
  // Store current thread partner for quick reply
  porukeThreadPartner = partner;
  porukeThreadName = displayName;
}


function porukeThreadAttach(partner, displayName) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxW = 800, maxH = 1000;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        porukeThreadSendWithAttachment(partner, displayName, '[IMG]' + dataUrl + '[/IMG]');
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

async function porukeThreadSendWithAttachment(partner, displayName, attachmentText) {
  const sender = getCurrentUsername();
  const senderName = getDisplayName();
  let recipientName = partner;
  if (typeof imenikData !== 'undefined') {
    const found = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === partner);
    if (found) recipientName = found.ime || found.name || partner;
  }
  try {
    const res = await fetch(KM_API_BASE + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, recipient: partner, text: attachmentText, senderName, recipientName })
    });
    const data = await res.json();
    if (data.success) {
      porukeSent = await porukeFetchSent();
      porukeOpenThread(partner, displayName);
    }
  } catch (e) {
    alert('Greska pri slanju');
  }
}
let porukeThreadPartner = null;
let porukeThreadName = null;

async function porukeThreadReply(partner, displayName) {
  const input = document.getElementById('thread-quick-reply');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  
  const sender = getCurrentUsername();
  const senderName = getDisplayName();
  let recipientName = partner;
  if (typeof imenikData !== 'undefined') {
    const found = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === partner);
    if (found) recipientName = found.ime || found.name || partner;
  }
  
  input.value = '';
  input.disabled = true;
  
  try {
    const res = await fetch(KM_API_BASE + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, recipient: partner, text, senderName, recipientName })
    });
    const data = await res.json();
    if (data.success) {
      // Refresh and re-render thread
      porukeSent = await porukeFetchSent();
      porukeOpenThread(partner, displayName);
    } else {
      alert('Greska pri slanju: ' + (data.error || 'Nepoznata'));
      input.disabled = false;
    }
  } catch (e) {
    alert('Greska pri slanju');
    input.disabled = false;
  }
}

async function porukeRenderInbox() {
  const content = document.getElementById('poruke-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 0;">Ucitavanje...</div>';
  porukeInbox = (await porukeFetchInbox()).filter(m => !isMsgDeleted(m.id));
  if (porukeInbox.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:60px 20px;"><div style="font-size:2.5rem;margin-bottom:12px;">\u{1F4ED}</div>Nemate primljenih poruka</div>';
    return;
  }
  let html = '';
  porukeInbox.forEach(msg => {
    const dt = new Date(msg.created_date || msg.createdAt || Date.now());
    const time = dt.toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const unread = !msg.read;
    const senderName = msg.senderName || msg.sender || 'Nepoznato';
    const text = porukePreviewText(msg.text || '');
    let senderPhoto = null;
    if (typeof imenikData !== 'undefined') {
      const contact = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === (msg.sender || ''));
      if (contact && contact.photo) senderPhoto = contact.photo;
    }
    const initial = senderName.charAt(0).toUpperCase();
    const avatar = senderPhoto
      ? '<img src="' + senderPhoto + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
      : '<div style="width:38px;height:38px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;flex-shrink:0;">' + initial + '</div>';
    html += '<div onclick="porukeOpenMessage(\'' + msg.id + '\', \'inbox\')" style="display:flex;gap:10px;background:white;border:1.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;' + (unread ? 'border-left:3px solid var(--navy);' : '') + '">' +
      avatar +
      '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div style="font-weight:' + (unread ? '700' : '500') + ';font-size:0.9rem;color:var(--text);">' + senderName + '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);flex-shrink:0;">' + time + '</div>' +
      '</div>' +
      '<div style="font-size:0.85rem;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + text + '</div>' +
      (unread ? '<div style="font-size:0.68rem;color:var(--navy);margin-top:4px;font-weight:600;">\u2022 Neprocitano</div>' : '') +
      '</div>' +
      '</div>';
  });
  content.innerHTML = html;
}

async function porukeRenderSent() {
  const content = document.getElementById('poruke-content');
  if (!content) return;
  content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:40px 0;">Ucitavanje...</div>';
  porukeSent = (await porukeFetchSent()).filter(m => !isMsgDeleted(m.id));
  if (porukeSent.length === 0) {
    content.innerHTML = '<div style="text-align:center;color:var(--muted);padding:60px 20px;"><div style="font-size:2.5rem;margin-bottom:12px;">\u{1F4E4}</div>Niste poslali nijednu poruku</div>';
    return;
  }
  let html = '';
  porukeSent.forEach(msg => {
    const dt = new Date(msg.created_date || msg.createdAt || Date.now());
    const time = dt.toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const recipientName = msg.recipientName || msg.recipient || 'Nepoznato';
    const text = porukePreviewText(msg.text || '');
    let recPhoto = null;
    if (typeof imenikData !== 'undefined') {
      const contact = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === (msg.recipient || ''));
      if (contact && contact.photo) recPhoto = contact.photo;
    }
    const initial = recipientName.charAt(0).toUpperCase();
    const avatar = recPhoto
      ? '<img src="' + recPhoto + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
      : '<div style="width:38px;height:38px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;flex-shrink:0;">' + initial + '</div>';
    html += '<div onclick="porukeOpenMessage(\'' + msg.id + '\', \'sent\')" style="display:flex;gap:10px;background:white;border:1.5px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;cursor:pointer;">' +
      avatar +
      '<div style="flex:1;min-width:0;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
      '<div style="font-weight:500;font-size:0.9rem;color:var(--text);">\u2192 ' + recipientName + '</div>' +
      '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
        (msg.read
          ? '<span title="Procitano" style="color:#43a047;font-size:0.8rem;">\u2713\u2713</span>'
          : '<span title="Poslato" style="color:var(--muted);font-size:0.8rem;">\u2713</span>') +
        '<span style="font-size:0.72rem;color:var(--muted);">' + time + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:0.85rem;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + text + '</div>' +
      (msg.read ? '' : '<div style="font-size:0.68rem;color:var(--muted);margin-top:3px;">\u2713 Poslato, nije procitano</div>') +
      '</div>' +
      '</div>';
  });
}

let porukeSelectedRecipient = null;

function porukeRenderCompose() {
  const content = document.getElementById('poruke-content');
  if (!content) return;
  porukeSelectedRecipient = null;
  content.innerHTML = 
    '<div style="padding:8px 0;">' +
    '<div style="font-size:0.8rem;font-weight:700;color:var(--text);margin-bottom:8px;">Nova poruka</div>' +
    '<div style="font-size:0.75rem;color:var(--muted);margin-bottom:6px;">Primaoc:</div>' +
    '<input type="text" id="poruke-search" placeholder="Pretraga po imenu..." oninput="porukeFilterContacts()" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:0.85rem;background:white;margin-bottom:8px;outline:none;">' +
    '<div id="poruke-contact-list" style="max-height:240px;overflow-y:auto;border:1.5px solid var(--border);border-radius:10px;margin-bottom:10px;background:white;"></div>' +
    '<div id="poruke-selected-display" style="display:none;align-items:center;gap:8px;padding:8px 12px;background:var(--navy);color:white;border-radius:10px;margin-bottom:10px;font-size:0.85rem;">' +
    '<span id="poruke-selected-text"></span>' +
    '<button onclick="porukeClearRecipient()" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;color:white;border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:0.7rem;">\u2715</button>' +
    '</div>' +
    '<textarea id="poruke-text" placeholder="Unesite tekst poruke..." style="width:100%;min-height:120px;padding:12px;border:1.5px solid var(--border);border-radius:10px;font-size:0.88rem;background:white;margin-bottom:10px;outline:none;resize:vertical;font-family:inherit;"></textarea>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
    '<button onclick="porukeAttachPhoto()" style="flex:1;padding:10px;background:white;border:1.5px solid var(--border);border-radius:10px;font-size:0.82rem;cursor:pointer;color:var(--text);">\ud83d\udcf7 Slika</button>' +
    '<button onclick="porukeAttachFile()" style="flex:1;padding:10px;background:white;border:1.5px solid var(--border);border-radius:10px;font-size:0.82rem;cursor:pointer;color:var(--text);">\ud83d\udcc1 Fajl</button>' +
    '</div>' +
    '<div id="poruke-attachments" style="display:none;margin-bottom:8px;"></div>' +
    '<button onclick="porukeSend()" style="width:100%;padding:14px;background:var(--navy);color:white;border:none;border-radius:10px;font-size:0.9rem;font-weight:700;cursor:pointer;">Posalji poruku</button>' +
    '<div id="poruke-send-status" style="text-align:center;margin-top:8px;font-size:0.82rem;"></div>' +
    '</div>';
  porukeFilterContacts();
}

function porukeFilterContacts() {
  const search = (document.getElementById('poruke-search')?.value || '').toLowerCase();
  const listEl = document.getElementById('poruke-contact-list');
  if (!listEl) return;
  let contacts = [];
  const visibleData = getVisibleImenikContacts();
  visibleData.forEach(p => {
    const username = imenikToUsername(p.ime || p.name || '');
    const name = p.ime || p.name || username;
    if (username) contacts.push({ username, name, photo: p.photo || null, org: p.org || '' });
  });
  if (search) contacts = contacts.filter(c => c.name.toLowerCase().includes(search) || c.username.toLowerCase().includes(search));
  if (contacts.length === 0) {
    listEl.innerHTML = '<div style="padding:16px;text-align:center;color:var(--muted);font-size:0.82rem;">Nema rezultata</div>';
    return;
  }
  let html = '';
  contacts.forEach(c => {
    const initial = c.name.charAt(0).toUpperCase();
    const avatar = c.photo 
      ? '<img src="' + c.photo + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
      : '<div style="width:36px;height:36px;border-radius:50%;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;flex-shrink:0;">' + initial + '</div>';
    html += '<div onclick="porukeSelectRecipient(\'' + c.username + '\', \'' + c.name.replace(/'/g, "\\'") + '\')" style="display:flex;align-items:center;gap:10px;padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.15s;" onmouseover="this.style.background=\'#f0f0f0\'" onmouseout="this.style.background=\'transparent\'">' +
      avatar +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:0.85rem;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + c.name + '</div>' +
      '<div style="font-size:0.72rem;color:var(--muted);">' + c.username + (c.org ? ' \u00b7 ' + c.org : '') + '</div>' +
      '</div>' +
      '</div>';
  });
  listEl.innerHTML = html;
}

function porukeSelectRecipient(username, name) {
  porukeSelectedRecipient = username;
  document.getElementById('poruke-contact-list').style.display = 'none';
  document.getElementById('poruke-search').style.display = 'none';
  const display = document.getElementById('poruke-selected-display');
  display.style.display = 'flex';
  document.getElementById('poruke-selected-text').textContent = name + ' (' + username + ')';
}

function porukeClearRecipient() {
  porukeSelectedRecipient = null;
  document.getElementById('poruke-contact-list').style.display = 'block';
  document.getElementById('poruke-search').style.display = 'block';
  document.getElementById('poruke-selected-display').style.display = 'none';
  document.getElementById('poruke-search').value = '';
  porukeFilterContacts();
}

let porukeAttachments = [];

function porukeAttachPhoto() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      // Compress image
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const maxW = 800, maxH = 1000;
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        porukeAttachments.push({ type: 'image', data: dataUrl, name: file.name });
        porukeRenderAttachments();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function porukeAttachFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2000000) {
      alert('Fajl je prevelik. Maximum 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
      porukeAttachments.push({ type: 'file', data: ev.target.result, name: file.name, mime: file.type });
      porukeRenderAttachments();
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function porukeRenderAttachments() {
  const el = document.getElementById('poruke-attachments');
  if (!el) return;
  if (porukeAttachments.length === 0) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  let html = '';
  porukeAttachments.forEach((a, i) => {
    if (a.type === 'image') {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px;background:white;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;">' +
        '<img src="' + a.data + '" style="width:40px;height:40px;border-radius:6px;object-fit:cover;">' +
        '<span style="flex:1;font-size:0.78rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + a.name + '</span>' +
        '<button onclick="porukeRemoveAttachment(' + i + ')" style="background:#e53935;color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.65rem;">\u2715</button>' +
        '</div>';
    } else {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:6px;background:white;border:1px solid var(--border);border-radius:8px;margin-bottom:4px;">' +
        '<div style="width:40px;height:40px;border-radius:6px;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">\ud83d\udcc1</div>' +
        '<span style="flex:1;font-size:0.78rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + a.name + '</span>' +
        '<button onclick="porukeRemoveAttachment(' + i + ')" style="background:#e53935;color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:0.65rem;">\u2715</button>' +
        '</div>';
    }
  });
  el.innerHTML = html;
}

function porukeRemoveAttachment(idx) {
  porukeAttachments.splice(idx, 1);
  porukeRenderAttachments();
}

async function porukeSend() {
  const recipient = porukeSelectedRecipient;
  const currentUser = (localStorage.getItem(KM_CURRENT_USER) || '').toLowerCase();
  if (currentUser === 'test01' && recipient && recipient.toLowerCase() !== 'milos.avramov') {
    document.getElementById('poruke-send-status').textContent = 'Možete slati poruke samo Milošu Avramovu';
    document.getElementById('poruke-send-status').style.color = 'var(--danger)';
    return;
  }
  const text = document.getElementById('poruke-text')?.value?.trim();
  const statusEl = document.getElementById('poruke-send-status');
  const sender = getCurrentUsername();
  const senderName = getDisplayName();
  
  if (!recipient) {
    if (statusEl) { statusEl.textContent = '\u26A0\uFE0F Izaberite primaoca'; statusEl.style.color = '#e53935'; }
    return;
  }
  if (!text && porukeAttachments.length === 0) {
    if (statusEl) { statusEl.textContent = '\u26A0\uFE0F Unesite tekst ili dodajte fajl'; statusEl.style.color = '#e53935'; }
    return;
  }
  
  let recipientName = recipient;
  if (typeof imenikData !== 'undefined') {
    const found = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === recipient);
    if (found) recipientName = found.ime || found.name || recipient;
  }
  
  if (statusEl) { statusEl.textContent = 'Slanje...'; statusEl.style.color = 'var(--muted)'; }
  
  try {
    let fullText = text || '';
    if (porukeAttachments.length > 0) {
      porukeAttachments.forEach(a => {
        if (a.type === 'image') {
          fullText += (fullText ? '\n' : '') + '[IMG]' + a.data + '[/IMG]';
        } else {
          fullText += (fullText ? '\n' : '') + '[FILE]' + a.name + '|' + a.data + '[/FILE]';
        }
      });
    }
    const res = await fetch(KM_API_BASE + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, recipient, text: fullText, senderName, recipientName })
    });
    const data = await res.json();
    if (data.success) {
      if (statusEl) { statusEl.textContent = '\u2705 Poruka poslata!'; statusEl.style.color = '#43a047'; }
      document.getElementById('poruke-text').value = '';
      porukeAttachments = [];
      setTimeout(() => porukeView('sent'), 1200);
    } else {
      if (statusEl) { statusEl.textContent = '\u26A0\uFE0F Greska: ' + (data.error || 'Nepoznata'); statusEl.style.color = '#e53935'; }
    }
  } catch (e) {
    if (statusEl) { statusEl.textContent = '\u26A0\uFE0F Greska pri slanju'; statusEl.style.color = '#e53935'; }
  }
}

function porukePreviewText(text) {
  if (!text) return '';
  let t = text.replace(/\[IMG\]data:image\/[^\]]+\[\/IMG\]/g, '\ud83d\udcf7 [Slika]');
  t = t.replace(/\[FILE\][^|]+\|[^\]]+\[\/FILE\]/g, function(match) {
    const name = match.match(/\[FILE\]([^|]+)/);
    return '\ud83d\udcc1 ' + (name ? name[1] : 'Fajl');
  });
  return t.substring(0, 100);
}

function porukeFormatMessage(text) {
  if (!text) return '';
  let html = text;
  // Images
  html = html.replace(/\[IMG\](data:image\/[^\]]+)\[\/IMG\]/g, '<img src="$1" style="max-width:100%;border-radius:8px;margin:6px 0;cursor:pointer;" onclick="porukeZoomImage(this.src)">');
  // Files
  html = html.replace(/\[FILE\]([^|]+)\|([^\]]+)\[\/FILE\]/g, '<a href="$2" download="$1" style="display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:var(--navy);color:white;border-radius:8px;text-decoration:none;font-size:0.82rem;margin:6px 0;">\ud83d\udcc1 $1</a>');
  return html;
}

function porukeZoomImage(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:200;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.innerHTML = '<img src="' + src + '" style="max-width:95%;max-height:90%;border-radius:8px;">';
  overlay.onclick = function() { overlay.remove(); };
  document.body.appendChild(overlay);
}

function porukeOpenMessage(msgId, type) {
  const list = type === 'inbox' ? porukeInbox : porukeSent;
  const msg = list.find(m => m.id === msgId);
  if (!msg) return;
  const isReceived = type === 'inbox';
  const otherName = isReceived ? (msg.senderName || msg.sender || 'Nepoznato') : (msg.recipientName || msg.recipient || 'Nepoznato');
  const dt = new Date(msg.created_date || msg.createdAt || Date.now());
  const time = dt.toLocaleString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const text = msg.text || '';
  const content = document.getElementById('poruke-content');
  if (!content) return;
  content.innerHTML = 
    '<div style="padding:8px 0;">' +
    '<button onclick="porukeView(\'' + type + '\')" style="background:none;border:none;color:var(--navy);font-size:0.82rem;cursor:pointer;margin-bottom:12px;">\u2190 Nazad</button>' +
    '<div style="background:white;border:1.5px solid var(--border);border-radius:12px;padding:14px;">' +
    '<div style="font-size:0.72rem;color:var(--muted);">' + (isReceived ? 'Od' : 'Primalac') + '</div>' +
    '<div style="font-weight:700;font-size:0.95rem;color:var(--text);margin-bottom:6px;">' + otherName + '</div>' +
    '<div style="font-size:0.72rem;color:var(--muted);margin-bottom:10px;">' + time + (isReceived ? '' : (msg.read ? ' \u00b7 \u2713\u2713 Procitano' : ' \u00b7 \u2713 Poslato')) + '</div>' +
    '<div style="font-size:0.88rem;color:var(--text);line-height:1.5;white-space:pre-wrap;">' + porukeFormatMessage(text) + '</div>' +
    '</div>' +
    (isReceived ? '<button onclick="porukeReply(\'' + (msg.sender || '') + '\')" style="width:100%;padding:12px;background:var(--navy);color:white;border:none;border-radius:10px;font-size:0.88rem;font-weight:700;cursor:pointer;margin-top:10px;">\u21A9\uFE0F Odgovori</button>' : '') +
    '</div>';
  
  if (isReceived && !msg.read) {
    fetch(KM_API_BASE + '/markAsRead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: msgId })
    }).then(() => {
      msg.read = true;
      porukeCheckNew();
    }).catch(() => {});
  }
}

function porukeReply(recipientUsername) {
  porukeView('compose');
  setTimeout(() => {
    let displayName = recipientUsername;
    if (typeof imenikData !== 'undefined') {
      const found = imenikData.find(p => imenikToUsername(p.ime || p.name || '') === recipientUsername);
      if (found) displayName = found.ime || found.name || recipientUsername;
    }
    porukeSelectRecipient(recipientUsername, displayName);
    const txt = document.getElementById('poruke-text');
    if (txt) txt.focus();
  }, 100);
}

// ===== PRIJAVA / AUTENTIKACIJA =====
// Napomena: ovo je jednostavna zaštita na nivou klijenta (fiksni korisnik/šifra),
// dovoljna da spreči slučajan pristup, ali nije prava serverska autentikacija.
const KM_AUTH_KEY = 'km_auth_v1';
const KM_USERS_KEY = 'km_users_v1';
const KM_CURRENT_USER = 'km_current_user';
const KM_DISPLAY_NAME = 'km_display_name';

// Get users from localStorage, seed with default if empty
function transliterateSerbian(text) {
  const map = {
    '\u010d': 'c', '\u010c': 'C', '\u0107': 'c', '\u0106': 'C',
    '\u0111': 'dj', '\u0110': 'Dj', '\u0161': 's', '\u0160': 'S',
    '\u017e': 'z', '\u017d': 'Z'
  };
  return text.replace(/[\u010d\u010c\u0107\u0106\u0111\u0110\u0161\u0160\u017e\u017d]/g, ch => map[ch] || ch);
}

function imenikToUsername(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return transliterateSerbian(parts[0] || '').toLowerCase();
  const first = parts[0];
  const last = parts[parts.length - 1];
  return transliterateSerbian(first + '.' + last);
}

function getImenikUsers() {
  return (typeof imenikData !== 'undefined' ? imenikData : []).map(c => ({
    username: imenikToUsername(c.name),
    password: (c.phones && c.phones[0]) ? c.phones[0] : '',
    displayName: c.name,
    role: 'user',
    source: 'imenik'
  })).filter(u => u.username && u.password);
}

function getKMUsers() {
  let users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || 'null');
  if (!users) {
    users = [{ username: 'admin', password: 'admin', role: 'admin', created: Date.now() }];
    localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  }
  // Ensure test01 user always exists
  if (!users.find(x => x.username.toLowerCase() === "test01")) {
    users.push({ username: "test01", password: "test01", role: "user", created: Date.now() });
    localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  }
  const imenikUsers = getImenikUsers();
  return [...users, ...imenikUsers];
}

function getCurrentUser() {
  return localStorage.getItem(KM_DISPLAY_NAME) || localStorage.getItem(KM_CURRENT_USER) || '';
}

function updateCurrentUserDisplay() {
  var display = getCurrentUser();
  var el = document.querySelector('.header-text p');
  if (el && display) el.textContent = '@' + display;
}

function isLoggedIn() {
  return localStorage.getItem(KM_AUTH_KEY) === '1';
}

function showRegisterForm() {
  document.getElementById('login-form-box').style.display = 'none';
  document.getElementById('register-form-box').style.display = 'block';
  document.getElementById('reg-username').focus();
}

function showLoginForm() {
  document.getElementById('register-form-box').style.display = 'none';
  document.getElementById('login-form-box').style.display = 'block';
  document.getElementById('login-username').focus();
}

function doRegister() {
  const u = (document.getElementById('reg-username').value || '').trim();
  const p = document.getElementById('reg-password').value || '';
  const p2 = document.getElementById('reg-password2').value || '';
  const errEl = document.getElementById('register-error');

  if (u.length < 3) { errEl.textContent = 'Ime.Prezime mora imati min. 3 karaktera!'; errEl.style.display = 'block'; return; }
  if (p.length < 4) { errEl.textContent = 'Broj telefona mora imati min. 4 karaktera!'; errEl.style.display = 'block'; return; }
  if (p !== p2) { errEl.textContent = 'Šifre se ne poklapaju!'; errEl.style.display = 'block'; return; }

  const users = getKMUsers();
  if (users.find(x => x.username.toLowerCase() === u.toLowerCase())) {
    errEl.textContent = 'Ime.Prezime već postoji!'; errEl.style.display = 'block'; return;
  }

  users.push({ username: u, password: p, role: 'user', created: Date.now() });
  localStorage.setItem(KM_USERS_KEY, JSON.stringify(users));
  errEl.style.display = 'none';

  // Auto-login
  localStorage.setItem(KM_AUTH_KEY, '1');
  localStorage.setItem(KM_CURRENT_USER, u);
  porukeStartPolling();
  document.getElementById('reg-password').value = '';
  document.getElementById('reg-password2').value = '';
  var tabLogin = document.getElementById('tab-login'); if (tabLogin) tabLogin.style.display = 'none';
  switchTab('docs');
  showToast('✅ Nalog kreiran! Dobrodošli, ' + u);
}


function showForgotPassword() {
  document.getElementById('login-form-box').style.display = 'none';
  document.getElementById('register-form-box').style.display = 'none';
  var fp = document.getElementById('forgot-password-box');
  if (fp) fp.style.display = 'block';
}

function resetPassword() {
  var username = (document.getElementById('forgot-username').value || '').trim().toLowerCase();
  var errEl = document.getElementById('forgot-error');
  var successEl = document.getElementById('forgot-success');
  errEl.style.display = 'none';
  successEl.style.display = 'none';
  
  if (!username) {
    errEl.textContent = 'Unesite korisničko ime.';
    errEl.style.display = 'block';
    return;
  }
  
  // Pronadji korisnika u imeniku
  var imenikUsers = getImenikUsers();
  var imUser = imenikUsers.find(function(x) { return x.username.toLowerCase() === username; });
  
  if (!imUser) {
    errEl.textContent = 'Korisnik nije pronađen u imeniku.';
    errEl.style.display = 'block';
    return;
  }
  
  // Ukloni korisnika iz localStorage (km_users_v1) ako postoji - vratice se na imenik default
  var users = JSON.parse(localStorage.getItem(KM_USERS_KEY) || '[]');
  var filtered = users.filter(function(x) { return x.username.toLowerCase() !== username; });
  localStorage.setItem(KM_USERS_KEY, JSON.stringify(filtered));
  
  var phone = imUser.password || '';
  var maskedPhone = phone.length > 3 ? phone.substring(0, 3) + '***' + phone.substring(phone.length - 3) : '***';
  successEl.innerHTML = '✅ Lozinka resetovana! Vaša podrazumevana lozinka je broj telefona iz imenika: <b>' + maskedPhone + '</b><br>Prijavite se sa njom.';
  successEl.style.display = 'block';
  document.getElementById('forgot-username').value = '';
}

function doLogin() {
  const rawU = (document.getElementById('login-username').value || '').trim();
  const p = (document.getElementById('login-password').value || '').trim();
  const errEl = document.getElementById('login-error');
  const normPhone = ph => (ph || '').replace(/[^0-9+]/g, '');
  // Normalizuj username: "S A" -> "s.a", "SA" -> "s.a", "S.A" -> "s.a"
  const normUser = s => s.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').replace(/\.+/g, '.');
  const u = normUser(rawU);
  
  // 1. Probaj iz svih korisnika (localStorage + imenik)
  const users = getKMUsers();
  let user = users.find(x => normUser(x.username) === u && x.password === p);
  if (!user) {
    user = users.find(x => normUser(x.username) === u && x.password && normPhone(x.password) === normPhone(p));
  }
  
  // 2. Fallback: direktno iz imenika (uvek radi, bez obzira na localStorage)
  if (!user) {
    const imenikUsers = getImenikUsers();
    const imUser = imenikUsers.find(x => normUser(x.username) === u);
    if (imUser && imUser.password) {
      if (imUser.password === p || normPhone(imUser.password) === normPhone(p)) {
        user = imUser;
      }
    }
  }
  
  // 3. Fallback: admin sa default lozinkom
  if (!user && u.toLowerCase() === 'admin' && p === 'admin') {
    user = { username: 'admin', password: 'admin', displayName: 'Admin', role: 'admin' };
  }

  if (user) {
    localStorage.setItem(KM_AUTH_KEY, '1');
    localStorage.setItem(KM_CURRENT_USER, user.username);
    localStorage.setItem(KM_DISPLAY_NAME, user.displayName || user.username);
    // Set login flag IMMEDIATELY — porukeCheckNew will pick it up
    localStorage.setItem('km_pendingLoginLog', navigator.userAgent.substring(0, 120));
    errEl.style.display = 'none';
    document.getElementById('login-password').value = '';
    var tabLogin = document.getElementById('tab-login'); if (tabLogin) tabLogin.style.display = 'none';
    switchTab('docs');
    const displayName = user.displayName || user.username;
    if (typeof showToast === 'function') showToast('\u2705 Dobrodo' + '\u0161' + 'li, ' + displayName);
    updateCurrentUserDisplay();
    checkAdminAccess();
    // Start message polling and push subscription after login
    porukeStartPolling();
    // subscribeToPush() - odlozeno, poziva se iz porukeStartPolling
  } else {
    errEl.style.display = 'block';
    document.getElementById('login-password').value = '';
  }
}

function doLogout() {
  localStorage.removeItem(KM_AUTH_KEY);
  localStorage.removeItem(KM_CURRENT_USER);
  showLoginForm();
  switchTab('login');
  if (typeof showToast === 'function') showToast('👋 Odjavljeni ste');
}

// Na učitavanju stranice: ako korisnik nije prijavljen, prikaži ekran za prijavu

// Mouse wheel horizontal scroll for nav on desktop
(function() {
  var navEl = document.querySelector('nav');
  if (!navEl) return;
  navEl.addEventListener('wheel', function(e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      navEl.scrollLeft += e.deltaY;
    }
  }, { passive: false });
})();

(function initAuthGate() {
  // Safety: hide loader after 8s no matter what
  setTimeout(function() {
    var l = document.getElementById('app-loader');
    if (l) { l.classList.add('hidden'); setTimeout(function() { if(l) l.remove(); }, 500); }
  }, 8000);
  function gateCheck() {
    try {
      initDarkMode();
      if (!isLoggedIn()) {
        switchTab('login');
      } else {
        switchTab('docs');
        // Start polling and push subscription for returning users
        porukeStartPolling();
        // subscribeToPush() - odlozeno, poziva se iz porukeStartPolling
      }
    } catch(e) {
      document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
      var ls = document.getElementById('screen-login');
      if (ls) { ls.classList.add('active'); ls.style.display = 'flex'; }
    }
    // Hide loader
    var loader = document.getElementById('app-loader');
    if (loader) { loader.classList.add('hidden'); setTimeout(function() { loader.remove(); }, 500); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', gateCheck);
  } else {
    gateCheck();
  }
})();

// ===== DOKUMENTI =====
function newDoc() {
  currentDocId = null;
  document.getElementById('doc-title').value = '';
  document.getElementById('doc-editor').innerHTML = '';
  document.getElementById('view-list').style.display = 'none';
  document.getElementById('view-editor').style.display = 'flex';
  document.getElementById('doc-editor').focus();
}

function backToList() {
  document.getElementById('view-editor').style.display = 'none';
  document.getElementById('view-list').style.display = 'block';
  renderDocs();
}

function saveDoc() {
  const title = document.getElementById('doc-title').value.trim() || 'Bez naslova';
  const content = document.getElementById('doc-editor').innerHTML;
  const now = new Date().toLocaleDateString('sr-RS', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  if (currentDocId !== null) {
    const idx = docs.findIndex(d => d.id === currentDocId);
    if (idx > -1) { docs[idx].title = title; docs[idx].content = content; docs[idx].date = now; }
  } else {
    currentDocId = Date.now();
    docs.unshift({ id: currentDocId, title, content, date: now });
  }
  localStorage.setItem('bk_docs', JSON.stringify(docs));
  showToast('✅ Dokument sačuvan');
}

function loadDoc(id) {
  const d = docs.find(x => x.id === id);
  if (!d) return;
  currentDocId = id;
  document.getElementById('doc-title').value = d.title;
  document.getElementById('doc-editor').innerHTML = d.content;
  document.getElementById('view-list').style.display = 'none';
  document.getElementById('view-editor').style.display = 'flex';
}

function deleteDoc(id, e) {
  e.stopPropagation();
  if (!confirm('Obrisati ovaj dokument?')) return;
  docs = docs.filter(d => d.id !== id);
  localStorage.setItem('bk_docs', JSON.stringify(docs));
  renderDocs();
}

function renderDocs() {
  const el = document.getElementById('saved-list');
  let html = '';

  // Ugradjeni dokumenti (uvek prikazani, ne mogu se brisati)
  html += `<div style="font-size:0.68rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:4px 2px 2px;">Ugrađeni obrasci</div>`;
  html += ugradeniDocs.map(d => `
    <div class="doc-card" onclick="loadUgradeni('${d.id}')">
      <span class="doc-card-icon">${d.icon}</span>
      <div class="doc-card-info">
        <div class="doc-card-title">${d.title}</div>
        <div class="doc-card-date">${d.date}</div>
      </div>
      <span style="font-size:0.68rem;color:var(--accent);font-weight:700;padding:4px 6px;">OBRAZAC</span>
    </div>
  `).join('');

  // Korisnicki dokumenti
  if (docs.length) {
    html += `<div style="font-size:0.68rem;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);padding:8px 2px 2px;">Moji dokumenti</div>`;
    html += docs.map(d => `
      <div class="doc-card" onclick="loadDoc(${d.id})">
        <span class="doc-card-icon">📝</span>
        <div class="doc-card-info">
          <div class="doc-card-title">${d.title}</div>
          <div class="doc-card-date">${d.date}</div>
        </div>
        <span class="doc-card-del" onclick="deleteDoc(${d.id}, event)">🗑️</span>
      </div>
    `).join('');
  }

  el.innerHTML = html;
}

function loadUgradeni(id) {
  const d = ugradeniDocs.find(x => x.id === id);
  if (!d) return;
  currentDocId = null; // tretiraj kao novi dok (da se sačuva kao kopija)
  document.getElementById('doc-title').value = d.title;
  document.getElementById('doc-editor').innerHTML = d.content;
  document.getElementById('view-list').style.display = 'none';
  document.getElementById('view-editor').style.display = 'flex';
  showToast('📋 Obrazac otvoren – izmeni i sačuvaj kao novi dokument');
}

function shareDoc(via) {
  var title = document.getElementById('doc-title').value.trim() || 'Dokument';
  var editorContent = document.getElementById('doc-editor').innerHTML;
  
  // Unique filename with timestamp
  var now = new Date();
  var ts = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
  var safeName = title.replace(/[^a-zA-Z0-9 \-]/g, '').trim() || 'Dokument';
  var fileName = safeName + '_' + ts + '.doc';
  
  // Build Word-compatible HTML
  var htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + title + '</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--></head><body><h1>' + title + '</h1>' + editorContent + '</body></html>';

  
  var blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
  var url = URL.createObjectURL(blob);
  
  // Step 1: Download the Word file IMMEDIATELY (synchronous, within user gesture)
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  // Clean up after delay
  setTimeout(function() {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 3000);
  
  // Step 2: Try Web Share API with file (async, may fail on some devices)
  if (navigator.share) {
    var file = new File([blob], fileName, { type: 'application/msword' });
    navigator.share({ title: title, text: title, files: [file] }).then(function() {
      showToast('Dokument deljen!');
    }).catch(function(e) {
      if (e.name !== 'AbortError') {
        // Share failed, file already downloaded
        showToast('Word fajl preuzet: ' + fileName);
      }
    });
  } else {
    showToast('Word preuzet: ' + fileName + '. Prilozi ga u ' + (via === 'viber' ? 'Viberu' : 'mailu') + '.');
  }
  
  // Step 3: Open email/viber after short delay
  setTimeout(function() {
    if (via === 'viber') {
      window.open('viber://forward?text=' + encodeURIComponent(title), '_blank');
    } else {
      window.open('mailto:?subject=' + encodeURIComponent(title), '_blank');
    }
  }, 500);
}

function fmt(cmd) { document.getElementById('doc-editor').focus(); document.execCommand(cmd, false, null); }

let savedRange = null;
function saveSelection() {
  const sel = window.getSelection();
  if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
}
document.addEventListener('selectionchange', function() {
  const editor = document.getElementById('doc-editor');
  if (editor && editor.contains(document.activeElement)) saveSelection();
});

function insertCameraPhoto() {
  document.getElementById('camera-capture').click();
}

function handlePhoto(event, fromCamera) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const editor = document.getElementById('doc-editor');
    editor.focus();
    // Restore cursor position
    if (savedRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    }
    // Insert image as base64 — resized for storage
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const maxW = 800, maxH = 1000;
      let w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      document.execCommand('insertHTML', false, '<div style="text-align:center;margin:10px 0;"><img src="' + dataUrl + '" style="max-width:100%;border:1px solid #ccc;border-radius:8px;"></div>');
      savedRange = null;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function downloadDocx() {
  const title = document.getElementById('doc-title').value.trim() || 'Dokument';
  const content = document.getElementById('doc-editor').innerHTML;

  // Build a proper Word-compatible HTML document
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml>
      <![endif]-->
      
    </head>
    <body>
      <h1>${title}</h1>
      ${content}
    


</body>
    </html>`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const now = new Date();
  const ts = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '_' + String(now.getHours()).padStart(2,'0') + String(now.getMinutes()).padStart(2,'0');
  a.download = title.replace(/[^a-zA-Z0-9_\-čćšđžČĆŠĐŽ ]/g, '') + '_' + ts + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📄 Dokument preuzet!');
}

// ===== PRAVNI AKTI =====
