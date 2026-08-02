

// ===== TAP SOUND SYSTEM =====
let tapAudioCtx = null;
let tapSoundEnabled = true;

function initTapSound() {
  try {
    const saved = localStorage.getItem('km_tap_sound');
    if (saved !== null) tapSoundEnabled = saved === 'true';
    // Sync the toggle UI if present
    const toggle = document.getElementById('tap-sound-toggle');
    if (toggle) toggle.checked = tapSoundEnabled;
    const slider = document.getElementById('tap-sound-slider');
    if (slider) {
      const knob = slider.querySelector('span');
      if (tapSoundEnabled) {
        slider.style.background = 'var(--blue)';
        if (knob) knob.style.left = '21px';
      } else {
        slider.style.background = 'var(--border)';
        if (knob) knob.style.left = '3px';
      }
    }
  } catch(e) {}
}

function playTapSound() {
  if (!tapSoundEnabled) return;
  try {
    if (!tapAudioCtx) {
      tapAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (tapAudioCtx.state === 'suspended') tapAudioCtx.resume();
    
    const osc = tapAudioCtx.createOscillator();
    const gain = tapAudioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(tapAudioCtx.destination);
    
    osc.frequency.setValueAtTime(800, tapAudioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, tapAudioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.06, tapAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, tapAudioCtx.currentTime + 0.06);
    
    osc.start(tapAudioCtx.currentTime);
    osc.stop(tapAudioCtx.currentTime + 0.06);
  } catch(e) {}
}

function toggleTapSound() {
  tapSoundEnabled = !tapSoundEnabled;
  localStorage.setItem('km_tap_sound', tapSoundEnabled);
  const slider = document.getElementById('tap-sound-slider');
  if (slider) {
    const knob = slider.querySelector('span');
    if (tapSoundEnabled) {
      slider.style.background = 'var(--blue)';
      if (knob) knob.style.left = '21px';
    } else {
      slider.style.background = 'var(--border)';
      if (knob) knob.style.left = '3px';
    }
  }
  if (tapSoundEnabled) playTapSound();
}

// Global tap sound listener - plays on interactive elements
document.addEventListener('click', function(e) {
  const target = e.target.closest('button, [onclick], .side-menu-item, .acc-header, .settings-row, .tab-btn, .link-card');
  if (target) playTapSound();
}, true);

initTapSound();

