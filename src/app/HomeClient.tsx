'use client';

import { useState } from 'react';
import LeagueAccordion from '@/components/LeagueAccordion';
import Banner1Win from '@/components/Banner1Win';
import { filterRelevantLeagues } from '@/lib/league-filter';

interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

interface HomeClientProps {
  leagues: LeagueData[];
  oddsMap: Record<string, any>;
  topLeagueIds: number[];
}

export default function HomeClient({ leagues, oddsMap, topLeagueIds }: HomeClientProps) {
  const [search, setSearch] = useState('');

  // Primero filtrar ligas irrelevantes, luego aplicar búsqueda
  const relevantLeagues = filterRelevantLeagues(leagues, search);

  const filteredLeagues = relevantLeagues.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const leagueName = (l.league?.name || '').toLowerCase();
    const country = (l.league?.country || '').toLowerCase();
    const hasTeamMatch = l.fixtures.some((f: any) =>
      (f.teams?.home?.name || '').toLowerCase().includes(q) ||
      (f.teams?.away?.name || '').toLowerCase().includes(q)
    );
    return leagueName.includes(q) || country.includes(q) || hasTeamMatch;
  });

  return (
    <div className="layout-main">
      {/* Logo header */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0 10px' }}>
        <img src="/logo-apuestadisticas.png" alt="Apuestadísticas" style={{ height: 52, objectFit: 'contain' }} />
      </div>

      {/* CAMBIO 6 — Banner 1Win debajo del título */}
      <Banner1Win variant="full" />

      {/* Search bar */}
      <div className="search-bar-wrapper">
        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          className="search-bar-input"
          placeholder="Buscar liga o equipo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="section-title">Partidos de hoy</div>

      {filteredLeagues.length === 0 ? (
        <div className="empty-state">
          <p>No hay partidos programados para hoy</p>
        </div>
      ) : (
        filteredLeagues.map((leagueData, index) => (
          <div key={leagueData.id}>
            <LeagueAccordion
              league={leagueData.league}
              fixtures={leagueData.fixtures}
              oddsMap={oddsMap}
              defaultOpen={topLeagueIds.includes(leagueData.id)}
            />
            {/* CAMBIO 6 — Banner inline cada 4 ligas */}
            {(index + 1) % 4 === 0 && index < filteredLeagues.length - 1 && (
              <Banner1Win variant="inline" />
            )}
          </div>
        ))
      )}
    </div>
  );
}
