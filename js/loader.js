
// ===== INDEPENDENT LOADER SAFETY (immune to main script crashes) =====
(function() {
  // Version display — read from window.KM_VERSION (set in index.html, always fresh)
  var vText = document.createElement('div');
  vText.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,215,0,0.5);font-size:10px;font-family:monospace;z-index:100000;';
  vText.textContent = window.KM_VERSION || 'v?';
  document.addEventListener('DOMContentLoaded', function() {
    document.body.appendChild(vText);
  });
  
  // Safety: remove loader from DOM after 1.2s no matter what
  function forceHideLoader() {
    var l = document.getElementById('app-loader');
    if (!l) return;
    var hasActive = document.querySelector('.screen.active');
    if (!hasActive) {
      var ls = document.getElementById('screen-login');
      if (ls) { ls.classList.add('active'); ls.style.display = 'flex'; }
      var nav = document.querySelector('nav');
      if (nav) { nav.style.display = 'flex'; }
    }
    l.style.display = 'none';
    l.remove(); // permanently remove from DOM — no more opacity tricks
  }
  setTimeout(forceHideLoader, 1200);
})();
