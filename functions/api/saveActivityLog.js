import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    const action = body.action || '';
    const details = body.details || '';
    
    if (!username || !action) {
      return errorResponse('username and action required');
    }
    
    await DB.prepare('INSERT INTO activity_logs (username, action, details) VALUES (?, ?, ?)')
      .bind(username, action, details || '').run();
    
    return jsonResponse({ success: true });
  } catch (e) {
    return errorResponse(e.message);
  }
}
