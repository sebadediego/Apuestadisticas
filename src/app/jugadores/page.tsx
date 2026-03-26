// src/app/jugadores/page.tsx
'use client';
import { useState, useEffect } from 'react';

const TOP_LEAGUES = [
  { id: 128, name: 'Liga Argentina' },
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 135, name: 'Serie A' },
  { id: 78, name: 'Bundesliga' },
];

export default function JugadoresPage() {
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeague, setSelectedLeague] = useState(39); // Premier League default

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const season = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;
        const res = await fetch(`/api/football?endpoint=/players/topscorers&league=${selectedLeague}&season=${season}`);
        const data = await res.json();
        setTopScorers(data.response || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [selectedLeague]);

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl text-text-primary mb-2">⭐ Jugadores</h1>
      <p className="text-text-muted text-sm mb-6">Máximos goleadores por liga</p>

      {/* League filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TOP_LEAGUES.map((l) => (
          <button
            key={l.id}
            onClick={() => setSelectedLeague(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedLeague === l.id
                ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20'
                : 'bg-bg-tertiary text-text-muted border border-border-subtle'
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      )}

      {!loading && topScorers.length === 0 && (
        <div className="glass-card-sm p-8 text-center">
          <p className="text-text-secondary">No hay datos de goleadores disponibles.</p>
        </div>
      )}

      <div className="space-y-2">
        {topScorers.map((item: any, i: number) => {
          const p = item.player;
          const s = item.statistics?.[0];
          return (
            <div key={p?.id || i} className="glass-card-sm p-3 flex items-center gap-3 match-card">
              <span className="font-display font-bold text-lg text-text-muted w-8 text-center">{i + 1}</span>
              {p?.photo && <img src={p.photo} alt="" className="w-10 h-10 rounded-full object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{p?.name}</p>
                <div className="flex items-center gap-2 text-[10px] text-text-muted">
                  {s?.team?.logo && <img src={s.team.logo} alt="" className="w-3.5 h-3.5" />}
                  <span>{s?.team?.name}</span>
                  <span>•</span>
                  <span>{p?.nationality}</span>
                  <span>•</span>
                  <span>{p?.age} años</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-lg text-accent-emerald">{s?.goals?.total ?? 0}</p>
                <p className="text-[10px] text-text-muted">goles</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="font-mono text-sm text-text-secondary">{s?.goals?.assists ?? 0}</p>
                <p className="text-[10px] text-text-muted">asistencias</p>
              </div>
              <div className="text-right hidden md:block">
                <p className="font-mono text-sm text-text-secondary">{s?.games?.appearences ?? 0}</p>
                <p className="text-[10px] text-text-muted">partidos</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
