import Link from 'next/link';
import { FIXTURE_STATUS } from '@/lib/api-football';
import { S, C, fonts } from '@/lib/styles';

interface MatchCardProps { fixture: any; showLeague?: boolean; compact?: boolean; }

export default function MatchCard({ fixture, showLeague = true, compact = false }: MatchCardProps) {
  const f = fixture.fixture;
  const teams = fixture.teams;
  const goals = fixture.goals;
  const league = fixture.league;
  const st = FIXTURE_STATUS[f?.status?.short] || { label: f?.status?.long || '?', live: false };
  const time = f?.date ? new Date(f.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : '?';
  const isLive = st.live;
  const isFinished = ['FT', 'AET', 'PEN'].includes(f?.status?.short);
  const baseStyle = compact ? S.matchRow : S.matchCard;
  const liveExtra = isLive ? (compact ? S.matchRowLive : S.matchCardLive) : {};

  return (
    <Link href={`/partidos/${f?.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div style={{ ...baseStyle, ...liveExtra }}>
        <div style={S.team}>
          {teams?.home?.logo && <img src={teams.home.logo} alt="" style={S.teamLogo} />}
          <span style={{ ...S.teamName, color: teams?.home?.winner ? C.textPrimary : C.textSecondary }}>
            {teams?.home?.name || 'Local'}
          </span>
        </div>

        <div style={{ textAlign: 'center', minWidth: 64 } as any}>
          {isLive || isFinished ? (
            <>
              <div style={{ fontFamily: fonts.mono, fontSize: compact ? '1rem' : '1.25rem', fontWeight: 700, color: isLive ? C.textPrimary : C.textSecondary, letterSpacing: '0.05em' }}>
                {goals?.home ?? 0} - {goals?.away ?? 0}
              </div>
              <div style={{ marginTop: 2 }}>
                {isLive ? (
                  <span style={S.badgeLive}>
                    <span className="live-pulse" style={{ width: 6, height: 6, marginRight: 4, display: 'inline-block' }} />
                    {f?.status?.elapsed ? `${f.status.elapsed}'` : st.label}
                  </span>
                ) : (
                  <span style={S.badgeFinished}>{st.label}</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: fonts.mono, fontSize: '0.9375rem', fontWeight: 600, color: C.cyan }}>{time}</div>
              <span style={S.badgeScheduled}>{st.label}</span>
            </>
          )}
        </div>

        <div style={{ ...S.team, ...S.teamAway }}>
          <span style={{ ...S.teamName, color: teams?.away?.winner ? C.textPrimary : C.textSecondary, textAlign: 'right' as const }}>
            {teams?.away?.name || 'Visitante'}
          </span>
          {teams?.away?.logo && <img src={teams.away.logo} alt="" style={S.teamLogo} />}
        </div>
      </div>

      {showLeague && league && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 24px 0', marginTop: -8 }}>
          {league.logo && <img src={league.logo} alt="" style={{ width: 12, height: 12 }} />}
          <span style={{ fontSize: '0.6875rem', color: C.textFaint }}>{league.name} • {league.country}</span>
        </div>
      )}
    </Link>
  );
}