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

  // Sort: TOP_LEAGUES first (in order), then alphabetically
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

  // Fetch odds — Strategy: try by date first, then fill gaps with individual fixture requests
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};

  // Step 1: Try batch by date
  try {
    const oddsRaw = await getOdds({ date: today });
    const oddsRes = oddsRaw.response || [];
    if (Array.isArray(oddsRes)) {
      for (const item of oddsRes) {
        const fixtureId = item.fixture?.id;
        if (!fixtureId) continue;
        for (const bk of (item.bookmakers || [])) {
          const market = bk.bets?.find((b: any) => b.id === 1 || b.name === 'Match Winner');
          if (market) {
            oddsMap[fixtureId] = {
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

  // Step 2: For top league fixtures without odds, fetch individually (max 8 requests)
  const topFixturesWithoutOdds = fixtures
    .filter((f: any) => {
      const fid = f.fixture?.id;
      const lid = f.league?.id;
      const status = f.fixture?.status?.short;
      return fid && TOP_LEAGUE_IDS.includes(lid) && !oddsMap[fid] && status === 'NS';
    })
    .slice(0, 8);

  for (const fix of topFixturesWithoutOdds) {
    const fid = fix.fixture?.id;
    try {
      const oddsRaw = await getOdds({ fixture: fid });
      const oddsArr = oddsRaw.response || [];
      if (oddsArr.length > 0) {
        const bk = oddsArr[0]?.bookmakers?.[0];
        if (bk) {
          const market = bk.bets?.find((b: any) => b.id === 1 || b.name === 'Match Winner');
          if (market) {
            oddsMap[fid] = {
              home: market.values?.find((v: any) => v.value === 'Home')?.odd || null,
              draw: market.values?.find((v: any) => v.value === 'Draw')?.odd || null,
              away: market.values?.find((v: any) => v.value === 'Away')?.odd || null,
            };
          }
        }
      }
    } catch {}
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
