import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    if (body.messageId) {
      await DB.prepare('DELETE FROM messages WHERE id = ?').bind(body.messageId).run();
    }
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
