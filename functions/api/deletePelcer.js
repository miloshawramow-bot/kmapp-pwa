import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    await DB.prepare('DELETE FROM pelceri WHERE id = ?').bind(body.id || '').run();
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
