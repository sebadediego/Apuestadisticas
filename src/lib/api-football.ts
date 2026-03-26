// src/lib/api-football.ts
// Core library for API-Football (API-Sports) integration

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const API_HOST = process.env.API_FOOTBALL_HOST || 'v3.football.api-sports.io';
const BASE_URL = `https://${API_HOST}`;

interface ApiResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[];
  results: number;
  paging: { current: number; total: number };
  response: T;
}

async function fetchApi<T>(endpoint: string, params?: Record<string, string | number>): Promise<ApiResponse<T>> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': API_KEY,
      'x-apisports-host': API_HOST,
    },
    next: { revalidate: 120 },
  });

  if (!res.ok) {
    throw new Error(`API-Football error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ==================== COUNTRIES ====================
export async function getCountries() {
  return fetchApi<any[]>('/countries');
}

// ==================== SEASONS ====================
export async function getSeasons() {
  return fetchApi<number[]>('/leagues/seasons');
}

// ==================== LEAGUES ====================
export async function getLeagues(params?: { id?: number; country?: string; season?: number; current?: string }) {
  return fetchApi<any[]>('/leagues', params as any);
}

// ==================== STANDINGS ====================
export async function getStandings(params: { league: number; season: number }) {
  return fetchApi<any[]>('/standings', params as any);
}

// ==================== TEAMS ====================
export async function getTeams(params?: { id?: number; league?: number; season?: number; country?: string }) {
  return fetchApi<any[]>('/teams', params as any);
}

export async function getTeamStatistics(params: { team: number; league: number; season: number }) {
  return fetchApi<any>('/teams/statistics', params as any);
}

// ==================== FIXTURES ====================
export async function getFixtures(params?: {
  id?: number; live?: string; date?: string; league?: number;
  season?: number; team?: number; from?: string; to?: string;
  status?: string; timezone?: string;
}) {
  return fetchApi<any[]>('/fixtures', { timezone: 'America/Argentina/Buenos_Aires', ...params } as any);
}

export async function getFixturesToday() {
  const today = new Date().toISOString().split('T')[0];
  return getFixtures({ date: today });
}

export async function getLiveFixtures() {
  return fetchApi<any[]>('/fixtures', { live: 'all', timezone: 'America/Argentina/Buenos_Aires' } as any);
}

// ==================== HEAD TO HEAD ====================
export async function getHeadToHead(params: { h2h: string; last?: number }) {
  return fetchApi<any[]>('/fixtures/headtohead', params as any);
}

// ==================== EVENTS ====================
export async function getFixtureEvents(fixtureId: number) {
  return fetchApi<any[]>('/fixtures/events', { fixture: fixtureId } as any);
}

// ==================== LINEUPS ====================
export async function getFixtureLineups(fixtureId: number) {
  return fetchApi<any[]>('/fixtures/lineups', { fixture: fixtureId } as any);
}

// ==================== STATISTICS ====================
export async function getFixtureStatistics(fixtureId: number) {
  return fetchApi<any[]>('/fixtures/statistics', { fixture: fixtureId } as any);
}

// ==================== PLAYERS ====================
export async function getPlayers(params?: { id?: number; team?: number; league?: number; season?: number; page?: number }) {
  return fetchApi<any[]>('/players', params as any);
}

export async function getTopScorers(params: { league: number; season: number }) {
  return fetchApi<any[]>('/players/topscorers', params as any);
}

// ==================== TRANSFERS ====================
export async function getTransfers(params: { player?: number; team?: number }) {
  return fetchApi<any[]>('/transfers', params as any);
}

// ==================== TROPHIES ====================
export async function getTrophies(params: { player?: number; coach?: number }) {
  return fetchApi<any[]>('/trophies', params as any);
}

// ==================== INJURIES ====================
export async function getInjuries(params?: { league?: number; season?: number; fixture?: number; team?: number }) {
  return fetchApi<any[]>('/injuries', params as any);
}

// ==================== ODDS ====================
export async function getOdds(params?: { fixture?: number; league?: number; season?: number; bookmaker?: number; date?: string }) {
  return fetchApi<any[]>('/odds', params as any);
}

export async function getLiveOdds(params?: { fixture?: number }) {
  return fetchApi<any[]>('/odds/live', params as any);
}

// ==================== PREDICTIONS ====================
export async function getPredictions(fixtureId: number) {
  return fetchApi<any[]>('/predictions', { fixture: fixtureId } as any);
}

// ==================== HELPERS ====================
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getCurrentSeason(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

// Ligas y competiciones prioritarias — orden de importancia
export const TOP_LEAGUES = [
  // Ligas principales sudamericanas
  { id: 128, name: 'Liga Profesional Argentina', country: 'Argentina' },
  { id: 71, name: 'Brasileirao Serie A', country: 'Brazil' },
  { id: 239, name: 'Primera Division Uruguay', country: 'Uruguay' },
  { id: 262, name: 'Liga MX', country: 'Mexico' },
  { id: 239, name: 'Primera A Colombia', country: 'Colombia' },
  // Top 5 europeas
  { id: 39, name: 'Premier League', country: 'England' },
  { id: 140, name: 'La Liga', country: 'Spain' },
  { id: 135, name: 'Serie A', country: 'Italy' },
  { id: 61, name: 'Ligue 1', country: 'France' },
  { id: 78, name: 'Bundesliga', country: 'Germany' },
  // Otras ligas europeas importantes
  { id: 94, name: 'Primeira Liga', country: 'Portugal' },
  { id: 88, name: 'Eredivisie', country: 'Netherlands' },
  { id: 144, name: 'Jupiler Pro League', country: 'Belgium' },
  // Competiciones internacionales de clubes
  { id: 2, name: 'Champions League', country: 'World' },
  { id: 3, name: 'Europa League', country: 'World' },
  { id: 848, name: 'Conference League', country: 'World' },
  { id: 13, name: 'Copa Libertadores', country: 'World' },
  { id: 11, name: 'Copa Sudamericana', country: 'World' },
  // Copas nacionales
  { id: 130, name: 'Copa Argentina', country: 'Argentina' },
  { id: 73, name: 'Copa do Brasil', country: 'Brazil' },
  { id: 45, name: 'FA Cup', country: 'England' },
  { id: 143, name: 'Copa del Rey', country: 'Spain' },
  { id: 137, name: 'Coppa Italia', country: 'Italy' },
  { id: 65, name: 'Coupe de France', country: 'France' },
  { id: 81, name: 'DFB Pokal', country: 'Germany' },
  // Selecciones — eliminatorias y copas
  { id: 1, name: 'World Cup', country: 'World' },
  { id: 4, name: 'Euro Championship', country: 'World' },
  { id: 9, name: 'Copa America', country: 'World' },
  { id: 29, name: 'World Cup Qualifying South America', country: 'World' },
  { id: 32, name: 'World Cup Qualifying Europe', country: 'World' },
  { id: 30, name: 'World Cup Qualifying North America', country: 'World' },
  { id: 34, name: 'Friendlies', country: 'World' },
  { id: 10, name: 'Friendlies', country: 'World' },
];

export const TOP_LEAGUE_IDS = [...new Set(TOP_LEAGUES.map(l => l.id))];

// Status mapping for fixtures
export const FIXTURE_STATUS: Record<string, { label: string; color: string; live: boolean }> = {
  TBD: { label: 'Por definir', color: 'text-text-muted', live: false },
  NS: { label: 'No iniciado', color: 'text-text-secondary', live: false },
  '1H': { label: '1er Tiempo', color: 'text-accent-emerald', live: true },
  HT: { label: 'Entretiempo', color: 'text-accent-amber', live: true },
  '2H': { label: '2do Tiempo', color: 'text-accent-emerald', live: true },
  ET: { label: 'Tiempo Extra', color: 'text-accent-amber', live: true },
  BT: { label: 'Descanso TE', color: 'text-accent-amber', live: true },
  P: { label: 'Penales', color: 'text-accent-red', live: true },
  SUSP: { label: 'Suspendido', color: 'text-accent-red', live: false },
  INT: { label: 'Interrumpido', color: 'text-accent-red', live: false },
  FT: { label: 'Finalizado', color: 'text-text-muted', live: false },
  AET: { label: 'Final TE', color: 'text-text-muted', live: false },
  PEN: { label: 'Final Penales', color: 'text-text-muted', live: false },
  PST: { label: 'Pospuesto', color: 'text-accent-amber', live: false },
  CANC: { label: 'Cancelado', color: 'text-accent-red', live: false },
  ABD: { label: 'Abandonado', color: 'text-accent-red', live: false },
  AWD: { label: 'Otorgado', color: 'text-text-muted', live: false },
  WO: { label: 'Walkover', color: 'text-text-muted', live: false },
  LIVE: { label: 'En Vivo', color: 'text-accent-emerald', live: true },
};
