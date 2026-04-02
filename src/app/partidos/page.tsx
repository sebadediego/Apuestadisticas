import { getFixtures, getOdds, TOP_LEAGUE_IDS } from '@/lib/api-football';
import PartidosClient from './PartidosClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function PartidosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || getTodayDate();

  // Always fetch ALL fixtures for the date (no league filter — that's done client-side)
  let fixtures: any[] = [];
  try {
    const res = await getFixtures({ date });
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

  // Sort: top leagues first
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

  // Fetch odds in parallel for NS fixtures (batches of 10 for speed)
  let oddsMap: Record<number, { home: string | null; draw: string | null; away: string | null }> = {};
  const nsFixtures = fixtures.filter((f: any) => f.fixture?.status?.short === 'NS');
  const batchSize = 10;
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

  // Build available leagues list
  const availableLeagues = sortedLeagues.map(l => ({
    id: l.id,
    name: l.league?.name || '',
  }));

  return (
    <PartidosClient
      leagues={sortedLeagues}
      oddsMap={oddsMap}
      availableLeagues={availableLeagues}
      currentDate={date}
    />
  );
}
