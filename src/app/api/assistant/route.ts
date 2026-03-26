// src/app/api/assistant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getFixturesToday, getLiveFixtures, getOdds, getPredictions,
  getHeadToHead, TOP_LEAGUES
} from '@/lib/api-football';
import {
  processFixtureForContext, processOddsForContext,
  processPredictionForContext, processH2HForContext
} from '@/lib/data-processor';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    // Gather all relevant data
    const { context, matchData } = await gatherContext(message);
    const systemPrompt = buildSystemPrompt();

    const messages = [
      ...(conversationHistory || []).slice(-10),
      {
        role: 'user',
        content: message + '\n\n--- DATOS REALES (API-Football) ---\n' + context + '\n--- FIN DATOS ---'
      }
    ];

    // Try Claude API first
    if (ANTHROPIC_KEY) {
      try {
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
        const text = data.content?.map((c: any) => c.text || '').join('') || '';
        if (text) {
          return NextResponse.json({ response: text });
        }
      } catch {}
    }

    // Fallback: Generate a proper analytical report locally
    const analysis = generateAnalyticalReport(message, matchData);
    return NextResponse.json({ response: analysis });

  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json(
      { error: 'Error procesando la solicitud', details: error.message },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(): string {
  return [
    'Sos "Apuestadisticas Bot", un analista deportivo experto especializado en futbol y apuestas.',
    '',
    'REGLAS:',
    '- SOLO respondas sobre futbol, apuestas, cuotas, predicciones y partidos.',
    '- Si te preguntan sobre CUALQUIER otro tema, responde: "Solo puedo ayudarte con partidos, cuotas y predicciones deportivas."',
    '- SOLO basate en los datos reales proporcionados entre las etiquetas DATOS REALES.',
    '- NUNCA inventes estadisticas, resultados, cuotas o datos que no esten en el contexto.',
    '',
    'CUANDO TE PREGUNTEN POR UN PARTIDO ESPECIFICO:',
    '- Busca ESE partido en los datos.',
    '- Genera un INFORME DETALLADO con secciones: Analisis del partido, Cuotas disponibles, Mercados recomendados, Prediccion.',
    '- Analiza las cuotas y di cuales tienen valor.',
    '- NO listes todos los partidos. Solo habla del partido consultado.',
    '',
    'FORMATO:',
    '- Responde en espanol argentino.',
    '- Usa parrafos cortos con **negritas** para datos clave.',
    '- Al final sugeri: "Podes apostar en 1Win con las mejores cuotas."',
    '- Siempre: "Las apuestas implican riesgo. Aposta responsablemente."',
    '- NO uses emojis.',
    '- Se detallado y analitico.',
  ].join('\n');
}

interface MatchAnalysis {
  fixture: any;
  odds: any;
  prediction: any;
  h2h: any[];
  type: 'specific' | 'live' | 'general' | 'recommendations';
}

async function gatherContext(message: string): Promise<{ context: string; matchData: MatchAnalysis | null }> {
  const lowerMsg = message.toLowerCase();
  const contextParts: string[] = [];
  let matchData: MatchAnalysis | null = null;

  try {
    const todayRes = await getFixturesToday();
    const todayFixtures = todayRes.response || [];

    // Try to find a specific team/match mentioned
    const specificMatch = findSpecificMatch(lowerMsg, todayFixtures);

    if (specificMatch) {
      const fid = specificMatch.fixture?.id;
      contextParts.push('=== PARTIDO CONSULTADO ===');
      contextParts.push(processFixtureForContext(specificMatch));

      let oddsRaw: any = null;
      let predRaw: any = null;
      let h2hRaw: any[] = [];

      // Fetch odds
      try {
        const o = await getOdds({ fixture: fid });
        if (o.response?.length) {
          oddsRaw = o.response[0];
          contextParts.push('\n=== CUOTAS ===');
          contextParts.push(processOddsForContext(o.response[0]));
        }
      } catch {}

      // Fetch prediction
      try {
        const p = await getPredictions(fid);
        if (p.response?.length) {
          predRaw = p.response[0];
          contextParts.push('\n=== PREDICCION ===');
          contextParts.push(processPredictionForContext(p.response[0]));
        }
      } catch {}

      // Fetch H2H
      const homeId = specificMatch.teams?.home?.id;
      const awayId = specificMatch.teams?.away?.id;
      if (homeId && awayId) {
        try {
          const h = await getHeadToHead({ h2h: `${homeId}-${awayId}`, last: 5 });
          h2hRaw = h.response || [];
          if (h2hRaw.length > 0) {
            contextParts.push('\n=== HISTORIAL ===');
            contextParts.push(processH2HForContext(h2hRaw));
          }
        } catch {}
      }

      matchData = { fixture: specificMatch, odds: oddsRaw, prediction: predRaw, h2h: h2hRaw, type: 'specific' };

    } else if (lowerMsg.includes('vivo') || lowerMsg.includes('live') || lowerMsg.includes('ahora')) {
      const live = await getLiveFixtures();
      if (live.response?.length) {
        contextParts.push('=== PARTIDOS EN VIVO ===');
        live.response.slice(0, 8).forEach((f: any) => {
          contextParts.push(processFixtureForContext(f));
        });
        matchData = { fixture: null, odds: null, prediction: null, h2h: [], type: 'live' };
      } else {
        contextParts.push('No hay partidos en vivo en este momento.');
      }

    } else if (lowerMsg.includes('recomend') || lowerMsg.includes('pick') || lowerMsg.includes('mejor') || lowerMsg.includes('apostar')) {
      // Get upcoming matches with odds for recommendations
      const upcoming = todayFixtures.filter((f: any) => f.fixture?.status?.short === 'NS').slice(0, 5);
      contextParts.push('=== PARTIDOS DISPONIBLES PARA APUESTAS ===');

      for (const f of upcoming) {
        contextParts.push(processFixtureForContext(f));
        try {
          const o = await getOdds({ fixture: f.fixture.id });
          if (o.response?.length) {
            contextParts.push(processOddsForContext(o.response[0]));
          }
        } catch {}
        try {
          const p = await getPredictions(f.fixture.id);
          if (p.response?.length) {
            contextParts.push('Prediccion: ' + (p.response[0]?.predictions?.advice || 'N/D'));
          }
        } catch {}
        contextParts.push('---');
      }
      matchData = { fixture: null, odds: null, prediction: null, h2h: [], type: 'recommendations' };

    } else {
      // General overview
      contextParts.push('=== PARTIDOS DE HOY ===');
      todayFixtures.slice(0, 10).forEach((f: any) => {
        contextParts.push(processFixtureForContext(f));
      });
      matchData = { fixture: null, odds: null, prediction: null, h2h: [], type: 'general' };
    }
  } catch (error: any) {
    contextParts.push('Error obteniendo datos: ' + error.message);
  }

  return { context: contextParts.join('\n'), matchData };
}

function findSpecificMatch(query: string, fixtures: any[]): any | null {
  // Normalize query
  const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // Common team name mappings
  const aliases: Record<string, string[]> = {
    'boca': ['boca juniors', 'boca jrs'],
    'river': ['river plate'],
    'san lorenzo': ['san lorenzo'],
    'racing': ['racing club', 'racing'],
    'independiente': ['independiente'],
    'huracan': ['huracan'],
    'velez': ['velez sarsfield', 'velez'],
    'lanus': ['lanus'],
    'argentinos': ['argentinos juniors', 'argentinos jrs'],
    'banfield': ['banfield'],
    'defensa': ['defensa y justicia'],
    'talleres': ['talleres'],
    'belgrano': ['belgrano'],
    'colon': ['colon'],
    'union': ['union'],
    'estudiantes': ['estudiantes'],
    'newells': ['newell', 'newells'],
    'rosario': ['rosario central'],
    'godoy': ['godoy cruz'],
    'barcelona': ['barcelona', 'barca'],
    'real madrid': ['real madrid'],
    'atletico': ['atletico madrid', 'atletico'],
    'liverpool': ['liverpool'],
    'manchester': ['manchester united', 'manchester city', 'man utd', 'man city'],
    'chelsea': ['chelsea'],
    'arsenal': ['arsenal'],
    'juventus': ['juventus', 'juve'],
    'milan': ['ac milan', 'inter milan', 'milan'],
    'psg': ['paris saint-germain', 'psg'],
    'bayern': ['bayern munich', 'bayern'],
    'dortmund': ['borussia dortmund', 'dortmund'],
    'flamengo': ['flamengo'],
    'palmeiras': ['palmeiras'],
    'corinthians': ['corinthians'],
  };

  for (const fix of fixtures) {
    const homeName = (fix.teams?.home?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const awayName = (fix.teams?.away?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Direct name match (partial)
    const homeWords = homeName.split(/\s+/);
    const awayWords = awayName.split(/\s+/);

    for (const word of homeWords) {
      if (word.length >= 4 && q.includes(word)) return fix;
    }
    for (const word of awayWords) {
      if (word.length >= 4 && q.includes(word)) return fix;
    }

    // Alias match
    for (const [alias, fullNames] of Object.entries(aliases)) {
      if (q.includes(alias)) {
        for (const fn of fullNames) {
          if (homeName.includes(fn) || awayName.includes(fn)) return fix;
        }
        // Also check partial
        if (homeName.includes(alias) || awayName.includes(alias)) return fix;
      }
    }
  }

  return null;
}

function generateAnalyticalReport(message: string, matchData: MatchAnalysis | null): string {
  if (!matchData) {
    return 'No encontre datos disponibles para tu consulta.\n\nPodes preguntarme por:\n- Un partido especifico ("Que apostar en Argentinos vs Lanus")\n- Recomendaciones del dia ("Que recomendas para hoy")\n- Partidos en vivo ("Hay partidos en vivo")\n\nPodes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
  }

  // SPECIFIC MATCH ANALYSIS
  if (matchData.type === 'specific' && matchData.fixture) {
    const fix = matchData.fixture;
    const home = fix.teams?.home?.name || 'Local';
    const away = fix.teams?.away?.name || 'Visitante';
    const league = fix.league?.name || '';
    const time = fix.fixture?.date
      ? new Date(fix.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
      : '';

    let report = `**INFORME: ${home} vs ${away}**\n`;
    report += `${league} | ${time}hs\n\n`;

    // Prediction section
    const pred = matchData.prediction?.predictions;
    if (pred) {
      report += '**Analisis del partido**\n';
      if (pred.winner?.name) {
        report += `El favorito segun los datos es **${pred.winner.name}**.\n`;
      }
      if (pred.percent) {
        report += `Probabilidades: Local ${pred.percent.home} | Empate ${pred.percent.draw} | Visitante ${pred.percent.away}\n`;
      }
      if (pred.advice) {
        report += `Consejo de la API: ${pred.advice}\n`;
      }
      report += '\n';

      // Team form
      const homeTeam = matchData.prediction?.teams?.home;
      const awayTeam = matchData.prediction?.teams?.away;
      if (homeTeam?.league?.form || awayTeam?.league?.form) {
        report += '**Forma reciente**\n';
        if (homeTeam?.league?.form) {
          report += `${home}: ${homeTeam.league.form.slice(-5).split('').join('-')}\n`;
        }
        if (awayTeam?.league?.form) {
          report += `${away}: ${awayTeam.league.form.slice(-5).split('').join('-')}\n`;
        }
        report += '\n';
      }

      // Goals analysis
      if (homeTeam?.league?.goals || awayTeam?.league?.goals) {
        report += '**Goles (promedio por partido)**\n';
        if (homeTeam?.league?.goals) {
          report += `${home}: ${homeTeam.league.goals.for?.average?.total || 'N/D'} a favor, ${homeTeam.league.goals.against?.average?.total || 'N/D'} en contra\n`;
        }
        if (awayTeam?.league?.goals) {
          report += `${away}: ${awayTeam.league.goals.for?.average?.total || 'N/D'} a favor, ${awayTeam.league.goals.against?.average?.total || 'N/D'} en contra\n`;
        }
        report += '\n';
      }
    }

    // Odds section
    const odds = matchData.odds;
    if (odds?.bookmakers?.length) {
      const bk = odds.bookmakers[0];
      report += '**Cuotas disponibles**\n';
      report += `Fuente: ${bk.name}\n`;

      for (const bet of (bk.bets || []).slice(0, 5)) {
        const vals = (bet.values || []).map((v: any) => `${v.value}: ${v.odd}`).join(' | ');
        report += `${bet.name}: ${vals}\n`;
      }
      report += '\n';

      // Value analysis
      const mw = bk.bets?.find((b: any) => b.name === 'Match Winner');
      const ou = bk.bets?.find((b: any) => b.name === 'Goals Over/Under');
      const btts = bk.bets?.find((b: any) => b.name === 'Both Teams Score');

      report += '**Mercados recomendados**\n';
      if (mw && pred?.winner?.name) {
        const winnerOdd = mw.values?.find((v: any) => {
          if (pred.winner.name === home && v.value === 'Home') return true;
          if (pred.winner.name === away && v.value === 'Away') return true;
          return false;
        });
        if (winnerOdd) {
          report += `- Ganador (${pred.winner.name}) a cuota **${winnerOdd.odd}**\n`;
        }
      }
      if (ou) {
        const over25 = ou.values?.find((v: any) => v.value === 'Over 2.5');
        const under25 = ou.values?.find((v: any) => v.value === 'Under 2.5');
        if (over25) report += `- Over 2.5 goles a cuota **${over25.odd}**\n`;
        if (under25) report += `- Under 2.5 goles a cuota **${under25.odd}**\n`;
      }
      if (btts) {
        const yes = btts.values?.find((v: any) => v.value === 'Yes');
        if (yes) report += `- Ambos marcan: Si a cuota **${yes.odd}**\n`;
      }
      report += '\n';
    } else {
      report += '**Cuotas**: No hay cuotas disponibles para este partido en este momento.\n\n';
    }

    // H2H section
    if (matchData.h2h.length > 0) {
      report += '**Historial directo (ultimos enfrentamientos)**\n';
      let homeWins = 0, awayWins = 0, draws = 0;
      for (const m of matchData.h2h.slice(0, 5)) {
        const hg = m.goals?.home ?? 0;
        const ag = m.goals?.away ?? 0;
        const hName = m.teams?.home?.name || '';
        const aName = m.teams?.away?.name || '';
        const d = m.fixture?.date ? new Date(m.fixture.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
        report += `${d}: ${hName} ${hg}-${ag} ${aName}\n`;
        if (hg > ag) {
          if (hName.includes(home.split(' ')[0])) homeWins++; else awayWins++;
        } else if (ag > hg) {
          if (aName.includes(away.split(' ')[0])) awayWins++; else homeWins++;
        } else {
          draws++;
        }
      }
      report += `Resumen: ${home.split(' ')[0]} ${homeWins}G | ${draws}E | ${away.split(' ')[0]} ${awayWins}G\n\n`;
    }

    report += 'Podes apostar en 1Win con las mejores cuotas.\n\n';
    report += 'Las apuestas implican riesgo. Aposta responsablemente.';
    return report;
  }

  // LIVE MATCHES
  if (matchData.type === 'live') {
    return 'Consulta la pestana "En Vivo" para ver todos los partidos en curso con scores actualizados cada 30 segundos.\n\nPodes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
  }

  // GENERAL / RECOMMENDATIONS - already handled by context passing
  return 'Encontre partidos para hoy. Para un informe detallado, preguntame por un partido especifico, por ejemplo:\n\n- "Que apostar en Argentinos vs Lanus"\n- "Analisis de Barcelona vs Real Madrid"\n- "Recomendacion para el partido de River"\n\nPodes apostar en 1Win con las mejores cuotas.\n\nLas apuestas implican riesgo. Aposta responsablemente.';
}
