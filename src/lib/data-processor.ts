// src/lib/data-processor.ts
// Transforms raw API data into structured context for the AI assistant

export interface ProcessedMatchContext {
  summary: string;
  homeTeam: TeamContext;
  awayTeam: TeamContext;
  odds?: OddsContext;
  prediction?: PredictionContext;
  h2h?: string;
}

interface TeamContext {
  name: string;
  recentForm: string;
  goalsScored: string;
  goalsConceded: string;
  homeAwayRecord: string;
  cleanSheets: string;
}

interface OddsContext {
  home: string;
  draw: string;
  away: string;
  over25: string;
  under25: string;
  bttsYes: string;
  bttsNo: string;
}

interface PredictionContext {
  winner: string;
  winnerPercent: string;
  advice: string;
  goalsHome: string;
  goalsAway: string;
}

export function processFixtureForContext(fixture: any): string {
  const home = fixture.teams?.home?.name || 'Equipo Local';
  const away = fixture.teams?.away?.name || 'Equipo Visitante';
  const league = fixture.league?.name || 'Liga desconocida';
  const date = fixture.fixture?.date
    ? new Date(fixture.fixture.date).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Fecha no disponible';
  const status = fixture.fixture?.status?.long || 'Estado desconocido';
  const scoreHome = fixture.goals?.home ?? '-';
  const scoreAway = fixture.goals?.away ?? '-';

  return `Partido: ${home} vs ${away} | Liga: ${league} | Fecha: ${date} | Estado: ${status} | Marcador: ${scoreHome}-${scoreAway}`;
}

export function processStatisticsForContext(stats: any[]): string {
  if (!stats || stats.length === 0) return 'Estadísticas no disponibles.';

  return stats.map((teamStats: any) => {
    const name = teamStats.team?.name || 'Equipo';
    const statsList = (teamStats.statistics || [])
      .map((s: any) => `  - ${s.type}: ${s.value ?? 'N/D'}`)
      .join('\n');
    return `${name}:\n${statsList}`;
  }).join('\n\n');
}

export function processOddsForContext(odds: any): string {
  if (!odds || !odds.bookmakers?.length) return 'Cuotas no disponibles.';

  const bookmaker = odds.bookmakers[0];
  const bets = bookmaker.bets || [];

  const lines: string[] = [`Casa de apuestas: ${bookmaker.name}`];

  bets.forEach((bet: any) => {
    const values = (bet.values || []).map((v: any) => `${v.value}: ${v.odd}`).join(' | ');
    lines.push(`${bet.name}: ${values}`);
  });

  return lines.join('\n');
}

export function processPredictionForContext(prediction: any): string {
  if (!prediction) return 'Predicción no disponible.';

  const lines: string[] = [];

  if (prediction.predictions) {
    const p = prediction.predictions;
    if (p.winner?.name) lines.push(`Ganador probable: ${p.winner.name}`);
    if (p.percent) {
      lines.push(`Probabilidades: Local ${p.percent.home} | Empate ${p.percent.draw} | Visitante ${p.percent.away}`);
    }
    if (p.advice) lines.push(`Consejo: ${p.advice}`);
    if (p.goals) {
      lines.push(`Goles estimados: Local ${p.goals.home ?? 'N/D'} | Visitante ${p.goals.away ?? 'N/D'}`);
    }
  }

  if (prediction.comparison) {
    const c = prediction.comparison;
    lines.push('\nComparación:');
    Object.entries(c).forEach(([key, value]: [string, any]) => {
      lines.push(`  ${key}: Local ${value.home} | Visitante ${value.away}`);
    });
  }

  if (prediction.teams) {
    ['home', 'away'].forEach((side) => {
      const team = prediction.teams?.[side];
      if (team) {
        const form = team.league?.form || 'N/D';
        const goals = team.league?.goals;
        lines.push(`\n${team.name}:`);
        lines.push(`  Forma: ${form}`);
        if (goals) {
          lines.push(`  Goles a favor (prom): ${goals.for?.average?.total ?? 'N/D'}`);
          lines.push(`  Goles en contra (prom): ${goals.against?.average?.total ?? 'N/D'}`);
        }
        if (team.last_5) {
          const l5 = team.last_5;
          lines.push(`  Últimos 5: ${l5.form || 'N/D'} | Goles: ${l5.goals?.for?.total ?? 'N/D'} a favor, ${l5.goals?.against?.total ?? 'N/D'} en contra`);
        }
      }
    });
  }

  return lines.join('\n');
}

export function processH2HForContext(matches: any[]): string {
  if (!matches || matches.length === 0) return 'Sin historial de enfrentamientos.';

  const lines: string[] = [`Últimos ${matches.length} enfrentamientos:`];

  matches.slice(0, 10).forEach((m: any) => {
    const date = m.fixture?.date
      ? new Date(m.fixture.date).toLocaleDateString('es-AR')
      : '?';
    const home = m.teams?.home?.name || '?';
    const away = m.teams?.away?.name || '?';
    const gHome = m.goals?.home ?? '?';
    const gAway = m.goals?.away ?? '?';
    const league = m.league?.name || '';
    lines.push(`  ${date} - ${home} ${gHome}-${gAway} ${away} (${league})`);
  });

  // Summary
  if (matches.length >= 2) {
    const team1 = matches[0].teams?.home?.name;
    let wins1 = 0, wins2 = 0, draws = 0;
    matches.forEach((m: any) => {
      const h = m.goals?.home ?? 0;
      const a = m.goals?.away ?? 0;
      const homeTeam = m.teams?.home?.name;
      if (h === a) draws++;
      else if (h > a && homeTeam === team1) wins1++;
      else if (h < a && homeTeam === team1) wins2++;
      else if (h > a) wins2++;
      else wins1++;
    });
    lines.push(`\nResumen H2H: ${team1} ganó ${wins1} | Empates ${draws} | Rival ganó ${wins2}`);
  }

  return lines.join('\n');
}

export function processEventsForContext(events: any[]): string {
  if (!events || events.length === 0) return 'Sin eventos registrados.';

  return events.map((e: any) => {
    const time = e.time?.elapsed ? `${e.time.elapsed}'` : '?';
    const extra = e.time?.extra ? `+${e.time.extra}` : '';
    const team = e.team?.name || '';
    const player = e.player?.name || '';
    const type = e.type || '';
    const detail = e.detail || '';
    return `${time}${extra} | ${team} | ${type}: ${detail} | ${player}`;
  }).join('\n');
}

export function processLineupsForContext(lineups: any[]): string {
  if (!lineups || lineups.length === 0) return 'Alineaciones no disponibles.';

  return lineups.map((lineup: any) => {
    const team = lineup.team?.name || 'Equipo';
    const formation = lineup.formation || 'N/D';
    const starters = (lineup.startXI || [])
      .map((p: any) => `  ${p.player?.number || '?'}. ${p.player?.name || 'N/D'} (${p.player?.pos || '?'})`)
      .join('\n');
    const subs = (lineup.substitutes || [])
      .slice(0, 7)
      .map((p: any) => `  ${p.player?.number || '?'}. ${p.player?.name || 'N/D'}`)
      .join('\n');
    return `${team} (${formation}):\nTitulares:\n${starters}\nSuplentes:\n${subs}`;
  }).join('\n\n');
}

export function buildMatchAnalysisPrompt(data: {
  fixture?: string;
  stats?: string;
  odds?: string;
  prediction?: string;
  h2h?: string;
  events?: string;
  lineups?: string;
}): string {
  let prompt = 'Datos del partido para análisis:\n\n';

  if (data.fixture) prompt += `=== PARTIDO ===\n${data.fixture}\n\n`;
  if (data.stats) prompt += `=== ESTADÍSTICAS ===\n${data.stats}\n\n`;
  if (data.odds) prompt += `=== CUOTAS ===\n${data.odds}\n\n`;
  if (data.prediction) prompt += `=== PREDICCIÓN ===\n${data.prediction}\n\n`;
  if (data.h2h) prompt += `=== HEAD TO HEAD ===\n${data.h2h}\n\n`;
  if (data.events) prompt += `=== EVENTOS ===\n${data.events}\n\n`;
  if (data.lineups) prompt += `=== ALINEACIONES ===\n${data.lineups}\n\n`;

  return prompt;
}
