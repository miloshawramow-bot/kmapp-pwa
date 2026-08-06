import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    if (body.messageId) {
      await DB.prepare('UPDATE messages SET read = 1 WHERE id = ?').bind(body.messageId).run();
    } else if (body.username) {
      await DB.prepare('UPDATE messages SET read = 1 WHERE recipient = ? AND read = 0').bind(body.username).run();
    }
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
