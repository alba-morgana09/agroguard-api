import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  adulterarRegistro,
  criarRegistro,
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
  status: string;
  hash: string;
  hashAnterior?: string;
  chainIndex: number;
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

type Situacao = 'Íntegra' | 'Atenção' | 'Em risco';

interface DemoRuntime {
  telemetria: Telemetria;
  statusLacre: string;
  situacao: Situacao;
  alerta: string | null;
  temperaturas: number[];
  umidades: number[];
  progressoRota: number;
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

function converterLogs(logs: Array<RegistroAuditoria | LogApi>, invertido = false): SecurityLog[] {
  return logs.map((log, index) => ({
    id: String(log.id),
    timestamp: formatarData(log.timestamp),
    eventType: log.evento,
    status: 'status' in log ? log.status : 'NORMAL',
    hash: log.hash,
    hashAnterior: log.hashAnterior,
    chainIndex: invertido ? logs.length - index : index + 1,
  }));
}

function MiniGraph({
  data,
  color,
  safeMin,
  safeMax,
}: {
  data: number[];
  color: string;
  safeMin?: number;
  safeMax?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * 200;
    const y = 30 - ((value - min) / (max - min || 1)) * 24 - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ width: '100%', height: '30px', overflow: 'hidden', marginTop: '8px' }}>
      <svg width="100%" height="30" viewBox="0 0 200 30" preserveAspectRatio="none">
        {safeMin !== undefined && safeMax !== undefined && (
          <>
            <line x1="0" x2="200" y1={30 - ((safeMin - min) / (max - min || 1)) * 24 - 3} y2={30 - ((safeMin - min) / (max - min || 1)) * 24 - 3} stroke="#34d399" strokeDasharray="4 3" />
            <line x1="0" x2="200" y1={30 - ((safeMax - min) / (max - min || 1)) * 24 - 3} y2={30 - ((safeMax - min) / (max - min || 1)) * 24 - 3} stroke="#34d399" strokeDasharray="4 3" />
          </>
        )}
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {data.map((value, index) => {
          const x = (index / Math.max(data.length - 1, 1)) * 200;
          const y = 30 - ((value - min) / (max - min || 1)) * 24 - 3;
          const foraDaFaixa = (safeMin !== undefined && value < safeMin) || (safeMax !== undefined && value > safeMax);
          return <circle key={`${index}-${value}`} cx={x} cy={y} r="2.5" fill={foraDaFaixa ? '#f43f5e' : color} />;
        })}
      </svg>
    </div>
  );
}

function Historico({ children }: { children: ReactNode }) {
  return <details style={{ marginBottom: '20px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '14px' }}>
    <summary style={{ cursor: 'pointer', color: '#f8fafc', fontWeight: 'bold' }}>O que estou vendo?</summary>
    <div style={{ display: 'grid', gap: '8px', marginTop: '12px', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.45 }}>{children}</div>
  </details>;
}

const buttonStyle = {
  background: '#111827',
  color: '#e2e8f0',
  border: '1px solid',
  padding: '8px 10px',
  borderRadius: '5px',
  fontSize: '11px',
  cursor: 'pointer',
};

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
  const [demoCadeiasOriginais, setDemoCadeiasOriginais] = useState<Record<string, RegistroAuditoria[]>>({});
  const [demoRuntime, setDemoRuntime] = useState<Record<string, DemoRuntime>>({});

  const carga = useMemo(
    () => cargas.find((item) => item.id === selectedId) ?? cargas[0],
    [cargas, selectedId],
  );
  const demo = demoCargas.find((item) => item.carga.id === selectedId) ?? demoCargas[0];
  const runtime = demoRuntime[selectedId];
  const doorLocked = carga?.statusLacre !== 'ABERTO' && carga?.statusLacre !== 'VIOLADO';
  const situacao: Situacao | null = connected
    ? (chainResult?.integra ? 'Íntegra' : 'Em risco')
    : (runtime?.situacao ?? null);
  const situacaoCor = situacao === 'Em risco' ? '#f43f5e' : situacao === 'Atenção' ? '#fbbf24' : '#10b981';

  async function aplicarDemo(id: string) {
    const selecionada = demoCargas.find((item) => item.carga.id === id) ?? demoCargas[0];
    const cadeia = demoCadeias[selecionada.carga.id] ?? [];
    const estado = demoRuntime[selecionada.carga.id];
    setTelemetria(estado?.telemetria ?? { ...selecionada.telemetria, timestamp: new Date().toISOString() });
    setLogs(converterLogs([...cadeia].reverse(), true));
    setChainResult(await verificarCadeia(cadeia));
  }

  async function registrarEventoDemo(
    evento: string,
    status: Situacao,
    atualizar: (atual: DemoRuntime) => DemoRuntime,
  ) {
    if (connected || !runtime) return;
    const cadeiaAtual = demoCadeias[selectedId] ?? [];
    const proximoId = (cadeiaAtual.at(-1)?.id ?? 0) + 1;
    const registro = await criarRegistro({
      id: proximoId,
      timestamp: new Date().toISOString(),
      evento,
      status,
    }, cadeiaAtual.at(-1)?.hash ?? '0'.repeat(64));
    const novaCadeia = [...cadeiaAtual, registro];
    const novoRuntime = atualizar(runtime);
    setDemoCadeias((atual) => ({ ...atual, [selectedId]: novaCadeia }));
    setDemoRuntime((atual) => ({ ...atual, [selectedId]: novoRuntime }));
    setCargas((atual) => atual.map((item) => item.id === selectedId
      ? { ...item, statusLacre: novoRuntime.statusLacre }
      : item));
    setTelemetria(novoRuntime.telemetria);
    setLogs(converterLogs([registro, ...[...cadeiaAtual].reverse()], true));
    setChainResult(await verificarCadeia(novaCadeia));
  }

  async function adulterarRegistroDemo() {
    if (connected) return;
    const cadeia = demoCadeias[selectedId] ?? [];
    if (cadeia.length < 2) return;
    const indice = Math.floor(cadeia.length / 2);
    const adulterada = adulterarRegistro(cadeia, indice, 'Sem ocorrências');
    setDemoCadeias((atual) => ({ ...atual, [selectedId]: adulterada }));
    setLogs(converterLogs([...adulterada].reverse(), true));
    setChainResult(await verificarCadeia(adulterada));
  }

  async function restaurarRegistroDemo() {
    if (connected) return;
    const original = demoCadeiasOriginais[selectedId];
    if (!original) return;
    setDemoCadeias((atual) => ({ ...atual, [selectedId]: original }));
    setLogs(converterLogs([...original].reverse(), true));
    setChainResult(await verificarCadeia(original));
  }

  async function simularRefrigerador() {
    if (!runtime || connected) return;
    const proximaTemperatura = runtime.telemetria.temperatura + 1.5;
    const limite = selectedId === 'DEMO-002' ? 4 : 8;
    const situacao: Situacao = selectedId === 'DEMO-003'
      ? (runtime.temperaturas.length > 1 ? 'Em risco' : 'Atenção')
      : (proximaTemperatura > limite ? 'Em risco' : 'Atenção');
    await registrarEventoDemo(
      'Refrigerador falhou',
      situacao,
      (atual) => ({
        ...atual,
        situacao,
        alerta: proximaTemperatura > limite
          ? 'Alerta: temperatura acima da faixa segura.'
          : 'Atenção: temperatura subindo.',
        telemetria: { ...atual.telemetria, temperatura: proximaTemperatura, timestamp: new Date().toISOString() },
        temperaturas: [...atual.temperaturas, proximaTemperatura],
      }),
    );
  }

  async function simularLacreViolado() {
    await registrarEventoDemo('Lacre violado', 'Em risco', (atual) => ({
      ...atual,
      statusLacre: 'VIOLADO',
      situacao: 'Em risco',
      alerta: 'Alerta: o lacre foi violado.',
    }));
  }

  async function simularDesvio() {
    await registrarEventoDemo('Desvio de rota detectado', 'Em risco', (atual) => ({
      ...atual,
      situacao: 'Em risco',
      alerta: 'Alerta: a carga saiu da rota planejada.',
      telemetria: { ...atual.telemetria, latitude: atual.telemetria.latitude + 0.18, longitude: atual.telemetria.longitude + 0.22, timestamp: new Date().toISOString() },
    }));
  }

  async function voltarAoNormal() {
    if (!runtime || connected) return;
    const original = demoCargas.find((item) => item.carga.id === selectedId);
    if (!original) return;
    await registrarEventoDemo('Carga voltou ao normal', 'Íntegra', (atual) => ({
      ...atual,
      telemetria: { ...original.telemetria, timestamp: new Date().toISOString() },
      statusLacre: 'BLOQUEADO',
      situacao: 'Íntegra',
      alerta: null,
      temperaturas: [...atual.temperaturas, original.telemetria.temperatura],
      umidades: [...atual.umidades, original.telemetria.umidade],
    }));
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
        setDemoCadeiasOriginais(cadeias);
        setDemoRuntime(Object.fromEntries(demoCargas.map(({ carga: item, telemetria }) => [item.id, {
          telemetria: { ...telemetria, timestamp: new Date().toISOString() },
          statusLacre: item.statusLacre,
          situacao: 'Íntegra' as Situacao,
          alerta: null,
          temperaturas: Array(20).fill(telemetria.temperatura),
          umidades: Array(20).fill(telemetria.umidade),
          progressoRota: 12,
        }])));
        setLogs(converterLogs([...cadeias[demoCargas[0].carga.id]].reverse(), true));
        void verificarCadeia(cadeias[demoCargas[0].carga.id]).then(setChainResult);
      });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (connected || !runtime) return;
    const atualizarTelemetria = () => {
      if (document.visibilityState !== 'visible') return;
      const temperatura = Math.max(0, runtime.telemetria.temperatura + (Math.random() - 0.5) * 0.2);
      const umidade = Math.min(100, Math.max(0, runtime.telemetria.umidade + (Math.random() - 0.5) * 1.2));
      const proximaTelemetria = { ...runtime.telemetria, temperatura, umidade, timestamp: new Date().toISOString() };
      setDemoRuntime((atual) => {
        const estado = atual[selectedId];
        if (!estado) return atual;
        return {
          ...atual,
          [selectedId]: {
            ...estado,
            telemetria: proximaTelemetria,
            temperaturas: [...estado.temperaturas, temperatura].slice(-30),
            umidades: [...estado.umidades, umidade].slice(-30),
            progressoRota: Math.min(100, estado.progressoRota + 0.3),
          },
        };
      });
      setTelemetria(proximaTelemetria);
    };
    const interval = window.setInterval(atualizarTelemetria, 3000);
    return () => window.clearInterval(interval);
  }, [connected, runtime, selectedId]);

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
      await registrarEventoDemo(
        action === 'ABRIR' ? 'Lacre aberto' : 'Lacre bloqueado',
        action === 'ABRIR' ? 'Atenção' : 'Íntegra',
        (atual) => ({
          ...atual,
          statusLacre: action === 'ABRIR' ? 'ABERTO' : 'BLOQUEADO',
          situacao: action === 'ABRIR' ? 'Atenção' : 'Íntegra',
          alerta: action === 'ABRIR' ? 'Atenção: o lacre está aberto.' : null,
        }),
      );
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

        <p style={{ margin: '0 0 16px', color: '#cbd5e1', fontSize: '15px', lineHeight: 1.5 }}>
          Imagine um caminhão levando vacinas. Se a temperatura passar do limite ou o lacre for aberto, este painel avisa e guarda tudo num caderno que não pode ser alterado sem deixar rastro.
        </p>
        <Historico>
          <div><strong>Temperatura:</strong> mostra se a carga está quente ou fria demais.</div>
          <div><strong>Lacre:</strong> indica se a porta está protegida, aberta ou violada.</div>
          <div><strong>Rota:</strong> acompanha o caminho esperado entre a origem e o destino.</div>
          <div><strong>Trilha de auditoria:</strong> registra o que aconteceu, na ordem em que aconteceu.</div>
          <div><strong>Hash:</strong> é o código de cada registro; se alguém mudar uma linha, o painel percebe.</div>
        </Historico>

        <section className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
            <span style={{ fontSize: '11px', color: '#00f2fe', fontFamily: 'monospace', background: '#082f49', padding: '3px 8px', borderRadius: '4px' }}>MONITORAMENTO DE CARGA</span>
            <h2 style={{ margin: '14px 0 4px', fontSize: '24px', color: '#fff', fontFamily: 'monospace' }}>{carga.id}</h2>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b' }}>{carga.descricao}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
              <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>Rota</span><strong>{carga.origem} ➔ {carga.destino}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>Faixa segura</span><strong style={{ color: '#00f2fe' }}>{connected ? 'Dados da API' : demo.faixa}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>Situação da carga</span><strong style={{ color: situacaoCor }}>{situacao ?? 'Verificando...'}</strong></div>
              <div><span style={{ color: '#94a3b8', display: 'block', fontSize: '10px' }}>Atualização</span><strong>{currentTime || '00/00/0000 00:00:00'}</strong></div>
            </div>
            <button onClick={() => void toggleSeal()} style={{ marginTop: '20px', background: '#1e293b', color: '#cbd5e1', border: '1px solid #334155', padding: '10px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              {doorLocked ? 'Abrir lacre' : 'Bloquear lacre'}
            </button>
            {!connected && (
              <div style={{ marginTop: '20px', padding: '14px', border: '1px solid #334155', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '10px', color: '#fff' }}>Simular um problema</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button onClick={() => void simularRefrigerador()} style={{ ...buttonStyle, borderColor: '#fbbf24' }}>Refrigerador falhou</button>
                  <button onClick={() => void simularLacreViolado()} style={{ ...buttonStyle, borderColor: '#f43f5e' }}>Lacre violado</button>
                  <button onClick={() => void simularDesvio()} style={{ ...buttonStyle, borderColor: '#f43f5e' }}>Desvio de rota</button>
                  <button onClick={() => void voltarAoNormal()} style={{ ...buttonStyle, borderColor: '#10b981' }}>Voltar ao normal</button>
                </div>
              </div>
            )}
            {!connected && runtime?.alerta && (
              <div style={{ marginTop: '14px', padding: '12px', color: '#fecaca', background: '#450a0a', border: '1px solid #f43f5e', borderRadius: '6px', fontWeight: 'bold' }}>
                {runtime.alerta}
              </div>
            )}
            {!connected && (
              <div style={{ marginTop: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Progresso da rota</span><strong>{runtime?.progressoRota.toFixed(0)}%</strong>
                </div>
                <div style={{ height: '10px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="route-progress" style={{ width: `${runtime?.progressoRota ?? 0}%`, height: '100%', background: '#00f2fe', borderRadius: '999px' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px', marginTop: '5px' }}>
                  <span>{carga.origem}</span><span>{carga.destino}</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>TELEMETRIA {loading ? '· CARREGANDO' : '· ÚLTIMA LEITURA'}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Temperatura</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.temperatura.toFixed(1)} °C</strong><MiniGraph data={connected ? [telemetria.temperatura] : runtime?.temperaturas ?? [telemetria.temperatura]} color="#10b981" safeMin={selectedId === 'DEMO-001' ? 2 : selectedId === 'DEMO-002' ? 0 : undefined} safeMax={selectedId === 'DEMO-001' ? 8 : selectedId === 'DEMO-002' ? 4 : undefined} /></div>
              <div><span style={{ color: '#94a3b8', fontSize: '11px' }}>Umidade</span><strong style={{ display: 'block', color: '#fff', fontSize: '32px' }}>{telemetria.umidade.toFixed(1)} %</strong><MiniGraph data={connected ? [telemetria.umidade] : runtime?.umidades ?? [telemetria.umidade]} color="#00f2fe" safeMax={!connected && selectedId === 'DEMO-003' ? 60 : undefined} /></div>
            </div>
            <div style={{ marginTop: '20px', color: '#00f2fe', fontFamily: 'monospace', fontSize: '12px' }}>GPS: {telemetria.latitude.toFixed(4)}, {telemetria.longitude.toFixed(4)}</div>
          </div>
        </section>

        <section className="dashboard-grid" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
            <div><h3 style={{ margin: 0, fontSize: '14px', color: '#fff', textTransform: 'uppercase', fontFamily: 'monospace' }}>Log de eventos e auditoria</h3><span style={{ fontSize: '11px', color: '#64748b' }}>Hash SHA-256 encadeado</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {!connected && (
                <>
                  <button onClick={() => void adulterarRegistroDemo()} style={{ ...buttonStyle, borderColor: '#f43f5e' }}>Adulterar um registro</button>
                  <button onClick={() => void restaurarRegistroDemo()} style={{ ...buttonStyle, borderColor: '#10b981' }}>Restaurar registro</button>
                </>
              )}
              <span style={{ fontSize: '11px', color: chainResult?.integra ? '#34d399' : '#fb7185' }}>{chainResult?.integra ? 'Corrente íntegra ✓' : `Corrente violada a partir do registro ${chainResult?.primeiroInvalido ?? 1}`}</span>
            </div>
          </div>
          {!connected && <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '11px' }}>Mudou uma linha? O código dela não bate mais, e todas as seguintes também ficam inválidas.</p>}
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead><tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', fontFamily: 'monospace', fontSize: '10px' }}><th style={{ padding: '10px' }}>Data e hora</th><th style={{ padding: '10px' }}>Evento</th><th style={{ padding: '10px' }}>Situação</th><th style={{ padding: '10px' }}>Hash</th></tr></thead>
              <tbody>{logs.map((log) => {
                const invalida = !connected
                  && chainResult?.integra === false
                  && log.chainIndex >= (chainResult.primeiroInvalido ?? Number.MAX_SAFE_INTEGER);
                return <tr key={log.id} style={{ borderBottom: '1px solid #1e293b', background: invalida ? '#450a0a' : 'transparent', outline: invalida ? '1px solid #7f1d1d' : undefined }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: invalida ? '#fca5a5' : '#94a3b8' }}>{log.timestamp}</td>
                  <td style={{ padding: '10px', color: invalida ? '#fecaca' : '#fff', fontWeight: 'bold' }}>{log.eventType}</td>
                  <td style={{ padding: '10px', color: log.status === 'Em risco' ? '#f43f5e' : log.status === 'Atenção' ? '#fbbf24' : '#34d399' }}>{log.status}</td>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: invalida ? '#fca5a5' : '#00f2fe', fontSize: '11px' }}>{log.hash}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
