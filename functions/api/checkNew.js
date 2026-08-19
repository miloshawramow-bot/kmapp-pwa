import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || '';
    const lastCheck = body.lastCheck || '1970-01-01';
    
    // Save login log if flagged
    if (body.logLogin && username) {
      try {
        await DB.prepare('INSERT INTO login_logs (username, device) VALUES (?, ?)')
          .bind(username, body.device || '').run();
      } catch (logErr) {
        console.error('Login log error:', logErr.message);
      }
    }
    
    const result = await DB.prepare('SELECT COUNT(*) as count FROM messages WHERE recipient = ? AND read = 0 AND created_date > ?')
      .bind(username, lastCheck).first();
    const count = result ? result.count : 0;
    const msgs = await DB.prepare('SELECT * FROM messages WHERE recipient = ? AND read = 0 AND created_date > ? ORDER BY created_date DESC LIMIT 20')
      .bind(username, lastCheck).all();
    return jsonResponse({ success: true, count, newMessages: msgs.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
