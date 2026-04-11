// src/lib/country-groups.ts
// Organización de ligas por país estilo 365Scores
// Prioridad: mejores ligas primero, agrupadas por país

import { translateCountry } from './country-names';

// Países prioritarios en orden. Cada uno con max ligas a mostrar abierto.
// 3 para países top, 2 para el resto
export const PRIORITY_COUNTRIES: { country: string; maxLeagues: number; flag?: string }[] = [
  // Sudamérica primero (público argentino)
  { country: 'Argentina', maxLeagues: 3, flag: '🇦🇷' },
  { country: 'Brazil', maxLeagues: 2, flag: '🇧🇷' },
  { country: 'Colombia', maxLeagues: 2, flag: '🇨🇴' },
  { country: 'Uruguay', maxLeagues: 2, flag: '🇺🇾' },
  { country: 'Mexico', maxLeagues: 2, flag: '🇲🇽' },
  // Top 5 europeas
  { country: 'England', maxLeagues: 3, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { country: 'Spain', maxLeagues: 3, flag: '🇪🇸' },
  { country: 'Italy', maxLeagues: 3, flag: '🇮🇹' },
  { country: 'Germany', maxLeagues: 3, flag: '🇩🇪' },
  { country: 'France', maxLeagues: 3, flag: '🇫🇷' },
  // Otras europeas relevantes
  { country: 'Portugal', maxLeagues: 2, flag: '🇵🇹' },
  { country: 'Netherlands', maxLeagues: 2, flag: '🇳🇱' },
  { country: 'Belgium', maxLeagues: 2, flag: '🇧🇪' },
  { country: 'Turkey', maxLeagues: 2, flag: '🇹🇷' },
  { country: 'Scotland', maxLeagues: 2, flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { country: 'Greece', maxLeagues: 2, flag: '🇬🇷' },
];

// "World" es especial — competiciones internacionales se muestran como grupo propio
export const INTERNATIONAL_COUNTRY = 'World';

export interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

export interface CountryGroup {
  country: string;        // nombre EN original (key)
  countryEs: string;      // nombre ES traducido
  flag: string;
  leagues: LeagueData[];
  isPriority: boolean;
  maxLeagues: number;
}

/**
 * Agrupa ligas por país, respetando prioridades.
 * Retorna: [internacionales, prioritarios, resto]
 */
export function groupLeaguesByCountry(leagues: LeagueData[]): {
  international: LeagueData[];
  priorityGroups: CountryGroup[];
  otherGroups: CountryGroup[];
} {
  // Separar internacionales
  const international = leagues.filter(l => (l.league?.country || '') === INTERNATIONAL_COUNTRY);
  const domestic = leagues.filter(l => (l.league?.country || '') !== INTERNATIONAL_COUNTRY);

  // Agrupar por país
  const byCountry: Record<string, LeagueData[]> = {};
  for (const l of domestic) {
    const c = l.league?.country || 'Otro';
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(l);
  }

  // Separar priority vs otros
  const priorityMap = new Map(PRIORITY_COUNTRIES.map(p => [p.country, p]));
  const priorityGroups: CountryGroup[] = [];
  const otherGroups: CountryGroup[] = [];

  // Primero los prioritarios en orden
  for (const pc of PRIORITY_COUNTRIES) {
    const countryLeagues = byCountry[pc.country];
    if (!countryLeagues || countryLeagues.length === 0) continue;
    priorityGroups.push({
      country: pc.country,
      countryEs: translateCountry(pc.country),
      flag: pc.flag || '',
      leagues: countryLeagues,
      isPriority: true,
      maxLeagues: pc.maxLeagues,
    });
    delete byCountry[pc.country];
  }

  // Luego el resto, alfabéticamente por nombre traducido
  const remaining = Object.entries(byCountry).sort(([a], [b]) =>
    translateCountry(a).localeCompare(translateCountry(b))
  );
  for (const [country, countryLeagues] of remaining) {
    otherGroups.push({
      country,
      countryEs: translateCountry(country),
      flag: '',
      leagues: countryLeagues,
      isPriority: false,
      maxLeagues: 2,
    });
  }

  return { international, priorityGroups, otherGroups };
}
