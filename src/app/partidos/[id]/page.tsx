// src/app/partidos/[id]/page.tsx
import {
  getFixtures, getFixtureStatistics, getFixtureEvents, getFixtureLineups,
  getHeadToHead, getOdds, getPredictions, FIXTURE_STATUS
} from '@/lib/api-football';
import Link from 'next/link';

export const revalidate = 60;

interface Props {
  params: { id: string };
}

export default async function MatchDetailPage({ params }: Props) {
  const fixtureId = parseInt(params.id);

  // Fetch all data in parallel
  const [fixtureRes, statsRes, eventsRes, lineupsRes, oddsRes, predRes] = await Promise.allSettled([
    getFixtures({ id: fixtureId }),
    getFixtureStatistics(fixtureId),
    getFixtureEvents(fixtureId),
    getFixtureLineups(fixtureId),
    getOdds({ fixture: fixtureId }),
    getPredictions(fixtureId),
  ]);

  const fixture = fixtureRes.status === 'fulfilled' ? fixtureRes.value.response?.[0] : null;
  const stats = statsRes.status === 'fulfilled' ? statsRes.value.response : [];
  const events = eventsRes.status === 'fulfilled' ? eventsRes.value.response : [];
  const lineups = lineupsRes.status === 'fulfilled' ? lineupsRes.value.response : [];
  const oddsData = oddsRes.status === 'fulfilled' ? oddsRes.value.response?.[0] : null;
  const prediction = predRes.status === 'fulfilled' ? predRes.value.response?.[0] : null;

  if (!fixture) {
    return (
      <div className="page-enter max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-text-secondary text-lg">No se encontró el partido.</p>
        <Link href="/partidos" className="text-accent-emerald text-sm mt-3 inline-block hover:underline">← Volver a partidos</Link>
      </div>
    );
  }

  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const league = fixture.league;
  const status = FIXTURE_STATUS[f?.status?.short] || { label: f?.status?.long || '?', color: 'text-text-muted', live: false };

  // H2H
  let h2hMatches: any[] = [];
  if (teams?.home?.id && teams?.away?.id) {
    try {
      const h2hRes = await getHeadToHead({ h2h: `${teams.home.id}-${teams.away.id}`, last: 10 });
      h2hMatches = h2hRes.response || [];
    } catch {}
  }

  const matchDate = f?.date
    ? new Date(f.date).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })
    : 'Fecha no disponible';

  // Extract odds
  const getOddValues = (betName: string) => {
    if (!oddsData?.bookmakers?.length) return null;
    for (const bk of oddsData.bookmakers) {
      const bet = bk.bets?.find((b: any) => b.name === betName);
      if (bet) return { bookmaker: bk.name, values: bet.values };
    }
    return null;
  };

  const matchWinner = getOddValues('Match Winner');
  const overUnder = getOddValues('Goals Over/Under');
  const btts = getOddValues('Both Teams Score');

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href="/partidos" className="text-text-muted text-sm hover:text-accent-emerald transition-colors mb-4 inline-block">
        ← Volver a partidos
      </Link>

      {/* Match header */}
      <div className="glass-card p-6 md:p-8 mb-6">
        <div className="text-center mb-2">
          <div className="flex items-center justify-center gap-2 text-xs text-text-muted mb-4">
            {league?.logo && <img src={league.logo} alt="" className="w-4 h-4" />}
            <span>{league?.name} — {league?.country}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:gap-8">
          {/* Home */}
          <div className="flex-1 text-center">
            {teams?.home?.logo && <img src={teams.home.logo} alt="" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 object-contain" />}
            <p className={`font-display font-bold text-base md:text-lg ${teams?.home?.winner ? 'text-text-primary' : 'text-text-secondary'}`}>
              {teams?.home?.name}
            </p>
          </div>

          {/* Score */}
          <div className="text-center flex-shrink-0">
            {status.live || f?.status?.short === 'FT' || f?.status?.short === 'AET' || f?.status?.short === 'PEN' ? (
              <>
                <div className="flex items-center gap-3 font-mono font-extrabold text-4xl md:text-5xl text-text-primary">
                  <span>{goals?.home ?? 0}</span>
                  <span className="text-text-muted text-2xl">:</span>
                  <span>{goals?.away ?? 0}</span>
                </div>
                <span className={`badge mt-2 ${status.live ? 'badge-live live-pulse' : 'badge-finished'}`}>
                  {f?.status?.elapsed ? `${f.status.elapsed}'` : status.label}
                </span>
              </>
            ) : (
              <>
                <p className="font-mono font-bold text-2xl text-accent-cyan">VS</p>
                <span className="badge badge-upcoming mt-2">{status.label}</span>
              </>
            )}
            <p className="text-xs text-text-muted mt-3">{matchDate}</p>
            {f?.venue?.name && (
              <p className="text-xs text-text-muted">📍 {f.venue.name}, {f.venue.city}</p>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 text-center">
            {teams?.away?.logo && <img src={teams.away.logo} alt="" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2 object-contain" />}
            <p className={`font-display font-bold text-base md:text-lg ${teams?.away?.winner ? 'text-text-primary' : 'text-text-secondary'}`}>
              {teams?.away?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Statistics */}
        {stats.length > 0 && (
          <div className="glass-card p-5 md:col-span-2">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">📊 Estadísticas</h2>
            <div className="space-y-3">
              {(stats[0]?.statistics || []).map((stat: any, i: number) => {
                const homeVal = stat.value ?? 0;
                const awayStat = stats[1]?.statistics?.[i];
                const awayVal = awayStat?.value ?? 0;
                const homeNum = typeof homeVal === 'string' ? parseFloat(homeVal) || 0 : homeVal;
                const awayNum = typeof awayVal === 'string' ? parseFloat(awayVal) || 0 : awayVal;
                const total = homeNum + awayNum || 1;

                return (
                  <div key={stat.type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-mono text-text-primary w-12 text-right">{homeVal}</span>
                      <span className="text-text-muted text-xs flex-1 text-center">{stat.type}</span>
                      <span className="font-mono text-text-primary w-12 text-left">{awayVal}</span>
                    </div>
                    <div className="flex gap-1">
                      <div className="flex-1 flex justify-end">
                        <div className="h-1.5 rounded-full bg-accent-emerald/30" style={{ width: `${(homeNum / total) * 100}%` }}>
                          <div className="h-full rounded-full bg-accent-emerald" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-accent-cyan/30" style={{ width: `${(awayNum / total) * 100}%` }}>
                          <div className="h-full rounded-full bg-accent-cyan" style={{ width: '100%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Events */}
        {events.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">📋 Eventos</h2>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {events.map((e: any, i: number) => {
                const isHome = e.team?.id === teams?.home?.id;
                const icon = e.type === 'Goal' ? '⚽' : e.type === 'Card' ? (e.detail === 'Yellow Card' ? '🟨' : '🟥') : e.type === 'subst' ? '🔄' : '📌';
                return (
                  <div key={i} className={`flex items-center gap-3 text-sm p-2 rounded-lg ${isHome ? 'bg-accent-emerald/5' : 'bg-accent-cyan/5'}`}>
                    <span className="font-mono text-text-muted text-xs w-10">{e.time?.elapsed}'{e.time?.extra ? `+${e.time.extra}` : ''}</span>
                    <span>{icon}</span>
                    <span className="text-text-primary truncate">{e.player?.name || '?'}</span>
                    <span className="text-text-muted text-xs ml-auto truncate">{e.detail}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lineups */}
        {lineups.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">👥 Alineaciones</h2>
            <div className="space-y-4">
              {lineups.map((lineup: any) => (
                <div key={lineup.team?.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {lineup.team?.logo && <img src={lineup.team.logo} alt="" className="w-5 h-5" />}
                    <span className="text-sm font-semibold text-text-primary">{lineup.team?.name}</span>
                    <span className="text-xs text-accent-emerald font-mono">{lineup.formation}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {(lineup.startXI || []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-secondary py-0.5">
                        <span className="font-mono text-text-muted w-5">{p.player?.number}</span>
                        <span className="truncate">{p.player?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Odds */}
        {(matchWinner || overUnder || btts) && (
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">📊 Cuotas</h2>
            <p className="text-[10px] text-text-muted mb-3">Fuente: {matchWinner?.bookmaker || oddsData?.bookmakers?.[0]?.name || 'N/D'}</p>

            {matchWinner && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">1X2</p>
                <div className="flex gap-2">
                  {matchWinner.values.map((v: any) => (
                    <div key={v.value} className="odds-btn flex-1">
                      <span className="label">{v.value === 'Home' ? 'Local' : v.value === 'Draw' ? 'Empate' : 'Visitante'}</span>
                      <span className="value">{v.odd}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {overUnder && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Over/Under</p>
                <div className="flex flex-wrap gap-2">
                  {overUnder.values.map((v: any) => (
                    <div key={v.value} className="odds-btn">
                      <span className="label">{v.value}</span>
                      <span className="value">{v.odd}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {btts && (
              <div>
                <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Ambos Marcan</p>
                <div className="flex gap-2">
                  {btts.values.map((v: any) => (
                    <div key={v.value} className="odds-btn flex-1">
                      <span className="label">{v.value === 'Yes' ? 'Sí' : 'No'}</span>
                      <span className="value">{v.odd}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prediction */}
        {prediction && (
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">🎯 Predicción</h2>

            {prediction.predictions?.winner?.name && (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent-emerald/5 border border-accent-emerald/10">
                <span className="text-xl">🏆</span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ganador probable: {prediction.predictions.winner.name}</p>
                  {prediction.predictions.advice && (
                    <p className="text-xs text-text-muted mt-0.5">{prediction.predictions.advice}</p>
                  )}
                </div>
              </div>
            )}

            {prediction.predictions?.percent && (
              <div className="mb-4">
                <p className="text-xs text-text-muted mb-2">Probabilidades</p>
                <div className="flex gap-2">
                  {[
                    { label: 'Local', value: prediction.predictions.percent.home, color: 'bg-accent-emerald' },
                    { label: 'Empate', value: prediction.predictions.percent.draw, color: 'bg-accent-amber' },
                    { label: 'Visitante', value: prediction.predictions.percent.away, color: 'bg-accent-cyan' },
                  ].map((p) => (
                    <div key={p.label} className="flex-1 text-center">
                      <div className="h-2 rounded-full bg-bg-primary mb-1 overflow-hidden">
                        <div className={`h-full rounded-full ${p.color}`} style={{ width: p.value || '0%' }} />
                      </div>
                      <p className="text-xs text-text-muted">{p.label}</p>
                      <p className="font-mono font-bold text-sm text-text-primary">{p.value || 'N/D'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {prediction.comparison && (
              <div>
                <p className="text-xs text-text-muted mb-2">Comparación</p>
                <div className="space-y-2">
                  {Object.entries(prediction.comparison).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-accent-emerald w-10 text-right">{val.home}</span>
                      <div className="flex-1">
                        <div className="h-1 rounded-full bg-bg-primary flex overflow-hidden">
                          <div className="h-full bg-accent-emerald" style={{ width: val.home || '50%' }} />
                          <div className="h-full bg-accent-cyan" style={{ width: val.away || '50%' }} />
                        </div>
                      </div>
                      <span className="font-mono text-accent-cyan w-10">{val.away}</span>
                      <span className="text-text-muted w-20 text-center">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* H2H */}
        {h2hMatches.length > 0 && (
          <div className="glass-card p-5 md:col-span-2">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">⚔️ Historial (H2H)</h2>
            <div className="space-y-2">
              {h2hMatches.slice(0, 10).map((m: any) => {
                const d = m.fixture?.date ? new Date(m.fixture.date).toLocaleDateString('es-AR') : '?';
                const hGoals = m.goals?.home ?? '?';
                const aGoals = m.goals?.away ?? '?';
                return (
                  <div key={m.fixture?.id} className="flex items-center gap-3 text-sm p-2 rounded-lg bg-bg-primary/50">
                    <span className="text-xs text-text-muted font-mono w-20">{d}</span>
                    <span className={`flex-1 text-right truncate ${hGoals > aGoals ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>
                      {m.teams?.home?.name}
                    </span>
                    <span className="font-mono font-bold text-text-primary px-2">
                      {hGoals} - {aGoals}
                    </span>
                    <span className={`flex-1 truncate ${aGoals > hGoals ? 'text-text-primary font-semibold' : 'text-text-secondary'}`}>
                      {m.teams?.away?.name}
                    </span>
                    <span className="text-[10px] text-text-muted truncate max-w-[80px]">{m.league?.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No data fallback */}
        {stats.length === 0 && events.length === 0 && lineups.length === 0 && !matchWinner && !prediction && h2hMatches.length === 0 && (
          <div className="glass-card p-8 text-center md:col-span-2">
            <p className="text-3xl mb-3">📭</p>
            <p className="text-text-secondary">Los datos detallados aún no están disponibles para este partido.</p>
            <p className="text-text-muted text-sm mt-1">Las estadísticas, alineaciones y cuotas se cargan cerca del inicio del partido.</p>
          </div>
        )}
      </div>
    </div>
  );
}
