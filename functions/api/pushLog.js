import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const username = body.username || 'unknown';
    const event = body.event || 'push-received';
    const detail = body.detail || '';
    const timestamp = new Date().toISOString();
    
    // Log to a simple table or just return success
    // We'll use a simple approach: store in a log table
    try {
      await DB.prepare('CREATE TABLE IF NOT EXISTS push_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, event TEXT, detail TEXT, created_at TEXT)')
        .run();
      await DB.prepare('INSERT INTO push_logs (username, event, detail, created_at) VALUES (?, ?, ?, ?)')
        .bind(username, event, detail, timestamp).run();
    } catch(e) {
      // Table might already exist, ignore
    }
    
    return jsonResponse({ success: true, logged: true, timestamp });
  } catch (e) {
    return errorResponse(e.message);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const { DB } = env;
    const url = new URL(request.url);
    const username = url.searchParams.get('username') || '';
    
    try {
      const rows = await DB.prepare('SELECT * FROM push_logs ORDER BY created_at DESC LIMIT 20').all();
      return jsonResponse({ success: true, logs: rows.results || [] });
    } catch(e) {
      return jsonResponse({ success: true, logs: [], note: 'No logs table yet' });
    }
  } catch (e) {
    return errorResponse(e.message);
  }
}
