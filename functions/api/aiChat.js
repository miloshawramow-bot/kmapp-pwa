import { jsonResponse, errorResponse, parseBody } from './_shared.js';

let licenseAccepted = false;

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const { question, context, history } = body;

    if (!question || question.trim().length < 2) {
      return errorResponse('Pitanje je prekratko', 400);
    }

    if (!context || context.trim().length < 10) {
      return jsonResponse({ success: true, reply: 'U bazi akata nema odredbe koja reguliše ovo pitanje. Pokušajte sa drugim terminima (npr. "parkiranje trotoar", "buka", "tegobe", "odlaganje otpada").', hasAkti: false });
    }

    if (!env.AI) {
      return errorResponse('AI nije konfigurisan', 503);
    }

    if (!licenseAccepted) {
      try { await env.AI.run('@cf/meta/llama-3.2-3b-instruct', { prompt: 'agree' }); } catch (e) {}
      licenseAccepted = true;
    }

    const systemPrompt = `Ti si pravni asistent. Odgovaraš SAMO iz teksta ispod.

Zadatak:
1. Pronađi MATERIJALNU ODREDBU - član koji nešto ZABRANJUJE ili propisuje
2. Pronađi KAZNENU ODREDBU - član koji kaže "kazniće se" i NAVODI IZNOS kazne
3. Kaznena odredba često REFERENCIRA materijalnu (npr. "ako postupa suprotno članu 19")

Format odgovora (KRATKO, bez uvoda):
"Prema [naziv akta]:
Materijalna odredba: član [broj] [stav] [tačka] - [kratak opis šta je zabranjeno]
Kaznena odredba: član [broj]
Novčana kazna:
- Fizičko lice: [iznos] dinara
- Pravno lice: [iznos] dinara
- Odgovorno lice: [iznos] dinara
- Preduzetnik: [iznos] dinara (ako postoji)"

PRAVILA:
- Navedi samo iznose koji STVARNO PISE u tekstu
- Ako neka kategorija lica nije navedena, nemoj je pisati
- Ne izmišljaj ništa što nije u tekstu
- Ako u tekstu nema kaznene odredbe, napiši: "Kaznena odredba nije pronađena u ovom aktu."

Tekst akata:
${context}`;

    const messages = [{ role: 'system', content: systemPrompt }];
    if (history && Array.isArray(history)) {
      history.slice(-4).forEach(h => {
        if (h.role && h.content) messages.push({ role: h.role === 'ai' ? 'assistant' : 'user', content: h.content });
      });
    }
    messages.push({ role: 'user', content: question });

    try {
      const result = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages, max_tokens: 400, temperature: 0.05, top_p: 0.7
      });
      const answer = result?.response || '';
      if (answer && answer.length > 3) {
        return jsonResponse({ success: true, reply: answer.trim(), hasAkti: true });
      }
      return errorResponse('AI nije vratio odgovor', 503);
    } catch (e) {
      if (String(e.message||e).includes('agree')) {
        try {
          await env.AI.run('@cf/meta/llama-3.2-3b-instruct', { prompt: 'agree' });
          const r2 = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', { messages, max_tokens: 400, temperature: 0.05 });
          const a2 = r2?.response || '';
          if (a2) return jsonResponse({ success: true, reply: a2.trim(), hasAkti: true });
        } catch (e2) { return errorResponse('AI: ' + (e2.message||e2), 503); }
      }
      return errorResponse('AI: ' + (e.message||e), 503);
    }
  } catch (err) {
    return errorResponse('Greška: ' + err.message, 500);
  }
}
