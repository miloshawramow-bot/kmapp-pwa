import { jsonResponse, errorResponse, parseBody, genId } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    if (body.id) {
      await DB.prepare('UPDATE pelceri SET kategorija = ?, naziv = ?, tekst = ?, updated_date = datetime(\'now\') WHERE id = ?')
        .bind(body.kategorija || '', body.naziv || '', body.tekst || '', body.id).run();
      return jsonResponse({ success: true, id: body.id });
    }
    const id = genId();
    await DB.prepare('INSERT INTO pelceri (id, kategorija, naziv, tekst) VALUES (?, ?, ?, ?)')
      .bind(id, body.kategorija || '', body.naziv || '', body.tekst || '').run();
    return jsonResponse({ success: true, id });
  } catch (e) {
    return errorResponse(e.message);
  }
}
