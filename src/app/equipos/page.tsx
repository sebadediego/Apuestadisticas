// src/app/equipos/page.tsx
'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function EquiposPage() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchTeams = async () => {
    if (!search.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/football?endpoint=/teams&search=${encodeURIComponent(search.trim())}`);
      const data = await res.json();
      setResults(data.response || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display font-bold text-3xl text-text-primary mb-2">🏟️ Equipos</h1>
      <p className="text-text-muted text-sm mb-6">Buscá cualquier equipo para ver su información y estadísticas</p>

      {/* Search */}
      <div className="glass-card-sm p-3 flex gap-2 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchTeams()}
          placeholder="Buscar equipo... (ej: River Plate, Barcelona)"
          className="flex-1 bg-bg-primary rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted border border-border-subtle focus:border-accent-emerald/30 focus:outline-none"
        />
        <button
          onClick={searchTeams}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-accent-emerald text-white text-sm font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Results */}
      {searched && !loading && results.length === 0 && (
        <div className="glass-card-sm p-8 text-center">
          <p className="text-text-secondary">No se encontraron equipos con ese nombre.</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {results.map((item: any) => {
          const team = item.team;
          const venue = item.venue;
          return (
            <Link key={team?.id} href={`/equipos/${team?.id}`}>
              <div className="glass-card-sm p-4 match-card cursor-pointer">
                <div className="flex items-center gap-3 mb-3">
                  {team?.logo && <img src={team.logo} alt="" className="w-12 h-12 object-contain" />}
                  <div>
                    <p className="font-display font-bold text-text-primary">{team?.name}</p>
                    <p className="text-xs text-text-muted">{team?.country} • Fundado: {team?.founded || 'N/D'}</p>
                  </div>
                </div>
                {venue && (
                  <div className="text-xs text-text-muted">
                    📍 {venue.name}, {venue.city} ({venue.capacity ? `${venue.capacity.toLocaleString()} cap.` : 'N/D'})
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
