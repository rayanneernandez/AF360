// Cliente simples para a af360-api (Vercel), que faz a ponte com o Postgres.
// Troque API_BASE_URL/API_KEY se o projeto do Vercel ou a chave mudarem.

const API_BASE_URL = 'https://af-360.vercel.app';
const API_KEY = 'af360-3x9k2mQpL7vZtR8wYbN4cJ';

// Erro de API com o código cru do backend preservado (ex: 'invalid_credentials',
// 'auth_not_configured') além da mensagem — quem chama pode decidir mostrar uma
// mensagem amigável própria em vez do texto técnico que vem do servidor/Supabase.
export class ApiError extends Error {
  code: string | null;
  status: number;

  constructor(message: string, code: string | null, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(path: string, options: { method?: string; body?: unknown } = {}) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // fetch em si falhou (sem internet, DNS, timeout, etc.) — nem chegou a ter
    // resposta do servidor, então não tem "código de erro" de negócio nenhum.
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 'network_error', 0);
  }

  const json = await response.json().catch(() => null);

  if (!response.ok || !json || json.ok === false) {
    const message = json?.message || json?.error || `Erro ${response.status}`;
    throw new ApiError(message, json?.error ?? null, response.status);
  }

  return json;
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) => request(path, { method: 'POST', body }),
  patch: (path: string, body?: unknown) => request(path, { method: 'PATCH', body }),
  put: (path: string, body?: unknown) => request(path, { method: 'PUT', body }),
  delete: (path: string, body?: unknown) => request(path, { method: 'DELETE', body }),
};

// actorId (profileId de quem está logado, salvo no login) vai como query
// string ?actorId=... nas rotas admin — o af360-api repassa como header
// x-actor-id pro Lovable validar is_master.
function withActorId(path: string, actorId?: string | null) {
  if (!actorId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}actorId=${encodeURIComponent(actorId)}`;
}

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
  endereco_cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  rg: string | null;
  orgao_rg: string | null;
  uf_rg: string | null;
  carteira_habilitacao: string | null;
  carteira_trabalho: string | null;
  pis_pasep: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  tipo_sanguineo: string | null;
  estado_civil: string | null;
  grau_instrucao: string | null;
  nacionalidade: string | null;
  // naturalidade é a coluna canônica de cidade de nascimento (confirmado
  // pelo Lovable em 29/07/2026) — cidade_nascimento é redundante/legado e
  // não deve ser usada em telas novas.
  naturalidade: string | null;
  cidade_nascimento: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  telefone: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string | null;
  pix_tipo: string | null;
  pix: string | null;
  tamanho_camisa: string | null;
  tamanho_calca: string | null;
  tamanho_calcado: string | null;
  [key: string]: unknown;
};

export type RhStats = {
  total: number;
  by_status: Record<string, number>;
};

// Sem limit/offset o backend traz TODOS os colaboradores, paginando
// internamente por conta própria (o Lovable corta em 1000/2000 por
// chamada, então isso é feito em vários pedidos, não um só).
export async function fetchRhColaboradores(
  params: { q?: string; status?: string; empresaId?: string } = {}
): Promise<RhColaboradorRaw[]> {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.empresaId) search.set('empresaId', params.empresaId);
  search.set('all', '1');
  const json = await api.get(`/api/rh/colaboradores?${search.toString()}`);
  return json.data as RhColaboradorRaw[];
}

export async function fetchRhStats(): Promise<RhStats> {
  const json = await api.get('/api/rh/colaboradores/stats');
  return json.data as RhStats;
}

// PATCH real em rh_colaboradores (dados pessoais/contrato/bancário/uniforme)
// — endpoint confirmado pelo Lovable em 29/07/2026, aceita null pra limpar um
// campo. Body: chaves cruas da tabela (mesmos nomes de RhColaboradorRaw).
export async function updateRhColaborador(
  id: string,
  body: Record<string, unknown>
): Promise<RhColaboradorRaw> {
  const json = await api.patch(`/api/rh/colaboradores/${encodeURIComponent(id)}`, body);
  return json.data as RhColaboradorRaw;
}

// --- RH: benefícios do colaborador (rh_beneficios_colaborador — VR/VA/
// seguro de vida/plano de saúde/odontológico, 1:1 via colaborador_id) ---

export type RhBeneficiosColaborador = {
  colaborador_id: string;
  vr_ativo: boolean | null;
  vr_valor_dia: number | null;
  va_ativo: boolean | null;
  va_valor_dia: number | null;
  seguro_vida_ativo: boolean | null;
  seguro_vida_seguradora: string | null;
  seguro_vida_cobertura: number | null;
  seguro_vida_desconto_mensal: number | null;
  plano_saude_ativo: boolean | null;
  plano_saude_operadora: string | null;
  plano_saude_plano: string | null;
  plano_saude_desconto_titular: number | null;
  plano_saude_desconto_dependente: number | null;
  plano_odonto_ativo: boolean | null;
  plano_odonto_operadora: string | null;
  plano_odonto_plano: string | null;
  plano_odonto_desconto_titular: number | null;
  plano_odonto_desconto_dependente: number | null;
  [key: string]: unknown;
};

export async function fetchRhBeneficios(colaboradorId: string): Promise<RhBeneficiosColaborador | null> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/beneficios`);
  return (json.data as RhBeneficiosColaborador) ?? null;
}

export async function updateRhBeneficios(
  colaboradorId: string,
  body: Record<string, unknown>
): Promise<RhBeneficiosColaborador> {
  const json = await api.put(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/beneficios`, body);
  return json.data as RhBeneficiosColaborador;
}

// --- RH: histórico de contratações (rh_historico_contratacoes — passagens
// anteriores do colaborador na rede, aba Histórico do Dados Pessoais) ---

export type RhHistoricoContratacaoItem = {
  id: string;
  colaborador_id: string | null;
  cpf: string;
  empresa_id: string | null;
  cargo: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  motivo_desligamento: string | null;
  valor_rescisao_liquida: number | null;
  observacoes: string | null;
  [key: string]: unknown;
};

export async function fetchRhHistoricoContratacoes(colaboradorId: string): Promise<RhHistoricoContratacaoItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/historico-contratacoes`);
  return json.data as RhHistoricoContratacaoItem[];
}

export async function createRhHistoricoContratacao(
  body: Record<string, unknown>
): Promise<RhHistoricoContratacaoItem> {
  const json = await api.post('/api/rh/historico-contratacoes', body);
  return json.data as RhHistoricoContratacaoItem;
}

export async function updateRhHistoricoContratacao(
  id: string,
  body: Record<string, unknown>
): Promise<RhHistoricoContratacaoItem> {
  const json = await api.patch(`/api/rh/historico-contratacoes/${encodeURIComponent(id)}`, body);
  return json.data as RhHistoricoContratacaoItem;
}

export async function deleteRhHistoricoContratacao(id: string): Promise<void> {
  await api.delete(`/api/rh/historico-contratacoes/${encodeURIComponent(id)}`);
}

// --- RH: unidades reais (tabela empresas no Supabase do Lovable) ---
// NÃO confundir com o endpoint /api/empresas (esse lê "postos" de um
// Postgres self-hosted diferente, usado por Vendas/Margem/Estoque).
export type RhUnidadeItem = { id: string; nome: string };

export async function fetchRhUnidades(): Promise<RhUnidadeItem[]> {
  const json = await api.get('/api/rh/unidades');
  return json.data as RhUnidadeItem[];
}

export async function fetchRhCargos(): Promise<{ id: string; nome: string }[]> {
  const json = await api.get('/api/rh/cargos');
  return json.data as { id: string; nome: string }[];
}

export async function fetchRhSetores(): Promise<{ id: string; nome: string }[]> {
  const json = await api.get('/api/rh/setores');
  return json.data as { id: string; nome: string }[];
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

// --- Autenticação (login real via Supabase Auth, por trás da af360-api) ---

export type AuthIdentity = {
  profileId: string;
  email: string;
  fullName: string | null;
  role: 'colaborador' | 'rh' | 'diretoria';
  // Lista de painéis que esse login pode abrir de verdade (pode ter mais de
  // 1 — ex: alguém com módulo RH que também tem ficha de colaborador
  // vinculada vê ['rh', 'colaborador']). 'role' acima é só o primeiro/
  // principal, mantido por compatibilidade; o app decide se mostra a tela
  // de seleção de painel com base neste array.
  availableRoles: Array<'colaborador' | 'rh' | 'diretoria'>;
  colaboradorId: string | null;
  empresaId: string | null;
};

export async function login(email: string, password: string): Promise<AuthIdentity> {
  const json = await api.post('/api/auth/login', { email, password });
  return json.data as AuthIdentity;
}

// --- Meu Painel (colaborador): agregado de comunicados/chamados/treinamentos/contracheque ---

export type ColaboradorHomeComunicado = { id: string; titulo: string; tempoLabel: string };

export type ColaboradorHomeData = {
  comunicadosNaoLidos: number;
  comunicadosRecentes: ColaboradorHomeComunicado[];
  chamadosAbertos: number;
  treinamentosPendentes: number;
  eventosProximos: null;
  ultimoContracheque: { competenciaLabel: string; valorLiquido: string } | null;
};

export async function fetchColaboradorHome(colaboradorId: string): Promise<ColaboradorHomeData> {
  const json = await api.get(`/api/rh/dashboard/colaborador-home?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorHomeData;
}

// --- Colaborador (self-service): Comunicados (lista completa) ---

export type ColaboradorComunicadoItem = {
  id: string;
  titulo: string;
  conteudo: string;
  publico: string | null;
  tempoLabel: string;
  lido: boolean;
};

export type ColaboradorComunicadosDetalhe = { items: ColaboradorComunicadoItem[]; total: number };

export async function fetchColaboradorComunicados(colaboradorId: string): Promise<ColaboradorComunicadosDetalhe> {
  const json = await api.get(`/api/rh/dashboard/comunicados?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorComunicadosDetalhe;
}

// --- Colaborador (self-service): Minhas Solicitações ---

export type ColaboradorSolicitacaoItem = {
  id: string;
  protocolo: string | null;
  titulo: string;
  openedDateLabel: string;
  department: string;
  status: { label: string; color: string; tint: string };
};

export type ColaboradorSolicitacoesDetalhe = { items: ColaboradorSolicitacaoItem[]; total: number };

export async function fetchColaboradorSolicitacoes(colaboradorId: string): Promise<ColaboradorSolicitacoesDetalhe> {
  const json = await api.get(`/api/rh/dashboard/solicitacoes?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorSolicitacoesDetalhe;
}

// --- Colaborador (self-service): Metas ---

export type ColaboradorMetaItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  progressoPct: number | null;
  status: string;
  color: string;
};

export type ColaboradorMetasDetalhe = { items: ColaboradorMetaItem[]; total: number };

export async function fetchColaboradorMetas(colaboradorId: string): Promise<ColaboradorMetasDetalhe> {
  const json = await api.get(`/api/rh/dashboard/metas?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorMetasDetalhe;
}

// --- Colaborador (self-service): Treinamentos (lista/status — conteúdo de aulas/prova
// continua sendo apresentação local no app, sem tabela de aulas/questões no schema) ---

export type ColaboradorTreinamentoItem = {
  id: string;
  titulo: string;
  categoria: string | null;
  duracaoLabel: string;
  obrigatorio: boolean;
  status: 'concluido' | 'em_andamento' | 'nao_iniciado';
  progressoPct: number | null;
};

export type ColaboradorTreinamentosDetalhe = { items: ColaboradorTreinamentoItem[]; total: number };

export async function fetchColaboradorTreinamentos(colaboradorId: string): Promise<ColaboradorTreinamentosDetalhe> {
  const json = await api.get(`/api/rh/dashboard/treinamentos?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorTreinamentosDetalhe;
}

// --- Colaborador (self-service): Meus Benefícios ---

export type ColaboradorBeneficioItem = {
  id: string;
  titulo: string;
  subtitulo: string;
  valor: string | null;
};

export type ColaboradorBeneficiosDetalhe = { items: ColaboradorBeneficioItem[]; total: number; semCadastro: boolean };

export async function fetchColaboradorBeneficios(colaboradorId: string): Promise<ColaboradorBeneficiosDetalhe> {
  const json = await api.get(`/api/rh/dashboard/beneficios?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorBeneficiosDetalhe;
}

// --- Colaborador (self-service): Notificações ---

export type ColaboradorNotificacaoItem = {
  id: string;
  titulo: string;
  mensagem: string;
  modulo: string | null;
  unread: boolean;
};

export type ColaboradorNotificacoesDetalhe = { items: ColaboradorNotificacaoItem[]; total: number };

export async function fetchColaboradorNotificacoes(colaboradorId: string): Promise<ColaboradorNotificacoesDetalhe> {
  const json = await api.get(`/api/rh/dashboard/notificacoes?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorNotificacoesDetalhe;
}

// --- Colaborador (self-service): Contra-cheques (histórico completo) ---

export type ColaboradorContrachequeItem = {
  id: string;
  competenciaLabel: string;
  valorLiquido: string;
  valorBruto: string;
  valorDescontos: string;
  arquivoUrl: string | null;
};

export type ColaboradorContrachequesDetalhe = { items: ColaboradorContrachequeItem[]; total: number };

export async function fetchColaboradorContracheques(colaboradorId: string): Promise<ColaboradorContrachequesDetalhe> {
  const json = await api.get(`/api/rh/dashboard/contracheques?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return json.data as ColaboradorContrachequesDetalhe;
}

// --- Admin: Cargos (roles) ---

export type AdminCargoItem = {
  id: string;
  name: string;
  slug: string;
  group: string | null;
  moduleLabels: string[];
  isActive: boolean;
};

export type AdminCargosDetalhe = { count: number; cargos: AdminCargoItem[] };

export async function fetchAdminCargos(): Promise<AdminCargosDetalhe> {
  const json = await api.get('/api/admin/cargos');
  return json.data as AdminCargosDetalhe;
}

export async function createAdminCargo(
  body: { name: string; slug?: string; group_type?: string; default_modules?: string[]; is_active?: boolean },
  actorId?: string | null
): Promise<AdminCargoItem> {
  const json = await api.post(withActorId('/api/admin/cargos', actorId), body);
  return json.data as AdminCargoItem;
}

export async function updateAdminCargo(
  id: string,
  body: { name?: string; slug?: string; group_type?: string; default_modules?: string[]; is_active?: boolean },
  actorId?: string | null
): Promise<AdminCargoItem> {
  const json = await api.patch(withActorId(`/api/admin/cargos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminCargoItem;
}

export async function deleteAdminCargo(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/cargos/${encodeURIComponent(id)}`, actorId));
}

export type AdminFeaturePermission = {
  feature_id: string;
  can_read: boolean;
  can_write: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export async function putAdminCargoPermissoes(
  id: string,
  permissions: AdminFeaturePermission[],
  actorId?: string | null
): Promise<void> {
  await api.put(withActorId(`/api/admin/cargos/${encodeURIComponent(id)}/permissoes`, actorId), { permissions });
}

// --- Admin: módulos e funcionalidades (tabelas modules/module_features,
// liberadas na allowlist do Lovable em 29/07/2026) ---

export type AdminModuleItem = { id: string; slug: string | null; name: string | null };
export type AdminModuleFeatureItem = {
  id: string;
  module_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
};

export async function fetchAdminModulos(): Promise<AdminModuleItem[]> {
  const json = await api.get('/api/admin/modulos');
  return json.data as AdminModuleItem[];
}

export async function fetchAdminModuleFeatures(moduleId?: string): Promise<AdminModuleFeatureItem[]> {
  const query = moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : '';
  const json = await api.get(`/api/admin/module-features${query}`);
  return json.data as AdminModuleFeatureItem[];
}

// --- Admin: Grupos (tabela própria public.grupos, confirmada pelo Lovable
// em 29/07/2026 — roles.group_type = grupos.slug) ---

export type AdminGrupoItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  isActive: boolean;
  cargosCount: number;
};

export type AdminGruposDetalhe = { count: number; grupos: AdminGrupoItem[] };

export async function fetchAdminGrupos(q?: string): Promise<AdminGruposDetalhe> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const json = await api.get(`/api/admin/grupos${query}`);
  return json.data as AdminGruposDetalhe;
}

export async function createAdminGrupo(
  body: { nome: string; slug?: string; descricao?: string | null; cor?: string; is_active?: boolean },
  actorId?: string | null
): Promise<AdminGrupoItem> {
  const json = await api.post(withActorId('/api/admin/grupos', actorId), body);
  return json.data as AdminGrupoItem;
}

export async function updateAdminGrupo(
  id: string,
  body: { nome?: string; descricao?: string | null; cor?: string; is_active?: boolean },
  actorId?: string | null
): Promise<AdminGrupoItem> {
  const json = await api.patch(withActorId(`/api/admin/grupos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminGrupoItem;
}

export async function deleteAdminGrupo(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/grupos/${encodeURIComponent(id)}`, actorId));
}

// --- Admin: Unidades (tabela própria public.empresas — schema completo e
// ação "Vender unidade" confirmados pelo Lovable em 29/07/2026) ---

export type AdminUnidadeBandeira = 'American Fuel' | 'Ipiranga' | 'Shell' | 'Vibra';
export type AdminUnidadeTipo = 'Matriz' | 'Posto' | 'Loja' | 'Escritório';

export type AdminUnidadeItem = {
  id: string;
  nomeFantasia: string | null;
  apelido: string | null;
  razaoSocial: string | null;
  cnpj: string | null;
  bandeira: AdminUnidadeBandeira | null;
  tipo: AdminUnidadeTipo | null;
  cidade: string | null;
  estado: string | null;
  idq: string | null;
  isActive: boolean;
  cdRede: string | null;
  regiao: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  enderecoTexto: string | null;
  proprietario: string | null;
  ipirangaHabilitado: boolean;
  vendida: boolean;
  dataVenda: string | null;
  comprador: string | null;
  vendaObservacao: string | null;
  colaboradoresAtivos: number;
};

export type AdminUnidadesDetalhe = { count: number; unidades: AdminUnidadeItem[] };

export async function fetchAdminUnidades(q?: string): Promise<AdminUnidadesDetalhe> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const json = await api.get(`/api/admin/unidades${query}`);
  return json.data as AdminUnidadesDetalhe;
}

export type AdminUnidadeWriteBody = {
  nome_fantasia?: string | null;
  apelido?: string | null;
  razao_social?: string;
  cnpj?: string;
  bandeira?: AdminUnidadeBandeira;
  tipo?: AdminUnidadeTipo;
  cidade?: string | null;
  estado?: string | null;
  idq?: string | null;
  is_active?: boolean;
};

export async function createAdminUnidade(
  body: AdminUnidadeWriteBody,
  actorId?: string | null
): Promise<AdminUnidadeItem> {
  const json = await api.post(withActorId('/api/admin/unidades', actorId), body);
  return json.data as AdminUnidadeItem;
}

export async function updateAdminUnidade(
  id: string,
  body: AdminUnidadeWriteBody,
  actorId?: string | null
): Promise<AdminUnidadeItem> {
  const json = await api.patch(withActorId(`/api/admin/unidades/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminUnidadeItem;
}

export async function deleteAdminUnidade(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/unidades/${encodeURIComponent(id)}`, actorId));
}

export type AdminVenderUnidadeBody = {
  data_venda: string;
  comprador?: string | null;
  observacao?: string | null;
  transferencias: Array<{ colaborador_id: string; empresa_destino_id: string }>;
};

export type AdminVenderUnidadeResultado = {
  ok: boolean;
  transferidos: number;
  desligados: number;
  total_ativos: number;
  webhook_ok_total?: number;
  webhook_falha_total?: number;
  falhas?: unknown[];
};

export async function venderAdminUnidade(
  id: string,
  body: AdminVenderUnidadeBody,
  actorId?: string | null
): Promise<AdminVenderUnidadeResultado> {
  const json = await api.post(withActorId(`/api/admin/unidades/${encodeURIComponent(id)}/vender`, actorId), body);
  return json.data as AdminVenderUnidadeResultado;
}

// --- Admin: Usuários (profiles + roles + rh_colaboradores/empresas) ---

export type AdminUsuarioItem = {
  id: string;
  fullName: string | null;
  email: string;
  cargo: string | null;
  unidade: string | null;
  isActive: boolean;
  isMaster: boolean;
  createdAt: string | null;
  chatAtendente: boolean;
};

export type AdminUsuariosDetalhe = { count: number; usuarios: AdminUsuarioItem[] };

export async function fetchAdminUsuarios(): Promise<AdminUsuariosDetalhe> {
  const json = await api.get('/api/admin/usuarios');
  return json.data as AdminUsuariosDetalhe;
}

export async function createAdminUsuario(
  body: {
    email: string;
    full_name: string;
    password: string;
    is_master?: boolean;
    is_active?: boolean;
    empresa_id?: string | null;
    role_id?: string | null;
    chat_atendente?: boolean;
  },
  actorId?: string | null
): Promise<unknown> {
  const json = await api.post(withActorId('/api/admin/usuarios', actorId), body);
  return json.data;
}

export async function resetAdminUsuarioSenha(id: string, password: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId(`/api/admin/usuarios/${encodeURIComponent(id)}/redefinir-senha`, actorId), {
    password,
  });
}

export async function toggleAdminUsuarioAtivo(
  id: string,
  isActive: boolean,
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId(`/api/admin/usuarios/${encodeURIComponent(id)}/toggle-ativo`, actorId), {
    isActive,
  });
}

export async function updateAdminUsuario(
  id: string,
  body: {
    full_name?: string;
    email?: string;
    empresa_id?: string | null;
    role_id?: string | null;
    chat_atendente?: boolean;
    is_master?: boolean;
  },
  actorId?: string | null
): Promise<unknown> {
  const json = await api.patch(withActorId(`/api/admin/usuarios/${encodeURIComponent(id)}`, actorId), body);
  return json.data;
}

export async function deleteAdminUsuario(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/usuarios/${encodeURIComponent(id)}`, actorId));
}

// --- Admin: Acesso por Usuário (profiles + roles + user_modules/modules) ---

export type AdminAcessoUsuarioItem = {
  id: string;
  fullName: string | null;
  email: string;
  cargo: string | null;
  moduleCount: number;
  moduleLabels: string[];
};

export type AdminAcessoPorUsuarioDetalhe = { count: number; usuarios: AdminAcessoUsuarioItem[] };

export async function fetchAdminAcessoPorUsuario(): Promise<AdminAcessoPorUsuarioDetalhe> {
  const json = await api.get('/api/admin/acesso-por-usuario');
  return json.data as AdminAcessoPorUsuarioDetalhe;
}

export async function addAdminUsuarioModulo(
  userId: string,
  moduleRef: { moduleId?: string; moduleSlug?: string },
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId(`/api/admin/usuarios/${encodeURIComponent(userId)}/modulos`, actorId), moduleRef);
}

export async function resetAdminUsuarioModulos(userId: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId(`/api/admin/usuarios/${encodeURIComponent(userId)}/modulos/reset`, actorId));
}

export async function removeAdminUsuarioModulo(
  userId: string,
  moduleId: string,
  actorId?: string | null
): Promise<void> {
  await api.delete(
    withActorId(`/api/admin/usuarios/${encodeURIComponent(userId)}/modulos/${encodeURIComponent(moduleId)}`, actorId)
  );
}

export async function putAdminUsuarioPermissoes(
  userId: string,
  permissions: AdminFeaturePermission[],
  actorId?: string | null
): Promise<void> {
  await api.put(withActorId(`/api/admin/usuarios/${encodeURIComponent(userId)}/permissoes`, actorId), {
    permissions,
  });
}
