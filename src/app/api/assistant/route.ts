// src/app/api/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getFixtures, getLiveFixtures, getOdds, getPredictions, getHeadToHead
} from '@/lib/api-football';
import {
  processFixtureForContext, processOddsForContext,
  processPredictionForContext, processH2HForContext
} from '@/lib/data-processor';

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    // Detect intent — only fetch football data when needed
    const intent = detectIntent(message);
    let context = '';

    if (intent.needsData) {
      context = await gatherContext(message, intent);
    }

    const systemPrompt = buildSystemPrompt();
    const userMsg = context
      ? message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---'
      : message;

    // Try Groq
    let response = '';
    if (GROQ_KEY) {
      response = await callGroq(systemPrompt, userMsg, conversationHistory);
    }
    if (!response && GEMINI_KEY) {
      response = await callGemini(systemPrompt, userMsg, conversationHistory);
    }
    if (!response) {
      response = 'Disculpa, no pude procesar tu consulta en este momento. Intenta de nuevo.';
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}

// ==================== INTENT DETECTION ====================
interface Intent {
  needsData: boolean;
  isGreeting: boolean;
  isLive: boolean;
  isSpecificMatch: boolean;
  wantsTomorrow: boolean;
  wantsRecommendation: boolean;
}

function detectIntent(msg: string): Intent {
  const lower = msg.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const greetings = ['hola', 'buenas', 'hey', 'que tal', 'buen dia', 'buenas tardes', 'buenas noches', 'como estas', 'hi', 'hello'];
  const isGreeting = greetings.some(g => lower.includes(g)) && lower.length < 30;

  const footballKeywords = ['partido', 'partidos', 'apostar', 'apuesta', 'cuota', 'cuotas', 'prediccion',
    'pronostico', 'gol', 'goles', 'equipo', 'liga', 'futbol', 'juega', 'juegan', 'hoy', 'manana',
    'recomend', 'pick', 'mejor', 'analisis', 'versus', ' vs ', 'contra', 'vivo', 'live',
    'over', 'under', 'btts', 'ganador', 'empate', 'resultado', 'marcador', 'score'];

  const isLive = ['vivo', 'live', 'ahora', 'jugando'].some(k => lower.includes(k));
  const wantsTomorrow = lower.includes('manana') || lower.includes('mañana');
  const wantsRecommendation = ['recomend', 'pick', 'mejor', 'apostar', 'apuesta', 'que jugar', 'a que le'].some(k => lower.includes(k));

  // Check if the message mentions any team-like words (4+ letter words that aren't common Spanish)
  const commonWords = new Set(['para', 'como', 'que', 'esto', 'esta', 'esos', 'esas', 'algo', 'nada', 'todo', 'bien', 'bueno', 'malo', 'puede', 'quiero', 'donde', 'cuando', 'porque', 'gracias', 'favor', 'decir', 'hacer', 'tener', 'haber', 'poder', 'saber', 'deber']);
  const words = lower.split(/\s+/);
  const hasTeamName = words.some(w => w.length >= 4 && !commonWords.has(w) && !greetings.includes(w) && !footballKeywords.includes(w));

  const hasFootballKeyword = footballKeywords.some(k => lower.includes(k));
  const isSpecificMatch = hasTeamName && (hasFootballKeyword || wantsRecommendation || lower.includes('vs') || lower.includes('contra'));

  const needsData = !isGreeting && (hasFootballKeyword || isLive || isSpecificMatch || hasTeamName);

  return { needsData, isGreeting, isLive, isSpecificMatch, wantsTomorrow, wantsRecommendation };
}

// ==================== SYSTEM PROMPT ====================
function buildSystemPrompt(): string {
  return [
    'Sos "Apuestadisticas Bot", un analista deportivo experto en futbol y apuestas.',
    'Tu personalidad es amigable, cercana, como un amigo que sabe mucho de futbol.',
    'Hablas en espanol argentino (usas vos, sos, podes, dale, etc.).',
    '',
    'COMPORTAMIENTO:',
    '- Si te saludan (hola, buenas, etc), respondé de forma amigable y breve, presentate y pregunta en que podes ayudar. NO listes partidos.',
    '- Si preguntan algo que NO es de futbol/apuestas, decí amablemente que solo podes ayudar con temas de futbol y apuestas.',
    '- Si preguntan por un partido especifico, genera un INFORME ANALITICO con: analisis, cuotas, mercados recomendados, prediccion.',
    '- Si piden recomendaciones generales, analiza los datos y recomienda los mejores partidos para apostar.',
    '- Si preguntan por partidos en vivo, resume los scores actuales.',
    '',
    'CUANDO HAY DATOS REALES:',
    '- Basate SOLO en los datos entre "DATOS REALES". No inventes.',
    '- Analiza las cuotas y explica cuales tienen valor.',
    '- Da una recomendacion concreta.',
    '- Menciona mercados: 1X2, Over/Under, Ambos Marcan, etc.',
    '',
    'FORMATO:',
    '- Parrafos cortos y claros.',
    '- Usa **negritas** para datos importantes.',
    '- NO uses emojis.',
    '- Al final de recomendaciones: "Podes apostar en 1Win con las mejores cuotas."',
    '- Siempre en recomendaciones: "Las apuestas implican riesgo. Aposta responsablemente."',
  ].join('\n');
}

// ==================== CONTEXT GATHERING ====================
function getArgDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

function findMatch(query: string, fixtures: any[]): any | null {
  const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  for (const fix of fixtures) {
    for (const side of ['home', 'away']) {
      const name = (fix.teams?.[side]?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      for (const w of name.split(/[\s\-]+/)) {
        if (w.length >= 3 && q.includes(w)) return fix;
      }
    }
  }
  return null;
}

async function gatherContext(message: string, intent: Intent): Promise<string> {
  const lower = message.toLowerCase();
  const parts: string[] = [];

  try {
    // Live matches
    if (intent.isLive) {
      const live = await getLiveFixtures();
      const arr = live.response || [];
      if (arr.length === 0) {
        parts.push('No hay partidos en vivo en este momento.');
      } else {
        parts.push('=== PARTIDOS EN VIVO ===');
        arr.slice(0, 10).forEach((f: any) => parts.push(processFixtureForContext(f)));
      }
      return parts.join('\n');
    }

    // Determine dates to search
    const today = getArgDate();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    const primaryDate = intent.wantsTomorrow ? tomorrow : today;
    const datesToSearch = intent.wantsTomorrow
      ? [tomorrow, today, dayAfter]
      : [today, tomorrow, dayAfter];

    // Fetch primary date fixtures
    const res = await getFixtures({ date: primaryDate });
    let fixtures = res.response || [];
    let specific = findMatch(lower, fixtures);
    let usedDate = primaryDate;

    // If not found, try other dates
    if (!specific) {
      for (const d of datesToSearch.filter(x => x !== primaryDate)) {
        try {
          const r2 = await getFixtures({ date: d });
          const f2 = r2.response || [];
          const found = findMatch(lower, f2);
          if (found) {
            specific = found;
            fixtures = f2;
            usedDate = d;
            break;
          }
        } catch {}
      }
    }

    if (specific) {
      // Found specific match — get full data
      const fid = specific.fixture?.id;
      parts.push('=== PARTIDO ENCONTRADO ===');
      parts.push(processFixtureForContext(specific));
      if (usedDate !== primaryDate) {
        const label = usedDate === today ? 'hoy' : usedDate === tomorrow ? 'manana' : 'pasado manana';
        parts.push('(Este partido es ' + label + ')');
      }

      // Odds
      try {
        const o = await getOdds({ fixture: fid });
        if (o.response?.length) { parts.push('\n=== CUOTAS ==='); parts.push(processOddsForContext(o.response[0])); }
      } catch {}

      // Prediction
      try {
        const p = await getPredictions(fid);
        if (p.response?.length) { parts.push('\n=== PREDICCION ==='); parts.push(processPredictionForContext(p.response[0])); }
      } catch {}

      // H2H
      const hid = specific.teams?.home?.id;
      const aid = specific.teams?.away?.id;
      if (hid && aid) {
        try {
          const h = await getHeadToHead({ h2h: `${hid}-${aid}`, last: 5 });
          if (h.response?.length) { parts.push('\n=== HISTORIAL ==='); parts.push(processH2HForContext(h.response)); }
        } catch {}
      }
    } else {
      // No specific match — list available fixtures for the date
      const dateLabel = primaryDate === today ? 'hoy' : primaryDate === tomorrow ? 'manana' : 'pasado manana';
      const ns = fixtures.filter((f: any) => f.fixture?.status?.short === 'NS');

      if (ns.length === 0 && fixtures.length === 0) {
        parts.push('No se encontraron partidos para ' + dateLabel + '.');
      } else {
        parts.push('=== PARTIDOS DISPONIBLES PARA ' + dateLabel.toUpperCase() + ' ===');
        parts.push('Total: ' + fixtures.length + ' partidos (' + ns.length + ' por jugar)');
        // Group by league, show max 20
        const byLeague: Record<string, any[]> = {};
        for (const f of ns.slice(0, 20)) {
          const ln = f.league?.name || 'Otra';
          if (!byLeague[ln]) byLeague[ln] = [];
          byLeague[ln].push(f);
        }
        for (const [league, matches] of Object.entries(byLeague)) {
          parts.push('\n' + league + ':');
          for (const f of matches) {
            const t = f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }) : '';
            parts.push('  ' + t + ' ' + (f.teams?.home?.name || '?') + ' vs ' + (f.teams?.away?.name || '?'));
          }
        }
      }
    }
  } catch (error: any) {
    parts.push('Error obteniendo datos: ' + error.message);
  }

  return parts.join('\n');
}

// ==================== AI CALLS ====================
async function callGroq(system: string, userMsg: string, history: any[]): Promise<string> {
  try {
    const messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 2000, temperature: 0.7 }),
    });

    const data = await res.json();
    if (data.error) { console.error('[Groq Error]', JSON.stringify(data.error)); return ''; }
    const text = data.choices?.[0]?.message?.content || '';
    if (text) console.log('[Assistant] Groq responded OK');
    return text;
  } catch (e: any) {
    console.error('[Groq Exception]', e.message);
    return '';
  }
}

async function callGemini(system: string, userMsg: string, history: any[]): Promise<string> {
  try {
    const contents = [
      ...(history || []).slice(-8).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMsg }] },
    ];

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + GEMINI_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: system }] },
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );
    const data = await res.json();
    if (data.error) { console.error('[Gemini Error]', JSON.stringify(data.error)); return ''; }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (e: any) {
    console.error('[Gemini Exception]', e.message);
    return '';
  }
}
