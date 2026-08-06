import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const { DB } = env;
    const result = await DB.prepare('SELECT id, username, password, displayName, role FROM users ORDER BY username').all();
    return jsonResponse({ success: true, users: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
