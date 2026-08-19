import { jsonResponse, errorResponse, parseBody } from './_shared.js';
import { sendWebPush } from './_webpush.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const title = body.title || 'KMapp';
    const message = body.message || 'Aplikacija je ažurirana';
    
    const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
    const vapidPublicKey = env.VAPID_PUBLIC_KEY;
    
    if (!vapidPrivateKey || !vapidPublicKey) {
      return errorResponse('VAPID keys not configured');
    }
    
    // Get all push subscriptions
    const subs = await DB.prepare('SELECT username, subscription FROM push_subscriptions').all();
    
    if (!subs.results || subs.results.length === 0) {
      return jsonResponse({ success: false, error: 'No subscriptions found' });
    }
    
    let sent = 0;
    let failed = 0;
    const failures = [];
    
    for (const row of subs.results) {
      if (!row.subscription) continue;
      try {
        const result = await sendWebPush(
          row.subscription,
          { title: title, body: message, url: 'https://kmapp-n37.pages.dev/', tag: 'kmapp-update' },
          vapidPrivateKey,
          vapidPublicKey
        );
        if (result.success) {
          sent++;
        } else {
          failed++;
          failures.push({ username: row.username, error: result.error });
        }
      } catch(e) {
        failed++;
        failures.push({ username: row.username, error: e.message });
      }
    }
    
    return jsonResponse({ success: true, sent: sent, failed: failed, total: subs.results.length, failures: failures.slice(0, 5) });
  } catch (e) {
    return errorResponse(e.message);
  }
}
