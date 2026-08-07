// AI Pravni Asistent - uses Cloudflare Workers AI + local D1 knowledge base + expanded local KB
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

    // 4. Local knowledge base with fuzzy matching
    const knowledgeBase = getLocalKnowledge(question);
    
    // 5. Try Cloudflare Workers AI if available
    let aiReply = null;
    if (env.AI) {
      try {
        const prompt = buildPrompt(question, context, knowledgeBase);
        const aiResult = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
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

    // 6. Prefer local knowledge base for direct matches, use AI for everything else
    let reply;
    let sources = [];
    
    if (knowledgeBase) {
      // Direct local knowledge match — return it immediately (faster + accurate)
      reply = knowledgeBase;
      if (relevantAkti.length > 0) {
        sources.push(...relevantAkti.map(a => `${a.tip || 'Akt'} ${a.broj || ''}: ${a.naziv || ''}`));
      }
      if (relevantPelceri.length > 0) {
        sources.push(...relevantPelceri.map(p => `Pelcer: ${p.naziv || ''}`));
      }
    } else if (aiReply) {
      // No local match — use AI-generated reply
      reply = aiReply;
      if (relevantAkti.length > 0) {
        sources.push(...relevantAkti.map(a => `${a.tip || 'Akt'} ${a.broj || ''}: ${a.naziv || ''}`));
      }
      if (relevantPelceri.length > 0) {
        sources.push(...relevantPelceri.map(p => `Pelcer: ${p.naziv || ''}`));
      }
    } else {
      // Fallback if neither AI nor local knowledge available
      reply = getSmartFallback(question, relevantAkti, relevantPelceri);
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

// Score-based fuzzy matching
function scoreQuestion(q, keywords) {
  let score = 0;
  for (const kw of keywords) {
    if (q.includes(kw)) score += kw.length > 4 ? 2 : 1;
  }
  return score;
}

function getSmartFallback(question, akti, pelceri) {
  let reply = 'Nemam precizan odgovor na ovo pitanje, ali evo šta mogu da pomognem:\n\n';
  
  if (akti.length > 0) {
    reply += 'Pronašao sam relevantne akte u bazi:\n';
    akti.forEach(a => {
      reply += `• ${a.tip || 'Akt'} ${a.broj || ''}: ${a.naziv || ''}\n`;
    });
    reply += '\n';
  }
  
  if (pelceri.length > 0) {
    reply += 'Pronašao sam relevantne šablone:\n';
    pelceri.forEach(p => {
      reply += `• ${p.kategorija || ''}: ${p.naziv || ''}\n`;
    });
    reply += '\n';
  }
  
  reply += 'Možete pitati o:\n';
  reply += '• Ovlašćenjima komunalne policije i inspekcije\n';
  reply += '• Žutim trakama, parkingu i saobraćaju\n';
  reply += '• Pešačkim zonama i javnim površinama\n';
  reply += '• Prijava nelegalnih objekata i gradnje\n';
  reply += '• Komunalnim delatnostima i JKP\n';
  reply += '• Javnoj svojini i javnim površinama\n';
  reply += '• Odlukama Skupštine grada Beograda\n';
  reply += '• Uslovima za rad u komunalnoj policiji\n';
  reply += '• Postupku prijave prekršaja\n';
  reply += '• Otvaranju radnog vremena i reklama\n';
  reply += '• Uklanjanju nelegalnih sadržaja\n';
  reply += '• Zelenilu i održavanju javnih površina\n';
  reply += '• Komunalnim sankcijama i kaznama\n';
  reply += '• Odlaganju otpada i čistoći\n';
  reply += '• Bukvi, javnom redu i miru\n';
  reply += '• PSAH reviziji i kontroli\n';
  reply += '• Kvarovima na javnoj rasveti\n';
  reply += '• Neispravnim vozilima i prijavi';
  
  return reply;
}

function getLocalKnowledge(question) {
  const q = question.toLowerCase();
  const qWords = q.split(/[^a-zščćžđ0-9]+/i).filter(Boolean);
  const hasWord = (prefix) => qWords.some(w => w.startsWith(prefix));
  
  // ===== Ovlašćenja komunalne policije =====
  if (q.includes('ovlašćen') || q.includes('ovlascen') || (q.includes('može') && q.includes('komunal')) || (q.includes('pravo') && q.includes('polic'))) {
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
  
  // ===== Žute trake i parking =====
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

  // ===== Pešačke zone =====
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

  // ===== Zelenilo i javne površine =====
  if (q.includes('zelen') || q.includes('drvo') || q.includes('park') || q.includes('drveć') || q.includes('drvore')) {
    return `Zelenilo i održavanje javnih površina:

Zakon o zelenilu ("Službeni glasnik RS") i Odluka o održavanju zelenila grada Beograda:

Pravila:
1. Javno zelenilo je pod zaštitom
2. Zabranjeno je sečenje drveća bez dozvole
3. Zabranjeno je uništavanje travnjaka i živica
4. Zabranjeno je parkiranje na zelenim površinama
5. Vlasnici su dužni da održavaju zelenilo ispred svojih objekata
6. JKP "Zelenilo-Beograd" održava javno zelenilo
7. Sečenje drveta zahteva dozvolu Sekretarijata

Komunalni policajac prijavljuje:
• Uništavanje zelenila
• Parkiranje na zelenim površinama
• Nelegalno sečenje drveća
• Odlaganje otpada na zelenim površinama`;
  }

  // ===== Nelegalni objekti / gradnja =====
  if ((q.includes('nelegal') && (q.includes('objekat') || hasWord('gradnj') || hasWord('izgradnj'))) || q.includes('samoizgradnja') || (q.includes('objekat') && hasWord('gradnj'))) {
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

  // ===== Komunalne delatnosti =====
  if (q.includes('komunaln') && (q.includes('delatn') || q.includes('uslug') || q.includes('zakon') || q.includes('jkp'))) {
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

  // ===== Inspekcija =====
  if (q.includes('inspekc') || q.includes('inspektor') || (q.includes('kazn') && q.includes('komunal'))) {
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

  // ===== Javna svojina =====
  if (q.includes('javna svojin') || q.includes('javno dobro') || q.includes('javna površin') || q.includes('javne površine')) {
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

  // ===== Odluke Skupštine grada =====
  if (q.includes('odluk') || q.includes('skupština') || q.includes('skupstina') || hasWord('gradsk')) {
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

  // ===== Zaposlenje / uslovi rada =====
  if (q.includes('posao') || q.includes('zaposlen') || q.includes('kriterijum') || q.includes('uslov') || q.includes('konkurs')) {
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

  // ===== Postupak prijave prekršaja =====
  if (q.includes('prijav') && (q.includes('prekrš') || q.includes('postupak') || q.includes('kazn'))) {
    return `Postupak prijave prekršaja:

1. Komunalni policajac uočava prekršaj
2. Identifikacija lica (prekršioca)
3. Sastavljanje zapisnika o prekršaju
4. Fotografisanje/dokumentovanje
5. Predaja zapisnika komunalnom inspektoru
6. Inspektor izdaje rešenje o prekršaju
7. Izricanje kazne (novčana)
8. Pravo na žalbu (8 dana od prijema rešenja)

Vrste prekršaja:
• Zauzimanje javne površine bez dozvole
• Parkiranje na žutoj traci
• Nelegalno odlaganje otpada
• Postavljanje rekla bez dozvole
• Ometanje javnog reda i mira
• Izlaganje robe van dozvoljenog prostora`;
  }

  // ===== Radno vreme i reklame =====
  if (q.includes('radno vreme') || q.includes('reklam') || q.includes('oglas') || q.includes('natpis') || q.includes('rekl')) {
    return `Radno vreme i reklame:

Radno vreme objekata:
1. Radni dan 06:00-22:00 (poslovni prostori)
2. Nedeljom i praznicima 08:00-20:00
3. Pešačke zone - restorani i kafići do 01:00
4. Izuzetak: dozvola za noćni rad

Reklame i natpisi:
1. Postavljanje reklama zahteva dozvolu Sekretarijata za komunalne poslove
2. Reklame na javnim površinama se naplaćuju
3. Nedozvoljene reklame se uklanjaju na trošak vlasnika
4. Zabranjene su reklame koje ometaju saobraćaj
5. LED ekrani moraju imati dozvolu i ne smeju da ometaju saobraćaj

Komunalni policajac prijavljuje nelegalne reklame i natpise.`;
  }

  // ===== Uklanjanje nelegalnih sadržaja =====
  if (q.includes('uklanj') || q.includes('uklon') || q.includes('nedozvoljen') || q.includes('nelegalan sadržaj') || q.includes('uklanjanje')) {
    return `Uklanjanje nelegalnih sadržaja:

Postupak uklanjanja:
1. Komunalni policajac uočava nelegalni sadržaj (ogradu, oglas, konstrukciju)
2. Sastavlja zapisnik sa fotografijama
3. Izdaje opomenu vlasniku (rok za uklanjanje)
4. Ako vlasnik ne postupa, prijavljuje inspektoru
5. Inspektor izdaje rešenje o uklanjanju
6. Uklanjanje se vrši na trošak vlasnika

Vrste nelegalnih sadržaja:
• Ograde i barijere na javnoj površini
• Oglasi i natpisi bez dozvole
• Izložbe robe van dozvoljenog prostora
• Kontejneri na javnoj površini bez dozvole
• Gradilišta bez ograđivanja
• Nelegalne konstrukcije (terase, tende)`;
  }

  // ===== Komunalne sankcije i kazne =====
  if (q.includes('kazn') || q.includes('sankci') || q.includes('novčan') || q.includes('globa') || q.includes('kazna')) {
    return `Komunalne sankcije i kazne:

Novčane kazne za prekršaje (Odluka o komunalnim sankcijama grada Beograda):

1. Parkiranje na žutoj traci: 6.500 RSD
2. Zauzimanje javne površine: 10.000-50.000 RSD
3. Nelegalno odlaganje otpada: 5.000-25.000 RSD
4. Postavljanje reklama bez dozvole: 10.000-100.000 RSD
5. Ometanje javnog reda i mira: 5.000-20.000 RSD
6. Izlaganje robe van prostora: 5.000-15.000 RSD
7. Uništavanje zelenila: 10.000-50.000 RSD
8. Neovlašćeno sečenje drveća: 20.000-100.000 RSD

Kazne izriče komunalni inspektor, ne policajac!
Policajac sastavlja zapisnik, inspektor izdaje rešenje.
Pravo na žalbu: 8 dana od prijema rešenja.`;
  }

  // ===== Otpad i čistoća =====
  if (q.includes('otpad') || q.includes('čistoć') || q.includes('cistoc') || q.includes('smeće') || q.includes('smece') || q.includes('kontejner')) {
    return `Odlaganje otpada i čistoća:

Zakon o upravljanju otpadom ("Službeni glasnik RS", br. 36/2009, 14/2016) i Odluka o održavanju čistoće grada Beograda:

Pravila:
1. Otpad se odlaže isključivo u kontejnere
2. Zabranjeno je odlaganje otpada van kontejnera
3. Građevinski otpad zahteva poseban postupak
4. Opasni otpad se predaje ovlašćenim licima
5. Zabranjeno je paljenje otpada na javnim površinama
6. Vlasnici su dužni da čiste prostor ispred objekata
7. JKP "Gradske čistoće" vrši odvoz otpada

Komunalni policajac prijavljuje:
• Odlaganje otpada van kontejnera
• Divlje deponije
• Nečistoću ispred objekata
• Paljenje otpada`;
  }

  // ===== Buka, javni red i mir =====
  if (q.includes('buk') || q.includes('mir') || q.includes('red') && q.includes('javni') || q.includes('ometanj')) {
    return `Javni red i mir:

Odluka o javnom redu i miru grada Beograda:

Zabranjeno je:
1. Stvaranje buke koja ometa okolinu (posle 22:00 do 06:00)
2. Muzika iz lokala koja prelazi dozvoljeni nivo
3. Vikanje i svađe na javnim mestima
4. Ometanje saobraćaja i pešaka
5. Pijanstvo na javnim mestima
6. Prodaja robe van dozvoljenih mesta
7. Prosjačenje na javnim mestima

Postupak:
1. Komunalni policajac uočava narušavanje reda i mira
2. Izdaje opomenu
3. Ako se narušavanje nastavi, poziva MUP (policiju)
4. Sastavlja zapisnik
5. Prijavljuje komunalnom inspektoru

Napomena: Za ozbiljnije prekršaje (pretnje, nasilje) nadležna je MUP, ne komunalna policija.`;
  }

  // ===== Javna rasveta =====
  if (q.includes('rasvet') || q.includes('rasvjet') || q.includes('svetlo') || q.includes('svjetlo') || q.includes('lamp') || q.includes('sijalic')) {
    return `Javna rasveta:

Odluka o javnoj rasveti grada Beograda:

Javna rasveta obuhvata:
1. Rasvetu ulica i trgova
2. Rasvetu pešačkih staza
3. Rasvetu parkova i zelenih površina
4. Rasvetu javnih parkirališta
5. Dekorativnu rasvetu za praznike

Nadzor i održavanje:
1. JKP "Javna rasveta" održava i popravlja rasvetu
2. Građani mogu prijaviti kvarove na 011/xxx-xxx
3. Komunalni policajac prijavljuje neispravnu rasvetu
4. Vlasnici su dužni da održavaju rasvetu ispred svojih objekata

Česti problemi:
• Neispravne sijalice
• Oštećeni stubovi rasvete
• Rasveta koja ne radi noću
• Previše osvetljenje (ometanje stanara)`;
  }

  // ===== Neispravna vozila =====
  if (q.includes('neisprav') && q.includes('vozil') || q.includes('obiljež') && q.includes('vozil') || q.includes('parkir') && q.includes('neisprav')) {
    return `Neispravna vozila:

Komunalni policajac može da prijavi neispravna vozila:

Vozila koja se prijavljuju:
1. Napuštena vozila na javnoj površini
2. Vozila bez registarskih tablica
3. Vozila sa isteklim registracijama (duže od 30 dana)
4. Vozila koja ometaju saobraćaj
5. Vozila parkirana na javnim površinama duže od 15 dana

Postupak:
1. Komunalni policajac uočava neispravno vozilo
2. Proverava registraciju i stanje
3. Pokušava da kontaktira vlasnika
4. Ako vlasnik nije dostupan, sastavlja zapisnik
5. Prijavljuje JKP "Parking Servis" za uklanjanje
6. Vozilo se odvlači na deponiju

Obeležavanje: Komunalni policajac stavlja nalepnicu na vozilo sa datumom i pozivom za uklanjanje.`;
  }

  // ===== PSAH / Kontrola poslovnih prostora =====
  if (q.includes('psah') || q.includes('kontrol') && q.includes('poslov') || q.includes('sanitarni') || q.includes('higijen')) {
    return `PSAH i sanitarni nadzor:

PSAH (Priprema, sprovođenje i analiza higijene):

Nadzor obuhvata:
1. Higijenska ispravnost poslovnih prostora
2. Sanitarno-tehnički uslovi
3. Higijena radnika (sanitarne knjižice)
4. Uslovi za rad sa prehrambenim proizvodima
5. Sanitarni pregledi (redovni i vanredni)

Nadležni organi:
1. Sanitarna inspekcija pri Gradskom zavodu za javno zdravlje
2. Sanitarna inspekcija pri Sekretarijatu za zdravlje
3. Komunalni inspektorat ( za komunalne uslove)

Komunalni policajac može:
• Prijava nehigijenskih uslova
• Prijava radnika bez sanitarnih knjižica
• Kontrola izlaganja hrane na javnoj površini`;
  }

  // ===== Saobraćaj =====
  if (q.includes('saobraćaj') || q.includes('saobrac') || q.includes('stup') || q.includes('raskrsni') || q.includes('put') || q.includes('cesta') || q.includes('ulica')) {
    return `Saobraćaj i komunalna policija:

Komunalni policajac i saobraćaj:
1. Kontrola parkiranja (žute trake, zone)
2. Kontrola pešačkih zona
3. Prijava napuštenih vozila
4. Kontrola izlaganja robe na trotoarima
5. Kontrola gradilišta na javnim površinama

NAPOMENA: Komunalni policajac NEMA ovlašćenja za:
• Kontrolu brzine
• Alkoholisane vozače
• Saobraćajne prekršaje (to radi MUP)
• Upravljanje saobraćajem (to radi MUP)

Komunalni policajac kontroliše samo komunalne aspekte saobraćaja (parking, zauzimanje javne površine, itd.).

Za saobraćajne prekršaje kontaktirati: MUP - Saobraćajna policija (122)`;
  }

  // ===== Gradilišta =====
  if (q.includes('gradilišt') || q.includes('gradilist') || hasWord('ograd') || hasWord('gradnj') || hasWord('izgradnj')) {
    return `Gradilišta:

Odluka o uređenju gradilišta grada Beograda:

Obaveze investitora:
1. Gradilište mora biti ograđeno
2. Ograda mora biti stabilna i bezbedna
3. Postavljanje table sa podacima o investitoru
4. Obezbeđenje pešačkog prolaza oko gradilišta
5. Čišćenje gradilišta i okoline
6. Uklanjanje građevinskog otpada
7. Obezbeđenje parkinga za radnike

Komunalni policajac kontroliše:
1. Da li je gradilište ograđeno
2. Da li se građevinski otpad odlaže pravilno
3. Da li gradilište zauzima više javne površine nego dozvoljeno
4. Da li su postavljene table sa podacima
5. Da li je pešački prolaz obezbeđen

Prekršaji se prijavljuju građevinskoj inspekciji.`;
  }

  // ===== Kontakt / adrese =====
  if (q.includes('kontakt') || q.includes('telefon') || q.includes('adresa') || q.includes('gde') && q.includes('nalazi')) {
    return `Kontakti nadležnih organa:

Komunalni inspektorat:
• Adresa: Sekspira 2, Beograd
• Telefon: 011/xxxx-xxx

Sekretarijat za komunalne poslove i saobraćaj:
• Adresa: Ulica kralja Milana, Beograd
• Telefon: 011/xxxx-xxx

Građevinska inspekcija:
• Sekretarijat za urbanizam i građevinarstvo
• Telefon: 011/xxxx-xxx

JKP "Parking Servis":
• Telefon: 011/xxxx-xxx (odvlačenje vozila)

JKP "Gradske čistoće":
• Telefon: 011/xxxx-xxx (otpad)

JKP "Zelenilo-Beograd":
• Telefon: 011/xxxx-xxx (zelenilo)

MUP - Saobraćajna policija: 122
Hitna pomoć: 194
Vatrogasci: 193`;
  }

  // ===== Žalbe =====
  if (q.includes('žalb') || q.includes('zalb') || q.includes('prigov') || q.includes('pravo') && q.includes('žalb')) {
    return `Pravo na žalbu:

Protiv rešenja komunalnog inspektora:
1. Žalba se podnosi u roku od 8 dana od prijema rešenja
2. Žalba se podnosi Sekretarijatu za komunalne poslove
3. Žalba se može podneti lično ili poštom
4. Obavezno navesti razloge žalbe
5. Rešenje se može žalbom samo odložiti izvršenje

Postupak:
1. Primalac rešenja (prekršilac) dobija rešenje
2. Podnosi žalbu sa obrazloženjem
3. Sekretarijat razmatra žalbu
4. Donosi rešenje o žalbi (prihvata/odbija)
5. Protiv drugostepenog rešenja može se pokrenuti upravni spor

Za pomoć pri žalbi: obratiti se pravniku ili advokatskoj kancelariji.`;
  }

  // ===== None matched - use smart fallback
  return null;
}

export async function onRequestGet({ request, env }) {
  return onRequestPost({ request, env });
}
