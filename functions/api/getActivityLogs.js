import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    const limit = body.limit || 200;
    
    let result;
    if (username) {
      result = await DB.prepare('SELECT * FROM activity_logs WHERE username = ? ORDER BY created_date DESC LIMIT ?')
        .bind(username, limit).all();
    } else {
      result = await DB.prepare('SELECT * FROM activity_logs ORDER BY created_date DESC LIMIT ?')
        .bind(limit).all();
    }
    
    return jsonResponse({ success: true, logs: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
