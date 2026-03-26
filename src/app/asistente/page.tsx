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
        <div className="chat-header-avatar">AI</div>
        <div className="chat-header-info">
          <div className="chat-header-name">Asistente IA</div>
          <div className="chat-header-sub">Datos reales - API-Football</div>
        </div>
        <div className="chat-header-status">
          <span className="live-dot" style={{ position: 'relative', top: 0, right: 0, width: 6, height: 6 }} />
          Online
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}>
              <div dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
              <div className="chat-bubble-ts">{m.ts}</div>
            </div>
            {/* Show 1Win banner after bot analysis messages (long ones) */}
            {m.role === 'assistant' && m.content.length > 200 && i > 0 && (
              <a
                href="https://lkpq.cc/b8edf9"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  margin: '6px 0 10px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #060d1f, #122354)',
                  border: '1px solid rgba(26, 92, 255, 0.2)',
                  textDecoration: 'none',
                  maxWidth: '85%',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/1win-logo.png" alt="1Win" style={{ height: 24, width: 'auto', borderRadius: 3 }} />
                <span style={{ fontSize: 11, color: '#94a3b8', flex: 1 }}>Aposta con las mejores cuotas</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#1a5cff', padding: '4px 10px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                  Ir a 1Win
                </span>
              </a>
            )}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-bot">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="live-dot" style={{ position: 'relative', top: 0, right: 0, width: 6, height: 6 }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Consultando datos reales...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 2 && (
        <div className="chat-suggestions">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} disabled={loading} className="chat-suggestion">
              {q}
            </button>
          ))}
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
