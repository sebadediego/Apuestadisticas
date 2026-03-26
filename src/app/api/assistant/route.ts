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

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory } = await request.json();
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    const lower = message.toLowerCase();
    const isGreeting = ['hola', 'buenas', 'hey', 'que tal', 'buen dia', 'hi', 'hello', 'como estas', 'buenas tardes', 'buenas noches'].some(g => lower.includes(g)) && lower.length < 25;
    const isLive = ['en vivo', 'live', 'ahora', 'jugando'].some(k => lower.includes(k));

    // GREETING — no data needed
    if (isGreeting) {
      const resp = await callGroq(SYSTEM_PROMPT_CHAT, message, conversationHistory, '');
      return NextResponse.json({ response: resp || 'Hola! Soy el asistente de Apuestadisticas. Preguntame sobre cualquier partido, cuotas o predicciones.' });
    }

    // LIVE — fetch live fixtures
    if (isLive) {
      const live = await getLiveFixtures();
      const arr = live.response || [];
      let context = '=== PARTIDOS EN VIVO ===\n';
      if (arr.length === 0) {
        context += 'No hay partidos en vivo en este momento.';
      } else {
        arr.slice(0, 12).forEach((f: any) => {
          const h = f.teams?.home?.name || '?';
          const a = f.teams?.away?.name || '?';
          const gh = f.goals?.home ?? 0;
          const ga = f.goals?.away ?? 0;
          const min = f.fixture?.status?.elapsed || '?';
          const league = f.league?.name || '';
          context += `${h} ${gh}-${ga} ${a} (${min}') - ${league}\n`;
        });
      }
      const resp = await callGroq(SYSTEM_PROMPT_ANALYSIS, message, conversationHistory, context);
      return NextResponse.json({ response: resp || 'No hay partidos en vivo en este momento.' });
    }

    // FOOTBALL QUERY — fetch fixtures for today/tomorrow, send list to Groq
    // Determine date
    const today = getArgDate();
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    const wantsTomorrow = lower.includes('manana') || lower.includes('mañana');
    const primaryDate = wantsTomorrow ? tomorrow : today;

    // Fetch fixtures for primary date + secondary
    let allFixtures: any[] = [];
    const dates = [primaryDate];
    if (!wantsTomorrow) dates.push(tomorrow);
    else dates.push(today);
    dates.push(dayAfter);

    for (const d of dates) {
      try {
        const res = await getFixtures({ date: d });
        const arr = res.response || [];
        allFixtures.push(...arr.map((f: any) => ({ ...f, _date: d })));
      } catch {}
    }

    // Build compact fixture list for Groq to identify the match
    // Sort: top leagues first so important matches are always visible
    const TOP_IDS = [128, 71, 239, 262, 39, 140, 135, 61, 78, 94, 88, 2, 3, 848, 13, 11, 130, 73, 45, 143, 137, 65, 81, 1, 4, 9, 29, 32, 30, 34, 10];
    const nsList = allFixtures
      .filter((f: any) => ['NS', 'TBD', '1H', '2H', 'HT'].includes(f.fixture?.status?.short))
      .sort((a: any, b: any) => {
        const aTop = TOP_IDS.indexOf(a.league?.id);
        const bTop = TOP_IDS.indexOf(b.league?.id);
        // Friendlies (ID 10) also important for national teams
        const aFriendly = a.league?.name?.toLowerCase().includes('friendl') ? 0 : 1;
        const bFriendly = b.league?.name?.toLowerCase().includes('friendl') ? 0 : 1;
        if (aTop !== -1 && bTop !== -1) return aTop - bTop;
        if (aTop !== -1) return -1;
        if (bTop !== -1) return 1;
        if (aFriendly !== bFriendly) return aFriendly - bFriendly;
        return 0;
      });

    let fixtureListContext = '=== PARTIDOS DISPONIBLES (HOY + MANANA + PASADO) ===\n';
    fixtureListContext += 'Formato: [FIXTURE_ID] Hora(Argentina) - Equipo1 vs Equipo2 (Liga) [Fecha]\n\n';

    for (const f of nsList.slice(0, 80)) {
      const fid = f.fixture?.id;
      const time = f.fixture?.date
        ? new Date(f.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
        : '?';
      const dateLabel = f._date === today ? 'HOY' : f._date === tomorrow ? 'MANANA' : 'PASADO';
      const h = f.teams?.home?.name || '?';
      const a = f.teams?.away?.name || '?';
      const league = f.league?.name || '';
      fixtureListContext += `[${fid}] ${time}hs - ${h} vs ${a} (${league}) [${dateLabel}]\n`;
    }

    // STEP 1: Ask Groq to identify the fixture and respond
    // If user asks about a specific match, Groq will mention the FIXTURE_ID
    const step1Prompt = SYSTEM_PROMPT_STEP1;
    const step1Response = await callGroq(step1Prompt, message, conversationHistory, fixtureListContext);

    if (!step1Response) {
      return NextResponse.json({ response: 'No pude procesar tu consulta. Intenta de nuevo.' });
    }

    // STEP 2: Check if Groq identified a specific fixture (look for FIXTURE_ID pattern)
    const fixtureIdMatch = step1Response.match(/FIXTURE_ID[:\s]*(\d+)/i);

    if (fixtureIdMatch) {
      const fid = parseInt(fixtureIdMatch[1]);
      const fixture = allFixtures.find((f: any) => f.fixture?.id === fid);

      if (fixture) {
        // Fetch detailed data for this fixture
        let detailedContext = '=== PARTIDO SELECCIONADO ===\n';
        detailedContext += processFixtureForContext(fixture) + '\n';

        const time = fixture.fixture?.date
          ? new Date(fixture.fixture.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })
          : '?';
        detailedContext += 'Hora Argentina: ' + time + 'hs\n';

        // Odds
        try {
          const o = await getOdds({ fixture: fid });
          if (o.response?.length) {
            detailedContext += '\n=== CUOTAS ===\n';
            detailedContext += processOddsForContext(o.response[0]);
          }
        } catch {}

        // Prediction (includes form, goals avg, comparison)
        try {
          const p = await getPredictions(fid);
          if (p.response?.length) {
            detailedContext += '\n=== PREDICCION Y ESTADISTICAS ===\n';
            detailedContext += processPredictionForContext(p.response[0]);
          }
        } catch {}

        // H2H
        const hid = fixture.teams?.home?.id;
        const aid = fixture.teams?.away?.id;
        if (hid && aid) {
          try {
            const h = await getHeadToHead({ h2h: `${hid}-${aid}`, last: 5 });
            if (h.response?.length) {
              detailedContext += '\n=== HISTORIAL DIRECTO ===\n';
              detailedContext += processH2HForContext(h.response);
            }
          } catch {}
        }

        // STEP 2: Send detailed data to Groq for exhaustive analysis
        const analysisResponse = await callGroq(SYSTEM_PROMPT_ANALYSIS, message, conversationHistory, detailedContext);
        return NextResponse.json({ response: analysisResponse || step1Response.replace(/FIXTURE_ID[:\s]*\d+/gi, '').trim() });
      }
    }

    // No fixture identified — return step1 response (cleaned)
    const cleanResponse = step1Response.replace(/FIXTURE_ID[:\s]*\d+/gi, '').trim();
    return NextResponse.json({ response: cleanResponse });

  } catch (error: any) {
    console.error('Assistant error:', error);
    return NextResponse.json({ response: 'Hubo un error al procesar tu consulta. Intenta de nuevo.' });
  }
}

// ==================== SYSTEM PROMPTS ====================
const SYSTEM_PROMPT_CHAT = `Sos "Apuestadisticas Bot", un asistente amigable de apuestas deportivas.
Hablas en espanol argentino (vos, sos, podes, dale, etc.).
Si te saludan, responde amigablemente, presentate y pregunta en que podes ayudar.
Si preguntan algo que NO es de futbol/apuestas, deci amablemente que solo podes ayudar con eso.
NO uses emojis. Se breve y natural.`;

const SYSTEM_PROMPT_STEP1 = `Sos un asistente experto en futbol. Tu trabajo es:
1. Leer la lista de partidos disponibles que te paso (incluye partidos de HOY, MANANA y PASADO MANANA)
2. Entender que equipo o partido quiere el usuario (aunque escriba mal el nombre, con errores de tipeo, en espanol o ingles)
3. Si identificas un partido, responde brevemente que lo encontraste, menciona CUANDO juega (hoy, manana, etc), y agrega al FINAL de tu respuesta la etiqueta FIXTURE_ID: seguido del numero ID del fixture. Ejemplo: "FIXTURE_ID: 1234567"
4. Si el usuario no pregunta por un partido especifico sino que quiere recomendaciones, sugeri 2-3 partidos interesantes de la lista
5. Si no encontras el partido en la lista, deci que no encontraste partidos para ese equipo en los proximos dias

IMPORTANTE:
- La lista tiene partidos de MULTIPLES dias (HOY, MANANA, PASADO). Busca en TODOS.
- Los nombres de equipos estan en ingles (Brazil, France, Turkey, Argentina, etc). El usuario puede escribir en espanol.
- Interpreta errores de tipeo: "brsil" = Brasil = Brazil, "turkia" = Turquia = Turkey, "fransia" = Francia = France
- "Argentina" puede referirse a la seleccion Argentina (busca "Argentina" en la lista)
- SIEMPRE que identifiques un partido, pone FIXTURE_ID: [numero] al final
- Habla en espanol argentino, se amigable y breve
- Las horas ya estan en hora argentina
- NO uses emojis`;

const SYSTEM_PROMPT_ANALYSIS = `Sos "Apuestadisticas Bot", un analista deportivo EXPERTO en apuestas de futbol.
Hablas en espanol argentino (vos, sos, podes).

CUANDO TE DAN DATOS DE UN PARTIDO ESPECIFICO, genera un INFORME ANALITICO EXHAUSTIVO:

1. **Presentacion**: Equipos, liga, hora Argentina
2. **Analisis de los equipos**: Analiza cada equipo segun lo que sabes y los datos. Si hay forma reciente (W/D/L), usala. Si no hay, analiza igualmente basandote en tu conocimiento del equipo, su nivel, su historia reciente.
3. **Analisis de goles**: Si hay promedios, usalos. Si no, analiza el estilo de juego de cada equipo (ofensivo, defensivo, etc) basandote en tu conocimiento.
4. **Historial directo**: Si hay datos de H2H, mencionalo. Si no, analiza la rivalidad o los antecedentes que conozcas.
5. **Cuotas y valor**: Muestra las cuotas disponibles. NUNCA menciones el nombre de la casa de apuestas (no digas "10Bet", "William Hill", "Bet365" ni ninguna). Solo di "las cuotas disponibles son:" y listalas.
6. **Mercados recomendados**: Recomienda 2-3 mercados concretos con las cuotas. Ejemplo: "Over 2.5 goles a cuota 1.85"
7. **Prediccion final**: Da tu prediccion concreta y tu tip de apuesta principal. Se decidido.

REGLAS ABSOLUTAS:
- NUNCA digas "no hay datos disponibles", "no tengo informacion", "datos insuficientes" ni nada similar. SIEMPRE analiza con lo que tengas y con tu conocimiento general de futbol.
- NUNCA digas que un partido "es muy parejo" sin dar recomendacion. SIEMPRE da un tip concreto.
- NUNCA menciones nombres de casas de apuestas que no sean 1Win. Si en los datos dice "10Bet" o "William Hill", NO lo menciones.
- Las cuotas simplemente decis "las cuotas disponibles son:" sin decir de donde vienen.
- Si no hay cuotas disponibles, recomienda igual basandote en tu analisis.
- Al final agrega: "Podes apostar en 1Win con las mejores cuotas."
- Termina con: "Las apuestas implican riesgo. Aposta responsablemente."
- NO uses emojis.
- Usa **negritas** para datos clave.
- Se seguro, decidido y analitico, como un tipster profesional que siempre da su opinion.`;

// ==================== HELPERS ====================
function getArgDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T12:00:00Z');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
}

// ==================== GROQ ====================
async function callGroq(system: string, userMsg: string, history: any[], context: string): Promise<string> {
  if (!GROQ_KEY) return '';
  try {
    const fullUserMsg = context ? userMsg + '\n\n' + context : userMsg;
    const messages = [
      { role: 'system', content: system },
      ...(history || []).slice(-6).map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: fullUserMsg },
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 2500, temperature: 0.7 }),
    });

    const data = await res.json();
    if (data.error) { console.error('[Groq Error]', JSON.stringify(data.error)); return ''; }
    const text = data.choices?.[0]?.message?.content || '';
    if (text) console.log('[Assistant] Groq OK');
    return text;
  } catch (e: any) {
    console.error('[Groq Exception]', e.message);
    return '';
  }
}
