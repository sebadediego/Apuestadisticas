// src/lib/league-filter.ts
// Filtro inteligente de ligas — client-side
// Muestra ligas relevantes para apuestas, oculta juveniles/3ras divisiones menores

import { TOP_LEAGUE_IDS } from './api-football';

// =========================================================
// IDs adicionales que SIEMPRE se muestran (2das divisiones
// de las 5 grandes, ligas sudamericanas relevantes, etc.)
// =========================================================
const ALWAYS_SHOW_IDS = new Set([
  ...TOP_LEAGUE_IDS,
  // 2das divisiones europeas
  40,   // Championship (England)
  141,  // La Liga 2 (Spain)
  136,  // Serie B (Italy)
  62,   // Ligue 2 (France)
  79,   // Bundesliga 2 (Germany)
  // Argentina divisiones
  131,  // Primera Nacional
  132,  // Primera B Metropolitana
  129,  // Copa de la Liga Profesional
  // Brasil
  72,   // Brasileirão Serie B
  // Colombia
  239,  // Already included but for clarity
  240,  // Primera B Colombia
  // Uruguay
  268,  // Segunda División Uruguay
  // México
  263,  // Liga de Expansión MX
  // Copas nacionales extra
  46,   // EFL Cup (England)
  556,  // Super Cup (Spain)
  547,  // Super Cup (Italy)
  529,  // Super Cup (Germany)
  526,  // Super Cup (France)
  // Eliminatorias extra
  31,   // WC Qualifying Africa
  33,   // WC Qualifying Asia
  // Internacional
  15,   // FIFA Club World Cup
  480,  // Recopa Sudamericana
  5,    // UEFA Nations League
]);

// =========================================================
// Palabras clave en el NOMBRE de la liga que indican que
// se debe OCULTAR (juveniles, reserva, etc.)
// =========================================================
const EXCLUDE_NAME_PATTERNS = [
  /\bU18\b/i, /\bU19\b/i, /\bU20\b/i, /\bU21\b/i, /\bU23\b/i,
  /\bunder\s*1[89]\b/i, /\bunder\s*2[013]\b/i,
  /\bjunior/i, /\bjuvenil/i, /\byouth/i,
  /\breserva/i, /\breserve/i,
  /\bwomen/i, /\bfemenin/i, /\bfeminine/i, /\bdames\b/i,
];

// =========================================================
// Países cuyas ligas domésticas (no copas ni elim.) se
// ocultan salvo que estén en ALWAYS_SHOW_IDS
// =========================================================
const EXCLUDED_COUNTRIES = new Set([
  'Iraq', 'Kenya', 'Tanzania', 'Uganda', 'Ethiopia', 'Bahrain',
  'Jordan', 'Oman', 'Kuwait', 'Syria', 'Lebanon', 'Palestine',
  'Libya', 'Sudan', 'Yemen', 'Myanmar', 'Cambodia', 'Laos',
  'Bangladesh', 'Nepal', 'Sri Lanka', 'Maldives', 'Bhutan',
  'Mongolia', 'Turkmenistan', 'Tajikistan', 'Kyrgyzstan',
  'Uzbekistan', 'Azerbaijan', 'Georgia', 'Armenia', 'Malta',
  'Faroe Islands', 'Gibraltar', 'Andorra', 'San Marino',
  'Liechtenstein', 'Luxembourg', 'Kosovo', 'North Macedonia',
  'Moldova', 'Belarus', 'Estonia', 'Latvia', 'Lithuania',
  'Iceland', 'Northern Ireland', 'Wales', 'Republic of Ireland',
  'Finland', 'Norway', 'Sweden', 'Denmark',
  'Nicaragua', 'Honduras', 'El Salvador', 'Guatemala',
  'Panama', 'Costa Rica', 'Jamaica', 'Trinidad and Tobago',
  'Bolivia', 'Paraguay', 'Venezuela', 'Peru', 'Ecuador', 'Chile',
  'Iran', 'Saudi Arabia', 'UAE', 'Qatar', 'China', 'Japan',
  'South Korea', 'Australia', 'India', 'Thailand', 'Vietnam',
  'Indonesia', 'Malaysia', 'Singapore', 'Philippines',
  'South Africa', 'Nigeria', 'Ghana', 'Cameroon', 'Egypt',
  'Tunisia', 'Morocco', 'Algeria', 'Senegal', 'Ivory Coast',
  'Congo', 'Congo DR', 'Zambia', 'Zimbabwe', 'Mozambique',
  'Angola', 'Botswana', 'Namibia', 'Rwanda', 'Burundi',
  'Haiti', 'Dominican Republic', 'Cuba', 'Puerto Rico',
  'Bermuda', 'Barbados', 'Guyana', 'Suriname',
]);

// =========================================================
// Patrones de nombre que indican 3ra división o inferior
// =========================================================
const LOWER_DIVISION_PATTERNS = [
  /\b3rd\b/i, /\bthird\b/i, /\btercera\b/i,
  /\b4th\b/i, /\bfourth\b/i, /\bcuarta\b/i,
  /\b5th\b/i, /\bregional/i,
  /\bprimera\s+c\b/i, /\bprimera\s+d\b/i,
  /\bserie\s+c\b/i, /\bserie\s+d\b/i,
  /\bdivision\s+3\b/i, /\bdivision\s+4\b/i,
  /\bnational\s+league\b/i, // England's 5th tier
  /\b3\.\s*liga\b/i, // Germany 3. Liga — actually relevant, but edge case
];

// =========================================================
// Función principal de filtro
// =========================================================
export interface LeagueData {
  id: number;
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag?: string;
  };
  fixtures: any[];
}

/**
 * Filtra un array de ligas agrupadas, removiendo las irrelevantes.
 * Si `searchQuery` tiene valor, NO se aplica el filtro (el usuario
 * está buscando algo específico y debe poder encontrarlo).
 */
export function filterRelevantLeagues(
  leagues: LeagueData[],
  searchQuery?: string
): LeagueData[] {
  // Si el usuario está buscando, mostrar todo (ya se filtra por texto aparte)
  if (searchQuery && searchQuery.trim().length > 0) {
    return leagues;
  }

  return leagues.filter((l) => {
    const leagueId = l.id || l.league?.id;
    const leagueName = l.league?.name || '';
    const country = l.league?.country || '';

    // 1. Si está en la whitelist de IDs → MOSTRAR
    if (ALWAYS_SHOW_IDS.has(leagueId)) return true;

    // 2. Si el nombre tiene patrón juvenil/reserva/femenino → OCULTAR
    if (EXCLUDE_NAME_PATTERNS.some((pat) => pat.test(leagueName))) return false;

    // 3. Si es una liga de un país excluido → OCULTAR
    if (EXCLUDED_COUNTRIES.has(country)) return false;

    // 4. Si parece una 3ra+ división → OCULTAR
    if (LOWER_DIVISION_PATTERNS.some((pat) => pat.test(leagueName))) return false;

    // 5. Default: MOSTRAR (puede ser una liga que no conocemos pero es relevante)
    return true;
  });
}
