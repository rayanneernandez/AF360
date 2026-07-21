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

// --- RH: colaboradores (rh_colaboradores no Supabase do Lovable) ---
// Tipo "cru" — reflete as colunas reais da tabela (ver af360-api/src/LOVABLE_API.md).
// Deixamos solto (Record) porque rh_colaboradores tem ~87 colunas e só usamos
// um subconjunto por vez; os campos abaixo são os que já sabemos que existem.

export type RhColaboradorRaw = {
  id: string;
  nome_completo: string | null;
  cargo: string | null;
  setor: string | null;
  posto_trabalho: string | null;
  matricula: string | null;
  codigo_interno: string | null;
  cpf: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  status: string | null;
  email_pessoal: string | null;
  email_corporativo: string | null;
  celular: string | null;
  whatsapp: string | null;
  salario_base: number | null;
  [key: string]: unknown;
};

export type RhStats = {
  total: number;
  by_status: Record<string, number>;
};

// Sem limit/offset o backend traz TODOS os colaboradores, paginando
// internamente por conta própria (o Lovable corta em 1000/2000 por
// chamada, então isso é feito em vários pedidos, não um só).
export async function fetchRhColaboradores(params: { q?: string } = {}): Promise<RhColaboradorRaw[]> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  search.set('all', '1');
  const json = await api.get(`/api/rh/colaboradores?${search.toString()}`);
  return json.data as RhColaboradorRaw[];
}

export async function fetchRhStats(): Promise<RhStats> {
  const json = await api.get('/api/rh/colaboradores/stats');
  return json.data as RhStats;
}

// --- RH: Dashboard (métricas calculadas em cima de rh_colaboradores/empresas) ---

export type RhRegiaoTurnover = { nome: string; hc: number; saidas: number; taxa: string };
export type RhMotivoDesligamento = { label: string; count: number; pct: number; color: string };

export type RhTurnoverData = {
  geralPct: string;
  geralMeta: string;
  voluntarioPct: string;
  voluntarioMeta: string;
  involuntarioPct: string;
  involuntarioMeta: string;
  insight: string | null;
  regioes: RhRegiaoTurnover[];
  ate90diasPct: string;
  ate90diasMeta: string;
  motivos: RhMotivoDesligamento[] | null;
  motivosVazio: string;
  historicoLabels: string[];
  historicoGeral: number[];
  historicoVoluntario: number[];
};

export async function fetchRhTurnover(params: {
  granularity: 'mes' | 'ano';
  year: number;
  month: number;
}): Promise<RhTurnoverData> {
  const search = new URLSearchParams({
    granularity: params.granularity,
    year: String(params.year),
    month: String(params.month),
  });
  const json = await api.get(`/api/rh/dashboard/turnover?${search.toString()}`);
  return json.data as RhTurnoverData;
}

export type RhDashboardResumo = {
  turnoverPct: string;
  movimentacaoPct: string;
  admissoes: number;
  admissoesChangePct: string;
  demissoes: number;
  demissoesChangePct: string;
  demissoesRescisao: string;
  folhaAtivos: string;
  quadro: { ativos: number; ferias: number; afastados: number; novos90d: number };
  engajamento: { aderencia: string | null; cobertura: string; tempoCasa: string; exp30d: number };
  admissoesDemissoesChart: Array<{ label: string; adm: number; dem: number }>;
  headcountEvolution: number[];
  headcountMonths: string[];
  topSetores: Array<{ label: string; value: number }>;
  topUnidades: Array<{ name: string; value: number }>;
  genderDistribution: Array<{ label: string; color: string; count: number; pct: number }>;
};

export async function fetchRhDashboardResumo(params: {
  granularity: 'mes' | 'ano';
  year: number;
  month: number;
}): Promise<RhDashboardResumo> {
  const search = new URLSearchParams({
    granularity: params.granularity,
    year: String(params.year),
    month: String(params.month),
  });
  const json = await api.get(`/api/rh/dashboard/resumo?${search.toString()}`);
  return json.data as RhDashboardResumo;
}

export type RhCategoryBreakdown = { label: string; count: number; value: string };

export type RhAdmissoesDetalhe = {
  total: number;
  comSalarioInformado: number;
  custoAdicional: string;
  salarioMedio: string;
  aindaAtivos: number;
  jaDesligados: number;
  aindaAtivosPct: number;
  jaDesligadosPct: number;
  maioresSalarios: Array<{ nome: string; cargo: string; setor: string; admissao: string; salario: string }>;
  maioresSalariosVazio: string;
  porCargo: RhCategoryBreakdown[];
  porSetor: RhCategoryBreakdown[];
  porEmpresa: RhCategoryBreakdown[];
  historicoLabels: string[];
  historicoAdmissoes: number[];
  historicoCusto: number[];
};

export type RhDemissoesDetalhe = {
  total: number;
  comRescisaoLancada: number;
  totalRescisoes: string;
  ticketMedio: string;
  tempoCasa: string;
  voluntario: number;
  voluntarioPct: number;
  involuntario: number;
  involuntarioPct: number;
  maioresValores: Array<{ nome: string; motivo: string; tempoCasa: string; demissao: string; valor: string }>;
  maioresValoresVazio: string;
  motivos: Array<{ label: string; count: number; pct: number; valor: string; color: string }>;
  motivosVazio: string;
  porCargo: RhCategoryBreakdown[];
  porSetor: RhCategoryBreakdown[];
  porEmpresa: RhCategoryBreakdown[];
  historicoLabels: string[];
  historicoDemissoes: number[];
  historicoRescisoes: number[];
};

export async function fetchRhAdmissoesDetalhe(params: {
  granularity: 'mes' | 'ano';
  year: number;
  month: number;
}): Promise<RhAdmissoesDetalhe> {
  const search = new URLSearchParams({
    granularity: params.granularity,
    year: String(params.year),
    month: String(params.month),
  });
  const json = await api.get(`/api/rh/dashboard/admissoes?${search.toString()}`);
  return json.data as RhAdmissoesDetalhe;
}

export async function fetchRhDemissoesDetalhe(params: {
  granularity: 'mes' | 'ano';
  year: number;
  month: number;
}): Promise<RhDemissoesDetalhe> {
  const search = new URLSearchParams({
    granularity: params.granularity,
    year: String(params.year),
    month: String(params.month),
  });
  const json = await api.get(`/api/rh/dashboard/demissoes?${search.toString()}`);
  return json.data as RhDemissoesDetalhe;
}

// --- RH: Férias (rh_ferias) ---

export type RhFeriasItem = {
  id: string;
  nome: string;
  unidade: string;
  inicioLabel: string;
  fimLabel: string;
  dias: number | null;
  statusRaw: string;
  statusLabel: string;
  statusColor: string;
  statusTint: string;
};

export type RhFeriasDetalhe = {
  stats: { andamento: number; programadas: number; concluidas: number };
  itens: RhFeriasItem[];
};

export async function fetchRhFeriasDetalhe(): Promise<RhFeriasDetalhe> {
  const json = await api.get('/api/rh/dashboard/ferias');
  return json.data as RhFeriasDetalhe;
}

// --- RH: Período de Experiência (derivado de rh_colaboradores) ---

export type RhExperienciaItem = {
  id: string;
  nome: string;
  cargo: string;
  unidade: string;
  totalDays: number | null;
  remainingDays: number;
  dueLabel: string;
};

export type RhExperienciaDetalhe = {
  stats: { emExperiencia: number; vencem7d: number; vencem30d: number };
  itens: RhExperienciaItem[];
};

export async function fetchRhExperienciaDetalhe(): Promise<RhExperienciaDetalhe> {
  const json = await api.get('/api/rh/dashboard/experiencia');
  return json.data as RhExperienciaDetalhe;
}

// --- RH: Transferências (rh_transferencias) ---

export type RhTransferenciaItem = {
  id: string;
  colaboradorNome: string;
  empresaOrigemNome: string | null;
  empresaDestinoNome: string | null;
  setorOrigem: string | null;
  setorDestino: string | null;
  cargoOrigem: string | null;
  cargoDestino: string | null;
  salarioAnterior: string | null;
  salarioNovo: string | null;
  motivo: string | null;
  observacao: string | null;
  status: string | null;
  statusLabel: string;
  statusColor: string;
  statusTint: string;
  vigenciaLabel: string;
};

export type RhStatusCount = {
  status: string | null;
  label: string;
  color: string;
  tint: string;
  count: number;
};

export type RhTransferenciasDetalhe = {
  items: RhTransferenciaItem[];
  total: number;
  statusSummary: RhStatusCount[];
};

export async function fetchRhTransferenciasDetalhe(): Promise<RhTransferenciasDetalhe> {
  const json = await api.get('/api/rh/dashboard/transferencias');
  return json.data as RhTransferenciasDetalhe;
}

// --- RH: Folha de Pagamento (rh_folha_competencias) ---

export type RhFolhaCompetencia = {
  id: string;
  ano: number;
  mes: number;
  label: string;
  status: string | null;
  statusLabel: string;
  statusColor: string;
  statusTint: string;
  totalColaboradores: number | null;
  totalBruto: string | null;
  totalLiquido: string | null;
  totalFgts: string | null;
  dataPagamentoLabel: string | null;
  dataPrevistaPagamentoLabel: string | null;
  observacao: string | null;
};

export type RhFolhaDetalhe = {
  items: RhFolhaCompetencia[];
  total: number;
};

export async function fetchRhFolhaDetalhe(): Promise<RhFolhaDetalhe> {
  const json = await api.get('/api/rh/dashboard/folha');
  return json.data as RhFolhaDetalhe;
}
