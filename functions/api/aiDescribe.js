// AI Image Recognition - Cloudflare Workers AI (Llama 3.2 Vision)
import { jsonResponse, errorResponse, parseBody } from './_shared.js';

let licenseAccepted = false;

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { image, prompt } = body;

    if (!image) {
      return errorResponse('Slika je obavezna', 400);
    }

    let base64Data = image;
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) base64Data = match[2];
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    if (!env.AI) {
      return errorResponse('AI binding nije konfigurisan', 503);
    }

    // Accept license first time
    if (!licenseAccepted) {
      try {
        await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: 'agree'
        });
      } catch (e) {}
      licenseAccepted = true;
    }

    const aiPrompt = prompt || 'Opiši šta vidiš na ovoj slici na srpskom jeziku (ćirilica). Fokusiraj se na: šta se vidi (objekti, vozila, ljudi, priroda, zgrade), eventualne prekršaje ili nepravilnosti (nelegalno parkiranje, divlja deponija, oštećena infrastruktura, buka). Odgovori u 2-3 kratke rečenice. Ne ponavljaj se.';

    // Use prompt format (not messages)
    try {
      const result = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
        image: bytes,
        prompt: aiPrompt,
        max_tokens: 200,
        temperature: 0.3,
        top_p: 0.9
      });
      const desc = result?.response || result?.description || (typeof result === 'string' ? result : '');
      if (desc && desc.length > 5) {
        // Clean up repeated patterns
        let clean = desc.trim();
        // Remove duplicate sentences
        const sentences = clean.split(/(?<=[.!?])\s+/);
        const seen = new Set();
        const unique = sentences.filter(s => {
          const key = s.trim().toLowerCase();
          if (seen.has(key) || seen.size > 4) return false;
          seen.add(key);
          return true;
        });
        clean = unique.join(' ');
        if (clean.length > 5) {
          return jsonResponse({ success: true, description: clean, model: 'llama3.2-vision' });
        }
        return jsonResponse({ success: true, description: desc.trim(), model: 'llama3.2-vision' });
      }
    } catch (e) {
      console.error('vision error:', e.message || e);
      if (String(e.message || e).includes('agree')) {
        try {
          await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', { prompt: 'agree' });
          const result2 = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
            image: bytes,
            prompt: aiPrompt,
            max_tokens: 200,
            temperature: 0.3
          });
          const desc2 = result2?.response || '';
          if (desc2 && desc2.length > 5) {
            return jsonResponse({ success: true, description: desc2.trim(), model: 'llama3.2-vision' });
          }
        } catch (e2) {
          return errorResponse('AI greška: ' + (e2.message || e2), 503);
        }
      }
      return errorResponse('AI greška: ' + (e.message || e), 503);
    }

    return errorResponse('AI nije vratio opis', 503);
  } catch (err) {
    return errorResponse('Greška: ' + err.message, 500);
  }
}
