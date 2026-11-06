import { useEffect, useMemo, useState } from 'react';

interface Carga {
  id: string;
  descricao: string;
  origem: string;
  destino: string;
  timestamp: string;
  statusLacre: string;
}

interface LogAuditoria {
  id: number;
  timestamp: string;
  evento: string;
  hashAnterior: string;
  hash: string;
}

interface Telemetria {
  timestamp: string;
  temperatura: number;
  umidade: number;
  latitude: number;
  longitude: number;
}

interface IntegridadeResponse {
  integra: boolean;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: string;
  source: string;
  status: 'NORMAL' | 'ATENÇÃO' | 'CRÍTICO';
  hash: string;
}

const demoCargas: Carga[] = [{
  id: 'DEMO-001',
  descricao: 'Medicamentos refrigerados',
  origem: 'São Paulo',
  destino: 'Porto de Santos',
  timestamp: '2026-09-29T01:58:12',
  statusLacre: 'BLOQUEADO',
}];

const demoTelemetria: Telemetria = {
  timestamp: '2026-09-29T01:58:12Z',
  temperatura: 4.2,
  umidade: 45.8,
  latitude: -23.55,
  longitude: -46.63,
};

const demoLogs: SecurityLog[] = [
  { id: 'LOG-9042', timestamp: '2026-09-29 01:58:12', eventType: 'Verificação de Integridade Criptográfica Completa', source: 'NODE-CORE-01', status: 'NORMAL', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  { id: 'LOG-9041', timestamp: '2026-09-29 01:32:45', eventType: 'Oscilação de Tensão no Circuito do Lacre Magnético', source: 'SEAL-MAG-9092', status: 'ATENÇÃO', hash: '5feceb66ffc86f38d952786c6d696c79c2dbc239d04e91b46729d73a27fb57a9' },
  { id: 'LOG-9040', timestamp: '2026-09-29 01:00:00', eventType: 'Passagem por Checkpoint Georeferenciado (Ponto 8)', source: 'GPS-SAT-PRIMARY', status: 'NORMAL', hash: '6b86b273ff34fca19d6b884eff5a3f574ada4eaa22f1d49c01e52ddb7875b4b' },
  { id: 'LOG-9039', timestamp: '2026-09-29 00:15:30', eventType: 'Inicialização de Sessão de Telemetria de Transporte', source: 'SYSTEM-INIT', status: 'NORMAL', hash: 'd41d8cd98f00b204e9800998ecf8427e00000000000000000000000000000000' },
];

const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

async function fetchApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { signal });
  if (!response.ok) {
    throw new Error(`API respondeu ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function MiniGraph({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const width = 200;
  const height = 30;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / (max - min || 1)) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ width: '100%', height: '30px', overflow: 'hidden', marginTop: '8px' }}>
      <svg width="100%" height="30" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}

export default function DashboardIntegridade() {
  const [currentTime, setCurrentTime] = useState('');
  const [cargas, setCargas] = useState<Carga[]>(demoCargas);
  const [selectedId, setSelectedId] = useState(demoCargas[0].id);
  const [telemetria, setTelemetria] = useState(demoTelemetria);
  const [logs, setLogs] = useState<SecurityLog[]>(demoLogs);
  const [connected, setConnected] = useState(false);
  const [chainIntegrity, setChainIntegrity] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const carga = useMemo(
    () => cargas.find((item) => item.id === selectedId) ?? cargas[0],
    [cargas, selectedId],
  );
  const doorLocked = carga?.statusLacre !== 'ABERTO';

  async function loadCargaData(id: string, signal: AbortSignal) {
    const [remoteTelemetria, remoteLogs, integrity] = await Promise.all([
      fetchApi<Telemetria>(`/cargas/${encodeURIComponent(id)}/telemetria`, signal),
      fetchApi<LogAuditoria[]>(`/cargas/${encodeURIComponent(id)}/logs`, signal),
      fetchApi<IntegridadeResponse>(`/cargas/${encodeURIComponent(id)}/logs/verificar`, signal),
    ]);
    setTelemetria(remoteTelemetria);
    setLogs(remoteLogs.map((log) => ({
      id: String(log.id),
      timestamp: new Date(log.timestamp).toLocaleString('pt-BR'),
      eventType: log.evento,
      source: 'AGROGUARD-API',
      status: 'NORMAL',
      hash: log.hash,
    })));
    setChainIntegrity(integrity.integra);
  }

  useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    const interval = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('pt-BR')), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    async function load() {
      if (!apiUrl) {
        setLoading(false);
        return;
      }
      try {
        const remoteCargas = await fetchApi<Carga[]>('/cargas', controller.signal);
        if (remoteCargas.length === 0) throw new Error('API não retornou cargas');
        setCargas(remoteCargas);
        setSelectedId(remoteCargas[0].id);
        await loadCargaData(remoteCargas[0].id, controller.signal);
        setConnected(true);
      } catch {
        setConnected(false);
        setChainIntegrity(null);
      } finally {
        setLoading(false);
        window.clearTimeout(timeout);
      }
    }

    void load();
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!connected || !selectedId || selectedId === demoCargas[0].id) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void loadCargaData(selectedId, controller.signal).catch(() => {
      setConnected(false);
      setChainIntegrity(null);
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [connected, selectedId]);

  async function toggleSeal() {
    const action = doorLocked ? 'ABRIR' : 'BLOQUEAR';
    if (!connected || !apiUrl || !carga) {
      setCargas((current) => current.map((item) => item.id === selectedId
        ? { ...item, statusLacre: action === 'ABRIR' ? 'ABERTO' : 'BLOQUEADO' }
        : item));
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/cargas/${encodeURIComponent(carga.id)}/lacre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: action }),
      });
      if (!response.ok) throw new Error(`API respondeu ${response.status}`);
      const updated = await response.json() as Carga;
      setCargas((current) => current.map((item) => item.id === updated.id ? updated : item));
      await loadCargaData(updated.id, new AbortController().signal);
    } catch {
      setConnected(false);
      setChainIntegrity(null);
      setCargas((current) => current.map((item) => item.id === selectedId
        ? { ...item, statusLacre: action === 'ABRIR' ? 'ABERTO' : 'BLOQUEADO' }
        : item));
    }
  }

  if (!carga) return null;

  return (
    <div style={{ backgroundColor: '#090d16', color: '#e2e8f0', minHeight: '100vh', padding: '24px', fontFamily: 'Segoe UI, Roboto, sans-serif', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid #1e293b', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: connected ? '#10b981' : '#f59e0b', boxShadow: `0 0 10px ${connected ? '#10b981' : '#f59e0b'}` }} />
            <h1 style={{ margin: 0, fontSize: '18px', fontFamily: 'monospace', color: '#00f2fe', letterSpacing: '1px' }}>
              AGROGUARD PROTOCOL <span style={{ color: '#64748b', fontWeight: 'normal' }}>| PLATAFORMA DE INTEGRIDADE DE CARGAS</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0f172a', padding: '6px 14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', fontFamily: 'monospace' }}>
            <span style={{ color: connected ? '#10b981' : '#f59e0b' }}>{connected ? '● CONECTADO À API' : '● MODO DEMONSTRAÇÃO'}</span>
            <span style={{ color: '#334155' }}>|</span><span style={{ color: '#94a3b8' }}>{currentTime || '00:00:00'}</span>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: connected ? '#34d399' : '#fbbf24', background: connected ? '#064e3b' : '#78350f', padding: '5px 9px', borderRadius: '4px' }}>
            {connected ? 'Conectado à API' : 'Modo demonstração (dados simulados)'}
          </span>
          <label style={{ fontSize: '12px', color: '#94a3b8' }}>
            CARGA:{' '}
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', padding: '6px', borderRadius: '4px' }}>
              {cargas.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.descricao}</option>)}
            </select>
          </label>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
            <span style={{ fontSize: '11px', color: '#00f2fe', fontFamily: 'monospace', background: '#082f49', padding: '3px 8px', borderRadius: '4px' }}>MONITORAMENTO DE CARGA</span>
            <h2 style={{ margin: '14px 0 4px', fontSize: '24px', color: '#fff', fontFamily: 'monospace' }}>{carga.id}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>{carga.descricao.toUpperCase()}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>ROTA</span><strong>{carga.origem} ➔ {carga.destino}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>STATUS INTEGRAL</span><strong style={{ color: chainIntegrity === false ? '#f43f5e' : '#10b981' }}>{connected ? (chainIntegrity ? 'CADEIA ÍNTEGRA' : 'CADEIA INVÁLIDA') : 'DEMONSTRAÇÃO'}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>COORDENADAS</span><strong>{telemetria.latitude.toFixed(4)}, {telemetria.longitude.toFixed(4)}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>ATUALIZAÇÃO</span><strong>{new Date(telemetria.timestamp).toLocaleTimeString('pt-BR')}</strong></div>
            </div>
            <button onClick={() => void toggleSeal()} style={{ marginTop: '20px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              {doorLocked ? 'ABRIR LACRE' : 'BLOQUEAR LACRE'}
            </button>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>TELEMETRIA {loading ? '· CARREGANDO' : '· ÚLTIMA LEITURA'}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>TEMPERATURA</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.temperatura.toFixed(1)} °C</strong><MiniGraph data={[4.1, 4.2, telemetria.temperatura]} color="#10b981" /></div>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>UMIDADE</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.umidade.toFixed(1)} %</strong><MiniGraph data={[46, 45, telemetria.umidade]} color="#00f2fe" /></div>
            </div>
            <div style={{ marginTop: '20px', color: '#00f2fe', fontFamily: 'monospace', fontSize: '12px' }}>GPS: {telemetria.latitude.toFixed(4)}, {telemetria.longitude.toFixed(4)}</div>
          </div>
        </section>

        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div><h3 style={{ margin: 0, fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontFamily: 'monospace' }}>LOG DE EVENTOS E AUDITORIA</h3><span style={{ fontSize: '11px', color: '#64748b' }}>HASH SHA-256 ENCADEADO</span></div>
            {connected && <span style={{ fontSize: '11px', color: chainIntegrity ? '#34d399' : '#fb7185' }}>{chainIntegrity ? '✓ CADEIA ÍNTEGRA' : '✕ CADEIA NÃO ÍNTEGRA'}</span>}
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead><tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontFamily: 'monospace', fontSize: '10px' }}><th style={{ padding: '10px' }}>TIMESTAMP</th><th style={{ padding: '10px' }}>EVENTO</th><th style={{ padding: '10px' }}>STATUS</th><th style={{ padding: '10px' }}>HASH</th></tr></thead>
              <tbody>{logs.map((log) => <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{log.timestamp}</td><td style={{ padding: '10px', color: '#fff', fontWeight: 'bold' }}>{log.eventType}</td><td style={{ padding: '10px', color: log.status === 'NORMAL' ? '#34d399' : '#fbbf24' }}>{log.status}</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#00f2fe', fontSize: '11px' }}>{log.hash}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
