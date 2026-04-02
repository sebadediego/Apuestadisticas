'use client';
import { useState, useRef, useEffect } from 'react';

interface Message { role: 'user' | 'assistant'; content: string; ts: string; }

const QUICK = [
  'Que partidos hay hoy?',
  'Que recomendas para hoy?',
  'Hay partidos en vivo?',
  'Cuales son las mejores cuotas?',
];

export default function AsistentePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hola! Soy el asistente de **Apuestadisticas**. Puedo ayudarte con analisis de partidos, cuotas, predicciones y recomendaciones basadas en datos reales.\n\nEn que puedo ayudarte?',
      ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const ts = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setMessages(p => [...p, { role: 'user', content: msg, ts }]);
    setInput('');
    setLoading(true);
    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, conversationHistory: history }),
      });
      const data = await res.json();
      setMessages(p => [
        ...p,
        {
          role: 'assistant',
          content: data.response || 'No pude procesar tu consulta.',
          ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (e: any) {
      setMessages(p => [
        ...p,
        {
          role: 'assistant',
          content: 'Error: ' + e.message,
          ts: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const fmt = (c: string) =>
    c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="chat-container">
      <div className="chat-header">
        <img src="/logo-futbot.png" alt="FutBOT" style={{ height: 44, objectFit: 'contain' }} />
        <div className="chat-header-info">
          <div className="chat-header-name">FutBOT</div>
          <div className="chat-header-sub">Datos reales - API-Football</div>
        </div>
        <div className="chat-header-status">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
          Online
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
            <div dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
            <div className="chat-bubble-ts">{m.ts}</div>
            {/* Show 1Win banner after bot analysis messages (long ones) */}
            {m.role === 'assistant' && m.content.length > 200 && i > 0 && (
              <a href="https://lkpq.cc/b8edf9" target="_blank" rel="noopener noreferrer" className="chat-1win-banner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/1win-logo.png" alt="1Win" className="chat-1win-logo" />
                <span className="chat-1win-text">Aposta con las mejores cuotas</span>
                <span className="chat-1win-cta">Ir a 1Win</span>
              </a>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-bot">
            <div className="loading-spinner"><div className="spinner" /></div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Consultando datos reales...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 2 && (
        <div className="chat-suggestions">
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} disabled={loading} className="chat-suggestion">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-bar">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Pregunta sobre partidos, cuotas..."
          disabled={loading}
          className="chat-input"
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="chat-send-btn"
        >
          Enviar
        </button>
      </div>
      <div className="chat-disclaimer">
        El asistente usa datos reales pero no garantiza resultados. Aposta responsablemente.
      </div>
    </div>
  );
}
