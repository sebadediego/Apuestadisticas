'use client';

import { useState } from 'react';
import MatchRowItem from './MatchRowItem';

interface LeagueAccordionProps {
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag?: string;
  };
  fixtures: any[];
  oddsMap?: Record<number, { home: string | null; draw: string | null; away: string | null }>;
  defaultOpen?: boolean;
}

export default function LeagueAccordion({
  league,
  fixtures,
  oddsMap = {},
  defaultOpen = false,
}: LeagueAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="league-group">
      <div className="league-header" onClick={() => setIsOpen(!isOpen)}>
        <img src={league.logo} alt={league.name} className="league-logo" loading="lazy" />
        <div className="league-info">
          <div className="league-name">{league.name}</div>
          <div className="league-country">{league.country}</div>
        </div>
        <span className="league-count">{fixtures.length}</span>
        <svg className={`league-chevron ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
      <div className={`league-matches ${isOpen ? 'open' : ''}`}>
        {fixtures.map((fix: any) => (
          <MatchRowItem
            key={fix.id}
            fixture={{
              id: fix.fixture?.id ?? fix.id,
              date: fix.fixture?.date ?? fix.date,
              status: fix.fixture?.status ?? fix.status,
              homeTeam: fix.teams?.home ?? fix.homeTeam,
              awayTeam: fix.teams?.away ?? fix.awayTeam,
              goals: fix.goals ?? { home: null, away: null },
            }}
            odds={oddsMap[fix.fixture?.id ?? fix.id] || null}
          />
        ))}
      </div>
    </div>
  );
}
