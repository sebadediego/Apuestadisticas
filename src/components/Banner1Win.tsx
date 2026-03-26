const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';
// 1Win official logo from their CDN
const LOGO_URL = 'https://1win.pro/images/logo/logo.svg';

interface Banner1WinProps {
  variant?: 'full' | 'inline';
}

export default function Banner1Win({ variant = 'full' }: Banner1WinProps) {
  if (variant === 'inline') {
    return (
      <a
        href={AFFILIATE_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="banner-1win-inline"
        style={{ textDecoration: 'none' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: '#1a5cff' }}>1Win</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Sponsor oficial de Apuestadisticas</span>
        </span>
        <span style={{ color: '#1a5cff', fontWeight: 600, fontSize: 12 }}>Registrate →</span>
      </a>
    );
  }

  // Full banner — gambeta.ai style
  return (
    <a
      href={AFFILIATE_LINK}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        margin: '10px 0',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, #0a1628 0%, #0f2045 50%, #1a3060 100%)',
        border: '1px solid rgba(26, 92, 255, 0.25)',
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow effect */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-10%',
        width: 120,
        height: 120,
        background: 'radial-gradient(circle, rgba(26, 92, 255, 0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 1Win Logo/Text */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        fontSize: 24,
        color: '#4d8aff',
        flexShrink: 0,
        lineHeight: 1,
        letterSpacing: '-0.5px',
        textShadow: '0 0 20px rgba(26, 92, 255, 0.3)',
      }}>
        1Win
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, lineHeight: 1.3 }}>
          Apuestadisticas es <span style={{ color: '#4d8aff' }}>100% GRATIS</span> gracias a 1Win
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
          Bono 500% en tu primer deposito
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: '7px 14px',
        background: '#1a5cff',
        color: '#fff',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        Registrate
      </div>
    </a>
  );
}
