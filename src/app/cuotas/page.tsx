import { getFixtures, getOdds, getPredictions, TOP_LEAGUE_IDS } from '@/lib/api-football';
import ApuestasClient from './ApuestasClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export default async function ApuestasDiaPage() {
  const today = getTodayDate();

  let fixtures: any[] = [];
  try {
    const res = await getFixtures({ date: today });
    fixtures = res.response || [];
  } catch (e) {
    console.error('Error fetching fixtures:', e);
  }

  // Filter: NS only, top leagues only, max 5
  const upcoming = fixtures
    .filter((f: any) => {
      const status = f.fixture?.status?.short;
      const leagueId = f.league?.id;
      return status === 'NS' && TOP_LEAGUE_IDS.includes(leagueId);
    })
    .sort((a: any, b: any) => {
      const aIdx = TOP_LEAGUE_IDS.indexOf(a.league?.id);
      const bIdx = TOP_LEAGUE_IDS.indexOf(b.league?.id);
      return aIdx - bIdx;
    })
    .slice(0, 5);

  // Fetch odds + predictions for each fixture
  const enriched: any[] = [];
  for (const fix of upcoming) {
    const fid = fix.fixture?.id;
    if (!fid) continue;

    let odds1x2: any = null;
    let oddsOU: any = null;
    let oddsBTTS: any = null;
    let prediction: any = null;

    try {
      const oddsRes = await getOdds({ fixture: fid });
      const oddsArr = oddsRes.response || [];
      if (oddsArr.length > 0) {
        const bk = oddsArr[0]?.bookmakers?.[0];
        if (bk) {
          const bets = bk.bets || [];
          const mw = bets.find((b: any) => b.name === 'Match Winner' || b.id === 1);
          if (mw) {
            odds1x2 = {
              home: mw.values?.find((v: any) => v.value === 'Home')?.odd || null,
              draw: mw.values?.find((v: any) => v.value === 'Draw')?.odd || null,
              away: mw.values?.find((v: any) => v.value === 'Away')?.odd || null,
            };
          }
          const ou = bets.find((b: any) => b.name === 'Goals Over/Under' || b.id === 5);
          if (ou) {
            const over25 = ou.values?.find((v: any) => v.value === 'Over 2.5');
            const under25 = ou.values?.find((v: any) => v.value === 'Under 2.5');
            oddsOU = { over: over25?.odd || null, under: under25?.odd || null };
          }
          const btts = bets.find((b: any) => b.name === 'Both Teams Score' || b.id === 8);
          if (btts) {
            oddsBTTS = {
              yes: btts.values?.find((v: any) => v.value === 'Yes')?.odd || null,
              no: btts.values?.find((v: any) => v.value === 'No')?.odd || null,
            };
          }
        }
      }
    } catch {}

    try {
      const predRes = await getPredictions(fid);
      const p = predRes.response?.[0];
      if (p?.predictions?.winner?.name) {
        prediction = {
          winner: p.predictions.winner.name,
          advice: p.predictions.advice || null,
        };
      }
    } catch {}

    enriched.push({
      fixture: fix,
      odds1x2,
      oddsOU,
      oddsBTTS,
      prediction,
    });
  }

  return <ApuestasClient matches={enriched} />;
}
