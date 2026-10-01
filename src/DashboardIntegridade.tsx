import React, { useState, useEffect } from 'react';

interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  status: 'NORMAL' | 'ATENÇÃO' | 'CRÍTICO';
  hash: string;
}

interface MiniGraphProps {
  data: number[];
  color: string;
}

// Micro-gráfico totalmente contido através de atributos SVG explícitos
const MiniGraph: React.FC<MiniGraphProps> = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const width = 200;
  const height = 30;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div style={{ width: '100%', height: '30px', overflow: 'hidden', marginTop: '8px' }}>
      <svg width="100%" height="30" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon fill={`url(#grad-${color})`} points={`0,${height} ${points} ${width},${height}`} />
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
};

export default function DashboardIntegridade() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [doorLocked, setDoorLocked] = useState<boolean>(true);

  const [logs] = useState<SecurityLog[]>([
    {
      id: 'LOG-9042',
      timestamp: '2026-09-29 01:58:12',
      eventType: 'Verificação de Integridade Criptográfica Completa',
      source: 'NODE-CORE-01',
      status: 'NORMAL',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    {
      id: 'LOG-9041',
      timestamp: '2026-09-29 01:32:45',
      eventType: 'Oscilação de Tensão no Circuito do Lacre Magnético',
      source: 'SEAL-MAG-9092',
      status: 'ATENÇÃO',
      hash: '5feceb66ffc86f38d952786c6d696c79c2dbc239d04e91b46729d73a27fb57a9'
    },
    {
      id: 'LOG-9040',
      timestamp: '2026-09-29 01:00:00',
      eventType: 'Passagem por Checkpoint Georeferenciado (Ponto 8)',
      source: 'GPS-SAT-PRIMARY',
      status: 'NORMAL',
      hash: '6b86b273ff34fca19d6b884eff5a3f574ada4eaa22f1d49c01e52ddb7875b4b'
    },
    {
      id: 'LOG-9039',
      timestamp: '2026-09-29 00:15:30',
      eventType: 'Inicialização de Sessão de Telemetria de Transporte',
      source: 'SYSTEM-INIT',
      status: 'NORMAL',
      hash: 'd41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000'
    }
  ]);

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ backgroundColor: '#090d16', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'Segoe UI, Roboto, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
            <h1 style={{ margin: 0, fontSize: '18px', fontFamily: 'monospace', fontWeight: 'bold', color: '#00f2fe', letterSpacing: '1px' }}>
              AGROGUARD PROTOCOL <span style={{ color: '#64748b', fontWeight: 'normal' }}>| PLATAFORMA DE INTEGRIDADE DE CARGAS</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0f172a', padding: '6px 14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', fontFamily: 'monospace' }}>
            <span style={{ color: '#10b981' }}>● TELEMETRIA ATIVA</span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#00f2fe' }}>SISTEMA: SECURE-LEDGER v2.4</span>
            <span style={{ color: '#334155' }}>|</span>
            <span style={{ color: '#94a3b8' }}>{currentTime || '00:00:00'}</span>
          </div>
        </header>

        {/* MÓDULO SUPERIOR: DETALHES DO ATIVO + CONTÊINER ISOMÉTRICO */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          
          {/* Card da Esquerda: Especificações da Carga */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', color: '#00f2fe', fontFamily: 'monospace', background: '#082f49', padding: '3px 8px', borderRadius: '4px', border: '1px solid #0284c7' }}>
                  MONITORAMENTO DE ALTO VALOR
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>MODO: AUDITORIA</span>
              </div>

              <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: '#ffffff', fontFamily: 'monospace' }}>
                Ativo: CT-8849-X
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b' }}>
                CONTAINER BLINDADO — CARGA FARMACÊUTICA / TERMOSSENSÍVEL
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>ROTA</span>
                  <strong style={{ color: '#e2e8f0' }}>GRU ➔ BRSNT (Porto de Santos)</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>VALOR DECLARADO</span>
                  <strong style={{ color: '#00f2fe', fontFamily: 'monospace' }}>USD 2,450,000.00</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>HASH CRIPTOGRÁFICO</span>
                  <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>8f9w2b...c41e (SHA-256)</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>STATUS INTEGRAL</span>
                  <strong style={{ color: '#10b981' }}>100% AUDITADO</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                EMITIR CERTIFICADO DE AUDITORIA
              </button>
              <button 
                onClick={() => setDoorLocked(!doorLocked)}
                style={{ background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
              >
                {doorLocked ? 'SIMULAR ABERTURA' : 'BLOQUEAR TRAVA'}
              </button>
            </div>
          </div>

          {/* Card da Direita: Gêmeo Digital do Contêiner */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '12px', left: '16px', fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
              REPRESENTAÇÃO ISOMÉTRICA EM TEMPO REAL
            </div>

            {/* Ilustração SVG do Contêiner Isométrico */}
            <svg width="280" height="150" viewBox="0 0 300 180" style={{ margin: '20px 0' }}>
              {/* Face Superior */}
              <polygon points="150,20 260,60 150,100 40,60" fill="#1e293b" stroke="#00f2fe" strokeWidth="1.5" />
              {/* Face Esquerda */}
              <polygon points="40,60 150,100 150,170 40,130" fill="#0f172a" stroke="#00f2fe" strokeWidth="1.5" />
              {/* Face Direita */}
              <polygon points="150,100 260,60 260,130 150,170" fill="#111827" stroke="#00f2fe" strokeWidth="1.5" />

              {/* Linhas Internas / Grade de Sensores */}
              <line x1="95" y1="40" x2="205" y2="80" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" />
              <line x1="95" y1="115" x2="205" y2="155" stroke="#0284c7" strokeWidth="1" strokeDasharray="3,3" />

              {/* LED do Lacre */}
              <circle cx="150" cy="100" r="5" fill={doorLocked ? "#10b981" : "#f43f5e"}>
                <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
              </circle>
              {/* LED do Sensor GPS */}
              <circle cx="200" cy="70" r="4" fill="#00f2fe" />
            </svg>

            <div style={{ display: 'flex', gap: '20px', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: doorLocked ? '#10b981' : '#f43f5e' }}>
                LACRE: {doorLocked ? 'FECHADO & SELADO' : 'ALERTA DE VIOLAÇÃO'}
              </span>
              <span style={{ color: '#00f2fe' }}>GPS: FIXO (24 SATS)</span>
            </div>
          </div>

        </section>

        {/* PAINEL DE 4 MÉTRICAS (GRID 4 COLUNAS COM ALTURA CONTROLADA) */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', height: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>TEMPERATURA (CLIMA)</span>
              <span style={{ fontSize: '10px', color: '#10b981', background: '#064e3b', padding: '2px 6px', borderRadius: '4px' }}>ESTÁVEL</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>
              4.2 °C
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>FAIXA SEGURA (+2.0°C a +8.0°C)</div>
            <MiniGraph data={[4.1, 4.2, 4.3, 4.2, 4.1, 4.2]} color="#10b981" />
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', height: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>UMIDADE RELATIVA</span>
              <span style={{ fontSize: '10px', color: '#00f2fe', background: '#082f49', padding: '2px 6px', borderRadius: '4px' }}>IDEAL</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>
              45.8 %
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>DENTRO DOS PARÂMETROS</div>
            <MiniGraph data={[48, 46, 45, 47, 45.8]} color="#00f2fe" />
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', height: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>LACRE ELETRÔNICO</span>
              <span style={{ fontSize: '10px', color: '#10b981', background: '#064e3b', padding: '2px 6px', borderRadius: '4px' }}>SETORED</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981', margin: '4px 0' }}>
              BLOQUEADO
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>CIRCUITO INTEGRADO OK</div>
            <MiniGraph data={[1, 1, 1, 1, 1, 1]} color="#10b981" />
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '14px', height: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>DESVIO DE ROTA</span>
              <span style={{ fontSize: '10px', color: '#10b981', background: '#064e3b', padding: '2px 6px', borderRadius: '4px' }}>ROTA NOMINAL</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: '4px 0' }}>
              0.00 KM
            </div>
            <div style={{ fontSize: '10px', color: '#64748b' }}>CORREDOR SEGURO MANTIDO</div>
            <MiniGraph data={[0, 0, 0, 0, 0]} color="#10b981" />
          </div>

        </section>

        {/* TABELA DE AUDITORIA E LOGS */}
        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#ffffff', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                LOG DE EVENTOS E AUDITORIA DE INTEGRIDADE
              </h3>
              <span style={{ fontSize: '11px', color: '#64748b' }}>REGISTRO IMUTÁVEL EM TEMPO REAL VIA HSM</span>
            </div>
            <span style={{ fontSize: '11px', color: '#00f2fe', fontFamily: 'monospace', background: '#082f49', padding: '4px 10px', borderRadius: '4px' }}>
              FILTRO: TODOS OS EVENTOS
            </span>
          </div>

          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>TIMESTAMP</th>
                  <th style={{ padding: '10px' }}>EVENTO DE SEGURANÇA</th>
                  <th style={{ padding: '10px' }}>COMPONENTE</th>
                  <th style={{ padding: '10px' }}>NÍVEL</th>
                  <th style={{ padding: '10px' }}>HASH DE VALIDAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{log.timestamp}</td>
                    <td style={{ padding: '10px', color: '#ffffff', fontWeight: 'bold' }}>{log.eventType}</td>
                    <td style={{ padding: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{log.source}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ 
                        fontSize: '9px', 
                        fontFamily: 'monospace', 
                        fontWeight: 'bold', 
                        padding: '3px 8px', 
                        borderRadius: '4px',
                        background: log.status === 'NORMAL' ? '#064e3b' : '#78350f',
                        color: log.status === 'NORMAL' ? '#34d399' : '#fbbf24'
                      }}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#00f2fe', fontSize: '11px' }}>{log.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}