import { jsonResponse, errorResponse } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const { DB } = env;
    if (!DB) return errorResponse('No D1 database bound');
    
    // Check table schema
    const schema = await DB.prepare("PRAGMA table_info(push_subscriptions)").all();
    
    // Get all subscriptions
    const subs = await DB.prepare("SELECT id, username, endpoint, subscription, created_date, updated_date FROM push_subscriptions LIMIT 50").all();
    
    // Check VAPID keys
    const vapidPrivate = env.VAPID_PRIVATE_KEY ? 'SET (' + env.VAPID_PRIVATE_KEY.length + ' chars)' : 'NOT SET';
    const vapidPublic = env.VAPID_PUBLIC_KEY ? 'SET (' + env.VAPID_PUBLIC_KEY.length + ' chars)' : 'NOT SET';
    
    return jsonResponse({
      schema: schema.results,
      subscriptions: subs.results,
      totalSubs: subs.results.length,
      vapidPrivate,
      vapidPublic
    });
  } catch (e) {
    return errorResponse(e.message + ' | Stack: ' + (e.stack || 'no stack'));
  }
}
