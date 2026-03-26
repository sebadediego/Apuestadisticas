// src/app/partidos/[id]/page.tsx
import {
  getFixtures, getFixtureStatistics, getFixtureEvents, getFixtureLineups,
  getHeadToHead, getOdds, getPredictions, FIXTURE_STATUS
} from '@/lib/api-football';
import Link from 'next/link';

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params;
  const fixtureId = parseInt(id);

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
      <div className="layout-main" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No se encontro el partido.</p>
        <Link href="/partidos" style={{ color: 'var(--accent-green)', fontSize: 13, marginTop: 12, display: 'inline-block' }}>
          Volver a partidos
        </Link>
      </div>
    );
  }

  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const league = fixture.league;
  const status = FIXTURE_STATUS[f?.status?.short] || { label: f?.status?.long || '?', color: '', live: false };
  const isFinished = ['FT', 'AET', 'PEN'].includes(f?.status?.short);
  const hasScore = goals?.home !== null;

  let h2hMatches: any[] = [];
  if (teams?.home?.id && teams?.away?.id) {
    try {
      const h2hRes = await getHeadToHead({ h2h: `${teams.home.id}-${teams.away.id}`, last: 5 });
      h2hMatches = h2hRes.response || [];
    } catch {}
  }

  const matchDate = f?.date
    ? new Date(f.date).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })
    : '';

  // Extract odds
  const getMarket = (betName: string) => {
    if (!oddsData?.bookmakers?.length) return null;
    for (const bk of oddsData.bookmakers) {
      const bet = bk.bets?.find((b: any) => b.name === betName);
      if (bet) return { bookmaker: bk.name, values: bet.values };
    }
    return null;
  };

  const matchWinner = getMarket('Match Winner');
  const overUnder = getMarket('Goals Over/Under');
  const btts = getMarket('Both Teams Score');

  return (
    <div className="layout-main" style={{ paddingBottom: 20 }}>
      {/* Back link */}
      <Link href="/partidos" style={{ color: 'var(--text-muted)', fontSize: 12, display: 'inline-block', padding: '12px 0 8px', textDecoration: 'none' }}>
        ← Volver a partidos
      </Link>

      {/* Match Header Card */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 10 }}>
        {/* League */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          {league?.logo && <img src={league.logo} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />}
          <span>{league?.name} — {league?.country}</span>
        </div>

        {/* Teams + Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          {/* Home */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {teams?.home?.logo && <img src={teams.home.logo} alt="" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 6px' }} />}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {teams?.home?.name}
            </div>
          </div>

          {/* Score / VS */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            {hasScore ? (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 32, color: 'var(--text-primary)' }}>
                  {goals?.home}:{goals?.away}
                </div>
                <div style={{
                  display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: status.live ? 'var(--accent-green-bg)' : 'var(--bg-elevated)',
                  color: status.live ? 'var(--accent-green)' : 'var(--text-muted)',
                  border: status.live ? '1px solid var(--accent-green-border)' : '1px solid var(--border-subtle)',
                }}>
                  {f?.status?.elapsed ? f.status.elapsed + "'" : status.label}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 22, color: 'var(--accent-cyan)' }}>VS</div>
                <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                  {status.label}
                </div>
              </>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{matchDate}</div>
          </div>

          {/* Away */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            {teams?.away?.logo && <img src={teams.away.logo} alt="" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 6px' }} />}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
              {teams?.away?.name}
            </div>
          </div>
        </div>
      </div>

      {/* Events */}
      {events.length > 0 && (
        <Section title="Eventos">
          {events.map((e: any, i: number) => {
            const icon = e.type === 'Goal' ? '⚽' : e.detail === 'Yellow Card' ? '🟨' : e.detail === 'Red Card' ? '🟥' : e.type === 'subst' ? '🔄' : '📌';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', width: 36 }}>{e.time?.elapsed}&apos;</span>
                <span>{icon}</span>
                <span style={{ color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.player?.name || '?'}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.detail}</span>
              </div>
            );
          })}
        </Section>
      )}

      {/* Cuotas */}
      {matchWinner && (
        <Section title="Cuotas">
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>Fuente: {matchWinner.bookmaker}</div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>1X2</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {matchWinner.values.map((v: any) => (
                <a key={v.value} href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd" style={{ flex: 1 }}>
                  <span className="apuesta-odd-label">{v.value === 'Home' ? 'Local' : v.value === 'Draw' ? 'Empate' : 'Visitante'}</span>
                  <span className="apuesta-odd-value">{v.odd}</span>
                </a>
              ))}
            </div>
          </div>

          {overUnder && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>OVER/UNDER</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {overUnder.values.map((v: any, i: number) => (
                  <a key={i} href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="odd-pill">
                    <span className="odd-pill-label">{v.value}</span>
                    <span className="odd-pill-value">{v.odd}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {btts && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>AMBOS MARCAN</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {btts.values.map((v: any) => (
                  <a key={v.value} href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd" style={{ flex: 1 }}>
                    <span className="apuesta-odd-label">{v.value === 'Yes' ? 'Si' : 'No'}</span>
                    <span className="apuesta-odd-value">{v.odd}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="pred-bet-btn" style={{ marginTop: 12 }}>
            Ver mas mercados en 1Win
          </a>
        </Section>
      )}

      {/* Prediction */}
      {prediction?.predictions && (
        <Section title="Prediccion">
          {prediction.predictions.winner?.name && (
            <div className="apuesta-prediction" style={{ marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>Ganador probable:</span> {prediction.predictions.winner.name}
            </div>
          )}

          {prediction.predictions.percent && (
            <div className="pred-bar-container" style={{ marginBottom: 10 }}>
              <div className="pred-bar">
                <div className="home" style={{ width: prediction.predictions.percent.home || '33%' }} />
                <div className="draw" style={{ width: prediction.predictions.percent.draw || '34%' }} />
                <div className="away" style={{ width: prediction.predictions.percent.away || '33%' }} />
              </div>
              <div className="pred-bar-labels">
                <span className="pred-bar-label home">Local {prediction.predictions.percent.home}</span>
                <span className="pred-bar-label draw">Empate {prediction.predictions.percent.draw}</span>
                <span className="pred-bar-label away">Visitante {prediction.predictions.percent.away}</span>
              </div>
            </div>
          )}

          {prediction.predictions.advice && (
            <div className="pred-advice">{prediction.predictions.advice}</div>
          )}
        </Section>
      )}

      {/* Statistics */}
      {stats.length >= 2 && (
        <Section title="Estadisticas">
          {(stats[0]?.statistics || []).map((stat: any, i: number) => {
            const homeVal = stat.value ?? 0;
            const awayStat = stats[1]?.statistics?.[i];
            const awayVal = awayStat?.value ?? 0;
            const homeNum = typeof homeVal === 'string' ? parseFloat(homeVal) || 0 : homeVal;
            const awayNum = typeof awayVal === 'string' ? parseFloat(awayVal) || 0 : awayVal;
            const total = homeNum + awayNum || 1;

            return (
              <div key={stat.type} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: 40, textAlign: 'right' }}>{homeVal}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, textAlign: 'center' }}>{stat.type}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', width: 40, textAlign: 'left' }}>{awayVal}</span>
                </div>
                <div style={{ display: 'flex', gap: 2, height: 4 }}>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: `${(homeNum / total) * 100}%`, height: '100%', borderRadius: 2, background: 'var(--accent-green)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ width: `${(awayNum / total) * 100}%`, height: '100%', borderRadius: 2, background: 'var(--accent-cyan)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* H2H */}
      {h2hMatches.length > 0 && (
        <Section title="Historial (H2H)">
          {h2hMatches.map((m: any) => {
            const d = m.fixture?.date ? new Date(m.fixture.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '?';
            return (
              <div key={m.fixture?.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', width: 52 }}>{d}</span>
                <span style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{m.teams?.home?.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', padding: '0 6px' }}>{m.goals?.home}-{m.goals?.away}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{m.teams?.away?.name}</span>
              </div>
            );
          })}
        </Section>
      )}

      {/* No data */}
      {stats.length === 0 && events.length === 0 && !matchWinner && !prediction && h2hMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
          Los datos detallados aun no estan disponibles para este partido.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  );
}
