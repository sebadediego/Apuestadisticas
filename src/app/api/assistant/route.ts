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

const GROQ_KEY = process.env.GROQ_API_KEY || '';
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
    const userMsg = message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---';

    let aiResponse = '';

    // 1. Try Groq (free, fast)
    if (!aiResponse && GROQ_KEY) {
      console.log('[Assistant] Trying Groq...');
      aiResponse = await callGroq(systemPrompt, userMsg, conversationHistory);
    }

    // 2. Try Gemini
    if (!aiResponse && GEMINI_KEY) {
      console.log('[Assistant] Trying Gemini...');
      aiResponse = await callGemini(systemPrompt, userMsg, conversationHistory);
    }

    // 3. Try Anthropic
    if (!aiResponse && ANTHROPIC_KEY) {
      console.log('[Assistant] Trying Anthropic...');
      aiResponse = await callAnthropic(systemPrompt, userMsg, conversationHistory);
    }

    // 4. Local fallback
    if (!aiResponse) {
      console.log('[Assistant] Using local fallback');
      aiResponse = generateReport(matchData);
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}

// ==================== GROQ (FREE) ====================
async function callGroq(system: string, userMsg: string, history: any[]): Promise<string> {
  try {
    const messages: any[] = [
      { role: 'system', content: system },
      ...(history || []).slice(-8).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMsg },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.error('[Groq Error]', JSON.stringify(data.error));
      return '';
    }
    const text = data.choices?.[0]?.message?.content || '';
    if (text) console.log('[Assistant] Groq responded OK');
    return text;
  } catch (e: any) {
    console.error('[Groq Exception]', e.message);
    return '';
  }
}

// ==================== GEMINI ====================
async function callGemini(system: string, userMsg: string, history: any[]): Promise<string> {
  try {
    const contents: any[] = [];
    for (const msg of (history || []).slice(-8)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: userMsg }] });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_KEY}`,
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

// ==================== ANTHROPIC ====================
async function callAnthropic(system: string, userMsg: string, history: any[]): Promise<string> {
  try {
    const messages = [
      ...(history || []).slice(-8),
      { role: 'user', content: userMsg },
    ];
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, system, messages }),
    });
    const data = await res.json();
    return data.content?.map((c: any) => c.text || '').join('') || '';
  } catch (e: any) {
    console.error('[Anthropic Exception]', e.message);
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
    '- Si preguntan CUALQUIER otro tema, responde: "Solo puedo ayudarte con partidos, cuotas y predicciones deportivas."',
    '- Basate UNICAMENTE en los datos reales entre "DATOS REALES".',
    '- NUNCA inventes datos. Si no tenes info, decilo.',
    '',
    'PARA PARTIDOS ESPECIFICOS:',
    '- Genera un INFORME ANALITICO DETALLADO con: Analisis General, Cuotas, Mercados Recomendados, Prediccion Final.',
    '- Analiza cuotas y explica cuales ofrecen valor.',
    '- Da recomendacion concreta de apuesta.',
    '- NO listes todos los partidos, SOLO el consultado.',
    '',
    'SIN PARTIDO ESPECIFICO:',
    '- Lista partidos disponibles agrupados por liga.',
    '- Sugeri preguntar por uno especifico.',
    '',
    'FORMATO:',
    '- Espanol argentino (vos, sos, podes).',
    '- Parrafos cortos, **negritas** en datos clave.',
    '- NO uses emojis.',
    '- Se detallado como analista profesional.',
    '- Al final: "Podes apostar en 1Win con las mejores cuotas."',
    '- Siempre: "Las apuestas implican riesgo. Aposta responsablemente."',
  ].join('\n');
}

// ==================== CONTEXT ====================
interface MatchData {
  fixture: any; odds: any; prediction: any; h2h: any[];
  allFixtures: any[]; type: 'specific' | 'live' | 'general'; dateLabel: string;
}

function getDateFromMessage(msg: string): { date: string; label: string } {
  const lower = msg.toLowerCase();
  const today = new Date();
  if (lower.includes('manana') || lower.includes('mañana')) {
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return { date: d.toISOString().split('T')[0], label: 'manana' };
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
    for (const side of ['home', 'away']) {
      const name = (fix.teams?.[side]?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      for (const w of name.split(/[\s\-]+/)) {
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
    if (lowerMsg.includes('vivo') || lowerMsg.includes('live') || lowerMsg.includes('ahora') || lowerMsg.includes('jugando')) {
      const live = await getLiveFixtures();
      const arr = live.response || [];
      parts.push('=== PARTIDOS EN VIVO ===');
      if (arr.length === 0) parts.push('No hay partidos en vivo.');
      else arr.slice(0, 10).forEach((f: any) => parts.push(processFixtureForContext(f)));
      matchData = { ...matchData, allFixtures: arr, type: 'live', dateLabel: 'en vivo' };
      return { context: parts.join('\n'), matchData };
    }

    const { date, label } = getDateFromMessage(message);
    matchData.dateLabel = label;

    const res = await getFixtures({ date });
    const fixtures = res.response || [];
    matchData.allFixtures = fixtures;

    const specific = findMatch(lowerMsg, fixtures);

    if (specific) {
      const fid = specific.fixture?.id;
      matchData.type = 'specific';
      matchData.fixture = specific;
      parts.push('=== PARTIDO CONSULTADO ===');
      parts.push(processFixtureForContext(specific));

      try { const o = await getOdds({ fixture: fid }); if (o.response?.length) { matchData.odds = o.response[0]; parts.push('\n=== CUOTAS ==='); parts.push(processOddsForContext(o.response[0])); } } catch {}
      try { const p = await getPredictions(fid); if (p.response?.length) { matchData.prediction = p.response[0]; parts.push('\n=== PREDICCION ==='); parts.push(processPredictionForContext(p.response[0])); } } catch {}

      const hid = specific.teams?.home?.id;
      const aid = specific.teams?.away?.id;
      if (hid && aid) {
        try { const h = await getHeadToHead({ h2h: `${hid}-${aid}`, last: 5 }); matchData.h2h = h.response || []; if (matchData.h2h.length > 0) { parts.push('\n=== HISTORIAL ==='); parts.push(processH2HForContext(matchData.h2h)); } } catch {}
      }
    } else {
      parts.push(`=== PARTIDOS PARA ${label.toUpperCase()} (${date}) ===`);
      if (fixtures.length === 0) parts.push('No se encontraron partidos.');
      else {
        fixtures.filter((f: any) => f.fixture?.status?.short === 'NS').slice(0, 15).forEach((f: any) => parts.push(processFixtureForContext(f)));
        parts.push('Total: ' + fixtures.length + ' partidos.');
      }
    }
  } catch (error: any) {
    parts.push('Error: ' + error.message);
  }

  return { context: parts.join('\n'), matchData };
}

// ==================== LOCAL FALLBACK ====================
function generateReport(data: MatchData): string {
  if (data.type === 'specific' && data.fixture) {
    const home = data.fixture.teams?.home?.name || 'Local';
    const away = data.fixture.teams?.away?.name || 'Visitante';
    const league = data.fixture.league?.name || '';
    const time = data.fixture.fixture?.date ? new Date(data.fixture.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    let r = `**INFORME: ${home} vs ${away}**\n${league} | ${time}hs\n\n`;
    const pred = data.prediction?.predictions;
    if (pred) {
      if (pred.winner?.name) r += `**Favorito:** ${pred.winner.name}\n`;
      if (pred.percent) r += `Probabilidades: Local ${pred.percent.home} | Empate ${pred.percent.draw} | Visitante ${pred.percent.away}\n`;
      if (pred.advice) r += `Consejo: ${pred.advice}\n\n`;
    }
    const odds = data.odds;
    if (odds?.bookmakers?.length) {
      const bk = odds.bookmakers[0];
      r += `**Cuotas** (${bk.name})\n`;
      for (const bet of (bk.bets || []).slice(0, 4)) {
        r += `${bet.name}: ${(bet.values || []).map((v: any) => v.value + ': ' + v.odd).join(' | ')}\n`;
      }
      r += '\n';
    }
    if (data.h2h.length > 0) {
      r += '**H2H**\n';
      for (const m of data.h2h.slice(0, 3)) {
        const d = m.fixture?.date ? new Date(m.fixture.date).toLocaleDateString('es-AR') : '';
        r += `${d}: ${m.teams?.home?.name} ${m.goals?.home}-${m.goals?.away} ${m.teams?.away?.name}\n`;
      }
      r += '\n';
    }
    r += 'Podes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
    return r;
  }

  if (data.allFixtures.length === 0) return 'No encontre partidos para ' + data.dateLabel + '.';

  let r = `**Partidos para ${data.dateLabel}** (${data.allFixtures.length})\n\n`;
  const ns = data.allFixtures.filter((f: any) => f.fixture?.status?.short === 'NS');
  const byLeague: Record<string, any[]> = {};
  for (const f of ns.slice(0, 20)) {
    const ln = f.league?.name || 'Otra';
    if (!byLeague[ln]) byLeague[ln] = [];
    byLeague[ln].push(f);
  }
  for (const [league, matches] of Object.entries(byLeague)) {
    r += `**${league}**\n`;
    for (const f of matches) {
      const t = f.fixture?.date ? new Date(f.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
      r += `${t} - ${f.teams?.home?.name} vs ${f.teams?.away?.name}\n`;
    }
    r += '\n';
  }
  r += 'Preguntame por un partido especifico para el informe completo.\n\nPodes apostar en 1Win.\n\nAposta responsablemente.';
  return r;
}
