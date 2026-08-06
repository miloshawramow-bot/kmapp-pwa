import { jsonResponse, errorResponse, parseBody, genId } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    if (body.id) {
      await DB.prepare('UPDATE akti SET tip = ?, naziv = ?, broj = ?, sadrzaj = ?, updated_date = datetime(\'now\') WHERE id = ?')
        .bind(body.tip || '', body.naziv || '', body.broj || '', body.sadrzaj || '', body.id).run();
      return jsonResponse({ success: true, id: body.id });
    }
    const id = genId();
    await DB.prepare('INSERT INTO akti (id, tip, naziv, broj, sadrzaj) VALUES (?, ?, ?, ?, ?)')
      .bind(id, body.tip || '', body.naziv || '', body.broj || '', body.sadrzaj || '').run();
    return jsonResponse({ success: true, id });
  } catch (e) {
    return errorResponse(e.message);
  }
}
