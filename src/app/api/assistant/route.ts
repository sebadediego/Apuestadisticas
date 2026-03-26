// src/app/api/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getFixturesToday, getLiveFixtures, getOdds, getPredictions,
  getHeadToHead, TOP_LEAGUES
} from '@/lib/api-football';
import {
  processFixtureForContext, processOddsForContext,
  processPredictionForContext
} from '@/lib/data-processor';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const context = await gatherContext(message);
    const systemPrompt = buildSystemPrompt();

    const messages = [
      ...(conversationHistory || []).slice(-10),
      {
        role: 'user',
        content: message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---'
      }
    ];

    if (ANTHROPIC_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: systemPrompt,
          messages,
        }),
      });

      const data = await response.json();
      const text = data.content?.map((c: any) => c.text || '').join('') || 'No pude generar una respuesta.';
      return NextResponse.json({ response: text, context });
    }

    const analysis = generateLocalAnalysis(message, context);
    return NextResponse.json({ response: analysis, context });

  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud', details: error.message },
      { status: 500 }
    );
  }
}

// CAMBIO 9: System prompt mejorado — sin emojis literales, enfocado en futbol/apuestas
function buildSystemPrompt(): string {
  return [
    'Sos "Apuestadisticas Bot", un analista deportivo experto especializado en futbol y apuestas.',
    '',
    'REGLAS:',
    '- SOLO respondas sobre futbol, apuestas, cuotas, predicciones y partidos.',
    '- Si te preguntan sobre CUALQUIER otro tema (politica, musica, cocina, etc.), responde: "Solo puedo ayudarte con partidos, cuotas y predicciones deportivas."',
    '- SOLO basate en los datos reales proporcionados entre las etiquetas DATOS REALES.',
    '- NUNCA inventes estadisticas, resultados, cuotas o datos que no esten en el contexto.',
    '- Si un dato no esta disponible, deci "dato no disponible".',
    '- NUNCA prometas resultados ni asegures que algo va a pasar.',
    '',
    'CUANDO TE PREGUNTEN POR UN PARTIDO ESPECIFICO:',
    '- Busca ESE partido en los datos proporcionados.',
    '- Da una recomendacion razonada sobre ese partido, analizando cuotas, forma, etc.',
    '- NO listes todos los partidos del dia. Solo habla del partido que preguntaron.',
    '- Si no encontras el partido en los datos, deci que no tenes datos para ese partido.',
    '',
    'FORMATO:',
    '- Responde en espanol argentino, tono profesional pero cercano.',
    '- Usa parrafos cortos.',
    '- Destaca datos clave con **negritas**.',
    '- Al final de cada recomendacion, sugeri: "Podes apostar en 1Win con las mejores cuotas."',
    '- Siempre agrega: "Las apuestas implican riesgo. Aposta responsablemente."',
    '- NO uses emojis.',
    '- Se conciso pero completo.',
  ].join('\n');
}

async function gatherContext(message: string): Promise<string> {
  const lowerMsg = message.toLowerCase();
  const contextParts: string[] = [];

  try {
    // Check if asking about a specific team
    const todayRes = await getFixturesToday();
    const todayFixtures = todayRes.response || [];

    // Try to find a specific match mentioned
    const specificMatch = todayFixtures.find((f: any) => {
      const homeName = (f.teams?.home?.name || '').toLowerCase();
      const awayName = (f.teams?.away?.name || '').toLowerCase();
      return lowerMsg.includes(homeName.split(' ')[0]) || lowerMsg.includes(awayName.split(' ')[0]);
    });

    if (specificMatch) {
      // User asked about a specific match — focus on that match only
      const fid = specificMatch.fixture?.id;
      contextParts.push('=== PARTIDO CONSULTADO ===');
      contextParts.push(processFixtureForContext(specificMatch));

      // Get odds for this specific match
      try {
        const odds = await getOdds({ fixture: fid });
        if (odds.response?.length) {
          contextParts.push('\n=== CUOTAS ===');
          contextParts.push(processOddsForContext(odds.response[0]));
        }
      } catch {}

      // Get prediction for this specific match
      try {
        const pred = await getPredictions(fid);
        if (pred.response?.length) {
          contextParts.push('\n=== PREDICCION ===');
          contextParts.push(processPredictionForContext(pred.response[0]));
        }
      } catch {}
    } else if (lowerMsg.includes('vivo') || lowerMsg.includes('live') || lowerMsg.includes('ahora') || lowerMsg.includes('jugando')) {
      // Live matches
      const live = await getLiveFixtures();
      if (live.response?.length) {
        contextParts.push('=== PARTIDOS EN VIVO ===');
        live.response.slice(0, 10).forEach((f: any) => {
          contextParts.push(processFixtureForContext(f));
        });
      } else {
        contextParts.push('No hay partidos en vivo en este momento.');
      }
    } else if (lowerMsg.includes('cuota') || lowerMsg.includes('odd') || lowerMsg.includes('apuesta') || lowerMsg.includes('recomend') || lowerMsg.includes('pick') || lowerMsg.includes('mejor')) {
      // Odds / recommendations — show top upcoming with odds
      const upcoming = todayFixtures
        .filter((f: any) => f.fixture?.status?.short === 'NS')
        .slice(0, 5);

      if (upcoming.length > 0) {
        contextParts.push('=== PROXIMOS PARTIDOS CON CUOTAS ===');
        for (const f of upcoming) {
          contextParts.push(processFixtureForContext(f));
          try {
            const odds = await getOdds({ fixture: f.fixture.id });
            if (odds.response?.length) {
              contextParts.push(processOddsForContext(odds.response[0]));
            }
          } catch {}
        }
      } else {
        contextParts.push('No hay partidos proximos con cuotas disponibles.');
      }
    } else {
      // General: show today overview (compact)
      if (todayFixtures.length > 0) {
        contextParts.push('=== PARTIDOS DE HOY ===');
        todayFixtures.slice(0, 12).forEach((f: any) => {
          contextParts.push(processFixtureForContext(f));
        });
      } else {
        contextParts.push('No hay partidos programados para hoy.');
      }
    }
  } catch (error: any) {
    contextParts.push('Error obteniendo datos: ' + error.message);
  }

  return contextParts.join('\n');
}

function generateLocalAnalysis(message: string, context: string): string {
  const lines = context.split('\n').filter(l => l.trim());
  const matchCount = lines.filter(l => l.startsWith('Partido:')).length;

  let response = '**Apuestadisticas Bot**\n\n';

  if (matchCount === 0) {
    response += 'No encontre datos disponibles para tu consulta. ';
    response += 'Podes intentar mas tarde o preguntar por algo especifico como:\n';
    response += '- "Que partidos hay hoy?"\n';
    response += '- "Cuales son las cuotas para los partidos de hoy?"\n';
    response += '- "Hay partidos en vivo?"';
    return response;
  }

  response += 'Encontre **' + matchCount + ' partido(s)** relevantes para tu consulta.\n\n';
  response += context.split('\n').slice(0, 15).map(l => {
    if (l.startsWith('===')) return '\n**' + l.replace(/===/g, '').trim() + '**';
    if (l.startsWith('Partido:')) return '- ' + l;
    return l;
  }).join('\n');

  response += '\n\nPodes apostar en 1Win con las mejores cuotas.';
  response += '\n\nLas apuestas implican riesgo. Aposta responsablemente.';

  return response;
}
