'use client';

import Banner1Win from '@/components/Banner1Win';

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';

interface MatchData {
  fixture: any;
  odds1x2: { home: string | null; draw: string | null; away: string | null } | null;
  oddsOU: { over: string | null; under: string | null } | null;
  oddsBTTS: { yes: string | null; no: string | null } | null;
  prediction: { winner: string; advice: string | null } | null;
}

export default function ApuestasClient({ matches }: { matches: MatchData[] }) {
  return (
    <div className="layout-main">
      <div className="page-header">
        <h1 className="page-title">Apuestas del dia</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Los mejores partidos con cuotas, predicciones y mercados
        </p>
      </div>

      {/* Banner 1Win arriba */}
      <Banner1Win variant="full" />

      {matches.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <p>No hay apuestas disponibles para hoy</p>
        </div>
      ) : (
        matches.map(({ fixture, odds1x2, oddsOU, oddsBTTS, prediction }) => {
          const f = fixture.fixture;
          const teams = fixture.teams;
          const league = fixture.league;
          const time = f?.date
            ? new Date(f.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
            : '?';

          return (
            <div key={f?.id} className="apuesta-card">
              {/* League + time */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                {league?.logo && (
                  <img src={league.logo} alt="" style={{ width: 14, height: 14, borderRadius: 2, objectFit: 'contain' }} />
                )}
                <span>{league?.name}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{time}</span>
              </div>

              {/* Teams */}
              <div className="apuesta-teams">
                <div className="apuesta-team">
                  {teams?.home?.logo && <img src={teams.home.logo} alt="" />}
                  <span className="apuesta-team-name">{teams?.home?.name}</span>
                </div>
                <span className="apuesta-vs">vs</span>
                <div className="apuesta-team away">
                  {teams?.away?.logo && <img src={teams.away.logo} alt="" />}
                  <span className="apuesta-team-name">{teams?.away?.name}</span>
                </div>
              </div>

              {/* 1X2 Odds */}
              {odds1x2 && (
                <div className="apuesta-odds-row">
                  <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd">
                    <span className="apuesta-odd-label">1</span>
                    <span className="apuesta-odd-value">{odds1x2.home || '—'}</span>
                  </a>
                  <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd">
                    <span className="apuesta-odd-label">X</span>
                    <span className="apuesta-odd-value" style={{ color: 'var(--accent-amber)' }}>{odds1x2.draw || '—'}</span>
                  </a>
                  <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd">
                    <span className="apuesta-odd-label">2</span>
                    <span className="apuesta-odd-value" style={{ color: 'var(--accent-cyan)' }}>{odds1x2.away || '—'}</span>
                  </a>
                </div>
              )}

              {/* Over/Under + BTTS */}
              <div className="apuesta-market-row">
                {oddsOU && (
                  <>
                    <div className="apuesta-market-item">
                      <div className="apuesta-market-label">Over 2.5</div>
                      <div className="apuesta-market-value">{oddsOU.over || '—'}</div>
                    </div>
                    <div className="apuesta-market-item">
                      <div className="apuesta-market-label">Under 2.5</div>
                      <div className="apuesta-market-value">{oddsOU.under || '—'}</div>
                    </div>
                  </>
                )}
                {oddsBTTS && (
                  <>
                    <div className="apuesta-market-item">
                      <div className="apuesta-market-label">Ambos Si</div>
                      <div className="apuesta-market-value">{oddsBTTS.yes || '—'}</div>
                    </div>
                    <div className="apuesta-market-item">
                      <div className="apuesta-market-label">Ambos No</div>
                      <div className="apuesta-market-value">{oddsBTTS.no || '—'}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Prediction */}
              {prediction && (
                <div className="apuesta-prediction">
                  <span style={{ fontWeight: 600 }}>Ganador probable:</span> {prediction.winner}
                </div>
              )}

              {/* Bet CTA */}
              <a
                href={AFFILIATE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="pred-bet-btn"
              >
                Apostar en 1Win
              </a>
            </div>
          );
        })
      )}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0 20px' }}>
        Las cuotas cambian constantemente. Aposta responsablemente.
      </p>
    </div>
  );
}
