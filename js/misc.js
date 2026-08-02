// Pre-load gate: force login screen immediately
(function() {
  var screens = document.querySelectorAll('.screen');
  // Wait for DOM to have screens
  function forceLogin() {
    var allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(function(s) {
      if (s.id !== 'screen-login') {
        s.classList.remove('active');
        s.style.display = 'none';
      }
    });
    var loginScreen = document.getElementById('screen-login');
    if (loginScreen) {
      loginScreen.classList.add('active');
      loginScreen.style.display = 'flex';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forceLogin);
  } else {
    forceLogin();
  }
})();