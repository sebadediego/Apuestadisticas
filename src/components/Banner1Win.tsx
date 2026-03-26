/* eslint-disable @next/next/no-img-element */
const AFFILIATE_LINK = 'https://lkpq.cc/b8edf9';

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
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 14px',
          margin: '8px 0',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(90deg, #0a1230 0%, #0d1a3a 50%, #111f40 100%)',
          border: '1px solid rgba(26, 92, 255, 0.2)',
          textDecoration: 'none',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img
            src="/1win-logo.png"
            alt="1Win"
            style={{ height: 22, width: 'auto', objectFit: 'contain', borderRadius: 3 }}
          />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            Sponsor oficial de <strong style={{ color: '#e2e8f0' }}>Apuestadisticas</strong>
          </span>
        </div>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: '#1a5cff',
          padding: '4px 10px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          Registrate →
        </span>
      </a>
    );
  }

  // Full banner — DBbet/gambeta.ai style
  return (
    <a
      href={AFFILIATE_LINK}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        margin: '10px 0',
        borderRadius: 'var(--radius-md)',
        background: 'linear-gradient(135deg, #060d1f 0%, #0b1633 40%, #122354 100%)',
        border: '1px solid rgba(26, 92, 255, 0.2)',
        textDecoration: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle glow behind logo */}
      <div style={{
        position: 'absolute',
        left: -20,
        top: -20,
        width: 100,
        height: 100,
        background: 'radial-gradient(circle, rgba(26, 92, 255, 0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        right: -30,
        bottom: -30,
        width: 120,
        height: 120,
        background: 'radial-gradient(circle, rgba(26, 92, 255, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* 1Win Logo */}
      <img
        src="/1win-logo.png"
        alt="1Win"
        style={{
          height: 38,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
          borderRadius: 4,
          position: 'relative',
          zIndex: 1,
        }}
      />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600, lineHeight: 1.3 }}>
          Apuestadisticas es <span style={{ color: '#5b9aff' }}>100% GRATIS</span> gracias a 1Win
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
          Registrate y recibi tu bono del 500%
        </div>
      </div>

      {/* CTA Button */}
      <div style={{
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #1a5cff, #2d6fff)',
        color: '#fff',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        boxShadow: '0 2px 12px rgba(26, 92, 255, 0.3)',
      }}>
        Registrate →
      </div>
    </a>
  );
}
