import { getFixtures, getOdds, TOP_LEAGUES, TOP_LEAGUE_IDS } from '@/lib/api-football';
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
    .sort(([aId], [bId]) => {
      const aTop = TOP_LEAGUE_IDS.indexOf(Number(aId));
      const bTop = TOP_LEAGUE_IDS.indexOf(Number(bId));
      if (aTop !== -1 && bTop !== -1) return aTop - bTop;
      if (aTop !== -1) return -1;
      if (bTop !== -1) return 1;
      return (grouped[Number(aId)].league?.name || '').localeCompare(
        grouped[Number(bId)].league?.name || ''
      );
    })
    .map(([id, data]) => ({ id: Number(id), ...data }));

  // Fetch odds per fixture for all NS matches (paid plan)
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};
  const nsFixtures = fixtures.filter((f: any) => f.fixture?.status?.short === 'NS');
  const batchSize = 5;
  for (let i = 0; i < nsFixtures.length; i += batchSize) {
    const batch = nsFixtures.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((fix: any) => getOdds({ fixture: fix.fixture.id }))
    );
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status !== 'fulfilled') continue;
      const oddsArr = result.value.response || [];
      if (oddsArr.length === 0) continue;
      const fid = batch[j].fixture.id;
      for (const bk of (oddsArr[0]?.bookmakers || [])) {
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

  // Build available leagues list from actual fixtures (for dynamic filter)
  const availableLeagues = sortedLeagues.map(l => ({
    id: l.id,
    name: l.league?.name || '',
    country: l.league?.country || '',
  }));

  return (
    <PartidosClient
      leagues={sortedLeagues}
      oddsMap={oddsMap}
      availableLeagues={availableLeagues}
      currentDate={date}
      currentLeague={validLeagueId || null}
    />
  );
}
