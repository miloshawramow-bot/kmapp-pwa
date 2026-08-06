import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const existing = await DB.prepare('SELECT id FROM push_subscriptions WHERE username = ?').bind(body.username || '').first();
    const sub = typeof body.subscription === 'string' ? body.subscription : JSON.stringify(body.subscription || {});
    if (existing) {
      await DB.prepare('UPDATE push_subscriptions SET endpoint = ?, subscription = ?, updated_date = datetime(\'now\') WHERE username = ?')
        .bind(body.endpoint || '', sub, body.username || '').run();
    } else {
      await DB.prepare('INSERT INTO push_subscriptions (username, endpoint, keys_auth, keys_p256dh, subscription) VALUES (?, ?, ?, ?, ?)')
        .bind(body.username || '', body.endpoint || '', body.keys_auth || '', body.keys_p256dh || '', sub).run();
    }
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
