import { jsonResponse, errorResponse, parseBody, genId } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    
    if (body.id) {
      const existing = await DB.prepare('SELECT id FROM users WHERE id = ?').bind(body.id).first();
      if (existing) {
        await DB.prepare('UPDATE users SET username = ?, password = ?, displayName = ?, role = ?, updated_date = datetime(\'now\') WHERE id = ?')
          .bind(body.username, body.password, body.displayName || body.username, body.role || 'user', body.id).run();
        return jsonResponse({ success: true, user: { id: body.id, ...body } });
      }
    }
    
    const id = genId();
    await DB.prepare('INSERT INTO users (id, username, password, displayName, role) VALUES (?, ?, ?, ?, ?)')
      .bind(id, body.username, body.password, body.displayName || body.username, body.role || 'user').run();
    return jsonResponse({ success: true, user: { id, ...body } });
  } catch (e) {
    return errorResponse(e.message);
  }
}
