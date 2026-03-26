'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LeagueAccordion from '@/components/LeagueAccordion';

interface LeagueData {
  id: number;
  league: any;
  fixtures: any[];
}

export default function EnVivoClient({ leagues }: { leagues: LeagueData[] }) {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="layout-main">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-dot" style={{ position: 'relative', top: 0, right: 0 }} />
          En Vivo
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Actualizacion automatica cada 30 segundos
        </p>
      </div>

      {leagues.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p>No hay partidos en vivo en este momento</p>
        </div>
      ) : (
        leagues.map((l) => (
          <LeagueAccordion
            key={l.id}
            league={{
              id: l.league.id,
              name: l.league.name,
              country: l.league.country || '',
              logo: l.league.logo || '',
            }}
            fixtures={l.fixtures}
            defaultOpen={true}
          />
        ))
      )}
    </div>
  );
}
