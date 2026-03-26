'use client';

import { useRouter } from 'next/navigation';
import LeagueAccordion from '@/components/LeagueAccordion';
import Banner1Win from '@/components/Banner1Win';

interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

interface PartidosClientProps {
  leagues: LeagueData[];
  oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }>;
  topLeagues: { id: number; name: string; country: string }[];
  currentDate: string;
  currentLeague: number | null;
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
  topLeagues,
  currentDate,
  currentLeague,
}: PartidosClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    const params = new URLSearchParams();
    params.set('date', date);
    if (currentLeague) params.set('league', String(currentLeague));
    router.push(`/partidos?${params.toString()}`);
  }

  function handleLeagueChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    const params = new URLSearchParams();
    params.set('date', currentDate);
    if (val && val !== 'all') {
      params.set('league', val);
    }
    router.push(`/partidos?${params.toString()}`);
  }

  const dateChips = getDateChips(currentDate);

  return (
    <div className="layout-main">
      <div className="page-header">
        <h1 className="page-title">Partidos</h1>
      </div>

      {/* Date navigation */}
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

      {/* League filter */}
      <div style={{ padding: '4px 0 8px' }}>
        <select
          className="filter-select"
          value={currentLeague ? String(currentLeague) : 'all'}
          onChange={handleLeagueChange}
        >
          <option value="all">Todas las ligas</option>
          {topLeagues.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {leagues.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
          </svg>
          <p>No hay partidos para esta fecha{currentLeague ? ' y liga seleccionada' : ''}</p>
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
              }}
              fixtures={leagueData.fixtures}
              oddsMap={oddsMap}
              defaultOpen={true}
            />
            {(index + 1) % 3 === 0 && index < leagues.length - 1 && (
              <Banner1Win variant="inline" />
            )}
          </div>
        ))
      )}
    </div>
  );
}
