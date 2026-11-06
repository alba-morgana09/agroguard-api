import { useEffect, useMemo, useState } from 'react';
import {
  gerarCadeia,
  verificarCadeia,
  type EventoAuditoria,
  type RegistroAuditoria,
} from './audit';

interface Carga {
  id: string;
  descricao: string;
  origem: string;
  destino: string;
  timestamp: string;
  statusLacre: string;
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
  status: 'NORMAL' | 'ATENÇÃO' | 'CRÍTICO';
  hash: string;
  hashAnterior?: string;
}

interface LogApi {
  id: number;
  timestamp: string;
  evento: string;
  hashAnterior: string;
  hash: string;
}

interface DemoCarga {
  carga: Carga;
  telemetria: Telemetria;
  eventos: EventoAuditoria[];
  faixa: string;
}

const demoCargas: DemoCarga[] = [
  {
    carga: {
      id: 'DEMO-001',
      descricao: 'Medicamentos refrigerados',
      origem: 'São Paulo',
      destino: 'Porto de Santos',
      timestamp: '2026-09-29T01:58:12',
      statusLacre: 'BLOQUEADO',
    },
    telemetria: { timestamp: '', temperatura: 4.2, umidade: 45.8, latitude: -23.55, longitude: -46.63 },
    faixa: 'Faixa segura: 2 a 8 °C',
    eventos: [
      { id: 1, timestamp: '2026-09-29T01:15:30', evento: 'Inicialização da sessão de telemetria', status: 'NORMAL' },
      { id: 2, timestamp: '2026-09-29T01:32:45', evento: 'Lacre eletrônico verificado', status: 'NORMAL' },
      { id: 3, timestamp: '2026-09-29T01:58:12', evento: 'Verificação de integridade concluída', status: 'NORMAL' },
    ],
  },
  {
    carga: {
      id: 'DEMO-002',
      descricao: 'Alimentos perecíveis',
      origem: 'Campinas',
      destino: 'Porto de Paranaguá',
      timestamp: '2026-09-29T02:05:00',
      statusLacre: 'BLOQUEADO',
    },
    telemetria: { timestamp: '', temperatura: 2.4, umidade: 52.1, latitude: -22.91, longitude: -47.06 },
    faixa: 'Faixa segura: 0 a 4 °C',
    eventos: [
      { id: 1, timestamp: '2026-09-29T01:20:00', evento: 'Carga refrigerada registrada', status: 'NORMAL' },
      { id: 2, timestamp: '2026-09-29T01:48:20', evento: 'Checkpoint de rota confirmado', status: 'NORMAL' },
      { id: 3, timestamp: '2026-09-29T02:05:00', evento: 'Lacre eletrônico verificado', status: 'NORMAL' },
    ],
  },
  {
    carga: {
      id: 'DEMO-003',
      descricao: 'Carga seca',
      origem: 'Belo Horizonte',
      destino: 'Porto do Rio de Janeiro',
      timestamp: '2026-09-29T02:20:00',
      statusLacre: 'BLOQUEADO',
    },
    telemetria: { timestamp: '', temperatura: 24.7, umidade: 48.3, latitude: -19.92, longitude: -43.94 },
    faixa: 'Umidade máxima: 60%',
    eventos: [
      { id: 1, timestamp: '2026-09-29T01:30:00', evento: 'Carga seca registrada', status: 'NORMAL' },
      { id: 2, timestamp: '2026-09-29T01:55:10', evento: 'Posição georreferenciada atualizada', status: 'NORMAL' },
      { id: 3, timestamp: '2026-09-29T02:20:00', evento: 'Auditoria de integridade concluída', status: 'NORMAL' },
    ],
  },
];

const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080' : '');

function formatarData(data: string): string {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return data;
  return valor.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

async function fetchApi<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { signal });
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  return response.json() as Promise<T>;
}

function converterLogs(logs: Array<RegistroAuditoria | LogApi>): SecurityLog[] {
  return logs.map((log) => ({
    id: String(log.id),
    timestamp: formatarData(log.timestamp),
    eventType: log.evento,
    status: ('status' in log ? log.status : 'NORMAL') as SecurityLog['status'],
    hash: log.hash,
    hashAnterior: log.hashAnterior,
  }));
}

function MiniGraph({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 200;
    const y = 30 - ((value - min) / (max - min || 1)) * 24 - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ width: '100%', height: '30px', overflow: 'hidden', marginTop: '8px' }}>
      <svg width="100%" height="30" viewBox="0 0 200 30" preserveAspectRatio="none">
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
    </div>
  );
}

export default function DashboardIntegridade() {
  const [currentTime, setCurrentTime] = useState('');
  const [cargas, setCargas] = useState<Carga[]>(demoCargas.map(({ carga }) => carga));
  const [selectedId, setSelectedId] = useState(demoCargas[0].carga.id);
  const [telemetria, setTelemetria] = useState(demoCargas[0].telemetria);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [connected, setConnected] = useState(false);
  const [chainResult, setChainResult] = useState<{ integra: boolean; primeiroInvalido: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoCadeias, setDemoCadeias] = useState<Record<string, RegistroAuditoria[]>>({});

  const carga = useMemo(
    () => cargas.find((item) => item.id === selectedId) ?? cargas[0],
    [cargas, selectedId],
  );
  const demo = demoCargas.find((item) => item.carga.id === selectedId) ?? demoCargas[0];
  const doorLocked = carga?.statusLacre !== 'ABERTO';

  async function aplicarDemo(id: string) {
    const selecionada = demoCargas.find((item) => item.carga.id === id) ?? demoCargas[0];
    const cadeia = demoCadeias[selecionada.carga.id] ?? [];
    setTelemetria({ ...selecionada.telemetria, timestamp: new Date().toISOString() });
    setLogs(converterLogs(cadeia));
    setChainResult(await verificarCadeia(cadeia));
  }

  async function loadCargaData(id: string, signal: AbortSignal) {
    const [remoteTelemetria, remoteLogs, integrity] = await Promise.all([
      fetchApi<Telemetria>(`/cargas/${encodeURIComponent(id)}/telemetria`, signal),
      fetchApi<LogApi[]>(`/cargas/${encodeURIComponent(id)}/logs`, signal),
      fetchApi<IntegridadeResponse>(`/cargas/${encodeURIComponent(id)}/logs/verificar`, signal),
    ]);
    setTelemetria(remoteTelemetria);
    setLogs(converterLogs(remoteLogs));
    setChainResult({ integra: integrity.integra, primeiroInvalido: integrity.integra ? null : 1 });
  }

  useEffect(() => {
    let ativo = true;
    void Promise.all(demoCargas.map(async ({ carga: item, eventos }) => [item.id, await gerarCadeia(eventos)] as const))
      .then((resultados) => {
        if (!ativo) return;
        const cadeias = Object.fromEntries(resultados);
        setDemoCadeias(cadeias);
        setLogs(converterLogs(cadeias[demoCargas[0].carga.id]));
        void verificarCadeia(cadeias[demoCargas[0].carga.id]).then(setChainResult);
      });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    setCurrentTime(formatarData(new Date().toISOString()));
    const interval = setInterval(() => setCurrentTime(formatarData(new Date().toISOString())), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    async function carregar() {
      if (!apiUrl) {
        setLoading(false);
        return;
      }
      try {
        const remoto = await fetchApi<Carga[]>('/cargas', controller.signal);
        if (!remoto.length) throw new Error('API não retornou cargas');
        setCargas(remoto);
        setSelectedId(remoto[0].id);
        await loadCargaData(remoto[0].id, controller.signal);
        setConnected(true);
      } catch {
        setConnected(false);
        setChainResult(null);
      } finally {
        setLoading(false);
        window.clearTimeout(timeout);
      }
    }
    void carregar();
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (connected || !demoCadeias[selectedId]) return;
    void aplicarDemo(selectedId);
  }, [connected, demoCadeias, selectedId]);

  useEffect(() => {
    if (!connected || !selectedId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void loadCargaData(selectedId, controller.signal).catch(() => {
      setConnected(false);
      setChainResult(null);
    }).finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [connected, selectedId]);

  async function toggleSeal() {
    if (!carga) return;
    const action = doorLocked ? 'ABRIR' : 'BLOQUEAR';
    if (!connected || !apiUrl) {
      setCargas((atual) => atual.map((item) => item.id === selectedId
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
      const atualizada = await response.json() as Carga;
      setCargas((atual) => atual.map((item) => item.id === atualizada.id ? atualizada : item));
      await loadCargaData(atualizada.id, new AbortController().signal);
    } catch {
      setConnected(false);
      setChainResult(null);
      setCargas((atual) => atual.map((item) => item.id === selectedId
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
              AgroGuard <span style={{ color: '#64748b', fontWeight: 'normal' }}>| Plataforma de integridade de cargas</span>
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#0f172a', padding: '6px 14px', borderRadius: '6px', border: '1px solid #1e293b', fontSize: '12px', fontFamily: 'monospace' }}>
            <span style={{ color: connected ? '#10b981' : '#f59e0b' }}>{connected ? '● CONECTADO À API' : '● MODO DEMONSTRAÇÃO'}</span>
            <span style={{ color: '#334155' }}>|</span><span style={{ color: '#94a3b8' }}>{currentTime || '00/00/0000 00:00:00'}</span>
          </div>
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: connected ? '#34d399' : '#fbbf24', background: connected ? '#064e3b' : '#78350f', padding: '5px 9px', borderRadius: '4px' }}>
            {connected ? 'Conectado à API' : 'Modo demonstração (dados simulados)'}
          </span>
          <label style={{ fontSize: '12px', color: '#94a3b8' }}>
            Carga:{' '}
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', padding: '6px', borderRadius: '4px' }}>
              {cargas.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.descricao}</option>)}
            </select>
          </label>
        </div>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
            <span style={{ fontSize: '11px', color: '#00f2fe', fontFamily: 'monospace', background: '#082f49', padding: '3px 8px', borderRadius: '4px' }}>MONITORAMENTO DE CARGA</span>
            <h2 style={{ margin: '14px 0 4px', fontSize: '24px', color: '#fff', fontFamily: 'monospace' }}>{carga.id}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>{carga.descricao}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Rota</span><strong>{carga.origem} ➔ {carga.destino}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Faixa segura</span><strong style={{ color: '#00f2fe' }}>{connected ? 'Dados da API' : demo.faixa}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Integridade</span><strong style={{ color: chainResult?.integra === false ? '#f43f5e' : '#10b981' }}>{connected ? (chainResult?.integra ? 'Corrente íntegra ✓' : `Corrente violada a partir do registro ${chainResult?.primeiroInvalido ?? 1}`) : (chainResult?.integra ? 'Corrente íntegra ✓' : 'Verificando...')}</strong></div>
              <div><span style={{ color: '#64748b', display: 'block', fontSize: '10px' }}>Atualização</span><strong>{currentTime || '00/00/0000 00:00:00'}</strong></div>
            </div>
            <button onClick={() => void toggleSeal()} style={{ marginTop: '20px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              {doorLocked ? 'Abrir lacre' : 'Bloquear lacre'}
            </button>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>TELEMETRIA {loading ? '· CARREGANDO' : '· ÚLTIMA LEITURA'}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Temperatura</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.temperatura.toFixed(1)} °C</strong><MiniGraph data={[4.1, 4.2, telemetria.temperatura]} color="#10b981" /></div>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Umidade</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.umidade.toFixed(1)} %</strong><MiniGraph data={[46, 45, telemetria.umidade]} color="#00f2fe" /></div>
            </div>
            <div style={{ marginTop: '20px', color: '#00f2fe', fontFamily: 'monospace', fontSize: '12px' }}>GPS: {telemetria.latitude.toFixed(4)}, {telemetria.longitude.toFixed(4)}</div>
          </div>
        </section>

        <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div><h3 style={{ margin: 0, fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontFamily: 'monospace' }}>Log de eventos e auditoria</h3><span style={{ fontSize: '11px', color: '#64748b' }}>Hash SHA-256 encadeado</span></div>
            <span style={{ fontSize: '11px', color: chainResult?.integra ? '#34d399' : '#fb7185' }}>{chainResult?.integra ? 'Corrente íntegra ✓' : `Corrente violada a partir do registro ${chainResult?.primeiroInvalido ?? 1}`}</span>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead><tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontFamily: 'monospace', fontSize: '10px' }}><th style={{ padding: '10px' }}>Data e hora</th><th style={{ padding: '10px' }}>Evento</th><th style={{ padding: '10px' }}>Situação</th><th style={{ padding: '10px' }}>Hash</th></tr></thead>
              <tbody>{logs.map((log) => <tr key={log.id} style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '10px', fontFamily: 'monospace', color: '#94a3b8' }}>{log.timestamp}</td><td style={{ padding: '10px', color: '#fff', fontWeight: 'bold' }}>{log.eventType}</td><td style={{ padding: '10px', color: log.status === 'NORMAL' ? '#34d399' : '#fbbf24' }}>{log.status}</td><td style={{ padding: '10px', fontFamily: 'monospace', color: '#00f2fe', fontSize: '11px' }}>{log.hash}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
