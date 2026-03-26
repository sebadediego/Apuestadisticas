# ⚽ Apuestadísticas

Plataforma profesional de análisis deportivo con datos reales, cuotas en vivo y asistente inteligente.

## 🚀 Setup Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
# Ya viene con .env.local pre-configurado con tu API key
# Para producción, configurar en tu hosting:
# API_FOOTBALL_KEY=tu_api_key
# API_FOOTBALL_HOST=v3.football.api-sports.io
# ANTHROPIC_API_KEY=tu_anthropic_key (opcional, para asistente IA avanzado)

# 3. Iniciar en modo desarrollo
npm run dev

# 4. Abrir http://localhost:3000
```

## 📁 Estructura del Proyecto

```
apuestadisticas/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── assistant/route.ts    # Backend del asistente IA
│   │   │   └── football/route.ts     # Proxy seguro a API-Football
│   │   ├── asistente/page.tsx        # Chat con asistente IA
│   │   ├── cuotas/page.tsx           # Cuotas 1X2, O/U, BTTS
│   │   ├── en-vivo/page.tsx          # Partidos en vivo (auto-refresh)
│   │   ├── equipos/
│   │   │   ├── [id]/page.tsx         # Detalle de equipo
│   │   │   └── page.tsx              # Búsqueda de equipos
│   │   ├── jugadores/page.tsx        # Top goleadores
│   │   ├── lesiones/page.tsx         # Jugadores lesionados
│   │   ├── partidos/
│   │   │   ├── [id]/page.tsx         # Detalle de partido (stats, H2H, odds)
│   │   │   └── page.tsx              # Partidos del día con filtros
│   │   ├── predicciones/page.tsx     # Predicciones con probabilidades
│   │   ├── globals.css               # Estilos globales premium
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Home
│   ├── components/
│   │   ├── LoadingSkeleton.tsx        # Skeleton loaders
│   │   ├── MatchCard.tsx             # Tarjeta de partido reutilizable
│   │   └── Navbar.tsx                # Navegación responsive
│   └── lib/
│       ├── api-football.ts           # Integración completa API-Football
│       └── data-processor.ts         # Procesamiento de datos para IA
├── .env.local                        # Variables de entorno
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 📡 Endpoints API-Football Implementados

| Endpoint | Función | Página |
|----------|---------|--------|
| /countries | getCountries() | Global |
| /leagues/seasons | getSeasons() | Global |
| /leagues | getLeagues() | Filtros |
| /standings | getStandings() | Equipos |
| /teams | getTeams() | Equipos |
| /teams/statistics | getTeamStatistics() | Detalle equipo |
| /fixtures | getFixtures() / getFixturesToday() | Partidos, Home |
| /fixtures (live) | getLiveFixtures() | En Vivo |
| /fixtures/headtohead | getHeadToHead() | Detalle partido |
| /fixtures/events | getFixtureEvents() | Detalle partido |
| /fixtures/lineups | getFixtureLineups() | Detalle partido |
| /fixtures/statistics | getFixtureStatistics() | Detalle partido |
| /players | getPlayers() | Equipo plantel |
| /players/topscorers | getTopScorers() | Jugadores |
| /transfers | getTransfers() | Jugadores |
| /trophies | getTrophies() | Jugadores |
| /injuries | getInjuries() | Lesiones |
| /odds | getOdds() | Cuotas, Detalle |
| /odds/live | getLiveOdds() | Cuotas |
| /predictions | getPredictions() | Predicciones, Detalle |

## 🤖 Asistente Inteligente

El asistente funciona en dos modos:

1. **Con Anthropic API Key** (recomendado): Usa Claude para análisis avanzado
2. **Sin API Key**: Genera análisis local basado en datos reales

El asistente NUNCA inventa datos. Todo proviene de API-Football.

## 🎨 Stack Tecnológico

- **Next.js 14** — App Router, Server Components, API Routes
- **TypeScript** — Tipado estricto
- **Tailwind CSS** — Dark mode premium
- **API-Football** — Datos deportivos reales
- **Claude API** — Asistente inteligente (opcional)

## 📱 Responsive

Diseño completamente responsive: mobile, tablet y desktop.

## ⚠️ Notas Importantes

- La API key de API-Football NUNCA se expone al cliente (solo server-side)
- Las cuotas cambian constantemente — siempre verificar
- Las predicciones son estimaciones, no garantías
- Plan gratuito: 100 requests/día — considerar plan pago para producción
