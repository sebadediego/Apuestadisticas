const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';

interface Banner1WinProps {
  variant?: 'full' | 'inline' | 'odds' | 'match';
}

export default function Banner1Win({ variant = 'full' }: Banner1WinProps) {
  if (variant === 'inline') {
    return (
      <div className="banner-1win-inline">
        <span>
          <strong style={{ color: '#1a5cff', fontWeight: 700 }}>1Win</strong> — Sponsor oficial de APUESTADISTICAS
        </span>
        <a href={AFFILIATE_LINK} target="_blank" rel="noopener noreferrer">
          Registrate →
        </a>
      </div>
    );
  }

  if (variant === 'odds') {
    return (
      <div className="banner-1win">
        <span className="banner-1win-logo">1Win</span>
        <div className="banner-1win-text">
          <strong>Estas cuotas están disponibles en 1Win.</strong> Registrate y recibí tu bono de bienvenida del 500%.
        </div>
        <a
          href={AFFILIATE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="banner-1win-cta"
        >
          Ver en 1Win
        </a>
      </div>
    );
  }

  if (variant === 'match') {
    return (
      <div className="banner-1win">
        <span className="banner-1win-logo">1Win</span>
        <div className="banner-1win-text">
          <strong>Apostá este partido en 1Win</strong> — Recibí tu bono del 500% en el primer depósito.
        </div>
        <a
          href={AFFILIATE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="banner-1win-cta"
        >
          Apostar ahora
        </a>
      </div>
    );
  }

  // Full banner (default)
  return (
    <div className="banner-1win">
      <span className="banner-1win-logo">1Win</span>
      <div className="banner-1win-text">
        <strong>Jugá en 1Win.es, sponsor oficial de APUESTADISTICAS</strong> — Registrate y recibí tu bono de bienvenida del 500% en tu primer depósito.
      </div>
      <a
        href={AFFILIATE_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="banner-1win-cta"
      >
        Registrate
      </a>
    </div>
  );
}
