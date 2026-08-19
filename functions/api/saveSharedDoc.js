import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { DB } = env;
    const downloadKey = body.downloadKey || '';
    const title = body.title || 'Dokument';
    const fileContent = body.fileContent || '';
    
    if (!downloadKey) return errorResponse('downloadKey required');
    
    // Store in a simple table or reuse SharedDoc
    await DB.prepare('INSERT OR REPLACE INTO shared_docs (downloadKey, title, fileContent) VALUES (?, ?, ?)')
      .bind(downloadKey, title, fileContent).run();
    
    return jsonResponse({ success: true, downloadKey: downloadKey });
  } catch (e) {
    return errorResponse(e.message);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || '';
    if (!key) return errorResponse('key required');
    
    const { DB } = env;
    const doc = await DB.prepare('SELECT * FROM shared_docs WHERE downloadKey = ?').bind(key).first();
    if (!doc) return jsonResponse({ success: false, error: 'Not found' });
    
    return jsonResponse({ success: true, doc: doc });
  } catch (e) {
    return errorResponse(e.message);
  }
}
