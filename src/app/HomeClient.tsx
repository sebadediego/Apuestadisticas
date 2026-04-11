'use client';

import { useState } from 'react';
import LeagueAccordion from '@/components/LeagueAccordion';
import CountrySection from '@/components/CountrySection';
import Banner1Win from '@/components/Banner1Win';
import { filterRelevantLeagues } from '@/lib/league-filter';
import { groupLeaguesByCountry } from '@/lib/country-groups';

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

  const relevantLeagues = filterRelevantLeagues(leagues, search);
  const isSearching = search.trim().length > 0;

  const searchFiltered = relevantLeagues.filter(l => {
    if (!isSearching) return true;
    const q = search.toLowerCase();
    const leagueName = (l.league?.name || '').toLowerCase();
    const country = (l.league?.country || '').toLowerCase();
    const hasTeamMatch = l.fixtures.some((f: any) =>
      (f.teams?.home?.name || '').toLowerCase().includes(q) ||
      (f.teams?.away?.name || '').toLowerCase().includes(q)
    );
    return leagueName.includes(q) || country.includes(q) || hasTeamMatch;
  });

  const { international, priorityGroups, otherGroups } = groupLeaguesByCountry(searchFiltered);

  return (
    <div className="layout-main">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
        <img src="/logo-apuestadisticas.png" alt="Apuestadísticas" style={{ width: '85%', maxWidth: 340, height: 'auto', objectFit: 'contain' }} />
      </div>

      <Banner1Win variant="full" />

      <div className="search-bar-wrapper">
        <svg className="search-bar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          className="search-bar-input"
          placeholder="Buscar liga, equipo o país..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="section-title">Partidos de hoy</div>

      {searchFiltered.length === 0 ? (
        <div className="empty-state">
          <p>No hay partidos programados para hoy</p>
        </div>
      ) : isSearching ? (
        searchFiltered.map((leagueData) => (
          <LeagueAccordion
            key={leagueData.id}
            league={leagueData.league}
            fixtures={leagueData.fixtures}
            oddsMap={oddsMap}
            defaultOpen={true}
          />
        ))
      ) : (
        <>
          {international.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)',
                textTransform: 'uppercase', letterSpacing: '1px',
                padding: '8px 4px 6px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>🌍</span> Internacionales
              </div>
              {international.map((l) => (
                <LeagueAccordion
                  key={l.id}
                  league={l.league}
                  fixtures={l.fixtures}
                  oddsMap={oddsMap}
                  defaultOpen={topLeagueIds.includes(l.id)}
                />
              ))}
            </>
          )}

          {priorityGroups.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--accent-green)',
                textTransform: 'uppercase', letterSpacing: '1px',
                padding: '12px 4px 6px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>⭐</span> Ligas principales
              </div>
              {priorityGroups.map((group, index) => (
                <div key={group.country}>
                  <CountrySection
                    group={group}
                    oddsMap={oddsMap}
                    defaultOpen={index < 3}
                    topLeagueIds={topLeagueIds}
                  />
                  {(index + 1) % 3 === 0 && index < priorityGroups.length - 1 && (
                    <Banner1Win variant="inline" />
                  )}
                </div>
              ))}
            </>
          )}

          {otherGroups.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '1px',
                padding: '12px 4px 6px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>🌐</span> Otras ligas
              </div>
              {otherGroups.map((group) => (
                <CountrySection
                  key={group.country}
                  group={group}
                  oddsMap={oddsMap}
                  defaultOpen={false}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
