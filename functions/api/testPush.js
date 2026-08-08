import { jsonResponse, errorResponse, parseBody } from './_shared.js';
import { sendWebPush } from './_webpush.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    if (!username) return errorResponse('username required');

    const sub = await DB.prepare('SELECT subscription FROM push_subscriptions WHERE username = ?')
      .bind(username).first();

    if (!sub || !sub.subscription) {
      return jsonResponse({ success: false, error: 'No push subscription found for ' + username });
    }

    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    
    if (!vapidPrivateKey || !vapidPublicKey) {
      return jsonResponse({ success: false, error: 'VAPID keys not configured' });
    }

    const result = await sendWebPush(
      sub.subscription,
      {
        title: 'KMapp Test Push',
        body: 'Test notifikacija - ako ovo vidis, push radi!',
        url: 'https://kmapp-n37.pages.dev/',
        tag: 'kmapp-test',
      },
      vapidPrivateKey,
      vapidPublicKey
    );

    return jsonResponse({ success: true, pushResult: result, subscription: sub.subscription.substring(0, 100) + '...' });
  } catch (e) {
    return errorResponse(e.message);
  }
}

// Add a GET handler that returns the subscription and can send no-payload push
export async function onRequestGet({ request, env }) {
  try {
    const { DB } = env;
    const url = new URL(request.url);
    const username = url.searchParams.get('username') || 'Milos.Avramov';
    const mode = url.searchParams.get('mode') || 'info';
    
    const sub = await DB.prepare('SELECT subscription FROM push_subscriptions WHERE username = ? COLLATE NOCASE')
      .bind(username).first();
    
    if (!sub || !sub.subscription) {
      return Response.json({ success: false, error: 'No subscription' });
    }
    
    const subObj = JSON.parse(sub.subscription);
    
    if (mode === 'nopayload') {
      // Send push WITHOUT payload (no encryption) — just test if SW receives the event
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
    }
    
    return Response.json({ 
      success: true, 
      endpoint: subObj.endpoint.substring(0, 60) + '...',
      hasKeys: !!subObj.keys,
      p256dh: subObj.keys?.p256dh?.substring(0, 20) + '...',
      auth: subObj.keys?.auth?.substring(0, 20) + '...',
    });
  } catch(e) {
    return Response.json({ success: false, error: e.message });
  }
}

const VAPID_PUBLIC_KEY = 'BO_VicJbLYfwhwCq48A6-cg4I-LHCbKLyN9BH6QvKM6RlUXzEMh74FleJ2fpQAsStTg0MhGiBe08mpieqLaoPwI';
const VAPID_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX-ntp851MVQakzF9bsB54QAN08ce07ZW8NGdEEM-aUahRANCAATv1YnCWy2H8IcAquPAOvnIOCPixwmyi8jfQR-kLyjOkZVF8xDIe-BZXidn6UALErU4NDIRogXtPJqYnqi2qD8C';
