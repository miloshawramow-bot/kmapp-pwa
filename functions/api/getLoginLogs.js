import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const result = await DB.prepare('SELECT * FROM login_logs ORDER BY created_date DESC LIMIT 200').all();
    return jsonResponse({ success: true, logs: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
