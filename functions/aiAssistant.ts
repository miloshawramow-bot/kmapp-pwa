// AI Pravni Asistent - poboljšana pretraga sa web search opcijom
// Koristi Groq API za odgovore + web pretragu za širi kontekst

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

export default async function(req, res) {
  try {
    const { pitanje, akti } = req.body || {};
    
    if (!pitanje || !pitanje.trim()) {
      return res.json({ success: false, error: 'Pitanje je obavezno.' });
    }

    // ===== 1. WEB PRETRAGA - traži relevantne pravne informacije na internetu =====
    let webContext = '';
    try {
      const searchQuery = encodeURIComponent(pitanje + ' site:paragraf.rs OR site:pravno-informacioni-sistem.rs OR site:slglasnik.rs OR zakon Srbija');
      // DuckDuckGo HTML pretraga (besplatno, bez API ključa)
      const ddgRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(pitanje + ' zakon Srbija pravni propis')}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KMapp/1.0)' },
        timeout: 5000
      });
      if (ddgRes.ok) {
        const ddgHtml = await ddgRes.text();
        // Izdvoji rezultate pretrage (naslove i snippetove)
        const snippets = [];
        const resultRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
        let match;
        let count = 0;
        while ((match = resultRegex.exec(ddgHtml)) !== null && count < 5) {
          const title = match[1].replace(/<[^>]+>/g, '').trim();
          const snippet = match[2].replace(/<[^>]+>/g, '').trim();
          if (title && snippet) {
            snippets.push(`${title}: ${snippet}`);
            count++;
          }
        }
        if (snippets.length > 0) {
          webContext = '\n\n--- WEB REZULTATI (sa interneta) ---\n' + snippets.join('\n\n');
        }
      }
    } catch (e) {
      console.log('Web search failed:', e.message);
      // Nastavi bez web rezultata
    }

    // ===== 2. PRIPREMA LOKALNIH AKATA =====
    let aktiContext = '';
    if (akti && Array.isArray(akti) && akti.length > 0) {
      // Grupiši po aktu, ograniči na najrelevantnije
      const aktByNaziv = {};
      akti.forEach(a => {
        if (!a.naziv) return;
        if (!aktByNaziv[a.naziv]) {
          aktByNaziv[a.naziv] = { naziv: a.naziv, broj: a.broj || '', tip: a.tip || '', sadrzaj: '' };
        }
        aktByNaziv[a.naziv].sadrzaj += (a.sadrzaj || '') + '\n';
      });

      // Za svaki akt, pronađi najrelevantnije članove
      const qLower = pitanje.toLowerCase();
      const qWords = qLower.split(/\s+/).filter(w => w.length > 2);
      
      const scoredAkti = Object.values(aktByNaziv).map(akt => {
        const text = (akt.naziv + ' ' + akt.sadrzaj).toLowerCase();
        let score = 0;
        qWords.forEach(w => {
          if (text.includes(w)) score++;
          // Posebno traži "materijalna odredba" i "kaznena odredba" 
          if (text.includes('materijalna') && qLower.includes('materijal')) score += 5;
          if (text.includes('kaznena') && qLower.includes('kazn')) score += 5;
          if (text.includes('prekršaj') && qLower.includes('prekršaj')) score += 3;
          if (text.includes('kazna') && (qLower.includes('kazna') || qLower.includes('kazn'))) score += 3;
        });
        return { ...akt, score };
      }).sort((a, b) => b.score - a.score);

      // Uzmi top 5 akata, ali uvek uključi one sa "kaznena" ili "materijalna" odredbama
      const topAkti = scoredAkti.slice(0, 5);
      
      // Takođe dodaj akte koji sadrže kaznene/materijalne odredbe ako već nisu u top 5
      scoredAkti.forEach(akt => {
        if (topAkti.length >= 8) return;
        if (topAkti.find(a => a.naziv === akt.naziv)) return;
        const text = akt.sadrzaj.toLowerCase();
        if ((text.includes('kaznena odredba') || text.includes('materijalna odredba') || 
             text.includes('kazniće se') || text.includes('novčana kaza') || text.includes('kazna'))
            && qLower.match(/prekršaj|kazna|materijal|kaznen/)) {
          topAkti.push(akt);
        }
      });

      // Za svaki akt, izdvoji relevantne članove (ne celi sadržaj)
      aktiContext = topAkti.map(akt => {
        // Razdvoji na članove
        const clanovi = akt.sadrzaj.split(/(?=Član \d+\.)/g).filter(c => c.trim());
        if (clanovi.length <= 1) {
          // Kratak akt, uzmi ceo
          return `=== ${akt.tip.toUpperCase()}: ${akt.naziv} (${akt.broj}) ===\n${akt.sadrzaj.slice(0, 3000)}`;
        }
        
        // Oceni svaki član
        const scoredClanovi = clanovi.map(clan => {
          const cl = clan.toLowerCase();
          let s = 0;
          qWords.forEach(w => { if (cl.includes(w)) s++; });
          // Prioritet za kaznene i materijalne odredbe
          if (cl.includes('kaznena odredba') && qLower.match(/kazn|prekršaj|kazna/)) s += 10;
          if (cl.includes('materijalna odredba') && qLower.match(/materijal|prekršaj/)) s += 10;
          if (cl.includes('kazniće se') && qLower.match(/kazn|kazna|prekršaj/)) s += 8;
          if (cl.includes('novčana kazna') && qLower.match(/kazn|kazna|prekršaj/)) s += 8;
          return { clan, score: s };
        }).sort((a, b) => b.score - a.score);
        
        // Uzmi top 3 člana po relevantnosti + uvek uključi one sa kaznenim odredbama
        const topClanovi = scoredClanovi.slice(0, 3).map(s => s.clan);
        
        // Dodaj i članove sa "kaznena" ili "materijalna" odredba ako već nisu tu
        scoredClanovi.forEach(s => {
          if (topClanovi.length >= 6) return;
          if (topClanovi.includes(s.clan)) return;
          const cl = s.clan.toLowerCase();
          if ((cl.includes('kaznena odredba') || cl.includes('kazniće se') || 
               cl.includes('novčana kazna') || cl.includes('materijalna odredba'))
              && qLower.match(/prekršaj|kazna|kazn|materijal/)) {
            topClanovi.push(s.clan);
          }
        });
        
        return `=== ${akt.tip.toUpperCase()}: ${akt.naziv} (${akt.broj}) ===\n${topClanovi.join('\n\n')}`;
      }).join('\n\n---\n\n');
    }

    // ===== 3. GROQ API POZIV =====
    const systemPrompt = `Ti si pravni asistent za komunalnu policiju i gradsku upravu Beograda.
Korisnik postavlja pitanje o zakonima i odlukama.

PRAVILA ZA ODGOVOR:
1. Uvek citiraj TAČAN naziv akta i broj (npr. "Zakon o komunalnoj miliciji, Sl. glasnik RS, br. 49/2019")
2. Uvek citiraj TAČAN član (npr. "Član 5")
3. Ako pitanje traži prekršaj/kaznu, PRONAĐI i MATERIJALNU odredbu (šta je prekršaj) i KAZNENU odredbu (koja je kazna)
4. Format odgovora:
   - Bold naslov akta i člana
   - Kratak citat relevantnog teksta
   - jasno razdvoji materijalnu od kaznene odredbe
5. Ako pitanje traži "prekršaj", obavezno pronađi:
   - MATERIJALNU odredbu (član koji definiše prekršaj)
   - KAZNENU odredbu (član koji definiše kaznu za taj prekršaj)
   - Poveži ih (npr. "Za prekršaj iz člana X, članom Y je propisana kazna...")
6. Koristi samo informacije iz dostavljenih akata
7. Ako u dostavljenim aktima nema odgovora, kaži to i koristi web rezultate ako su dostupni
8. Odgovaraj na srpskom jeziku, pravno precizno

KONTEKST IZ AKATA:
${aktiContext || 'Nema dostupnih akata.'}
${webContext}`;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pitanje }
        ],
        temperature: 0.15,
        max_tokens: 2000,
        top_p: 0.9
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return res.json({ 
        success: false, 
        error: 'Greška pri obradi zahteva. Pokušajte ponovo.' 
      });
    }

    const groqData = await groqRes.json();
    const odgovor = groqData.choices?.[0]?.message?.content || 'Nije moguće generisati odgovor.';

    return res.json({ 
      success: true, 
      odgovor,
      hasWebResults: webContext.length > 0
    });

  } catch (err) {
    console.error('AI Assistant error:', err);
    return res.json({ 
      success: false, 
      error: 'Greška: ' + err.message 
    });
  }
};
