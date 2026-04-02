'use client';
import { useState, useEffect } from 'react';
import Banner1Win from '@/components/Banner1Win';

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';
const TOP_LEAGUE_IDS = [128, 71, 239, 262, 39, 140, 135, 61, 78, 94, 88, 2, 3, 848, 13, 11, 130, 73, 1, 4, 9, 29, 32, 30, 34, 10];

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

          if (prediction?.predictions?.winner?.name) {
            const pred = prediction.predictions;
            const homeForm = prediction.teams?.home?.league?.form?.slice(-5) || '';
            const awayForm = prediction.teams?.away?.league?.form?.slice(-5) || '';
            const homeGoalsAvg = parseFloat(prediction.teams?.home?.league?.goals?.for?.average?.total || '0');
            const awayGoalsAvg = parseFloat(prediction.teams?.away?.league?.goals?.for?.average?.total || '0');
            const homeGoalsAgainst = parseFloat(prediction.teams?.home?.league?.goals?.against?.average?.total || '0');
            const awayGoalsAgainst = parseFloat(prediction.teams?.away?.league?.goals?.against?.average?.total || '0');

            const home = fix.teams?.home?.name || 'Local';
            const away = fix.teams?.away?.name || 'Visitante';
            const homeWins = (homeForm.match(/W/g) || []).length;
            const awayWins = (awayForm.match(/W/g) || []).length;
            const totalGoalsAvg = homeGoalsAvg + awayGoalsAvg;

            const tipIndex = results.length;
            let analysis = '';

            let mwOdds: any = null;
            let ouOdds: any = null;
            let bttsOdds: any = null;
            if (odds?.bookmakers?.length) {
              const bk = odds.bookmakers[0];
              mwOdds = bk.bets?.find((b: any) => b.name === 'Match Winner' || b.id === 1);
              ouOdds = bk.bets?.find((b: any) => b.name === 'Goals Over/Under' || b.id === 5);
              bttsOdds = bk.bets?.find((b: any) => b.name === 'Both Teams Score' || b.id === 8);
            }

            if (tipIndex === 0) {
              analysis = `${home} (${homeForm.split('').join('-')}) vs ${away} (${awayForm.split('').join('-')}). `;
              if (homeWins >= 3) {
                analysis += `${home} viene intratable con ${homeWins} victorias en 5 partidos. `;
              } else if (awayWins >= 3) {
                analysis += `${away} llega fuerte con ${awayWins} triunfos en los ultimos 5. `;
              }
              const winnerPct = pred.winner.name === home ? pred.percent?.home : pred.percent?.away;
              analysis += `${pred.winner.name} es favorito con ${winnerPct} de probabilidad. `;
              if (mwOdds) {
                const side = pred.winner.name === home ? 'Home' : 'Away';
                const odd = mwOdds.values?.find((v: any) => v.value === side)?.odd;
                if (odd) analysis += `Cuota: ${odd}. `;
              }
              analysis += `Tip: Ganador ${pred.winner.name}.`;
            } else if (tipIndex === 1) {
              analysis += `Promedio combinado de goles: ${totalGoalsAvg.toFixed(1)} por partido. `;
              analysis += `${home} mete ${homeGoalsAvg.toFixed(1)} y recibe ${homeGoalsAgainst.toFixed(1)}. `;
              analysis += `${away} hace ${awayGoalsAvg.toFixed(1)} y recibe ${awayGoalsAgainst.toFixed(1)}. `;
              if (totalGoalsAvg > 2.5) {
                analysis += `Con ese promedio, el Over 2.5 tiene valor. `;
                if (ouOdds) {
                  const o25 = ouOdds.values?.find((v: any) => v.value === 'Over 2.5')?.odd;
                  if (o25) analysis += `Cuota Over 2.5: ${o25}. `;
                }
                analysis += `Tip: Over 2.5 goles.`;
              } else {
                analysis += `Equipos poco goleadores, el Under 2.5 es mas seguro. `;
                if (ouOdds) {
                  const u25 = ouOdds.values?.find((v: any) => v.value === 'Under 2.5')?.odd;
                  if (u25) analysis += `Cuota Under 2.5: ${u25}. `;
                }
                analysis += `Tip: Under 2.5 goles.`;
              }
            } else {
              const bothScoreLikely = homeGoalsAvg >= 1.0 && awayGoalsAvg >= 1.0 && homeGoalsAgainst >= 0.8 && awayGoalsAgainst >= 0.8;
              analysis += `${home}: ${homeGoalsAvg.toFixed(1)} goles/partido, recibe ${homeGoalsAgainst.toFixed(1)}. `;
              analysis += `${away}: ${awayGoalsAvg.toFixed(1)} goles/partido, recibe ${awayGoalsAgainst.toFixed(1)}. `;
              if (bothScoreLikely) {
                analysis += `Ambos equipos tienen potencial ofensivo y defensa vulnerable. `;
                if (bttsOdds) {
                  const yes = bttsOdds.values?.find((v: any) => v.value === 'Yes')?.odd;
                  if (yes) analysis += `Cuota Ambos Marcan Si: ${yes}. `;
                }
                analysis += `Tip: Ambos marcan - Si.`;
              } else {
                analysis += `Es dificil que ambos marquen, uno de los dos es muy defensivo. `;
                if (bttsOdds) {
                  const no = bttsOdds.values?.find((v: any) => v.value === 'No')?.odd;
                  if (no) analysis += `Cuota Ambos Marcan No: ${no}. `;
                }
                analysis += `Tip: Ambos marcan - No.`;
              }
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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <img src="/logo-apuestips.png" alt="Apuestips" style={{ height: 48, objectFit: 'contain' }} />
        </div>
        <p className="section-subtitle">Los 3 mejores partidos del dia para apostar</p>
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner" />
          {[1,2,3].map(i =>
            <div key={i} className="skeleton skeleton-card" />
          )}
        </div>
      )}

      {!loading && tips.length === 0 && (
        <div className="empty-state">
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
          <div key={idx} className="pred-card">
            <div className="pred-header">
              {/* Tip number */}
              <span className="pred-tip-number">
                #{idx + 1}
              </span>
              {league?.logo && <img src={league.logo} alt="" />}
              <span>{league?.name}</span>
              <span className="pred-time">{time}hs</span>
            </div>

            {/* Teams with form */}
            <div className="pred-teams">
              <div className="pred-team">
                {teams?.home?.logo && <img src={teams.home.logo} alt="" />}
                <div className="pred-team-info">
                  <div className="pred-team-name">{teams?.home?.name}</div>
                  <div className="pred-team-form">{renderForm(prediction?.teams?.home?.league?.form)}</div>
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
                  <div className="pred-team-form">{renderForm(prediction?.teams?.away?.league?.form)}</div>
                </div>
              </div>
            </div>

            {/* Probability bar */}
            {pred?.percent && (
              <div className="pred-bar-container">
                <div className="pred-bar">
                  <div className="home" style={{ width: pred.percent.home }} />
                  <div className="draw" style={{ width: pred.percent.draw }} />
                  <div className="away" style={{ width: pred.percent.away }} />
                </div>
                <div className="pred-bar-labels">
                  <span className="pred-bar-label home">{pred.percent.home}</span>
                  <span className="pred-bar-label draw">{pred.percent.draw}</span>
                  <span className="pred-bar-label away">{pred.percent.away}</span>
                </div>
              </div>
            )}

            {/* 1X2 Odds — redesigned as 365Scores pills */}
            {odds1x2 && (
              <div className="pred-odds-row">
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="pred-odd-pill">
                  <span className="pred-odd-pill-label">1</span>
                  <span className="pred-odd-pill-value">{odds1x2.home || '—'}</span>
                </a>
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="pred-odd-pill">
                  <span className="pred-odd-pill-label">X</span>
                  <span className="pred-odd-pill-value">{odds1x2.draw || '—'}</span>
                </a>
                <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="pred-odd-pill">
                  <span className="pred-odd-pill-label">2</span>
                  <span className="pred-odd-pill-value">{odds1x2.away || '—'}</span>
                </a>
              </div>
            )}

            {/* Analysis */}
            <div className="pred-advice">
              {analysis}
            </div>

            {/* 1Win banner button — same style as chat banner */}
            <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="tip-1win-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/1win-logo.png" alt="1Win" className="tip-1win-logo" />
              <div className="tip-1win-content">
                <span className="tip-1win-title">Apostá con las mejores cuotas</span>
                <span className="tip-1win-sub">Registrate y recibi tu bono del 500%</span>
              </div>
              <span className="tip-1win-cta">Ir a 1Win</span>
            </a>
          </div>
        );
      })}

      <div className="chat-disclaimer" style={{ padding: '16px 0' }}>
        Estimaciones basadas en datos historicos. No garantizan resultados. Aposta responsablemente.
      </div>
    </div>
  );
}
