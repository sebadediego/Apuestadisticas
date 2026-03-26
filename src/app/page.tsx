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

  // Fetch odds for today
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};
  try {
    const oddsRaw = await getOdds({ date: today });
    const oddsRes = oddsRaw.response || [];
    if (Array.isArray(oddsRes)) {
      for (const item of oddsRes) {
        const fixtureId = item.fixture?.id;
        if (!fixtureId) continue;
        const bookmakers = item.bookmakers || [];
        for (const bk of bookmakers) {
          const market = bk.bets?.find((b: any) => b.id === 1 || b.name === 'Match Winner');
          if (market) {
            const values = market.values || [];
            oddsMap[fixtureId] = {
              home: values.find((v: any) => v.value === 'Home')?.odd || null,
              draw: values.find((v: any) => v.value === 'Draw')?.odd || null,
              away: values.find((v: any) => v.value === 'Away')?.odd || null,
            };
            break;
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching odds:', e);
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
