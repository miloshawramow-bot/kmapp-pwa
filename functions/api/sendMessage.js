import { jsonResponse, errorResponse, parseBody, genId } from './_shared.js';
import { sendWebPush } from './_webpush.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const id = genId();
    await DB.prepare('INSERT INTO messages (id, sender, senderName, recipient, recipientName, text) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, body.sender || '', body.senderName || '', body.recipient || '', body.recipientName || '', body.text || '').run();

    // Send push notification to recipient
    try {
      const recipient = body.recipient || '';
      if (recipient) {
        const sub = await DB.prepare('SELECT subscription FROM push_subscriptions WHERE username = ?')
          .bind(recipient).first();
        if (sub && sub.subscription) {
          const vapidPrivateKey = env.VAPID_PRIVATE_KEY;
          const vapidPublicKey = env.VAPID_PUBLIC_KEY;
          if (vapidPrivateKey && vapidPublicKey) {
            await sendWebPush(sub.subscription, {
              title: 'KMapp — ' + (body.senderName || body.sender || 'Nova poruka'),
              body: (body.text || '').substring(0, 100),
              url: 'https://kmapp-n37.pages.dev/#poruke',
              tag: 'kmapp-msg-' + (body.sender || 'unknown'),
            }, vapidPrivateKey, vapidPublicKey);
          }
        }
      }
    } catch (pushErr) {
      console.log('Push notification failed (non-fatal):', pushErr.message);
    }

    return jsonResponse({ success: true, id });
  } catch (e) {
    return errorResponse(e.message);
  }
}
