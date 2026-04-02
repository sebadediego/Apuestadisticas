// src/lib/league-filter.ts
// Filtro inteligente de ligas — client-side
// Muestra ligas relevantes para apuestas, oculta juveniles/3ras divisiones menores

import { TOP_LEAGUE_IDS } from './api-football';

// =========================================================
// IDs que SIEMPRE se muestran (prioridad máxima)
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
  /\bU18\b/, /\bU19\b/, /\bU20\b/, /\bU21\b/, /\bU23\b/,
  /\bUnder\s*1[89]\b/i, /\bUnder\s*2[013]\b/i,
  /\bJunior\b/i, /\bJuvenil/i, /\bYouth\b/i,
  /\bReserva\b/i, /\bReserve\b/i,
  /\bWomen\b/i, /\bFemenin/i, /\bFeminine\b/i, /\bDames\b/i,
  /\bAmateur\b/i,
];

// =========================================================
// Patrones de nombre que indican 3ra división o inferior
// =========================================================
const LOWER_DIVISION_PATTERNS = [
  /\b3rd\s+Division\b/i, /\bThird\s+Division\b/i, /\bTercera\s+Division\b/i,
  /\b4th\b/i, /\bFourth\b/i, /\bCuarta\b/i,
  /\b5th\b/i,
  /\bPrimera\s+C\b/, /\bPrimera\s+D\b/,
  /\bSerie\s+C\b/, /\bSerie\s+D\b/,
  /\bDivision\s+4\b/i,
];

// =========================================================
// Países cuyas ligas domésticas se ocultan salvo que
// estén en ALWAYS_SHOW_IDS. Solo los realmente irrelevantes.
// =========================================================
const EXCLUDED_COUNTRIES = new Set([
  'Iraq', 'Kenya', 'Tanzania', 'Uganda', 'Ethiopia', 'Bahrain',
  'Syria', 'Lebanon', 'Palestine', 'Libya', 'Sudan', 'Yemen',
  'Myanmar', 'Cambodia', 'Laos', 'Bangladesh', 'Nepal',
  'Sri Lanka', 'Maldives', 'Bhutan', 'Mongolia',
  'Turkmenistan', 'Tajikistan', 'Kyrgyzstan',
  'Gibraltar', 'Andorra', 'San Marino', 'Liechtenstein',
  'Faroe Islands',
  'Nicaragua', 'Haiti', 'Bermuda', 'Barbados',
  'Guyana', 'Suriname', 'Cuba', 'Puerto Rico',
  'Burundi', 'Rwanda', 'Mozambique', 'Botswana', 'Namibia',
  'Congo', 'Congo DR', 'Zambia', 'Zimbabwe',
]);

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

    // 3. Si parece una 3ra+ división → OCULTAR
    if (LOWER_DIVISION_PATTERNS.some((pat) => pat.test(leagueName))) return false;

    // 4. Si es una liga de un país claramente irrelevante → OCULTAR
    if (EXCLUDED_COUNTRIES.has(country)) return false;

    // 5. Default: MOSTRAR
    return true;
  });
}
