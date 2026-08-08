// Send push without payload to test if SW receives the event at all
const VAPID_PUBLIC_KEY = 'BO_VicJbLYfwhwCq48A6-cg4I-LHCbKLyN9BH6QvKM6RlUXzEMh74FleJ2fpQAsStTg0MhGiBe08mpieqLaoPwI';
const VAPID_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX-ntp851MVQakzF9bsB54QAN08ce07ZW8NGdEEM-aUahRANCAATv1YnCWy2H8IcAquPAOvnIOCPixwmyi8jfQR-kLyjOkZVF8xDIe-BZXidn6UALErU4NDIRogXtPJqYnqi2qD8C';

export async function onRequestGet({ request, env }) {
  try {
    const { DB } = env;
    const url = new URL(request.url);
    const username = url.searchParams.get('username') || 'Milos.Avramov';
    
    const sub = await DB.prepare('SELECT subscription FROM push_subscriptions WHERE username = ? COLLATE NOCASE')
      .bind(username).first();
    
    if (!sub || !sub.subscription) {
      return Response.json({ success: false, error: 'No subscription for ' + username });
    }
    
    const subObj = JSON.parse(sub.subscription);
    const audience = new URL(subObj.endpoint).origin;
    
    // Create VAPID JWT
    const enc = new TextEncoder();
    function b64url(buf) {
      const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      let bin = '';
      for (const b of bytes) bin += String.fromCharCode(b);
      return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function b64urlDecode(str) {
      const padded = str + '='.repeat((4 - str.length % 4) % 4);
      const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(base64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      return arr;
    }
    
    const header = { typ: 'JWT', alg: 'ES256' };
    const payload = { aud: audience, exp: Math.floor(Date.now()/1000)+12*3600, sub: 'mailto:kmapp@beograd.gov.rs' };
    const headerB64 = b64url(enc.encode(JSON.stringify(header)));
    const payloadB64 = b64url(enc.encode(JSON.stringify(payload)));
    const unsigned = headerB64 + '.' + payloadB64;
    
    const keyBytes = b64urlDecode(VAPID_PRIVATE_KEY);
    const key = await crypto.subtle.importKey('pkcs8', keyBytes, {name:'ECDSA',namedCurve:'P-256'}, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, key, enc.encode(unsigned)));
    const jwt = unsigned + '.' + b64url(sig);
    
    // Send push with NO body, NO Content-Encoding
    const resp = await fetch(subObj.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'vapid t=' + jwt + ', k=' + VAPID_PUBLIC_KEY,
        'TTL': '60',
        'Urgency': 'high',
      },
      body: '',
    });
    
    const respText = await resp.text();
    return Response.json({ 
      success: resp.ok || resp.status === 201, 
      status: resp.status, 
      respText: respText.substring(0, 200),
      mode: 'nopayload',
      endpoint: subObj.endpoint.substring(0, 60) + '...'
    });
  } catch(e) {
    return Response.json({ success: false, error: e.message });
  }
}
