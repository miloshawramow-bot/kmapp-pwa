import { jsonResponse, errorResponse, parseBody } from './_shared.js';
import { sendWebPush } from './_webpush.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    if (!username) return errorResponse('username required');

    // Get full subscription data
    const row = await DB.prepare('SELECT * FROM push_subscriptions WHERE username = ? COLLATE NOCASE')
      .bind(username).first();

    if (!row) {
      return jsonResponse({ 
        success: false, 
        error: 'No subscription found for: ' + username,
        suggestion: 'User needs to login and allow notifications'
      });
    }

    // Parse subscription
    let subData;
    try {
      subData = JSON.parse(row.subscription);
    } catch(e) {
      return jsonResponse({
        success: false,
        error: 'Cannot parse subscription JSON',
        raw: row.subscription ? row.subscription.substring(0, 200) : 'NULL'
      });
    }

    const hasEndpoint = !!subData.endpoint;
    const hasP256dh = !!(subData.keys && subData.keys.p256dh);
    const hasAuth = !!(subData.keys && subData.keys.auth);

    // Try sending push with MINIMAL options
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    
    if (!vapidPrivateKey || !vapidPublicKey) {
      return jsonResponse({
        success: false,
        error: 'VAPID keys not configured in environment'
      });
    }

    const result = await sendWebPush(
      row.subscription,
      {
        title: '🔔 KMapp',
        body: 'Dijagnostika - da li vidis ovo?',
        url: 'https://kmapp-n37.pages.dev/'
      },
      vapidPrivateKey,
      vapidPublicKey
    );

    return jsonResponse({
      success: true,
      subscription: {
        hasEndpoint,
        endpointDomain: subData.endpoint ? new URL(subData.endpoint).origin : 'NONE',
        hasP256dh,
        hasAuth,
        p256dhLength: subData.keys && subData.keys.p256dh ? subData.keys.p256dh.length : 0,
        authLength: subData.keys && subData.keys.auth ? subData.keys.auth.length : 0,
      },
      pushResult: result,
      vapidPublicKeyPrefix: vapidPublicKey ? vapidPublicKey.substring(0, 20) : 'MISSING'
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}
