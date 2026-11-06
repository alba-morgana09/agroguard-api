export const HASH_INICIAL = '0'.repeat(64);

export interface RegistroAuditoria {
  id: number;
  timestamp: string;
  evento: string;
  status: string;
  hashAnterior: string;
  hash: string;
}

export interface EventoAuditoria {
  id: number;
  timestamp: string;
  evento: string;
  status: string;
}

export async function calcularHash(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function criarRegistro(
  evento: EventoAuditoria,
  hashAnterior: string,
): Promise<RegistroAuditoria> {
  const texto = `${evento.id}|${evento.timestamp}|${evento.evento}|${evento.status}|${hashAnterior}`;
  return {
    ...evento,
    hashAnterior,
    hash: await calcularHash(texto),
  };
}

export async function gerarCadeia(eventos: EventoAuditoria[]): Promise<RegistroAuditoria[]> {
  const cadeia: RegistroAuditoria[] = [];
  let hashAnterior = HASH_INICIAL;

  for (const evento of eventos) {
    const registro = await criarRegistro(evento, hashAnterior);
    cadeia.push(registro);
    hashAnterior = registro.hash;
  }

  return cadeia;
}

export async function verificarCadeia(
  cadeia: RegistroAuditoria[],
): Promise<{ integra: boolean; primeiroInvalido: number | null }> {
  let hashAnterior = HASH_INICIAL;

  for (const [indice, registro] of cadeia.entries()) {
    const esperado = await calcularHash(
      `${registro.id}|${registro.timestamp}|${registro.evento}|${registro.status}|${hashAnterior}`,
    );
    if (registro.hashAnterior !== hashAnterior || registro.hash !== esperado) {
      return { integra: false, primeiroInvalido: indice + 1 };
    }
    hashAnterior = registro.hash;
  }

  return { integra: true, primeiroInvalido: null };
}
