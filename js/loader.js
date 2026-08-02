
// ===== INDEPENDENT LOADER SAFETY (immune to main script crashes) =====
(function() {
  // Version display — read from window.KM_VERSION (set in index.html, always fresh)
  var vText = document.createElement('div');
  vText.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,215,0,0.5);font-size:10px;font-family:monospace;z-index:100000;';
  vText.textContent = window.KM_VERSION || 'v?';
  document.addEventListener('DOMContentLoaded', function() {
    document.body.appendChild(vText);
  });
  
  // Safety: remove loader from DOM — DO NOT touch any screens
  // gateCheck in app-core.js handles which screen to show
  function forceHideLoader() {
    var l = document.getElementById('app-loader');
    if (!l) return;
    l.style.display = 'none';
    l.remove();
  }
  // Only force-hide after 5s as absolute last resort
  setTimeout(forceHideLoader, 5000);
})();
