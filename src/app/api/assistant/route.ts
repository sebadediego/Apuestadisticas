// src/app/api/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFixtures, getOdds, getPredictions, getHeadToHead, getLiveFixtures } from '@/lib/api-football';
import { processFixtureForContext, processOddsForContext, processPredictionForContext, processH2HForContext } from '@/lib/data-processor';

const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const GROQ_KEY = process.env.GROQ_API_KEY || '';

const SYSTEM = `Sos "Apuestadisticas Bot", un experto en apuestas de futbol. Sos como un amigo que sabe mucho de futbol y apuestas.

PERSONALIDAD:
- Hablas en espanol argentino (vos, sos, podes, dale, che, etc.)
- Sos amigable, cercano, pero profesional cuando analizas partidos
- Si te saludan, saluda normal y breve, presenta que podes ayudar con partidos, cuotas y predicciones
- NO uses emojis

REGLAS:
- SOLO respondas sobre futbol, apuestas deportivas, cuotas y partidos
- Si preguntan CUALQUIER otra cosa (politica, musica, etc), deci: "Che, yo solo puedo ayudarte con temas de futbol y apuestas. Preguntame sobre algun partido y te hago un analisis."
- SIEMPRE que hables de cuotas, NUNCA menciones el nombre de la casa de apuestas de donde vienen (no digas 10Bet, William Hill, Bet365, etc). Solo mostra los numeros.
- NUNCA digas "no tengo datos", "no hay informacion disponible", "datos insuficientes" ni nada similar. Si no tenes datos especificos, analiza con tu conocimiento de futbol y da tu opinion igual.
- NUNCA digas que un partido es "muy parejo" sin dar recomendacion. SIEMPRE termina con un tip concreto.
- Cuando el usuario pregunte por un equipo, busca en la lista de partidos que te paso. Los nombres estan en ingles (Brazil, France, Turkey, Argentina). Interpreta lo que el usuario quiso decir aunque escriba mal o en espanol.

CUANDO PREGUNTAN POR UN PARTIDO ESPECIFICO:
- Hace un analisis completo: como vienen los equipos, goles, cuotas, mercados recomendados
- Recomienda 2-3 mercados concretos (1X2, Over/Under, Ambos Marcan, etc) con las cuotas
- Da tu prediccion final con conviction, como un tipster profesional
- Menciona la hora del partido en hora Argentina (ya viene asi en los datos)

CUANDO PREGUNTAN "MEJORES CUOTAS" O "QUE APOSTAR HOY":
- Mira los partidos disponibles y sus cuotas
- Elegí 2-3 partidos que tengan cuotas con valor
- Explica brevemente por que cada uno es buena opcion
- Da tips concretos

CUANDO PREGUNTAN POR ALGO GENERAL DE FUTBOL:
- Responde naturalmente, como un amigo que sabe de futbol
- Si podes relacionarlo con apuestas, hacelo

AL FINAL DE CADA ANALISIS O RECOMENDACION:
- Agrega: "Podes apostar en 1Win con las mejores cuotas."
- Y: "Las apuestas implican riesgo. Aposta responsablemente."

USA **negritas** para datos importantes como cuotas, nombres de equipos, porcentajes.`;

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    // Check if it's a simple greeting
    const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isGreeting = ['hola', 'buenas', 'hey', 'que tal', 'buen dia', 'como estas', 'hi', 'hello'].some(g => lower.startsWith(g)) && lower.length < 20;

    let context = '';

    if (!isGreeting) {
      // Always load fixture data for football queries
      context = await buildContext(lower);
    }

    const userMsg = context ? message + '\n\n' + context : message;

    // Single Groq call — let the AI handle everything
    const messages = [
      { role: 'system', content: SYSTEM },
      ...(conversationHistory || []).slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    // Try OpenAI first (best), then Groq fallback
    let response = '';
    if (OPENAI_KEY) {
      response = await callOpenAI(messages);
    }
    if (!response && GROQ_KEY) {
      response = await callGroq(messages);
    }
    return NextResponse.json({ response: response || 'Disculpa, hubo un problema. Intenta de nuevo.' });
  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json({ response: 'Hubo un error. Intenta de nuevo en unos segundos.' });
  }
}

async function buildContext(query: string): Promise<string> {
  const parts: string[] = [];
  const isLive = ['vivo', 'live', 'ahora', 'jugando'].some(k => query.includes(k));

  try {
    if (isLive) {
      const live = await getLiveFixtures();
      const arr = live.response || [];
      if (arr.length > 0) {
        parts.push('=== PARTIDOS EN VIVO AHORA ===');
        arr.slice(0, 12).forEach((f: any) => parts.push(processFixtureForContext(f)));
      } else {
        parts.push('No hay partidos en vivo en este momento.');
      }
      return parts.join('\n');
    }

    // Load today + tomorrow fixtures
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    const tom = addDays(today, 1);

    const [todayRes, tomRes] = await Promise.allSettled([
      getFixtures({ date: today }),
      getFixtures({ date: tom }),
    ]);

    const todayFix = todayRes.status === 'fulfilled' ? todayRes.value.response || [] : [];
    const tomFix = tomRes.status === 'fulfilled' ? tomRes.value.response || [] : [];

    // Priority leagues
    const TOP = new Set([128, 71, 239, 262, 39, 140, 135, 61, 78, 94, 88, 2, 3, 848, 13, 11, 130, 73, 45, 143, 137, 65, 81, 1, 4, 9, 29, 32, 30, 34, 10]);

    // Sort: top leagues + friendlies first
    const sortFix = (arr: any[]) => arr.sort((a: any, b: any) => {
      const aTop = TOP.has(a.league?.id) || (a.league?.name || '').toLowerCase().includes('friendl');
      const bTop = TOP.has(b.league?.id) || (b.league?.name || '').toLowerCase().includes('friendl');
      if (aTop && !bTop) return -1;
      if (!aTop && bTop) return 1;
      return 0;
    });

    const todaySorted = sortFix(todayFix);
    const tomSorted = sortFix(tomFix);

    // Compact list for context
    parts.push('=== PARTIDOS DE HOY ===');
    const todayNS = todaySorted.filter((f: any) => f.fixture?.status?.short === 'NS');
    const todayLive = todaySorted.filter((f: any) => ['1H', '2H', 'HT', 'ET'].includes(f.fixture?.status?.short));
    const todayFT = todaySorted.filter((f: any) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short));

    if (todayLive.length > 0) {
      parts.push('\nEN VIVO:');
      todayLive.slice(0, 8).forEach((f: any) => parts.push(formatFixtureCompact(f, 'ARG')));
    }
    if (todayNS.length > 0) {
      parts.push('\nPOR JUGAR:');
      todayNS.slice(0, 25).forEach((f: any) => parts.push(formatFixtureCompact(f, 'ARG')));
    }
    if (todayFT.length > 0) {
      parts.push('\nFINALIZADOS:');
      todayFT.slice(0, 10).forEach((f: any) => parts.push(formatFixtureCompact(f, 'ARG')));
    }

    parts.push('\n=== PARTIDOS DE MANANA ===');
    const tomNS = tomSorted.filter((f: any) => f.fixture?.status?.short === 'NS');
    if (tomNS.length > 0) {
      tomNS.slice(0, 25).forEach((f: any) => parts.push(formatFixtureCompact(f, 'ARG')));
    } else {
      parts.push('No hay partidos cargados para manana todavia.');
    }

    // If user seems to ask about a specific match, try to find it and get detailed data
    const allFix = [...todayFix, ...tomFix];
    const specific = findBestMatch(query, allFix);

    if (specific) {
      const fid = specific.fixture?.id;
      parts.push('\n=== DATOS DETALLADOS DEL PARTIDO IDENTIFICADO ===');
      parts.push(processFixtureForContext(specific));
      const time = specific.fixture?.date
        ? new Date(specific.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
        : '?';
      parts.push('Hora Argentina: ' + time + 'hs');

      // Odds
      try {
        const o = await getOdds({ fixture: fid });
        if (o.response?.length) { parts.push('\nCUOTAS:'); parts.push(processOddsForContext(o.response[0])); }
      } catch {}

      // Prediction
      try {
        const p = await getPredictions(fid);
        if (p.response?.length) { parts.push('\nPREDICCION:'); parts.push(processPredictionForContext(p.response[0])); }
      } catch {}

      // H2H
      const hid = specific.teams?.home?.id;
      const aid = specific.teams?.away?.id;
      if (hid && aid) {
        try {
          const h = await getHeadToHead({ h2h: `${hid}-${aid}`, last: 5 });
          if (h.response?.length) { parts.push('\nHISTORIAL:'); parts.push(processH2HForContext(h.response)); }
        } catch {}
      }
    }
  } catch (e: any) {
    parts.push('Error cargando datos: ' + e.message);
  }

  return parts.join('\n');
}

// Translation map for team search
const TRANSLATIONS: Record<string, string[]> = {
  'brasil': ['brazil'], 'francia': ['france'], 'alemania': ['germany'],
  'espana': ['spain'], 'italia': ['italy'], 'inglaterra': ['england'],
  'argentina': ['argentina'], 'turquia': ['turkey', 'turkiye'],
  'rumania': ['romania'], 'holanda': ['netherlands'], 'belgica': ['belgium'],
  'portugal': ['portugal'], 'croacia': ['croatia'], 'suecia': ['sweden'],
  'noruega': ['norway'], 'dinamarca': ['denmark'], 'suiza': ['switzerland'],
  'grecia': ['greece'], 'serbia': ['serbia'], 'ucrania': ['ukraine'],
  'polonia': ['poland'], 'escocia': ['scotland'], 'gales': ['wales'],
  'irlanda': ['ireland'], 'mexico': ['mexico'], 'colombia': ['colombia'],
  'chile': ['chile'], 'peru': ['peru'], 'uruguay': ['uruguay'],
  'paraguay': ['paraguay'], 'ecuador': ['ecuador'], 'venezuela': ['venezuela'],
  'japon': ['japan'], 'corea': ['korea'], 'marruecos': ['morocco'],
  'egipto': ['egypt'], 'nigeria': ['nigeria'], 'camerun': ['cameroon'],
  'mauritania': ['mauritania'], 'estados unidos': ['usa', 'united states'],
  'boca': ['boca'], 'river': ['river'], 'racing': ['racing'],
  'lanus': ['lanus'], 'independiente': ['independiente'],
  'san lorenzo': ['san lorenzo'], 'huracan': ['huracan'],
  'barcelona': ['barcelona'], 'real madrid': ['real madrid'],
  'liverpool': ['liverpool'], 'chelsea': ['chelsea'], 'arsenal': ['arsenal'],
  'juventus': ['juventus'], 'milan': ['milan'], 'inter': ['inter'],
  'psg': ['paris saint'], 'bayern': ['bayern'], 'dortmund': ['dortmund'],
  'flamengo': ['flamengo'], 'palmeiras': ['palmeiras'],
};

function findBestMatch(query: string, fixtures: any[]): any | null {
  const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Build search terms from translations
  const terms: string[] = [];
  for (const [es, en] of Object.entries(TRANSLATIONS)) {
    if (q.includes(es)) terms.push(...en);
  }
  // Also add raw words 5+ chars
  q.split(/\s+/).filter(w => w.length >= 5).forEach(w => terms.push(w));

  if (terms.length === 0) return null;

  for (const fix of fixtures) {
    const home = (fix.teams?.home?.name || '').toLowerCase();
    const away = (fix.teams?.away?.name || '').toLowerCase();
    const both = home + ' ' + away;

    for (const term of terms) {
      if (both.includes(term)) return fix;
    }
  }
  return null;
}

function formatFixtureCompact(f: any, tz: string): string {
  const home = f.teams?.home?.name || '?';
  const away = f.teams?.away?.name || '?';
  const league = f.league?.name || '';
  const status = f.fixture?.status?.short;
  const time = f.fixture?.date
    ? new Date(f.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
    : '?';

  if (['1H', '2H', 'HT', 'ET'].includes(status)) {
    return `${home} ${f.goals?.home ?? 0}-${f.goals?.away ?? 0} ${away} (${f.fixture?.status?.elapsed}') [${league}]`;
  }
  if (['FT', 'AET', 'PEN'].includes(status)) {
    return `${home} ${f.goals?.home ?? 0}-${f.goals?.away ?? 0} ${away} (FT) [${league}]`;
  }
  return `${time}hs - ${home} vs ${away} [${league}]`;
}

function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

async function callOpenAI(messages: any[]): Promise<string> {
  if (!OPENAI_KEY) return '';
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 2500, temperature: 0.7 }),
    });
    const data = await res.json();
    if (data.error) { console.error('[OpenAI Error]', JSON.stringify(data.error)); return ''; }
    const text = data.choices?.[0]?.message?.content || '';
    if (text) console.log('[Assistant] OpenAI responded OK');
    return text;
  } catch (e: any) {
    console.error('[OpenAI Exception]', e.message);
    return '';
  }
}

async function callGroq(messages: any[]): Promise<string> {
  if (!GROQ_KEY) return '';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 2500, temperature: 0.7 }),
    });
    const data = await res.json();
    if (data.error) { console.error('[Groq Error]', JSON.stringify(data.error)); return ''; }
    return data.choices?.[0]?.message?.content || '';
  } catch (e: any) {
    console.error('[Groq Exception]', e.message);
    return '';
  }
}
