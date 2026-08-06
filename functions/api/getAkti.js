import { jsonResponse, errorResponse } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const { DB } = env;
    const result = await DB.prepare('SELECT * FROM akti ORDER BY tip, broj DESC').all();
    return jsonResponse({ success: true, akti: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
