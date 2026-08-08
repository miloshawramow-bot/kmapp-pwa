// Web Push implementation for Cloudflare Workers using Web Crypto API
const VAPID_SUBJECT = 'mailto:kmapp@beograd.gov.rs';

function base64UrlDecode(str) {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function base64UrlEncode(arr) {
  const bytes = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importEcKey(privateKeyStr, forECDH) {
  const keyBytes = base64UrlDecode(privateKeyStr);
  return crypto.subtle.importKey('pkcs8', keyBytes,
    { name: forECDH ? 'ECDH' : 'ECDSA', namedCurve: 'P-256' },
    forECDH, forECDH ? ['deriveBits'] : ['sign']);
}

async function createVapidJwt(privateKeyStr, audience) {
  const enc = new TextEncoder();
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp: Math.floor(Date.now()/1000)+12*3600, sub: VAPID_SUBJECT };
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const unsigned = headerB64 + '.' + payloadB64;
  const key = await importEcKey(privateKeyStr, false);
  const sig = new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, key, enc.encode(unsigned)));
  return unsigned + '.' + base64UrlEncode(sig);
}

async function hkdf(ikm, salt, info, length) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    {name:'HKDF',hash:'SHA-256',salt:salt,info:enc.encode(info)}, key, length*8));
}

async function encryptPayload(payload, p256dh, auth) {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payload);
  const pubKeyBytes = base64UrlDecode(p256dh);
  const pubKey = await crypto.subtle.importKey('raw', pubKeyBytes, {name:'ECDH',namedCurve:'P-256'}, false, []);
  const ephemKey = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'}, true, ['deriveBits']);
  const ecdhPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephemKey.publicKey));
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:pubKey}, ephemKey.privateKey, 256));
  const authSecret = base64UrlDecode(auth);
  const ikm = new Uint8Array(authSecret.length + 1 + sharedSecret.length);
  ikm.set(authSecret, 0);
  ikm[authSecret.length] = sharedSecret.length;
  ikm.set(sharedSecret, authSecret.length + 1);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const infoPrefix = new TextEncoder().encode('WebPush: info\0');
  const infoBytes = new Uint8Array(infoPrefix.length + ecdhPubRaw.length + pubKeyBytes.length);
  infoBytes.set(infoPrefix, 0);
  infoBytes.set(ecdhPubRaw, infoPrefix.length);
  infoBytes.set(pubKeyBytes, infoPrefix.length + ecdhPubRaw.length);
  const cek = await hkdf(ikm, salt, infoBytes, 16);
  const nonce = await hkdf(ikm, new Uint8Array(16), 'Content-Encoding: nonce\0', 12);
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce}, aesKey, plaintext));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header.set(rs, 16);
  header[20] = 65;
  header.set(ecdhPubRaw, 21);
  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header, 0);
  result.set(encrypted, header.length);
  return result;
}

export async function sendWebPush(subscription, payload, vapidPrivateKey, vapidPublicKey) {
  try {
    const sub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
    const endpoint = sub.endpoint;
    if (!endpoint) return { success: false, error: 'No endpoint' };
    const audience = new URL(endpoint).origin;
    const vapidJwt = await createVapidJwt(vapidPrivateKey, audience);
    const encrypted = await encryptPayload(JSON.stringify(payload), sub.keys.p256dh, sub.keys.auth);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': 'vapid t=' + vapidJwt + ', k=' + vapidPublicKey,
        'TTL': '2419200',
      },
      body: encrypted,
    });
    if (response.ok || response.status === 201) return { success: true, status: response.status };
    const text = await response.text();
    console.log('Push failed:', response.status, text);
    return { success: false, error: response.status + ': ' + text };
  } catch (e) {
    console.log('Push error:', e.message);
    return { success: false, error: e.message };
  }
}
