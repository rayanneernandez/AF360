// Cliente simples para a af360-api (Vercel), que faz a ponte com o Postgres.
// Troque API_BASE_URL/API_KEY se o projeto do Vercel ou a chave mudarem.

const API_BASE_URL = 'https://af-360.vercel.app';
const API_KEY = 'af360-3x9k2mQpL7vZtR8wYbN4cJ';

async function request(path: string, options: { method?: string; body?: unknown } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok || !json || json.ok === false) {
    const message = json?.message || json?.error || `Erro ${response.status}`;
    throw new Error(message);
  }

  return json;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body }),
};

// --- Diretoria: Fale com a Diretoria (conversas de WhatsApp) ---
// Status real vem de dir_contatos.chat_status (fonte de verdade no Supabase
// do Lovable) — não é mais um controle só local do app.

export type ConversaChatStatus = 'fila' | 'ativo' | 'finalizado';

export type ConversaMetadata = {
  tags?: string[];
  notas?: string;
  [key: string]: unknown;
};

export type ConversaResumo = {
  telefone: string;
  nome_contato: string | null;
  texto: string | null;
  tipo_mensagem: string;
  direcao: 'in' | 'out';
  criado_em: string | null;
  total_mensagens: number | null;
  pendentes: number;
  chat_status: ConversaChatStatus;
  blocked: boolean;
  muted: boolean;
  metadata: ConversaMetadata | null;
};

export type ConversaMensagem = {
  id: string | number;
  mensagem_id_zapi: string | null;
  telefone: string;
  nome_contato: string | null;
  direcao: 'in' | 'out';
  tipo_mensagem: string;
  texto: string | null;
  audio_url: string | null;
  criado_em: string;
  metadata: Record<string, unknown> | null;
};

export async function fetchConversas(q?: string): Promise<ConversaResumo[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const json = await api.get(`/api/diretoria/conversas${query}`);
  return json.data as ConversaResumo[];
}

export async function fetchMensagens(telefone: string): Promise<ConversaMensagem[]> {
  const json = await api.get(`/api/diretoria/conversas/${encodeURIComponent(telefone)}/mensagens`);
  return json.data as ConversaMensagem[];
}

export async function updateConversa(
  telefone: string,
  patch: { chat_status?: ConversaChatStatus; metadata?: ConversaMetadata }
): Promise<Record<string, unknown>> {
  const json = await api.patch(`/api/diretoria/conversas/${encodeURIComponent(telefone)}`, patch);
  return json.data;
}
