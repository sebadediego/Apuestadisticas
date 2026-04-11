'use client';

import { useState } from 'react';
import LeagueAccordion from './LeagueAccordion';
import type { CountryGroup } from '@/lib/country-groups';

interface CountrySectionProps {
  group: CountryGroup;
  oddsMap: Record<string, any>;
  defaultOpen?: boolean;
  topLeagueIds?: number[];
}

export default function CountrySection({
  group,
  oddsMap,
  defaultOpen = false,
  topLeagueIds = [],
}: CountrySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const totalMatches = group.leagues.reduce((sum, l) => sum + l.fixtures.length, 0);

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Country header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: isOpen ? '10px 10px 0 0' : 10,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {/* Flag */}
        {group.flag ? (
          <span style={{ fontSize: 20, lineHeight: 1 }}>{group.flag}</span>
        ) : (
          group.leagues[0]?.league?.flag && (
            <img
              src={group.leagues[0].league.flag}
              alt=""
              style={{ width: 22, height: 16, objectFit: 'cover', borderRadius: 2 }}
            />
          )
        )}

        {/* Country name */}
        <span style={{
          flex: 1,
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          color: 'var(--text-primary)',
          letterSpacing: '0.2px',
        }}>
          {group.countryEs}
        </span>

        {/* Match count */}
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600,
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '2px 8px',
          minWidth: 28, textAlign: 'center',
        }}>
          {totalMatches}
        </span>

        {/* Chevron */}
        <svg
          style={{
            width: 16, height: 16,
            color: 'var(--text-dim)',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {/* Leagues inside */}
      {isOpen && (
        <div style={{
          background: 'rgba(0,0,0,0.15)',
          border: '1px solid var(--border-subtle)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          padding: '6px 6px 2px',
        }}>
          {group.leagues.slice(0, group.maxLeagues).map((leagueData) => (
            <LeagueAccordion
              key={leagueData.id}
              league={leagueData.league}
              fixtures={leagueData.fixtures}
              oddsMap={oddsMap}
              defaultOpen={topLeagueIds.includes(leagueData.id)}
            />
          ))}
          {group.leagues.length > group.maxLeagues && (
            <div style={{
              textAlign: 'center', padding: '6px 0 8px',
              fontSize: 11, color: 'var(--text-dim)',
            }}>
              +{group.leagues.length - group.maxLeagues} liga{group.leagues.length - group.maxLeagues > 1 ? 's' : ''} más
            </div>
          )}
        </div>
      )}
    </div>
  );
}
