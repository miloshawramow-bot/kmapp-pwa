
// ===== WEATHER (Open-Meteo API - free, no key needed) =====
var weatherData = null;
var weatherLoc = null;

function wmoCodeToEmoji(code) {
  var map = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',
    51:'🌦️',53:'🌦️',55:'🌧️',56:'🌧️',57:'🌧️',
    61:'🌧️',63:'🌧️',65:'🌧️',66:'🌧️',67:'🌧️',
    71:'🌨️',73:'🌨️',75:'❄️',77:'❄️',
    80:'🌦️',81:'🌧️',82:'🌧️',
    85:'🌨️',86:'❄️',
    95:'⛈️',96:'⛈️',99:'⛈️'};
  return map[code] || '🌡️';
}

function wmoCodeToDesc(code) {
  var map = {0:'Vedro',1:'Pretežno vedro',2:'Delimično oblačno',3:'Oblačno',
    45:'Magla',48:'Magla',
    51:'Laka kiša',53:'Kiša',55:'Jaka kiša',
    56:'Ledena kiša',57:'Ledena kiša',
    61:'Kiša',63:'Kiša',65:'Jaka kiša',
    66:'Ledena kiša',67:'Ledena kiša',
    71:'Sneg',73:'Sneg',75:'Jak sneg',77:'Zrnasti sneg',
    80:'Proliv kiše',81:'Kiša',82:'Jaka kiša',
    85:'Sneg',86:'Jak sneg',
    95:'Grmljavina',96:'Grmljavina sa gradom',99:'Grmljavina sa gradom'};
  return map[code] || '—';
}

function initWeather() {
  if (!navigator.geolocation) { console.log('[Weather] No geolocation'); return; }
  navigator.geolocation.getCurrentPosition(function(pos) {
    var lat = pos.coords.latitude.toFixed(4);
    var lon = pos.coords.longitude.toFixed(4);
    fetchWeather(lat, lon);
    fetchLocationName(lat, lon);
  }, function(err) {
    console.log('[Weather] Geolocation denied:', err.message);
    // Fallback: Belgrade
    fetchWeather(44.8125, 20.4612);
    document.getElementById('weather-loc').textContent = 'Beograd';
  }, { timeout: 10000, enableHighAccuracy: true });
}

function fetchWeather(lat, lon) {
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature' +
    '&hourly=temperature_2m,weather_code,precipitation_probability' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=auto&forecast_days=7';
  fetch(url).then(function(r) { return r.json(); }).then(function(data) {
    weatherData = data;
    var temp = Math.round(data.current.temperature_2m);
    var code = data.current.weather_code;
    document.getElementById('weather-icon').textContent = wmoCodeToEmoji(code);
    document.getElementById('weather-temp').textContent = temp + '°';
    document.getElementById('weather-widget').style.display = 'flex';
  }).catch(function(e) { console.log('[Weather] Fetch error:', e); });
}

function fetchLocationName(lat, lon) {
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon, {
    headers: { 'Accept-Language': 'sr' }
  }).then(function(r) { return r.json(); }).then(function(data) {
    var addr = data.address || {};
    var name = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || addr.county || '—';
    // Strip prefixes: "Gradska opština", "Gradska opstina", "Grad", "Opština", "Opstina"
    name = name.replace(/^Gradska\s+op[šs]tina\s+/i, '')
               .replace(/^Gradska\s+opstina\s+/i, '')
               .replace(/^Op[šs]tina\s+/i, '')
               .replace(/^Opstina\s+/i, '')
               .replace(/^Grad\s+/i, '')
               .trim();
    // Fallback: if name still contains opstina/opština, take the last word
    if (/op[šs]tina/i.test(name)) {
      var parts = name.split(/\s+/);
      name = parts[parts.length - 1];
    }
    weatherLoc = name;
    document.getElementById('weather-loc').textContent = name;
  }).catch(function(e) {
    document.getElementById('weather-loc').textContent = 'Lokacija';
  });
}

function openWeatherForecast() {
  var modal = document.getElementById('weather-modal');
  if (!modal) return;
  modal.classList.add('open');
  loadWeatherModal();
}
function closeWeatherModal() {
  var modal = document.getElementById('weather-modal');
  if (modal) modal.classList.remove('open');
}

function loadWeatherModal() {
  var WC_ICONS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',73:'🌨️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',85:'🌨️',86:'❄️',95:'⛈️',96:'⛈️',99:'⛈️'};
  var WC_DESC = {0:'Vedro',1:'Pretežno vedro',2:'Delimično oblačno',3:'Oblačno',45:'Magla',48:'Magla sa injem',51:'Slaba rosulja',53:'Rosulja',55:'Jaka rosulja',61:'Slab dažd',63:'Kisa',65:'Jak dažd',71:'Slab sneg',73:'Sneg',75:'Jak sneg',80:'Pljuskovi',81:'Jaki pljuskovi',82:'Olujni pljuskovi',85:'Snežni pljuskovi',86:'Jaki snežni pljuskovi',95:'Grmljavinska oluja',96:'Oluja sa gradom',99:'Jaka oluja sa gradom'};
  var DAYS = ['Ned','Pon','Uto','Sre','Čet','Pet','Sub'];

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude.toFixed(4);
      var lon = pos.coords.longitude.toFixed(4);
      // Fetch current + forecast
      var url = 'https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
      fetch(url).then(r=>r.json()).then(function(d) {
        var cur = d.current;
        var code = cur.weather_code;
        document.getElementById('wm-icon').textContent = WC_ICONS[code] || '🌡️';
        document.getElementById('wm-temp').textContent = Math.round(cur.temperature_2m) + '°C';
        document.getElementById('wm-desc').textContent = WC_DESC[code] || 'Nepoznato';
        document.getElementById('wm-meta').textContent = 'Vlažnost: '+cur.relative_humidity_2m+'% · Vetar: '+Math.round(cur.wind_speed_10m)+' km/h';
        document.getElementById('wm-humidity').textContent = cur.relative_humidity_2m + '%';
        document.getElementById('wm-wind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
        document.getElementById('wm-pressure').textContent = Math.round(cur.surface_pressure) + ' hPa';
        // Forecast
        var fc = d.daily;
        var html = '';
        for (var i = 0; i < fc.time.length; i++) {
          var dt = new Date(fc.time[i]);
          var dayName = i === 0 ? 'Danas' : (i === 1 ? 'Sutra' : DAYS[dt.getDay()]);
          var fc_icon = WC_ICONS[fc.weather_code[i]] || '🌡️';
          var fc_desc = WC_DESC[fc.weather_code[i]] || '';
          html += '<div class="weather-forecast-row"><span class="weather-forecast-day">'+dayName+'</span><span class="weather-forecast-icon">'+fc_icon+'</span><span class="weather-forecast-desc">'+fc_desc+'</span><span class="weather-forecast-temps">'+Math.round(fc.temperature_2m_max[i])+'° <span>'+Math.round(fc.temperature_2m_min[i])+'°</span></span></div>';
        }
        document.getElementById('wm-forecast').innerHTML = html;
        // City name from reverse geocode
        fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lon+'&format=json').then(r=>r.json()).then(function(g) {
          var city = g.address.city || g.address.town || g.address.village || 'Beograd';
          document.getElementById('wm-city').textContent = '🌍 ' + city;
        }).catch(function(){});
      }).catch(function(e) {
        document.getElementById('wm-desc').textContent = 'Greška pri učitavanju';
      });
    }, function() {
      // Fallback: Beograd koordinate
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=44.8167&longitude=20.4667&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
      fetch(url).then(r=>r.json()).then(function(d) {
        var cur = d.current;
        var code = cur.weather_code;
        document.getElementById('wm-icon').textContent = WC_ICONS[code] || '🌡️';
        document.getElementById('wm-temp').textContent = Math.round(cur.temperature_2m) + '°C';
        document.getElementById('wm-desc').textContent = WC_DESC[code] || '';
        document.getElementById('wm-humidity').textContent = cur.relative_humidity_2m + '%';
        document.getElementById('wm-wind').textContent = Math.round(cur.wind_speed_10m) + ' km/h';
        document.getElementById('wm-pressure').textContent = Math.round(cur.surface_pressure) + ' hPa';
        document.getElementById('wm-city').textContent = '🌍 Beograd';
        var fc = d.daily;
        var DAYS_ = ['Ned','Pon','Uto','Sre','Čet','Pet','Sub'];
        var html = '';
        for (var i = 0; i < fc.time.length; i++) {
          var dt = new Date(fc.time[i]);
          var dayName = i === 0 ? 'Danas' : (i === 1 ? 'Sutra' : DAYS_[dt.getDay()]);
          html += '<div class="weather-forecast-row"><span class="weather-forecast-day">'+dayName+'</span><span class="weather-forecast-icon">'+(WC_ICONS[fc.weather_code[i]]||'🌡️')+'</span><span class="weather-forecast-desc">'+(WC_DESC[fc.weather_code[i]]||'')+'</span><span class="weather-forecast-temps">'+Math.round(fc.temperature_2m_max[i])+'° <span>'+Math.round(fc.temperature_2m_min[i])+'°</span></span></div>';
        }
        document.getElementById('wm-forecast').innerHTML = html;
      });
    });
  }
}
function closeWeatherForecast() { closeWeatherModal(); }

// Init weather after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWeather);
} else {
  initWeather();
}
