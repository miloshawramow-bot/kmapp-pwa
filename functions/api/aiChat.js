// AI Pravni Asistent - uses Cloudflare Workers AI + local D1 knowledge base
import { jsonResponse, errorResponse, parseBody } from './_shared.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await parseBody(request);
    const question = (body.question || '').trim();
    
    if (!question) {
      return jsonResponse({ success: true, reply: 'Molim postavite pitanje.' });
    }

    // 1. Search D1 for relevant Akti (laws/decisions)
    let relevantAkti = [];
    if (env.DB) {
      try {
        const keywords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const searchPattern = keywords.map(k => `%${k}%`).join(' OR ');
        const result = await env.DB.prepare(
          `SELECT naziv, tip, broj, sadrzaj FROM akti WHERE 
           LOWER(naziv) LIKE LOWER(?) OR LOWER(sadrzaj) LIKE LOWER(?) 
           LIMIT 5`
        ).bind(`%${question}%`, `%${question}%`).all();
        relevantAkti = result.results || [];
      } catch (e) {
        // D1 search failed, continue without it
      }
    }

    // 2. Search D1 for relevant Pelceri (templates)
    let relevantPelceri = [];
    if (env.DB) {
      try {
        const result = await env.DB.prepare(
          `SELECT naziv, kategorija, tekst FROM pelceri WHERE 
           LOWER(naziv) LIKE LOWER(?) OR LOWER(tekst) LIKE LOWER(?) 
           LIMIT 3`
        ).bind(`%${question}%`, `%${question}%`).all();
        relevantPelceri = result.results || [];
      } catch (e) {
        // continue
      }
    }

    // 3. Build context from local data
    let context = '';
    if (relevantAkti.length > 0) {
      context += 'RELEVANTNI AKTI IZ BAZE:\n';
      relevantAkti.forEach(a => {
        context += `- ${a.tip || 'Akt'} ${a.broj || ''}: ${a.naziv || ''}\n${(a.sadrzaj || '').substring(0, 500)}\n\n`;
      });
    }
    if (relevantPelceri.length > 0) {
      context += 'RELEVANTNI PELCERI (ŠABLONI):\n';
      relevantPelceri.forEach(p => {
        context += `- ${p.kategorija || ''}: ${p.naziv || ''}\n${(p.tekst || '').substring(0, 500)}\n\n`;
      });
    }

    // 4. Local knowledge base for common municipal law questions
    const knowledgeBase = getLocalKnowledge(question);
    
    // 5. Try Cloudflare Workers AI if available
    let aiReply = null;
    if (env.AI) {
      try {
        const prompt = buildPrompt(question, context, knowledgeBase);
        const aiResult = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: 'Ti si AI pravni asistent za komunalne inspektore i komunalnu policiju u Beogradu, Srbija. Odgovaraš na srpskom jeziku, jasno i koncizno. Koristi kontekst iz lokalnih propisa ako je dostupan. Ako ne znaš tačan odgovor, preporuči konsultaciju sa pravnikom.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.3
        });
        aiReply = aiResult.response;
      } catch (e) {
        // Workers AI not available, use fallback
      }
    }

    // 6. Use AI reply if available, otherwise use local knowledge
    let reply;
    let sources = [];
    
    if (aiReply) {
      reply = aiReply;
      if (relevantAkti.length > 0) {
        sources.push(...relevantAkti.map(a => `${a.tip || 'Akt'} ${a.broj || ''}: ${a.naziv || ''}`));
      }
      if (relevantPelceri.length > 0) {
        sources.push(...relevantPelceri.map(p => `Pelcer: ${p.naziv || ''}`));
      }
    } else {
      // Fallback to local knowledge base
      reply = knowledgeBase || 'Nemam precizan odgovor na ovo pitanje. Pokušajte da preformulišete pitanje ili konsultujte nadležnog pravnika.\n\nMožete pitati o:\n• Ovlašćenjima komunalne policije\n• Zakonu o komunalnim delatnostima\n• Žutim trakama i parkingu\n• Prijava nelegalnih objekata\n• Pešačkim zonama\n• Komunalnim inspekcijama';
    }

    return jsonResponse({ 
      success: true, 
      reply,
      sources: sources.length > 0 ? sources : undefined
    });
  } catch (e) {
    return errorResponse(e.message);
  }
}

function buildPrompt(question, context, localKB) {
  let prompt = `Pitanje: ${question}\n\n`;
  if (context) {
    prompt += `Kontekst iz baze podataka:\n${context}\n\n`;
  }
  if (localKB) {
    prompt += `Lokalno znanje:\n${localKB}\n\n`;
  }
  prompt += 'Odgovori jasno, koncizno i na srpskom jeziku. Ako pitaš o specifičnom zakonu, navedi član i stav ako je poznat.';
  return prompt;
}

function getLocalKnowledge(question) {
  const q = question.toLowerCase();
  
  // Ovlašćenja komunalne policije
  if (q.includes('ovlašćen') || q.includes('ovlascen') || q.includes('može') && q.includes('komunal')) {
    return `Ovlašćenja komunalne policije su definisana Zakonom o komunalnim policajcima ("Službeni glasnik RS", br. 104/2016, 95/2018 i 16/2020):

Glavna ovlašćenja:
1. Kontrola i nadzor nad izvršavanjem komunalnih propisa
2. Zabrana i sprečavanje nelegalnog parkinga (žute trake)
3. Kontrola pešačkih zona
4. Prijava nelegalnih objekata i gradnje
5. Kontrola javnih površina
6. Kontrola izlaganja robe van dozvoljenog prostora
7. Obeležavanje i prijavljivanje neispravnih vozila
8. Kontrola oglasa i natpisa na javnim površinama

Komunalni policajac NEMA ovlašćenja:
• Da izriče novčane kazne (to radi inspektor)
• Da vrši privođenje
• Da zaplenjuje imovinu

Komunalni policajac MOŽE:
• Da izda opomenu
• Da pozove nadležnu inspekciju
• Da zahteva identifikaciju lica
• Da sastavi zapisnik o prekršaju`;
  }
  
  // Žute trake
  if (q.includes('žut') || q.includes('zut') || q.includes('trak') || q.includes('parking') || q.includes('parkir')) {
    return `Žute trake i parking:

Zona žute trake označava ZABRANU parkiranja po svuda. Vozila parkirana na žutoj traci se prijavljuju i mogu biti odvučena.

Pravila:
1. Žuta traka (puna linija) = potpuna zabrana parkiranja
2. Žuta traka (isprekidana) = zabrana parkiranja u određenim satima (vidi znak)
3. Parking kartica je obavezna u platinastim zonama
4. Prva zona (crvena) - 36 RSD/h
5. Druga zona (žuta) - 24 RSD/h  
6. Treća zona (zelena) - 15 RSD/h

Komunalni policajac prijavljuje vozila na žutoj traci putem aplikacije ili zapisnika, a odvlačenje vrši JKP "Parking Servis".`;
  }

  // Pešačke zone
  if (q.includes('pešač') || q.includes('pesac') || q.includes('pešak') || q.includes('pesak')) {
    return `Pešačke zone u Beogradu:

U pešačkim zonama zabranjen je saobraćaj motornih vozila, osim:
1. Vozila javnog prevoza (GSP)
2. Vozila hitne pomoći, policije i vatrogasaca
3. Vozila koja imaju dozvolu (dostava, stanari sa dozvolom)

Pravila:
• Brzina je ograničena na 10 km/h gde je dozvoljen saobraćaj
• Parkiranje je zabranjeno osim na označenim mestima
• Biciklisti mogu koristiti pešačke zone ako nisu drugačije označene

Komunalni policajac kontrolira da li vozila imaju dozvolu za ulazak u pešačku zonu i prijavljuje vozila bez dozvole.`;
  }

  // Nelegalni objekti
  if (q.includes('nelegal') || q.includes('objekat') || q.includes('izgradnja') || q.includes('gradnja')) {
    return `Prijava nelegalnih objekata:

Nelegalna gradnja se prijavljuje nadležnoj građevinskoj inspekciji. Komunalni policajac može:
1. Uočiti i prijaviti nelegalnu gradnju
2. Sastaviti zapisnik
3. Obavestiti građevinsku inspekciju

Postupak:
1. Komunalni policajac uoči nelegalnu gradnju
2. Sastavi zapisnik sa fotografijama
3. Pošalje prijavu građevinskoj inspekciji
4. Inspekcija izdaje rešenje o rušenju ili legalizaciji

Zakon o planiranju i izgradnji ("Službeni glasnik RS", br. 72/2009, 81/2009, 64/2010, 24/2011, 121/2012, 32/2013, 132/2014, 145/2014, 35/2015, 114/2015, 132/2016, 9/2017, 95/2018, 52/2019, 144/2020).

Nadzor vrši Građevinska inspekcija pri Sekretarijatu za urbanizam i građevinarstvo grada Beograda.`;
  }

  // Komunalne delatnosti
  if (q.includes('komunaln') && (q.includes('delatn') || q.includes('uslug') || q.includes('zakon'))) {
    return `Zakon o komunalnim delatnostima ("Službeni glasnik RS", br. 16/97, 42/98, 11/2009, 88/2011, 25/2015, 34/2016):

Komunalne delatnosti su:
1. Snabdevanje vodom za piće
2. Prečišćavanje i odvođenje otpadnih voda
3. Upravljanje otpadom (skupljanje, prevoz, odlaganje)
4. Održavanje javnih površina (čistoća, zelenilo)
5. Održavanje ulica i puteva
6. Održavanje grobalja i krematorijuma
7. Održavanje javne rasvete
8. Održavanje parking prostora
9. Lokalni prevoz putnika

Javna komunalna preduzeća (JKP) obavljaju komunalne delatnosti po principu javne službe.

Nadzor vrši Komunalna inspekcija pri Sekretarijatu za komunalne poslove i saobraćaj grada Beograda.`;
  }

  // Inspekcija
  if (q.includes('inspekc') || q.includes('inspektor')) {
    return `Komunalna inspekcija:

Komunalni inspektor ima sledeća ovlašćenja:
1. Izriče novčane kazne za prekršaje komunalnih propisa
2. Izdaje rešenja o merama
3. Naređuje uklanjanje nelegalnih sadržaja
4. Zapošljava i upravlja komunalnim policajcima
5. Vrši nadzor nad radom JKP

Razlika između komunalnog policajca i inspektora:
• Komunalni policajac - nadzor, opomena, zapisnik, prijava
• Komunalni inspektor - kazna, rešenje, prisilna izvršenje

Komunalni inspektorat pri Sekretarijatu za komunalne poslove i saobraćaj Grada Beograda nalazi se u ulici Sekspira 2.`;
  }

  // Javna svojina
  if (q.includes('javna svojin') || q.includes('javno dobro') || q.includes('javna površin')) {
    return `Javna svojina i javne površine:

Zakon o javnoj svojini ("Službeni glasnik RS", br. 36/91, 80/92, 33/93, 53/93, 67/93, 48/94, 12/96, 27/2001, 23/2002, 26/2003, 32/2005, 18/2015, 80/2020, 144/2022):

Javna svojina obuhvata:
1. Javne površine (ulice, trgovi, parkovi, kejovi)
2. Javne objekte (škole, bolnice, javna preduzeća)
3. Prirodna dobra (vode, šume, rudna bogatstva)

Zabranjeno je:
• Samoinicijativno zauzimanje javne površine
• Postavljanje objekata na javnoj površini bez dozvole
• Ograđivanje javnih površina
• Postavljanje reklama i natpisa bez dozvole

Prekršaji se kažnjavaju novčanom kaznom i naređenjem uklanjanja.`;
  }

  // Odluke
  if (q.includes('odluk') || q.includes('skupština') || q.includes('skupstina') || q.includes('gradska')) {
    return `Odluke Skupštine grada Beograda:

Najvažnije komunalne odluke:
1. Odluka o javnom redu i miru
2. Odluka o održavanju čistoće
3. Odluka o parking prostorima
4. Odluka o pešačkim zonama
5. Odluka o uređenju gradilišta
6. Odluka o javnoj rasveti
7. Odluka o zelenilima
8. Odluka o saobraćajnoj signalizaciji

Komunalni policajac sprovodi ove odluke kroz nadzor i prijavljivanje prekršaja.

Odluke su dostupne na sajtu grada Beograda i u Službenom listu grada Beograda.`;
  }

  // Zaposlenje
  if (q.includes('posao') || q.includes('zaposlen') || q.includes('kriterijum') || q.includes('uslov')) {
    return `Uslovi za rad u komunalnoj policiji:

1. Srpsko državljanstvo
2. Starost 18-40 godina
3. Srednja stručna sprema (SSS) - minimum
4. Vozačka dozvola B kategorije
5. Zdravstvena sposobnost za rad
6. Bez osuđujuće presude
7. Bez krivičnog gonjenja u toku
8. Poznavanje zakona o komunalnim poslovima

Procena se vrši putem konkursa koji objavljuje Sekretarijat za komunalne poslove i saobraćaj Grada Beograda.`;
  }

  // None matched
  return null;
}

export async function onRequestGet({ request, env }) {
  return onRequestPost({ request, env });
}
