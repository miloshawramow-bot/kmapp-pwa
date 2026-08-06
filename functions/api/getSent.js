import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    const result = await DB.prepare('SELECT * FROM messages WHERE sender = ? ORDER BY created_date DESC LIMIT 200').bind(username).all();
    return jsonResponse({ success: true, messages: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
