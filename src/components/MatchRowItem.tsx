'use client';

import Link from 'next/link';

const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';

interface Odds {
  home: string | null;
  draw: string | null;
  away: string | null;
}

interface MatchRowProps {
  fixture: {
    id: number;
    date: string;
    status: {
      short: string;
      elapsed: number | null;
    };
    homeTeam: {
      id: number;
      name: string;
      logo: string;
    };
    awayTeam: {
      id: number;
      name: string;
      logo: string;
    };
    goals: {
      home: number | null;
      away: number | null;
    };
  };
  odds?: Odds | null;
}

function getStatusDisplay(status: { short: string; elapsed: number | null }) {
  const s = status.short;
  if (s === 'NS') {
    return { text: '', isLive: false, isFt: false };
  }
  if (['1H', '2H', 'ET'].includes(s)) {
    return { text: `${status.elapsed}'`, isLive: true, isFt: false };
  }
  if (s === 'HT') {
    return { text: 'HT', isLive: true, isFt: false };
  }
  if (['FT', 'AET', 'PEN'].includes(s)) {
    return { text: s, isLive: false, isFt: true };
  }
  return { text: s, isLive: false, isFt: false };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function MatchRowItem({ fixture, odds }: MatchRowProps) {
  const { text: statusText, isLive, isFt } = getStatusDisplay(fixture.status);
  const hasScore = fixture.goals.home !== null;
  const homeWins = hasScore && fixture.goals.home! > fixture.goals.away!;
  const awayWins = hasScore && fixture.goals.away! > fixture.goals.home!;

  const timeDisplay = fixture.status.short === 'NS' ? formatTime(fixture.date) : statusText;

  return (
    <Link href={`/partidos/${fixture.id}`} className={`match-row ${isLive ? 'is-live' : ''}`}>
      {/* Time / Status */}
      <div className="match-time">
        <span className={`match-time-text ${isLive ? 'live' : ''} ${isFt ? 'ft' : ''}`}>
          {timeDisplay}
        </span>
      </div>

      {/* Teams */}
      <div className="match-teams">
        <div className="match-team-line">
          <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="match-team-logo" />
          <span className={`match-team-name ${awayWins ? 'loser' : ''}`}>{fixture.homeTeam.name}</span>
          {hasScore && (
            <span className={`match-score ${awayWins ? 'loser' : ''}`}>{fixture.goals.home}</span>
          )}
        </div>
        <div className="match-team-line">
          <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="match-team-logo" />
          <span className={`match-team-name ${homeWins ? 'loser' : ''}`}>{fixture.awayTeam.name}</span>
          {hasScore && (
            <span className={`match-score ${homeWins ? 'loser' : ''}`}>{fixture.goals.away}</span>
          )}
        </div>
      </div>

      {/* Odds inline — neutral 365Scores style pills */}
      {odds?.home && !isFt && (
        <div className="match-odds">
          <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="odd-pill-neutral" onClick={(e) => e.stopPropagation()}>
            <span className="odd-pill-label">1</span>
            <span className="odd-pill-value-neutral">{odds.home}</span>
          </a>
          <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="odd-pill-neutral" onClick={(e) => e.stopPropagation()}>
            <span className="odd-pill-label">X</span>
            <span className="odd-pill-value-neutral">{odds.draw || '—'}</span>
          </a>
          <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer" className="odd-pill-neutral" onClick={(e) => e.stopPropagation()}>
            <span className="odd-pill-label">2</span>
            <span className="odd-pill-value-neutral">{odds.away || '—'}</span>
          </a>
        </div>
      )}
    </Link>
  );
}
