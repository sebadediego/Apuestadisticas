// src/app/api/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getFixtures, getFixturesToday, getLiveFixtures, getOdds, getPredictions,
  getHeadToHead, getTodayDate
} from '@/lib/api-football';
import {
  processFixtureForContext, processOddsForContext,
  processPredictionForContext, processH2HForContext
} from '@/lib/data-processor';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const { context, matchData } = await gatherContext(message);
    const systemPrompt = buildSystemPrompt();

    // Try Gemini first (free), then Anthropic, then local fallback
    let aiResponse = '';

    if (GEMINI_KEY) {
      aiResponse = await callGemini(systemPrompt, message, context, conversationHistory);
    }

    if (!aiResponse && ANTHROPIC_KEY) {
      aiResponse = await callAnthropic(systemPrompt, message, context, conversationHistory);
    }

    if (!aiResponse) {
      aiResponse = generateReport(matchData);
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}

// ==================== GEMINI ====================
async function callGemini(system: string, message: string, context: string, history: any[]): Promise<string> {
  try {
    const contents: any[] = [];

    // Add conversation history
    for (const msg of (history || []).slice(-8)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current message with context
    contents.push({
      role: 'user',
      parts: [{ text: message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---' }],
    });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  } catch (e) {
    console.error('Gemini error:', e);
    return '';
  }
}

// ==================== ANTHROPIC ====================
async function callAnthropic(system: string, message: string, context: string, history: any[]): Promise<string> {
  try {
    const messages = [
      ...(history || []).slice(-8),
      {
        role: 'user',
        content: message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---',
      },
    ];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system,
        messages,
      }),
    });

    const data = await res.json();
    return data.content?.map((c: any) => c.text || '').join('') || '';
  } catch (e) {
    console.error('Anthropic error:', e);
    return '';
  }
}

// ==================== SYSTEM PROMPT ====================
function buildSystemPrompt(): string {
  return [
    'Sos "Apuestadisticas Bot", analista deportivo experto en futbol y apuestas deportivas.',
    '',
    'REGLAS ESTRICTAS:',
    '- SOLO respondas sobre futbol, apuestas, cuotas, predicciones y partidos.',
    '- Si preguntan CUALQUIER otro tema (politica, musica, cocina, etc.), responde exactamente: "Solo puedo ayudarte con partidos, cuotas y predicciones deportivas."',
    '- Basate UNICAMENTE en los datos reales proporcionados entre las etiquetas "DATOS REALES".',
    '- NUNCA inventes estadisticas, resultados, cuotas o datos que no esten en el contexto.',
    '- Si no tenes datos de algo, deci "no tengo datos disponibles para eso".',
    '',
    'CUANDO TE PREGUNTEN POR UN PARTIDO ESPECIFICO:',
    '- Genera un INFORME ANALITICO DETALLADO.',
    '- Incluye secciones: Analisis General, Cuotas Disponibles, Mercados Recomendados, Prediccion Final.',
    '- Analiza las cuotas y explica cuales ofrecen valor.',
    '- Menciona el historial directo si hay datos.',
    '- Da una recomendacion concreta de apuesta.',
    '- NO listes todos los partidos del dia. SOLO habla del partido consultado.',
    '',
    'CUANDO PREGUNTEN "QUE APOSTAR" SIN ESPECIFICAR PARTIDO:',
    '- Muestra los partidos disponibles para esa fecha.',
    '- Agrupa por liga.',
    '- Sugeri que pregunten por un partido especifico para el informe completo.',
    '',
    'FORMATO DE RESPUESTA:',
    '- Responde en espanol argentino (vos, sos, podes, etc.).',
    '- Usa parrafos cortos y claros.',
    '- Usa **negritas** para datos clave (cuotas, porcentajes, nombres de equipos).',
    '- NO uses emojis.',
    '- Se detallado y analitico, como un analista profesional de apuestas.',
    '- Al final de cada recomendacion, agrega: "Podes apostar en 1Win con las mejores cuotas."',
    '- Siempre termina con: "Las apuestas implican riesgo. Aposta responsablemente."',
  ].join('\n');
}

// ==================== CONTEXT GATHERING ====================
interface MatchData {
  fixture: any;
  odds: any;
  prediction: any;
  h2h: any[];
  allFixtures: any[];
  type: 'specific' | 'live' | 'general';
  dateLabel: string;
}

function getDateFromMessage(msg: string): { date: string; label: string } {
  const lower = msg.toLowerCase();
  const today = new Date();

  if (lower.includes('manana') || lower.includes('mañana')) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return { date: d.toISOString().split('T')[0], label: 'manana' };
  }
  if (lower.includes('pasado') && (lower.includes('manana') || lower.includes('mañana'))) {
    const d = new Date(today); d.setDate(d.getDate() + 2);
    return { date: d.toISOString().split('T')[0], label: 'pasado manana' };
  }
  if (lower.includes('ayer')) {
    const d = new Date(today); d.setDate(d.getDate() - 1);
    return { date: d.toISOString().split('T')[0], label: 'ayer' };
  }
  return { date: today.toISOString().split('T')[0], label: 'hoy' };
}

function findMatch(query: string, fixtures: any[]): any | null {
  const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  for (const fix of fixtures) {
    const homeFull = (fix.teams?.home?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const awayFull = (fix.teams?.away?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for (const name of [homeFull, awayFull]) {
      const words = name.split(/[\s\-]+/);
      for (const w of words) {
        if (w.length >= 3 && q.includes(w)) return fix;
      }
    }
  }
  return null;
}

async function gatherContext(message: string): Promise<{ context: string; matchData: MatchData }> {
  const lowerMsg = message.toLowerCase();
  const parts: string[] = [];
  let matchData: MatchData = { fixture: null, odds: null, prediction: null, h2h: [], allFixtures: [], type: 'general', dateLabel: 'hoy' };

  try {
    // Live check
    if (lowerMsg.includes('vivo') || lowerMsg.includes('live') || lowerMsg.includes('ahora') || lowerMsg.includes('jugando')) {
      const live = await getLiveFixtures();
      const liveArr = live.response || [];
      parts.push('=== PARTIDOS EN VIVO ===');
      if (liveArr.length === 0) {
        parts.push('No hay partidos en vivo en este momento.');
      } else {
        liveArr.slice(0, 10).forEach((f: any) => parts.push(processFixtureForContext(f)));
      }
      matchData = { ...matchData, allFixtures: liveArr, type: 'live', dateLabel: 'en vivo' };
      return { context: parts.join('\n'), matchData };
    }

    // Get date
    const { date, label } = getDateFromMessage(message);
    matchData.dateLabel = label;

    // Fetch fixtures
    const res = await getFixtures({ date });
    const fixtures = res.response || [];
    matchData.allFixtures = fixtures;

    // Find specific match
    const specific = findMatch(lowerMsg, fixtures);

    if (specific) {
      const fid = specific.fixture?.id;
      matchData.type = 'specific';
      matchData.fixture = specific;
      parts.push('=== PARTIDO CONSULTADO ===');
      parts.push(processFixtureForContext(specific));

      // Odds
      try {
        const o = await getOdds({ fixture: fid });
        if (o.response?.length) {
          matchData.odds = o.response[0];
          parts.push('\n=== CUOTAS ===');
          parts.push(processOddsForContext(o.response[0]));
        }
      } catch {}

      // Prediction
      try {
        const p = await getPredictions(fid);
        if (p.response?.length) {
          matchData.prediction = p.response[0];
          parts.push('\n=== PREDICCION ===');
          parts.push(processPredictionForContext(p.response[0]));
        }
      } catch {}

      // H2H
      const hid = specific.teams?.home?.id;
      const aid = specific.teams?.away?.id;
      if (hid && aid) {
        try {
          const h = await getHeadToHead({ h2h: `${hid}-${aid}`, last: 5 });
          matchData.h2h = h.response || [];
          if (matchData.h2h.length > 0) {
            parts.push('\n=== HISTORIAL ===');
            parts.push(processH2HForContext(matchData.h2h));
          }
        } catch {}
      }
    } else {
      // General — list fixtures
      parts.push(`=== PARTIDOS PARA ${label.toUpperCase()} (${date}) ===`);
      if (fixtures.length === 0) {
        parts.push('No se encontraron partidos para esta fecha.');
      } else {
        const ns = fixtures.filter((f: any) => f.fixture?.status?.short === 'NS');
        const rest = fixtures.filter((f: any) => f.fixture?.status?.short !== 'NS');
        [...ns.slice(0, 15), ...rest.slice(0, 5)].forEach((f: any) => parts.push(processFixtureForContext(f)));
        parts.push('\nTotal: ' + fixtures.length + ' partidos.');
      }
    }
  } catch (error: any) {
    parts.push('Error obteniendo datos: ' + error.message);
  }

  return { context: parts.join('\n'), matchData };
}

// ==================== LOCAL FALLBACK ====================
function generateReport(data: MatchData): string {
  if (data.type === 'specific' && data.fixture) {
    const fix = data.fixture;
    const home = fix.teams?.home?.name || 'Local';
    const away = fix.teams?.away?.name || 'Visitante';
    const league = fix.league?.name || '';
    const time = fix.fixture?.date
      ? new Date(fix.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';

    let r = '**INFORME: ' + home + ' vs ' + away + '**\n' + league + ' | ' + time + 'hs\n\n';

    const pred = data.prediction?.predictions;
    if (pred) {
      r += '**Analisis**\n';
      if (pred.winner?.name) r += 'Favorito: **' + pred.winner.name + '**\n';
      if (pred.percent) r += 'Probabilidades: Local ' + pred.percent.home + ' | Empate ' + pred.percent.draw + ' | Visitante ' + pred.percent.away + '\n';
      if (pred.advice) r += 'Consejo: ' + pred.advice + '\n';
      r += '\n';
    }

    const odds = data.odds;
    if (odds?.bookmakers?.length) {
      const bk = odds.bookmakers[0];
      r += '**Cuotas** (' + bk.name + ')\n';
      for (const bet of (bk.bets || []).slice(0, 4)) {
        const vals = (bet.values || []).map((v: any) => v.value + ': ' + v.odd).join(' | ');
        r += bet.name + ': ' + vals + '\n';
      }
      r += '\n';
    }

    if (data.h2h.length > 0) {
      r += '**H2H**\n';
      for (const m of data.h2h.slice(0, 3)) {
        const d = m.fixture?.date ? new Date(m.fixture.date).toLocaleDateString('es-AR') : '';
        r += d + ': ' + (m.teams?.home?.name || '') + ' ' + (m.goals?.home ?? 0) + '-' + (m.goals?.away ?? 0) + ' ' + (m.teams?.away?.name || '') + '\n';
      }
      r += '\n';
    }

    r += 'Podes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
    return r;
  }

  if (data.type === 'live') {
    if (data.allFixtures.length === 0) return 'No hay partidos en vivo en este momento.';
    let r = '**' + data.allFixtures.length + ' partidos en vivo**\n\n';
    for (const f of data.allFixtures.slice(0, 8)) {
      r += '**' + (f.teams?.home?.name || '?') + '** ' + (f.goals?.home ?? 0) + '-' + (f.goals?.away ?? 0) + ' **' + (f.teams?.away?.name || '?') + '** (' + (f.fixture?.status?.elapsed || '?') + "')\n";
    }
    return r;
  }

  if (data.allFixtures.length === 0) {
    return 'No encontre partidos para ' + data.dateLabel + '. Proba con otra fecha.';
  }

  let r = '**Partidos para ' + data.dateLabel + '** (' + data.allFixtures.length + ' total)\n\n';
  const ns = data.allFixtures.filter((f: any) => f.fixture?.status?.short === 'NS');
  const byLeague: Record<string, any[]> = {};
  for (const f of ns.slice(0, 20)) {
    const ln = f.league?.name || 'Otra';
    if (!byLeague[ln]) byLeague[ln] = [];
    byLeague[ln].push(f);
  }
  for (const [league, matches] of Object.entries(byLeague)) {
    r += '**' + league + '**\n';
    for (const f of matches) {
      const t = f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
      r += t + ' - ' + (f.teams?.home?.name || '?') + ' vs ' + (f.teams?.away?.name || '?') + '\n';
    }
    r += '\n';
  }
  r += 'Preguntame por un partido especifico para el informe completo.\n\nPodes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
  return r;
}
