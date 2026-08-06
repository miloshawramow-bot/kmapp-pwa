import { jsonResponse, errorResponse } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const { DB } = env;
    const result = await DB.prepare('SELECT * FROM pelceri ORDER BY kategorija, naziv').all();
    return jsonResponse({ success: true, pelceri: result.results });
  } catch (e) {
    return errorResponse(e.message);
  }
}
