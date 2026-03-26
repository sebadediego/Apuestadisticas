'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Banner1Win from '@/components/Banner1Win';

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';
const TOP_LEAGUE_IDS = [128, 71, 39, 140, 135, 61, 78, 2, 13];

interface PredictionData { fixture: any; prediction: any; }

export default function PrediccionesPage() {
  const [predictions, setPredictions] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetch(`/api/football?endpoint=/fixtures&date=${today}&timezone=America/Argentina/Buenos_Aires`);
        const data = await res.json();

        // Filter: only NS, prioritize top leagues
        const allUpcoming = (data.response || []).filter(
          (m: any) => ['NS', 'TBD'].includes(m.fixture?.status?.short)
        );

        // Sort: top leagues first
        const sorted = allUpcoming.sort((a: any, b: any) => {
          const aIdx = TOP_LEAGUE_IDS.indexOf(a.league?.id);
          const bIdx = TOP_LEAGUE_IDS.indexOf(b.league?.id);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
          return 0;
        });

        // Fetch predictions for top 8, keep max 5 with winner
        const predResults: PredictionData[] = [];
        for (const fix of sorted.slice(0, 8)) {
          if (predResults.length >= 5) break;
          try {
            const pRes = await fetch(`/api/football?endpoint=/predictions&fixture=${fix.fixture.id}`);
            const pData = await pRes.json();
            const pred = pData.response?.[0];
            // Only show if there's a predicted winner
            if (pred?.predictions?.winner?.name) {
              predResults.push({ fixture: fix, prediction: pred });
            }
          } catch {}
        }
        setPredictions(predResults);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  const renderForm = (form: string | undefined) => {
    if (!form) return null;
    return form.slice(-5).split('').map((c, i) => (
      <span key={i} className={`form-dot ${c}`} />
    ));
  };

  return (
    <div className="layout-main">
      <div className="page-header">
        <h1 className="page-title">Predicciones para hoy</h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Analisis basado en datos reales de API-Football
        </p>
      </div>

      {/* CAMBIO 6 — Banner 1Win arriba */}
      <Banner1Win variant="full" />

      {loading && (
        <div>
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {!loading && predictions.length === 0 && (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <p>No hay predicciones disponibles para hoy</p>
        </div>
      )}

      {predictions.map(({ fixture, prediction }) => {
        const f = fixture.fixture;
        const teams = fixture.teams;
        const league = fixture.league;
        const pred = prediction.predictions;
        const time = f?.date
          ? new Date(f.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
          : '?';

        return (
          <div key={f?.id} className="pred-card">
            {/* Header: league + time */}
            <div className="pred-header">
              {league?.logo && <img src={league.logo} alt="" />}
              <span>{league?.name}</span>
              <span className="pred-time">{time}</span>
            </div>

            {/* Teams with form */}
            <div className="pred-teams">
              <div className="pred-team">
                {teams?.home?.logo && <img src={teams.home.logo} alt="" />}
                <div className="pred-team-info">
                  <div className="pred-team-name">{teams?.home?.name}</div>
                  <div className="pred-team-form">
                    {renderForm(prediction.teams?.home?.league?.form)}
                  </div>
                </div>
              </div>

              <div className="pred-vs">
                {pred?.winner?.name ? (
                  <span className="pred-winner-badge">
                    {pred.winner.name.split(' ').slice(0, 2).join(' ')}
                  </span>
                ) : (
                  'VS'
                )}
              </div>

              <div className="pred-team away">
                {teams?.away?.logo && <img src={teams.away.logo} alt="" />}
                <div className="pred-team-info">
                  <div className="pred-team-name">{teams?.away?.name}</div>
                  <div className="pred-team-form">
                    {renderForm(prediction.teams?.away?.league?.form)}
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

            {/* Advice */}
            {pred?.advice && (
              <div className="pred-advice">{pred.advice}</div>
            )}

            {/* Bet button — CAMBIO 6 */}
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
      })}

      <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0 20px' }}>
        Estimaciones basadas en datos historicos. No garantizan resultados. Aposta responsablemente.
      </p>
    </div>
  );
}
