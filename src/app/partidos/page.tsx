import { getFixtures, getOdds, TOP_LEAGUES } from '@/lib/api-football';
import PartidosClient from './PartidosClient';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// BUG 1 FIX: searchParams is a Promise in Next.js 14.2+
interface PageProps {
  searchParams: Promise<{ league?: string; date?: string }>;
}

export default async function PartidosPage({ searchParams }: PageProps) {
  // BUG 1 FIX: AWAIT searchParams
  const params = await searchParams;

  const date = params.date || getTodayDate();

  // BUG 1 FIX: Parse league as number and validate
  const leagueParam = params.league;
  const leagueId = leagueParam ? parseInt(leagueParam, 10) : undefined;
  const validLeagueId = leagueId && !isNaN(leagueId) ? leagueId : undefined;

  let fixtures: any[] = [];
  try {
    const fetchParams: any = { date };
    if (validLeagueId) {
      fetchParams.league = validLeagueId;
      // API-Football requires season when filtering by league
      const now = new Date();
      fetchParams.season = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    }
    const res = await getFixtures(fetchParams);
    fixtures = res.response || [];
  } catch (e) {
    console.error('Error fetching fixtures:', e);
  }

  // Group by league
  const grouped: Record<number, { league: any; fixtures: any[] }> = {};
  for (const fix of fixtures) {
    const lid = fix.league?.id;
    if (!lid) continue;
    if (!grouped[lid]) {
      grouped[lid] = { league: fix.league, fixtures: [] };
    }
    grouped[lid].fixtures.push(fix);
  }

  const sortedLeagues = Object.entries(grouped)
    .sort(([, a], [, b]) =>
      (a.league?.name || '').localeCompare(b.league?.name || '')
    )
    .map(([id, data]) => ({ id: Number(id), ...data }));

  // Fetch odds — batch by date + individual fallback for top leagues
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};
  try {
    const oddsRaw = await getOdds({ date });
    const oddsRes = oddsRaw.response || [];
    if (Array.isArray(oddsRes)) {
      for (const item of oddsRes) {
        const fid = item.fixture?.id;
        if (!fid) continue;
        for (const bk of (item.bookmakers || [])) {
          const market = bk.bets?.find((b: any) => b.id === 1 || b.name === 'Match Winner');
          if (market) {
            oddsMap[fid] = {
              home: market.values?.find((v: any) => v.value === 'Home')?.odd || null,
              draw: market.values?.find((v: any) => v.value === 'Draw')?.odd || null,
              away: market.values?.find((v: any) => v.value === 'Away')?.odd || null,
            };
            break;
          }
        }
      }
    }
  } catch {}

  // Individual odds for NS fixtures in top leagues that don't have odds yet
  const { TOP_LEAGUE_IDS } = await import('@/lib/api-football');
  const missingOddsFixtures = fixtures
    .filter((f: any) => {
      const fid = f.fixture?.id;
      const lid = f.league?.id;
      return fid && TOP_LEAGUE_IDS.includes(lid) && !oddsMap[fid] && f.fixture?.status?.short === 'NS';
    })
    .slice(0, 6);

  for (const fix of missingOddsFixtures) {
    try {
      const o = await getOdds({ fixture: fix.fixture.id });
      const arr = o.response || [];
      if (arr.length > 0) {
        const bk = arr[0]?.bookmakers?.[0];
        const market = bk?.bets?.find((b: any) => b.id === 1 || b.name === 'Match Winner');
        if (market) {
          oddsMap[fix.fixture.id] = {
            home: market.values?.find((v: any) => v.value === 'Home')?.odd || null,
            draw: market.values?.find((v: any) => v.value === 'Draw')?.odd || null,
            away: market.values?.find((v: any) => v.value === 'Away')?.odd || null,
          };
        }
      }
    } catch {}
  }

  return (
    <PartidosClient
      leagues={sortedLeagues}
      oddsMap={oddsMap}
      topLeagues={TOP_LEAGUES}
      currentDate={date}
      currentLeague={validLeagueId || null}
    />
  );
}
