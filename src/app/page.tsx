import { getFixtures, getOdds, TOP_LEAGUE_IDS } from '@/lib/api-football';
import HomeClient from './HomeClient';

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

export default async function HomePage() {
  const today = getTodayDate();

  let fixtures: any[] = [];
  try {
    const res = await getFixtures({ date: today });
    fixtures = res.response || [];
  } catch (e) {
    console.error('Error fetching fixtures:', e);
  }

  // Group fixtures by league
  const grouped: Record<number, { league: any; fixtures: any[] }> = {};
  for (const fix of fixtures) {
    const leagueId = fix.league?.id;
    if (!leagueId) continue;
    if (!grouped[leagueId]) {
      grouped[leagueId] = { league: fix.league, fixtures: [] };
    }
    grouped[leagueId].fixtures.push(fix);
  }

  // Sort: TOP_LEAGUES first, then alphabetically
  const sortedLeagues = Object.entries(grouped).sort(([aId], [bId]) => {
    const aTop = TOP_LEAGUE_IDS.indexOf(Number(aId));
    const bTop = TOP_LEAGUE_IDS.indexOf(Number(bId));
    if (aTop !== -1 && bTop !== -1) return aTop - bTop;
    if (aTop !== -1) return -1;
    if (bTop !== -1) return 1;
    return (grouped[Number(aId)].league?.name || '').localeCompare(
      grouped[Number(bId)].league?.name || ''
    );
  });

  // Fetch odds per fixture for all NS matches (paid plan supports this)
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};

  // Get all NS fixture IDs
  const nsFixtures = fixtures.filter((f: any) => f.fixture?.status?.short === 'NS');

  // Fetch odds in parallel batches of 5
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

  return (
    <HomeClient
      leagues={sortedLeagues.map(([id, data]) => ({
        id: Number(id),
        ...data,
      }))}
      oddsMap={oddsMap}
      topLeagueIds={TOP_LEAGUE_IDS}
    />
  );
}
