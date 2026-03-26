'use client';

import LeagueAccordion from '@/components/LeagueAccordion';
import Banner1Win from '@/components/Banner1Win';

interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

interface HomeClientProps {
  leagues: LeagueData[];
  oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }>;
  topLeagueIds: number[];
}

export default function HomeClient({ leagues, oddsMap, topLeagueIds }: HomeClientProps) {
  return (
    <div className="layout-main">
      {/* CAMBIO 5 — Título visible en mobile */}
      <div className="mini-header">
        <h1 className="mini-header-title">Apuestadisticas</h1>
      </div>

      {/* CAMBIO 6 — Banner 1Win debajo del título */}
      <Banner1Win variant="full" />

      <div className="page-header" style={{ paddingTop: 4 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Partidos de hoy
        </h2>
      </div>

      {leagues.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <p>No hay partidos programados para hoy</p>
        </div>
      ) : (
        leagues.map((leagueData, index) => (
          <div key={leagueData.id}>
            <LeagueAccordion
              league={{
                id: leagueData.league.id,
                name: leagueData.league.name,
                country: leagueData.league.country || '',
                logo: leagueData.league.logo || '',
                flag: leagueData.league.flag,
              }}
              fixtures={leagueData.fixtures}
              oddsMap={oddsMap}
              defaultOpen={index < 3 || topLeagueIds.includes(leagueData.id)}
            />
            {/* CAMBIO 6 — Banner inline cada 4 ligas */}
            {(index + 1) % 4 === 0 && index < leagues.length - 1 && (
              <Banner1Win variant="inline" />
            )}
          </div>
        ))
      )}
    </div>
  );
}
