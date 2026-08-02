
// ===== INDEPENDENT LOADER SAFETY (immune to main script crashes) =====
(function() {
  // Show version on loader
  var vText = document.createElement('div');
  vText.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);color:rgba(255,215,0,0.5);font-size:10px;font-family:monospace;z-index:100000;';
  vText.textContent = 'v146';
  document.addEventListener('DOMContentLoaded', function() {
    document.body.appendChild(vText);
  });
  
  // Safety: hide loader after 5s no matter what
  setTimeout(function() {
    var l = document.getElementById('app-loader');
    if (l && !l.classList.contains('hidden')) {
      // Check if gateCheck ran by looking for active screen
      var hasActive = document.querySelector('.screen.active');
      if (!hasActive) {
        // Main script probably crashed - show login screen manually
        var ls = document.getElementById('screen-login');
        if (ls) { ls.classList.add('active'); ls.style.display = 'flex'; }
        var nav = document.querySelector('nav');
        if (nav) { nav.style.display = 'flex'; }
      }
      l.classList.add('hidden');
      setTimeout(function() { if (l) l.remove(); }, 500);
    }
  }, 2000);
  
  // Also make loader dismissible by tapping (emergency)
  setTimeout(function() {
    var l = document.getElementById('app-loader');
    if (l && !l.classList.contains('hidden')) {
      l.style.cursor = 'pointer';
      l.addEventListener('click', function() {
        var hasActive = document.querySelector('.screen.active');
        if (!hasActive) {
          var ls = document.getElementById('screen-login');
          if (ls) { ls.classList.add('active'); ls.style.display = 'flex'; }
          var nav = document.querySelector('nav');
          if (nav) { nav.style.display = 'flex'; }
        }
        l.classList.add('hidden');
        setTimeout(function() { l.remove(); }, 500);
      });
    }
  }, 2000);
})();
