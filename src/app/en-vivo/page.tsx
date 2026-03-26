import { getFixtures } from '@/lib/api-football';
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

  return <EnVivoClient leagues={leagues} />;
}
