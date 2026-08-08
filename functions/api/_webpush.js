// Web Push implementation for Cloudflare Workers using Web Crypto API
// Correct per RFC 8291 / RFC 8188 (verified against web-push npm library)
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

// HKDF using Web Crypto API: HKDF(salt, ikm, info, length)
async function hkdf(salt, ikm, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits(
    {name:'HKDF', hash:'SHA-256', salt: salt, info: info}, key, length * 8));
}

async function encryptPayload(payload, p256dh, auth) {
  const enc = new TextEncoder();

  // Decode subscription keys
  const receiverPubKey = base64UrlDecode(p256dh);  // 65 bytes (uncompressed P-256)
  const authSecret = base64UrlDecode(auth);         // 16 bytes

  // Generate ephemeral ECDH key pair (sender)
  const ephemKey = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveBits']);
  const senderPubKey = new Uint8Array(await crypto.subtle.exportKey('raw', ephemKey.publicKey));  // 65 bytes

  // Import recipient public key
  const receiverKey = await crypto.subtle.importKey('raw', receiverPubKey, {name:'ECDH', namedCurve:'P-256'}, false, []);

  // Derive ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    {name:'ECDH', public: receiverKey}, ephemKey.privateKey, 256));  // 32 bytes

  // === Step 1: Derive 32-byte secret from auth secret and ECDH shared secret ===
  // HKDF(salt=authSecret, ikm=sharedSecret, info="WebPush: info\0" || receiverPub || senderPub, 32)
  const webpushInfo = new Uint8Array(14 + receiverPubKey.length + senderPubKey.length);
  webpushInfo.set(enc.encode('WebPush: info\0'), 0);
  webpushInfo.set(receiverPubKey, 14);
  webpushInfo.set(senderPubKey, 14 + receiverPubKey.length);

  const secret = await hkdf(authSecret, sharedSecret, webpushInfo, 32);  // 32 bytes

  // === Step 2: Derive CEK (16 bytes) and nonce (12 bytes) from random salt and secret ===
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const cekInfo = enc.encode('Content-Encoding: aes128gcm\0');
  const cek = await hkdf(salt, secret, cekInfo, 16);  // 16 bytes

  const nonceInfo = enc.encode('Content-Encoding: nonce\0');
  const nonce = await hkdf(salt, secret, nonceInfo, 12);  // 12 bytes

  // === Step 3: Encrypt with AES-128-GCM ===
  // Plaintext = payload || delimiter (0x02 for last/only record per RFC 8188)
  const plaintext = enc.encode(payload);
  const paddedPlaintext = new Uint8Array(plaintext.length + 1);
  paddedPlaintext.set(plaintext, 0);
  paddedPlaintext[plaintext.length] = 0x02;  // last record delimiter

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    {name:'AES-GCM', iv: nonce}, aesKey, paddedPlaintext));

  // === Step 4: Build aes128gcm header ===
  // salt(16) || rs(4, big-endian) || idlen(1) || keyId(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  header.set(rs, 16);
  header[20] = 65;  // keyId length
  header.set(senderPubKey, 21);

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
        'Urgency': 'high',
      },
      body: encrypted,
    });
    if (response.ok || response.status === 201) return { success: true, status: response.status };
    const text = await response.text();
    return { success: false, error: response.status + ': ' + text };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
