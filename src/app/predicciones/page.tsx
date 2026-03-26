'use client';
import { useState, useEffect } from 'react';
import Banner1Win from '@/components/Banner1Win';

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';
const TOP_LEAGUE_IDS = [128, 71, 39, 140, 135, 61, 78, 2, 13];

interface TipData {
  fixture: any;
  prediction: any;
  odds: any;
  analysis: string;
}

export default function ApuestipsPage() {
  const [tips, setTips] = useState<TipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTips() {
      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
        const res = await fetch(`/api/football?endpoint=/fixtures&date=${today}&timezone=America/Argentina/Buenos_Aires`);
        const data = await res.json();

        // Filter NS matches, prioritize top leagues
        const upcoming = (data.response || [])
          .filter((m: any) => m.fixture?.status?.short === 'NS')
          .sort((a: any, b: any) => {
            const aTop = TOP_LEAGUE_IDS.indexOf(a.league?.id);
            const bTop = TOP_LEAGUE_IDS.indexOf(b.league?.id);
            if (aTop !== -1 && bTop !== -1) return aTop - bTop;
            if (aTop !== -1) return -1;
            if (bTop !== -1) return 1;
            return 0;
          });

        // Get predictions + odds for top 5, keep best 3 with winner
        const results: TipData[] = [];
        for (const fix of upcoming.slice(0, 6)) {
          if (results.length >= 3) break;
          const fid = fix.fixture.id;

          let prediction: any = null;
          let odds: any = null;

          try {
            const pRes = await fetch(`/api/football?endpoint=/predictions&fixture=${fid}`);
            const pData = await pRes.json();
            prediction = pData.response?.[0] || null;
          } catch {}

          try {
            const oRes = await fetch(`/api/football?endpoint=/odds&fixture=${fid}`);
            const oData = await oRes.json();
            odds = oData.response?.[0] || null;
          } catch {}

          // Only include if we have prediction with winner
          if (prediction?.predictions?.winner?.name) {
            // Generate analysis text locally
            const pred = prediction.predictions;
            const homeForm = prediction.teams?.home?.league?.form?.slice(-5) || '';
            const awayForm = prediction.teams?.away?.league?.form?.slice(-5) || '';
            const homeGoalsAvg = prediction.teams?.home?.league?.goals?.for?.average?.total || '?';
            const awayGoalsAvg = prediction.teams?.away?.league?.goals?.for?.average?.total || '?';
            const homeGoalsAgainst = prediction.teams?.home?.league?.goals?.against?.average?.total || '?';
            const awayGoalsAgainst = prediction.teams?.away?.league?.goals?.against?.average?.total || '?';

            let analysis = '';
            const home = fix.teams?.home?.name || 'Local';
            const away = fix.teams?.away?.name || 'Visitante';

            // Form analysis
            const homeWins = (homeForm.match(/W/g) || []).length;
            const awayWins = (awayForm.match(/W/g) || []).length;

            if (homeWins > awayWins) {
              analysis += `${home} viene en mejor forma (${homeForm.split('').join('-')}) vs ${away} (${awayForm.split('').join('-')}). `;
            } else if (awayWins > homeWins) {
              analysis += `${away} llega mejor (${awayForm.split('').join('-')}) vs ${home} (${homeForm.split('').join('-')}). `;
            } else {
              analysis += `Ambos equipos llegan parejos en forma: ${home} (${homeForm.split('').join('-')}) y ${away} (${awayForm.split('').join('-')}). `;
            }

            // Goals analysis
            analysis += `${home} promedia ${homeGoalsAvg} goles a favor y recibe ${homeGoalsAgainst}. ${away} hace ${awayGoalsAvg} y recibe ${awayGoalsAgainst}. `;

            // Tip
            if (pred.advice) {
              analysis += `Tip: ${pred.advice}`;
            }

            results.push({ fixture: fix, prediction, odds, analysis });
          }
        }

        setTips(results);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchTips();
  }, []);

  const renderForm = (form: string | undefined) => {
    if (!form) return null;
    return form.slice(-5).split('').map((c, i) => (
      <span key={i} className={`form-dot ${c}`} />
    ));
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Argentina/Buenos_Aires'
    });
  };

  return (
    <div className="layout-main">
      <div className="page-header">
        <h1 className="page-title">Apuestips</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Los 3 mejores partidos del dia para apostar
        </p>
      </div>

      <Banner1Win variant="full" />

      {loading && (
        <div>
          {[1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {!loading && tips.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p>No hay tips disponibles para hoy</p>
        </div>
      )}

      {tips.map(({ fixture, prediction, odds, analysis }, idx) => {
        const f = fixture.fixture;
        const teams = fixture.teams;
        const league = fixture.league;
        const pred = prediction?.predictions;
        const time = f?.date ? formatTime(f.date) : '?';

        // Extract 1X2 odds
        let odds1x2: any = null;
        if (odds?.bookmakers?.length) {
          const bk = odds.bookmakers[0];
          const mw = bk.bets?.find((b: any) => b.name === 'Match Winner' || b.id === 1);
          if (mw) {
            odds1x2 = {
              home: mw.values?.find((v: any) => v.value === 'Home')?.odd,
              draw: mw.values?.find((v: any) => v.value === 'Draw')?.odd,
              away: mw.values?.find((v: any) => v.value === 'Away')?.odd,
            };
          }
        }

        return (
          <div key={f?.id} className="pred-card">
            {/* Tip number */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18,
                color: 'var(--accent-green)', minWidth: 28
              }}>
                #{idx + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div className="pred-header" style={{ marginBottom: 0 }}>
                  {league?.logo && <img src={league.logo} alt="" />}
                  <span>{league?.name}</span>
                  <span className="pred-time">{time}hs</span>
                </div>
              </div>
            </div>

            {/* Teams with form */}
            <div className="pred-teams">
              <div className="pred-team">
                {teams?.home?.logo && <img src={teams.home.logo} alt="" />}
                <div className="pred-team-info">
                  <div className="pred-team-name">{teams?.home?.name}</div>
                  <div className="pred-team-form">
                    {renderForm(prediction?.teams?.home?.league?.form)}
                  </div>
                </div>
              </div>
              <div className="pred-vs">
                {pred?.winner?.name ? (
                  <span className="pred-winner-badge">
                    {pred.winner.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                ) : 'VS'}
              </div>
              <div className="pred-team away">
                {teams?.away?.logo && <img src={teams.away.logo} alt="" />}
                <div className="pred-team-info">
                  <div className="pred-team-name">{teams?.away?.name}</div>
                  <div className="pred-team-form">
                    {renderForm(prediction?.teams?.away?.league?.form)}
                  </div>
                </div>
              </div>
            </div>

            {/* Probability bar */}
            {pred?.percent && (
              <div className="pred-bar-container">
                <div className="pred-bar">
                  <div className="home" style={{ width: pred.percent.home || '33%' }} />
                  <div className="draw" style={{ width: pred.percent.draw || '34%' }} />
                  <div className="away" style={{ width: pred.percent.away || '33%' }} />
                </div>
                <div className="pred-bar-labels">
                  <span className="pred-bar-label home">{pred.percent.home}</span>
                  <span className="pred-bar-label draw">{pred.percent.draw}</span>
                  <span className="pred-bar-label away">{pred.percent.away}</span>
                </div>
              </div>
            )}

            {/* 1X2 Odds */}
            {odds1x2 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd" style={{ flex: 1 }}>
                  <span className="apuesta-odd-label">1</span>
                  <span className="apuesta-odd-value">{odds1x2.home || '—'}</span>
                </a>
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd" style={{ flex: 1 }}>
                  <span className="apuesta-odd-label">X</span>
                  <span className="apuesta-odd-value" style={{ color: 'var(--accent-amber)' }}>{odds1x2.draw || '—'}</span>
                </a>
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="apuesta-odd" style={{ flex: 1 }}>
                  <span className="apuesta-odd-label">2</span>
                  <span className="apuesta-odd-value" style={{ color: 'var(--accent-cyan)' }}>{odds1x2.away || '—'}</span>
                </a>
              </div>
            )}

            {/* Analysis */}
            <div className="pred-advice">{analysis}</div>

            {/* Bet button */}
            <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="pred-bet-btn">
              Apostar en 1Win
            </a>
          </div>
        );
      })}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0 20px' }}>
        Estimaciones basadas en datos historicos. No garantizan resultados. Aposta responsablemente.
      </p>
    </div>
  );
}
