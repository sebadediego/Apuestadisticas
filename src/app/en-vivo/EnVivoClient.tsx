'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeagueAccordion from '@/components/LeagueAccordion';
import { filterRelevantLeagues } from '@/lib/league-filter';

interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

interface Props {
  leagues: LeagueData[];
  oddsMap: Record<string, any>;
}

export default function EnVivoClient({ leagues, oddsMap }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  // Primero filtrar ligas irrelevantes, luego búsqueda
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
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <img src="/logo-envivo.png" alt="En Vivo" style={{ width: '75%', maxWidth: 300, height: 'auto', objectFit: 'contain' }} />
        </div>
        <p className="section-subtitle">Actualizacion automatica cada 30 segundos</p>
      </div>

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

      {filteredLeagues.length === 0 ? (
        <div className="empty-state">
          <p>No hay partidos en vivo en este momento</p>
        </div>
      ) : (
        filteredLeagues.map((l) => (
          <LeagueAccordion
            key={l.id}
            league={l.league}
            fixtures={l.fixtures}
            oddsMap={oddsMap}
            defaultOpen={true}
          />
        ))
      )}
    </div>
  );
}
