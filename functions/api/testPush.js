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
