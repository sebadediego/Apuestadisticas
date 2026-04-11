'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

interface PartidosClientProps {
  leagues: LeagueData[];
  oddsMap: Record<string, any>;
  availableLeagues: { id: number; name: string }[];
  currentDate: string;
}

function getDateChips(current: string) {
  const chips = [];
  for (let i = -2; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    let label = '';
    if (i === -2) label = 'Anteayer';
    else if (i === -1) label = 'Ayer';
    else if (i === 0) label = 'Hoy';
    else if (i === 1) label = 'Manana';
    else label = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
    chips.push({ date: dateStr, label, active: dateStr === current });
  }
  return chips;
}

export default function PartidosClient({
  leagues,
  oddsMap,
  availableLeagues,
  currentDate,
}: PartidosClientProps) {
  const router = useRouter();
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  function handleDateChange(date: string) {
    setSelectedLeague(null);
    setSearch('');
    router.push(`/partidos?date=${date}`);
  }

  const relevantLeagues = filterRelevantLeagues(leagues, search);

  let filteredLeagues = selectedLeague
    ? relevantLeagues.filter(l => l.id === selectedLeague)
    : relevantLeagues;

  const isSearching = search.trim().length > 0 || selectedLeague !== null;

  if (search.trim()) {
    const q = search.toLowerCase();
    filteredLeagues = filteredLeagues.filter(l => {
      const leagueName = (l.league?.name || '').toLowerCase();
      const country = (l.league?.country || '').toLowerCase();
      const hasTeamMatch = l.fixtures.some((f: any) =>
        (f.teams?.home?.name || '').toLowerCase().includes(q) ||
        (f.teams?.away?.name || '').toLowerCase().includes(q)
      );
      return leagueName.includes(q) || country.includes(q) || hasTeamMatch;
    });
  }

  const dateChips = getDateChips(currentDate);
  const { international, priorityGroups, otherGroups } = groupLeaguesByCountry(filteredLeagues);

  return (
    <div className="layout-main">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
          <img src="/logo-partidos.png" alt="Partidos" style={{ width: '75%', maxWidth: 300, height: 'auto', objectFit: 'contain' }} />
        </div>
      </div>

      <div className="date-nav">
        {dateChips.map((chip) => (
          <button
            key={chip.date}
            className={`date-chip ${chip.active ? 'active' : ''}`}
            onClick={() => handleDateChange(chip.date)}
          >
            {chip.label}
          </button>
        ))}
      </div>

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

      <div style={{ padding: '0 0 8px' }}>
        <select
          className="filter-select"
          value={selectedLeague ?? 'all'}
          onChange={(e) => {
            const val = e.target.value;
            setSelectedLeague(val === 'all' ? null : Number(val));
          }}
        >
          <option value="all">Todas las ligas ({availableLeagues.length})</option>
          {availableLeagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {filteredLeagues.length === 0 ? (
        <div className="empty-state">
          <p>No hay partidos para esta fecha{selectedLeague ? ' y liga seleccionada' : ''}</p>
        </div>
      ) : isSearching ? (
        filteredLeagues.map((leagueData, index) => (
          <div key={leagueData.id}>
            <LeagueAccordion league={leagueData.league} fixtures={leagueData.fixtures} oddsMap={oddsMap} defaultOpen={index < 3} />
            {(index + 1) % 3 === 0 && index < filteredLeagues.length - 1 && (
              <Banner1Win variant="inline" />
            )}
          </div>
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
                <LeagueAccordion key={l.id} league={l.league} fixtures={l.fixtures} oddsMap={oddsMap} defaultOpen={true} />
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
                  <CountrySection group={group} oddsMap={oddsMap} defaultOpen={index < 3} />
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
                <CountrySection key={group.country} group={group} oddsMap={oddsMap} defaultOpen={false} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
