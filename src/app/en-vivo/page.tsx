import { getFixtures, getOdds } from '@/lib/api-football';
import EnVivoClient from './EnVivoClient';

export const revalidate = 30;

export default async function EnVivoPage() {
  let fixtures: any[] = [];
  try {
    const res = await getFixtures({ live: 'all' });
    fixtures = res.response || [];
  } catch (e) {
    console.error('Error fetching live fixtures:', e);
  }

  // Fetch odds for each live match (parallel, batches of 5)
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};
  const batchSize = 5;
  for (let i = 0; i < fixtures.length; i += batchSize) {
    const batch = fixtures.slice(i, i + batchSize);
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

  const leagues = Object.entries(grouped).map(([id, data]) => ({
    id: Number(id),
    ...data,
  }));

  return <EnVivoClient leagues={leagues} oddsMap={oddsMap} />;
}
