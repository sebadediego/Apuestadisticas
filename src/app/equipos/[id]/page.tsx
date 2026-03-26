// src/app/equipos/[id]/page.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';

export default function TeamDetailPage({ params }: { params: { id: string } }) {
  const teamId = parseInt(params.id);
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [squad, setSquad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'fixtures' | 'squad'>('stats');

  useEffect(() => {
    async function fetchData() {
      try {
        // Team info
        const teamRes = await fetch(`/api/football?endpoint=/teams&id=${teamId}`);
        const teamData = await teamRes.json();
        if (teamData.response?.[0]) setTeam(teamData.response[0]);

        const season = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

        // Recent fixtures
        const fixRes = await fetch(`/api/football?endpoint=/fixtures&team=${teamId}&season=${season}&last=10&timezone=America/Argentina/Buenos_Aires`);
        const fixData = await fixRes.json();
        setFixtures(fixData.response || []);

        // Squad
        const sqRes = await fetch(`/api/football?endpoint=/players&team=${teamId}&season=${season}`);
        const sqData = await sqRes.json();
        setSquad(sqData.response || []);

        // Try to get league for stats (use first fixture's league)
        if (fixData.response?.[0]?.league?.id) {
          const leagueId = fixData.response[0].league.id;
          const stRes = await fetch(`/api/football?endpoint=/teams/statistics&team=${teamId}&league=${leagueId}&season=${season}`);
          const stData = await stRes.json();
          if (stData.response) setStats(stData.response);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [teamId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="skeleton w-16 h-16 rounded-full mx-auto mb-4" />
        <div className="skeleton h-6 w-40 mx-auto" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-text-secondary">Equipo no encontrado.</p>
        <Link href="/equipos" className="text-accent-emerald text-sm mt-2 inline-block">← Volver</Link>
      </div>
    );
  }

  const t = team.team;
  const v = team.venue;

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-8">
      <Link href="/equipos" className="text-text-muted text-sm hover:text-accent-emerald mb-4 inline-block">← Volver</Link>

      {/* Team header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-4">
          {t?.logo && <img src={t.logo} alt="" className="w-20 h-20 object-contain" />}
          <div>
            <h1 className="font-display font-bold text-2xl text-text-primary">{t?.name}</h1>
            <p className="text-text-muted text-sm">{t?.country} • Fundado: {t?.founded || 'N/D'}</p>
            {v && (
              <p className="text-text-muted text-xs mt-1">📍 {v.name}, {v.city} ({v.capacity?.toLocaleString()} capacidad)</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: 'stats', label: '📊 Estadísticas' },
          { key: 'fixtures', label: '⚽ Partidos' },
          { key: 'squad', label: '👥 Plantel' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20'
                : 'bg-bg-tertiary text-text-muted border border-border-subtle'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {stats ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="glass-card-sm p-4 text-center">
                  <p className="text-3xl font-display font-bold text-accent-emerald">{stats.fixtures?.played?.total ?? 'N/D'}</p>
                  <p className="text-xs text-text-muted mt-1">Partidos Jugados</p>
                </div>
                <div className="glass-card-sm p-4 text-center">
                  <p className="text-3xl font-display font-bold text-accent-emerald">{stats.fixtures?.wins?.total ?? 'N/D'}</p>
                  <p className="text-xs text-text-muted mt-1">Victorias</p>
                </div>
                <div className="glass-card-sm p-4 text-center">
                  <p className="text-3xl font-display font-bold text-accent-amber">{stats.fixtures?.draws?.total ?? 'N/D'}</p>
                  <p className="text-xs text-text-muted mt-1">Empates</p>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="font-display font-bold text-sm text-text-primary mb-3">Goles</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted text-xs">A favor (total)</p>
                    <p className="font-mono font-bold text-accent-emerald text-lg">{stats.goals?.for?.total?.total ?? 'N/D'}</p>
                    <p className="text-text-muted text-[10px]">Promedio: {stats.goals?.for?.average?.total ?? 'N/D'}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs">En contra (total)</p>
                    <p className="font-mono font-bold text-accent-red text-lg">{stats.goals?.against?.total?.total ?? 'N/D'}</p>
                    <p className="text-text-muted text-[10px]">Promedio: {stats.goals?.against?.average?.total ?? 'N/D'}</p>
                  </div>
                </div>
              </div>

              {stats.form && (
                <div className="glass-card p-5">
                  <h3 className="font-display font-bold text-sm text-text-primary mb-3">Forma Reciente</h3>
                  <div className="flex gap-1.5">
                    {stats.form.slice(-10).split('').map((r: string, i: number) => (
                      <span
                        key={i}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          r === 'W' ? 'bg-accent-emerald/20 text-accent-emerald' :
                          r === 'D' ? 'bg-accent-amber/20 text-accent-amber' :
                          'bg-accent-red/20 text-accent-red'
                        }`}
                      >
                        {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {stats.clean_sheet && (
                <div className="glass-card p-5">
                  <h3 className="font-display font-bold text-sm text-text-primary mb-3">Valla Invicta</h3>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-text-muted text-xs">Local</p>
                      <p className="font-mono font-bold text-accent-cyan">{stats.clean_sheet.home ?? 'N/D'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">Visitante</p>
                      <p className="font-mono font-bold text-accent-cyan">{stats.clean_sheet.away ?? 'N/D'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">Total</p>
                      <p className="font-mono font-bold text-accent-cyan">{stats.clean_sheet.total ?? 'N/D'}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card-sm p-8 text-center">
              <p className="text-text-secondary">Estadísticas no disponibles para este equipo.</p>
            </div>
          )}
        </div>
      )}

      {/* Fixtures tab */}
      {activeTab === 'fixtures' && (
        <div className="space-y-3">
          {fixtures.length > 0 ? (
            fixtures.map((m: any) => <MatchCard key={m.fixture?.id} fixture={m} />)
          ) : (
            <div className="glass-card-sm p-8 text-center">
              <p className="text-text-secondary">No hay partidos recientes.</p>
            </div>
          )}
        </div>
      )}

      {/* Squad tab */}
      {activeTab === 'squad' && (
        <div className="space-y-2">
          {squad.length > 0 ? (
            squad.map((item: any) => {
              const p = item.player;
              const s = item.statistics?.[0];
              return (
                <div key={p?.id} className="glass-card-sm p-3 flex items-center gap-3">
                  {p?.photo && <img src={p.photo} alt="" className="w-10 h-10 rounded-full object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{p?.name}</p>
                    <p className="text-[10px] text-text-muted">
                      {s?.games?.position || 'N/D'} • {p?.nationality || 'N/D'} • {p?.age ? `${p.age} años` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-text-secondary">{s?.games?.appearences ?? 0} PJ</p>
                    <p className="text-accent-emerald font-mono">{s?.goals?.total ?? 0} goles</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass-card-sm p-8 text-center">
              <p className="text-text-secondary">Plantel no disponible.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
