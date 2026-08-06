import { jsonResponse, errorResponse, parseBody, genId } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const id = genId();
    await DB.prepare('INSERT INTO messages (id, sender, senderName, recipient, recipientName, text) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(body.sender || '', body.senderName || '', body.recipient || '', body.recipientName || '', body.text || '').run();
    return jsonResponse({ success: true, id });
  } catch (e) {
    return errorResponse(e.message);
  }
}
