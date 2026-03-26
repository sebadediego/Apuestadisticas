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
      short: string; // "NS" | "1H" | "2H" | "HT" | "FT" | "PEN" | etc.
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
    <Link href={`/partidos/${fixture.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className={`match-row ${isLive ? 'is-live' : ''}`}>
        {/* Time / Status */}
        <div className="match-time">
          <div className={`match-time-text ${isLive ? 'live' : ''} ${isFt ? 'ft' : ''}`}>
            {timeDisplay}
          </div>
        </div>

        {/* Teams */}
        <div className="match-teams">
          <div className="match-team-line">
            <img
              src={fixture.homeTeam.logo}
              alt={fixture.homeTeam.name}
              className="match-team-logo"
              loading="lazy"
            />
            <span className={`match-team-name ${isFt && awayWins ? 'loser' : ''}`}>
              {fixture.homeTeam.name}
            </span>
            {hasScore && (
              <span className={`match-score ${isFt && awayWins ? 'loser' : ''}`}>
                {fixture.goals.home}
              </span>
            )}
          </div>
          <div className="match-team-line">
            <img
              src={fixture.awayTeam.logo}
              alt={fixture.awayTeam.name}
              className="match-team-logo"
              loading="lazy"
            />
            <span className={`match-team-name ${isFt && homeWins ? 'loser' : ''}`}>
              {fixture.awayTeam.name}
            </span>
            {hasScore && (
              <span className={`match-score ${isFt && homeWins ? 'loser' : ''}`}>
                {fixture.goals.away}
              </span>
            )}
          </div>
        </div>

        {/* Odds inline */}
        <div className="match-odds">
          <a
            href={AFFILIATE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="odd-pill"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="odd-pill-label">1</span>
            <span className={`odd-pill-value ${!odds?.home ? 'empty' : ''}`}>
              {odds?.home || '—'}
            </span>
          </a>
          <a
            href={AFFILIATE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="odd-pill"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="odd-pill-label">X</span>
            <span className={`odd-pill-value ${!odds?.draw ? 'empty' : ''}`}>
              {odds?.draw || '—'}
            </span>
          </a>
          <a
            href={AFFILIATE_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="odd-pill"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="odd-pill-label">2</span>
            <span className={`odd-pill-value ${!odds?.away ? 'empty' : ''}`}>
              {odds?.away || '—'}
            </span>
          </a>
        </div>
      </div>
    </Link>
  );
}
