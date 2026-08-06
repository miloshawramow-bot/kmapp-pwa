import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    await DB.prepare('INSERT INTO login_logs (username, device) VALUES (?, ?)')
      .bind(body.username || '', body.device || '').run();
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
