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
  empresa_id: string | null;
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

// GET /api/rh/colaboradores/:id -> registro completo de UM colaborador.
// Usado tanto pelo lado RH quanto pelo self-service do colaborador (Meu
// Perfil) — o endpoint não tem restrição própria de papel, e o colaborador
// só busca o próprio id (identity.colaboradorId vindo do login).
export async function fetchRhColaboradorDetalhe(id: string): Promise<RhColaboradorRaw> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(id)}`);
  return json.data as RhColaboradorRaw;
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

// POST real em rh_colaboradores (cria um colaborador novo) — endpoint
// confirmado pelo Lovable em 10/08/2026. Obrigatórios no body: nome_completo
// e empresa_id (o resto tem default no Postgres — ver comentário em
// af360-api/src/lovable.js). CPF repetido devolve 409 com o registro
// existente, tratado aqui como resultado (não exceção) pra tela poder
// oferecer "abrir cadastro existente" em vez de só mostrar um erro genérico
// — mesmo padrão usado em send2faCode/verify2faCode.
export type CreateRhColaboradorResult =
  | { ok: true; data: RhColaboradorRaw }
  | {
      ok: false;
      conflict: true;
      message: string;
      existente: { id: string; nome_completo: string; status: string } | null;
    };

export async function createRhColaborador(
  body: Record<string, unknown>
): Promise<CreateRhColaboradorResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/rh/colaboradores`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 'network_error', 0);
  }

  const json = await response.json().catch(() => null);

  if (response.status === 409) {
    return {
      ok: false,
      conflict: true,
      message: json?.message || 'Já existe um colaborador cadastrado com esse CPF.',
      existente: json?.existente ?? null,
    };
  }

  if (!response.ok || !json || json.ok === false) {
    const message = json?.message || json?.error || `Erro ${response.status}`;
    throw new ApiError(message, json?.error ?? null, response.status);
  }

  return { ok: true, data: json.data as RhColaboradorRaw };
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

// --- RH: sub-recursos do colaborador (dependentes, promoções/salário
// histórico, premiações, transferências). Leitura via GET já existia;
// escrita confirmada pela Lovable em 11/08/2026 (endpoints dedicados abaixo
// de cada fetch). ---

export type RhDependenteItem = {
  id: string;
  colaborador_id: string;
  nome: string;
  parentesco: string | null;
  grau_parentesco: string | null;
  data_nascimento: string | null;
  cpf: string | null;
  e_dependente_ir: boolean | null;
  estudante_universitario: boolean | null;
  incapacitado: boolean | null;
  ativo: boolean | null;
  observacao: string | null;
  [key: string]: unknown;
};

export async function fetchRhDependentes(colaboradorId: string): Promise<RhDependenteItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/dependentes`);
  return (json.data as RhDependenteItem[]) ?? [];
}

export async function createRhDependente(body: Record<string, unknown>): Promise<RhDependenteItem> {
  const json = await api.post('/api/rh/dependentes', body);
  return json.data as RhDependenteItem;
}

export type RhSalarioHistoricoItem = {
  id: string;
  colaborador_id: string;
  vigencia_inicio: string | null;
  salario_anterior: number | null;
  salario_novo: number | null;
  percentual_reajuste: number | null;
  motivo: string | null;
  observacao: string | null;
  [key: string]: unknown;
};

export async function fetchRhPromocoes(colaboradorId: string): Promise<RhSalarioHistoricoItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/promocoes`);
  return (json.data as RhSalarioHistoricoItem[]) ?? [];
}

export async function createRhPromocao(
  body: Record<string, unknown>
): Promise<{ data: RhSalarioHistoricoItem; colaboradorAtualizado?: boolean }> {
  const json = await api.post('/api/rh/promocoes', body);
  return { data: json.data as RhSalarioHistoricoItem, colaboradorAtualizado: json.colaboradorAtualizado };
}

export type RhPremiacaoItem = {
  id: string;
  colaborador_id: string;
  tipo_id: string | null;
  competencia: string | null;
  data_pagamento: string | null;
  valor: number | null;
  motivo: string | null;
  meta_descricao: string | null;
  status: string | null;
  pago_em_folha: boolean | null;
  observacoes: string | null;
  [key: string]: unknown;
};

export async function fetchRhPremiacoes(colaboradorId: string): Promise<RhPremiacaoItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/premiacoes`);
  return (json.data as RhPremiacaoItem[]) ?? [];
}

export async function createRhPremiacao(body: Record<string, unknown>): Promise<RhPremiacaoItem> {
  const json = await api.post('/api/rh/premiacoes-escrita', body);
  return json.data as RhPremiacaoItem;
}

export type RhTransferenciaColaboradorItem = {
  id: string;
  colaborador_id: string;
  data_vigencia: string | null;
  empresa_origem_id: string | null;
  empresa_destino_id: string | null;
  setor_destino: string | null;
  cargo_destino: string | null;
  salario_novo: number | null;
  motivo: string | null;
  observacao: string | null;
  status: string | null;
  [key: string]: unknown;
};

export async function fetchRhTransferenciasColaborador(
  colaboradorId: string
): Promise<RhTransferenciaColaboradorItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/transferencias`);
  return (json.data as RhTransferenciaColaboradorItem[]) ?? [];
}

export async function createRhTransferencia(
  body: Record<string, unknown>
): Promise<{ data: RhTransferenciaColaboradorItem; colaboradorAtualizado?: boolean }> {
  const json = await api.post('/api/rh/transferencias-escrita', body);
  return { data: json.data as RhTransferenciaColaboradorItem, colaboradorAtualizado: json.colaboradorAtualizado };
}

// --- RH: Documentos do colaborador (rh_documentos). Leitura via sub-recurso
// já existente; upload/download/exclusão de arquivo confirmados pela
// Lovable em 11/08/2026 (bucket documentos-colaboradores, mesmo do painel
// web). ---

export type RhDocumentoItem = {
  id: string;
  colaborador_id: string;
  tipo: string;
  nome_arquivo: string | null;
  storage_path: string | null;
  validade: string | null;
  data_validade: string | null;
  data_emissao: string | null;
  observacoes: string | null;
  tamanho_bytes: number | null;
  mime_type: string | null;
  status: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhDocumentos(colaboradorId: string): Promise<RhDocumentoItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/documentos`);
  return (json.data as RhDocumentoItem[]) ?? [];
}

export async function createRhDocumento(body: {
  colaborador_id: string;
  tipo: string;
  nome_arquivo: string;
  arquivo_base64: string;
  mime_type: string;
  data_validade?: string;
  data_emissao?: string;
  observacoes?: string;
}): Promise<{ data: RhDocumentoItem; url: string | null }> {
  const json = await api.post('/api/rh/documentos', body);
  return { data: json.data as RhDocumentoItem, url: json.url ?? null };
}

export async function fetchRhDocumentoUrl(id: string): Promise<{ data: RhDocumentoItem | null; url: string | null }> {
  const json = await api.get(`/api/rh/documentos/${encodeURIComponent(id)}`);
  return { data: (json.data as RhDocumentoItem) ?? null, url: json.url ?? null };
}

export async function deleteRhDocumento(id: string): Promise<void> {
  await api.delete(`/api/rh/documentos/${encodeURIComponent(id)}`);
}

// --- RH: Conformidade de Admissões (rs_admissoes) — endpoint confirmado
// pela Lovable em 12/08/2026. Mesmo módulo de derivação de etapa/atraso do
// site, então nunca diverge do que aparece lá. ---

export type AdmissaoConformidadeResumo = {
  iniciadas: number;
  abertas: number;
  atrasadas: number;
  concluidas: number;
  canceladas: number;
  solicitacoes_pendentes: number;
};

export type AdmissaoConformidadeEtapaResumo = {
  etapa: string;
  rotulo: string;
  prazo_dias: number;
  total: number;
  atrasadas: number;
  media_dias: number;
};

export type AdmissaoConformidadeResponsavel = {
  responsavel: string;
  total: number;
  abertas: number;
  atrasadas: number;
};

export type AdmissaoConformidadeLinha = {
  id: string;
  candidato: string;
  empresa: string | null;
  empresa_id: string | null;
  cargo: string | null;
  status: string;
  etapa: string;
  etapa_rotulo: string;
  dias_na_etapa: number;
  prazo_dias: number;
  atrasada: boolean;
  encerrada: boolean;
  docs_pendentes: number;
  solicitacoes_pendentes: number;
  responsavel: string | null;
  responsavel_id: string | null;
  iniciada_em: string | null;
  data_admissao: string | null;
  [key: string]: unknown;
};

export type AdmissaoPrazoItem = {
  id: string;
  etapa: string;
  rotulo: string;
  dias: number;
  ordem: number;
};

export type AdmissaoConformidadeDetalhe = {
  resumo: AdmissaoConformidadeResumo;
  por_etapa: AdmissaoConformidadeEtapaResumo[];
  por_responsavel: AdmissaoConformidadeResponsavel[];
  linhas: AdmissaoConformidadeLinha[];
  prazos: AdmissaoPrazoItem[];
  filtros: Record<string, unknown>;
};

export async function fetchAdmissaoConformidade(filters: {
  inicio?: string;
  fim?: string;
  empresaId?: string;
  responsavelId?: string;
  etapa?: string;
  status?: string;
  busca?: string;
  incluirEncerradas?: 0 | 1;
} = {}): Promise<AdmissaoConformidadeDetalhe> {
  const search = new URLSearchParams();
  if (filters.inicio) search.set('inicio', filters.inicio);
  if (filters.fim) search.set('fim', filters.fim);
  if (filters.empresaId) search.set('empresaId', filters.empresaId);
  if (filters.responsavelId) search.set('responsavelId', filters.responsavelId);
  if (filters.etapa) search.set('etapa', filters.etapa);
  if (filters.status) search.set('status', filters.status);
  if (filters.busca) search.set('busca', filters.busca);
  if (filters.incluirEncerradas !== undefined) search.set('incluirEncerradas', String(filters.incluirEncerradas));
  const qs = search.toString();
  const json = await api.get(`/api/rh/admissao-conformidade${qs ? `?${qs}` : ''}`);
  return json.data as AdmissaoConformidadeDetalhe;
}

export async function updateAdmissaoPrazo(id: string, dias: number): Promise<AdmissaoPrazoItem> {
  const json = await api.patch(`/api/rh/admissao-conformidade/prazos/${encodeURIComponent(id)}`, { dias });
  return json.data as AdmissaoPrazoItem;
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

export type RhFeriasStatusValue = 'programada' | 'em_andamento' | 'concluida' | 'cancelada';

export type RhFeriasItem = {
  id: string;
  colaboradorId: string | null;
  nome: string;
  matricula: string | null;
  empresaId: string | null;
  empresaNome: string | null;
  unidade: string;
  periodoInicioIso: string | null;
  periodoFimIso: string | null;
  inicioLabel: string;
  fimLabel: string;
  dias: number | null;
  observacoes: string | null;
  ano: number | null;
  statusRaw: string;
  statusLabel: string;
  statusColor: string;
  statusTint: string;
};

export type RhFeriasDetalhe = {
  stats: { andamento: number; programadas: number; concluidasEsteAno: number };
  itens: RhFeriasItem[];
  anos: number[];
};

export async function fetchRhFeriasDetalhe(): Promise<RhFeriasDetalhe> {
  const json = await api.get('/api/rh/dashboard/ferias');
  return json.data as RhFeriasDetalhe;
}

export type RhFeriasCreateBody = {
  colaborador_id: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  dias_planejados?: number | null;
  status?: RhFeriasStatusValue;
  observacoes?: string | null;
};

export async function createRhFerias(body: RhFeriasCreateBody, actorId?: string | null): Promise<unknown> {
  const json = await api.post(withActorId('/api/rh/ferias', actorId), body);
  return json.data;
}

export async function updateRhFerias(
  id: string,
  body: Partial<RhFeriasCreateBody>,
  actorId?: string | null
): Promise<unknown> {
  const json = await api.patch(withActorId(`/api/rh/ferias/${encodeURIComponent(id)}`, actorId), body);
  return json.data;
}

// --- RH: Período de Experiência (rh_experiencia_avaliacoes) — endpoint
// confirmado pela Lovable em 19/08/2026 (/api/public/internal/rh-experiencia
// via nosso proxy /api/rh/experiencia). Não existe tabela de "etapas" — elas
// são derivadas de rh_colaboradores.data_admissao do lado deles (1ª = +45d,
// 2ª = +90d); o que é persistido são as decisões (aprovado/nao_aprovado).

export type RhExperienciaEtapa = 'primeira_45' | 'segunda_90';
export type RhExperienciaDecisao = 'aprovado' | 'nao_aprovado';
export type RhExperienciaUrgencia = 'vencido' | 'critico' | 'atencao' | 'ok' | 'tranquilo';

// "empresa" pode vir como string já resolvida ou como o objeto bruto da
// junção com a tabela empresas (ex: { id, razao_social, nome_fantasia,
// apelido }), dependendo de como a Lovable monta a linha — nunca renderizar
// direto, sempre resolver com experienciaEmpresaLabel() (RH.tsx).
export type RhExperienciaEmpresaRef =
  | string
  | { id: string; razao_social?: string | null; nome_fantasia?: string | null; apelido?: string | null }
  | null;

export type RhExperienciaListItem = {
  colaborador_id: string;
  nome_completo: string;
  matricula: string | null;
  cargo: string | null;
  setor: string | null;
  data_admissao: string;
  empresa: RhExperienciaEmpresaRef;
  etapa: RhExperienciaEtapa;
  etapa_label: string;
  vencimento: string;
  dias_restantes: number;
  urgencia: RhExperienciaUrgencia;
  primeira_avaliacao?: unknown;
};

export async function fetchRhExperienciaLista(
  params: { busca?: string; empresaId?: string; limit?: number; offset?: number } = {}
): Promise<{ items: RhExperienciaListItem[]; total: number; paginas: number; hoje: string | null }> {
  const search = new URLSearchParams();
  if (params.busca) search.set('busca', params.busca);
  if (params.empresaId) search.set('empresaId', params.empresaId);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  const json = await api.get(`/api/rh/experiencia${qs ? `?${qs}` : ''}`);
  return {
    items: (json.data as RhExperienciaListItem[]) ?? [],
    total: json.total ?? 0,
    paginas: json.paginas ?? 1,
    hoje: json.hoje ?? null,
  };
}

export type RhExperienciaHistoricoItem = {
  id: string;
  colaborador_id: string;
  etapa: RhExperienciaEtapa;
  vencimento: string;
  decisao: RhExperienciaDecisao;
  justificativa: string;
  desligar: boolean;
  avaliado_por: string | null;
  avaliado_em: string | null;
  created_at?: string;
};

export async function fetchRhExperienciaHistorico(colaboradorId: string): Promise<RhExperienciaHistoricoItem[]> {
  const json = await api.get(`/api/rh/experiencia/historico?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return (json.data as RhExperienciaHistoricoItem[]) ?? [];
}

export type RhExperienciaAvaliacaoBody = {
  colaborador_id: string;
  etapa: RhExperienciaEtapa;
  decisao: RhExperienciaDecisao;
  justificativa: string;
  desligar?: boolean;
  vencimento?: string;
};

export async function createRhExperienciaAvaliacao(
  body: RhExperienciaAvaliacaoBody,
  actorId?: string | null
): Promise<unknown> {
  const json = await api.post(withActorId('/api/rh/experiencia', actorId), body);
  return json.data;
}

export async function deleteRhExperienciaAvaliacao(id: string, actorId?: string | null): Promise<{ aviso: string | null }> {
  const json = await api.delete(withActorId(`/api/rh/experiencia/${encodeURIComponent(id)}`, actorId));
  return { aviso: json.aviso ?? null };
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

// --- RH: Folha de Pagamento (rh_folha_competencias + rh_folha + rh_rubricas
// + rh_folha_lancamentos + rh_ponto_apuracao + rh_folha_auditoria) —
// endpoint unificado confirmado pela Lovable em 19/08/2026
// (/api/public/internal/rh-folha via nosso proxy /api/rh/folha-pagamento).
// INSS/IRRF são calculados 100% do lado deles (RPC calcular_folha) — nunca
// replicar tabela de alíquotas no app, só chamar o endpoint e ler o
// resultado. status tem 5 valores mas a UI só trata aberta/em_calculo como
// "aberta" e o resto como "fechada".

export type RhFolhaStatus = 'aberta' | 'em_calculo' | 'fechada' | 'paga' | 'cancelada';
export type RhRubricaTipo = 'provento' | 'desconto' | 'informativa';
export type RhStatusEnvioFolha = 'nao_enviado' | 'enviado' | 'recebido';
export type RhLancamentoOrigem = 'manual' | 'calculado' | 'ponto' | 'beneficio' | 'rubrica_fixa';

export type RhFolhaCompetenciaItem = {
  id: string;
  ano: number;
  mes: number;
  status: RhFolhaStatus;
  data_pagamento: string | null;
  data_prevista_pagamento: string | null;
  observacao: string | null;
  fechada_em: string | null;
  fechada_por: string | null;
  total_colaboradores: number | null;
  total_bruto: number | null;
  total_liquido: number | null;
  total_fgts: number | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RhFolhaCreateBody = {
  mes: number;
  ano: number;
  data_pagamento?: string | null;
};

export async function fetchRhFolhaCompetencias(
  params: { ano?: number; status?: RhFolhaStatus } = {}
): Promise<{ items: RhFolhaCompetenciaItem[] }> {
  const search = new URLSearchParams();
  if (params.ano !== undefined) search.set('ano', String(params.ano));
  if (params.status) search.set('status', params.status);
  const qs = search.toString();
  const json = await api.get(`/api/rh/folha-pagamento${qs ? `?${qs}` : ''}`);
  return { items: (json.data as RhFolhaCompetenciaItem[]) ?? [] };
}

export async function createRhFolhaCompetencia(
  body: RhFolhaCreateBody,
  actorId?: string | null
): Promise<RhFolhaCompetenciaItem> {
  const json = await api.post(withActorId('/api/rh/folha-pagamento', actorId), body);
  return json.data as RhFolhaCompetenciaItem;
}

export async function updateRhFolhaCompetencia(
  id: string,
  body: Partial<{ data_pagamento: string | null; data_prevista_pagamento: string | null; observacao: string | null }>,
  actorId?: string | null
): Promise<RhFolhaCompetenciaItem> {
  const json = await api.patch(withActorId(`/api/rh/folha-pagamento/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhFolhaCompetenciaItem;
}

export async function deleteRhFolhaCompetencia(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/folha-pagamento/${encodeURIComponent(id)}`, actorId));
}

// Linha de rh_folha (uma por colaborador x competência), já com o
// colaborador embutido quando vem de "competência" (recurso=competencia) —
// campos do colaborador ficam soltos (Record) porque o formato exato de
// aninhamento não foi 100% detalhado pela Lovable.
export type RhFolhaLinha = {
  id?: string;
  competencia_id?: string;
  colaborador_id: string;
  salario_base: number | null;
  dias_trabalhados: number | null;
  total_proventos: number | null;
  total_descontos: number | null;
  base_inss: number | null;
  base_irrf: number | null;
  base_fgts: number | null;
  valor_inss: number | null;
  valor_irrf: number | null;
  valor_fgts: number | null;
  liquido: number | null;
  valor_vt: number | null;
  valor_vr: number | null;
  valor_adiantamento: number | null;
  outros_proventos: number | null;
  outros_descontos: number | null;
  dependentes_irrf_snapshot: number | null;
  observacao: string | null;
  calculado_em: string | null;
  status: string | null;
  status_envio: RhStatusEnvioFolha | null;
  data_envio: string | null;
  data_recebimento: string | null;
  assinatura_base64: string | null;
  ip_assinatura: string | null;
  [key: string]: unknown;
};

export type RhFolhaColaboradorResumo = {
  // rh_colaboradores.id — chave de cruzamento com folhas[].colaborador_id
  // (confirmado pela Lovable em 20/08/2026: a folha NÃO vem embutida aqui,
  // vem num array irmão "folhas").
  id: string;
  nome_completo: string;
  matricula: string | null;
  salario_base: number | null;
  cargo: string | null;
  empresa_id?: string | null;
  dependentes_irrf?: number | null;
  [key: string]: unknown;
};

export type RhFolhaCompetenciaResumo = {
  colaboradores_ativos: number;
  folhas_calculadas: number;
  enviados: number;
  recebidos: number;
  proventos: number;
  descontos: number;
  liquido: number;
  fgts: number;
};

export type RhFolhaCompetenciaDetalhe = {
  competencia: RhFolhaCompetenciaItem;
  fechada: boolean;
  colaboradores: RhFolhaColaboradorResumo[];
  // Uma linha por colaborador que já teve folha calculada — cruzar com
  // colaboradores via folhas.find(f => f.colaborador_id === colaborador.id).
  folhas: RhFolhaLinha[];
  resumo: RhFolhaCompetenciaResumo;
};

export async function fetchRhFolhaCompetenciaDetalhe(id: string): Promise<RhFolhaCompetenciaDetalhe> {
  const json = await api.get(`/api/rh/folha-pagamento/${encodeURIComponent(id)}`);
  return json.data as RhFolhaCompetenciaDetalhe;
}

export type RhRubrica = {
  id: string;
  codigo: string;
  nome: string;
  tipo: RhRubricaTipo;
  incide_inss: boolean;
  incide_irrf: boolean;
  incide_fgts: boolean;
  ativo: boolean;
  ordem: number | null;
  descricao: string | null;
};

export type RhFolhaLancamento = {
  id: string;
  folha_id: string;
  rubrica_id: string;
  referencia: string | null;
  quantidade: number | null;
  valor: number;
  origem: RhLancamentoOrigem;
  observacao: string | null;
  rubrica?: RhRubrica | null;
};

export type RhPontoApuracao = {
  id?: string;
  competencia_id: string;
  colaborador_id: string;
  horas_trabalhadas: number | null;
  he_50: number | null;
  he_100: number | null;
  faltas_dias: number | null;
  dsr_perdido_dias: number | null;
  adicional_noturno_horas: number | null;
};

export type RhFolhaSalarioHistoricoItem = {
  id?: string;
  salario_anterior?: number | null;
  salario_novo?: number | null;
  created_at?: string;
  [key: string]: unknown;
};

export type RhFolhaDadosSalariais = {
  salario_base: number | null;
  dependentes_irrf: number | null;
  cargo?: string | null;
  jornada_id?: string | null;
  regime_jornada?: string | null;
  data_admissao?: string | null;
  historico?: RhFolhaSalarioHistoricoItem[];
};

// rh_folha_auditoria — confirmado pela Lovable em 20/08/2026. "diferencas" é
// um mapa { campo: { de, para } } com o antes/depois de cada alteração.
export type RhFolhaAuditoriaItem = {
  id?: string;
  acao: 'criar' | 'atualizar' | 'excluir' | 'calcular' | 'fechar' | 'reabrir' | 'pagar' | string;
  entidade: 'folha' | 'lancamento' | 'competencia' | 'salario' | string;
  diferencas?: Record<string, { de: unknown; para: unknown }> | null;
  usuario_email?: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export type RhFolhaColaboradorDetalhe = {
  colaborador?: RhColaboradorRaw;
  folha: RhFolhaLinha | null;
  lancamentos: RhFolhaLancamento[];
  rubricas: RhRubrica[];
  ponto: RhPontoApuracao | null;
  dadosSalariais: RhFolhaDadosSalariais | null;
  historico: RhFolhaAuditoriaItem[];
};

export async function fetchRhFolhaColaboradorDetalhe(
  competenciaId: string,
  colaboradorId: string
): Promise<RhFolhaColaboradorDetalhe> {
  const json = await api.get(
    `/api/rh/folha-pagamento/detalhe?competenciaId=${encodeURIComponent(competenciaId)}&colaboradorId=${encodeURIComponent(colaboradorId)}`
  );
  const data = (json.data ?? {}) as RhFolhaColaboradorDetalhe & {
    dados_salariais?: RhFolhaDadosSalariais;
    auditoria?: RhFolhaAuditoriaItem[];
  };
  // Lovable devolve dados_salariais (snake_case) e historico com alias
  // auditoria — normaliza pros nomes que o resto do app usa.
  return {
    ...data,
    dadosSalariais: data.dados_salariais ?? data.dadosSalariais ?? null,
    historico: data.historico ?? data.auditoria ?? [],
  };
}

export async function fetchRhFolhaHistorico(
  params: { competenciaId?: string; folhaId?: string; colaboradorId?: string } = {}
): Promise<RhFolhaAuditoriaItem[]> {
  const search = new URLSearchParams();
  if (params.competenciaId) search.set('competenciaId', params.competenciaId);
  if (params.folhaId) search.set('folhaId', params.folhaId);
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  const json = await api.get(`/api/rh/folha-pagamento/historico?${search.toString()}`);
  return (json.data as RhFolhaAuditoriaItem[]) ?? [];
}

export async function calcularRhFolha(
  body: { competencia_id: string; colaborador_id?: string },
  actorId?: string | null
): Promise<{ total: number; calculados: number; erros: unknown[] }> {
  const json = await api.post(withActorId('/api/rh/folha-pagamento/calcular', actorId), body);
  return { total: json.total ?? 0, calculados: json.calculados ?? 0, erros: json.erros ?? [] };
}

export async function fecharRhFolhaCompetencia(id: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId(`/api/rh/folha-pagamento/${encodeURIComponent(id)}/fechar`, actorId), {});
}

export async function reabrirRhFolhaCompetencia(id: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId(`/api/rh/folha-pagamento/${encodeURIComponent(id)}/reabrir`, actorId), {});
}

export async function enviarContrachequesRhFolha(id: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId(`/api/rh/folha-pagamento/${encodeURIComponent(id)}/enviar-contracheques`, actorId), {});
}

export type RhFolhaLancamentoCreateBody = {
  competencia_id: string;
  colaborador_id?: string;
  folha_id?: string;
  rubrica_id: string;
  valor: number;
  observacao?: string | null;
  referencia?: string | null;
};

export async function createRhFolhaLancamento(
  body: RhFolhaLancamentoCreateBody,
  actorId?: string | null
): Promise<RhFolhaLancamento> {
  const json = await api.post(withActorId('/api/rh/folha-pagamento/lancamento', actorId), body);
  return json.data as RhFolhaLancamento;
}

export async function deleteRhFolhaLancamento(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/folha-pagamento/lancamento/${encodeURIComponent(id)}`, actorId));
}

export async function salvarRhFolhaPonto(body: RhPontoApuracao, actorId?: string | null): Promise<RhPontoApuracao> {
  const json = await api.post(withActorId('/api/rh/folha-pagamento/ponto', actorId), body);
  return json.data as RhPontoApuracao;
}

export async function updateRhFolhaSalario(
  colaboradorId: string,
  body: { salario_base?: number; dependentes_irrf?: number },
  actorId?: string | null
): Promise<void> {
  await api.patch(
    withActorId(`/api/rh/folha-pagamento/salario/${encodeURIComponent(colaboradorId)}`, actorId),
    body
  );
}

// --- Workflow: Hierarquia por Posto + Fluxos de Aprovação (endpoint
// confirmado pela Lovable em 20/08/2026). "Posto" = empresas com
// tipo='Posto'; liderança fica em rh_posto_lideranca; troca de líder grava
// histórico em rh_hierarquia_historico e recalcula gestor_direto_id/
// gestor_geral_id do lado deles.

export type RhWorkflowTipoLideranca = 'Supervisor' | 'Gerente' | 'Coordenador' | 'Diretor Regional' | string;

export type RhWorkflowLiderancaVigente = {
  id: string;
  posto_id?: string;
  colaborador_id?: string;
  tipo_lideranca: RhWorkflowTipoLideranca;
  data_inicio: string | null;
  data_fim?: string | null;
  motivo_saida?: string | null;
  rh_colaboradores?: RhColaboradorRaw | null;
  [key: string]: unknown;
};

export type RhWorkflowPosto = {
  id: string;
  nome: string;
  cidade?: string | null;
  estado?: string | null;
  localizacao?: string | null;
  tem_lideranca: boolean;
  liderancas?: RhWorkflowLiderancaVigente[];
  [key: string]: unknown;
};

export type RhWorkflowResumo = {
  postos: number;
  com_lideranca: number;
  sem_lideranca: number;
  lideres_ativos: number;
};

export type RhWorkflowPostosPayload = {
  data: RhWorkflowPosto[];
  resumo: RhWorkflowResumo | null;
  tipos_lideranca: string[];
};

export async function fetchRhWorkflowPostos(
  params: { busca?: string; filtro?: 'todos' | 'com' | 'sem' } = {}
): Promise<RhWorkflowPostosPayload> {
  const query = new URLSearchParams();
  if (params.busca) query.set('busca', params.busca);
  if (params.filtro) query.set('filtro', params.filtro);
  const qs = query.toString();
  const json = await api.get(`/api/rh/workflow/postos${qs ? `?${qs}` : ''}`);
  return {
    data: (json.data as RhWorkflowPosto[]) ?? [],
    resumo: (json.resumo as RhWorkflowResumo) ?? null,
    tipos_lideranca: (json.tipos_lideranca as string[]) ?? [],
  };
}

export type RhWorkflowLiderancaDetalhe = {
  posto: RhWorkflowPosto | null;
  vigentes: RhWorkflowLiderancaVigente[];
  encerradas: RhWorkflowLiderancaVigente[];
  historico: RhWorkflowHistoricoItem[];
};

export async function fetchRhWorkflowLideranca(postoId: string): Promise<RhWorkflowLiderancaDetalhe> {
  const json = await api.get(`/api/rh/workflow/lideranca?postoId=${encodeURIComponent(postoId)}`);
  const data = (json.data ?? {}) as Partial<RhWorkflowLiderancaDetalhe>;
  return {
    posto: data.posto ?? null,
    vigentes: data.vigentes ?? [],
    encerradas: data.encerradas ?? [],
    historico: data.historico ?? [],
  };
}

export type RhWorkflowHistoricoItem = {
  id?: string;
  posto_id?: string;
  colaborador_id?: string;
  tipo_lideranca?: RhWorkflowTipoLideranca;
  acao?: string;
  evento?: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  motivo_saida?: string | null;
  usuario_email?: string | null;
  created_at?: string;
  rh_colaboradores?: RhColaboradorRaw | null;
  [key: string]: unknown;
};

export async function fetchRhWorkflowHistorico(params: {
  postoId?: string;
  colaboradorId?: string;
}): Promise<RhWorkflowHistoricoItem[]> {
  const query = new URLSearchParams();
  if (params.postoId) query.set('postoId', params.postoId);
  if (params.colaboradorId) query.set('colaboradorId', params.colaboradorId);
  const json = await api.get(`/api/rh/workflow/historico?${query.toString()}`);
  return (json.data as RhWorkflowHistoricoItem[]) ?? [];
}

export type RhWorkflowAtribuirBody = {
  posto_id: string;
  colaborador_id: string;
  tipo_lideranca: RhWorkflowTipoLideranca;
  data_inicio: string;
  substituir?: boolean;
};

export async function atribuirRhWorkflowLideranca(
  body: RhWorkflowAtribuirBody,
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId('/api/rh/workflow/atribuir', actorId), body);
}

export async function encerrarRhWorkflowLideranca(
  body: { id: string; data_fim: string; motivo?: string | null },
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId('/api/rh/workflow/encerrar', actorId), body);
}

export async function transferirRhWorkflowLideranca(
  body: { id: string; posto_destino_id: string },
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId('/api/rh/workflow/transferir', actorId), body);
}

// Fluxos de Aprovação (rh_workflow_templates) — formato confirmado pela
// Lovable em 20/08/2026. O desenho (canvas) fica em nodes_json/edges_json
// no formato React Flow; o construtor visual continua só no painel web por
// enquanto — o app lê/alterna "ativo" e mostra os nós em texto.
export type RhWorkflowFluxoNode = {
  id: string;
  type: 'inicio' | 'fim_aprovado' | 'fim_rejeitado' | 'decisao' | 'divisao' | 'aprovacao' | 'notificacao' | 'prazo' | string;
  position?: { x: number; y: number };
  data?: { label?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export type RhWorkflowFluxoEdge = {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
};

export type RhWorkflowFluxoTemplate = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria: string;
  ativo: boolean;
  publicado: boolean;
  versao?: number;
  nodes_json?: RhWorkflowFluxoNode[];
  edges_json?: RhWorkflowFluxoEdge[];
  instancias_ativas: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export async function fetchRhWorkflowFluxos(): Promise<{ data: RhWorkflowFluxoTemplate[]; categorias: string[] }> {
  const json = await api.get('/api/rh/workflow/fluxos');
  return {
    data: (json.data as RhWorkflowFluxoTemplate[]) ?? [],
    categorias: (json.categorias as string[]) ?? [],
  };
}

export async function fetchRhWorkflowFluxoDetalhe(id: string): Promise<RhWorkflowFluxoTemplate> {
  const json = await api.get(`/api/rh/workflow/fluxos?id=${encodeURIComponent(id)}`);
  return json.data as RhWorkflowFluxoTemplate;
}

export type RhWorkflowFluxoCreateBody = {
  nome: string;
  categoria: string;
  descricao?: string | null;
};

export async function createRhWorkflowFluxo(
  body: RhWorkflowFluxoCreateBody,
  actorId?: string | null
): Promise<RhWorkflowFluxoTemplate> {
  const json = await api.post(withActorId('/api/rh/workflow/fluxo', actorId), body);
  return json.data as RhWorkflowFluxoTemplate;
}

export async function updateRhWorkflowFluxo(
  id: string,
  body: Partial<
    Pick<RhWorkflowFluxoTemplate, 'nome' | 'descricao' | 'categoria' | 'ativo' | 'publicado' | 'nodes_json' | 'edges_json'>
  >,
  actorId?: string | null
): Promise<RhWorkflowFluxoTemplate> {
  const json = await api.patch(withActorId(`/api/rh/workflow/fluxo/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhWorkflowFluxoTemplate;
}

export type RhWorkflowInstancia = {
  id: string;
  template_id?: string;
  colaborador_id?: string;
  status: string;
  rh_workflow_templates?: RhWorkflowFluxoTemplate | null;
  rh_colaboradores?: RhColaboradorRaw | null;
  rh_workflow_aprovacoes?: unknown[];
  [key: string]: unknown;
};

export async function fetchRhWorkflowInstancias(templateId: string): Promise<RhWorkflowInstancia[]> {
  const json = await api.get(`/api/rh/workflow/instancias?templateId=${encodeURIComponent(templateId)}`);
  return (json.data as RhWorkflowInstancia[]) ?? [];
}

// --- Relatórios: Reincidência/Recontratação — endpoint confirmado pela
// Lovable em 20/08/2026. Cálculo (regras de Recontratado x Reincidente,
// custo de rescisões, filtro de período) é feito inteiramente no servidor.

export type RhRelatorioPeriodoTipo = 'mes' | 'ano' | 'tudo' | 'custom';
export type RhRelatorioTipoFiltro = 'todos' | 'recontratado' | 'reincidente';

export type RhRelatorioVinculoDetalhe = {
  empresa_id?: string;
  posto?: string;
  cargo?: string;
  data_admissao: string | null;
  data_demissao: string | null;
  atual: boolean;
  motivo_desligamento?: string | null;
  valor_rescisao_liquida?: number | null;
  descricao?: string | null;
  [key: string]: unknown;
};

export type RhRelatorioReincidenciaItem = {
  colaborador_id: string;
  nome: string;
  cpf: string | null;
  tipo: 'Recontratado' | 'Reincidente';
  status_atual?: string | null;
  vinculos: number;
  postos: string[];
  vinculos_detalhe: RhRelatorioVinculoDetalhe[];
  primeira_admissao: string | null;
  ultima_movimentacao: string | null;
  motivos: string[];
  total_rescisao: number;
  [key: string]: unknown;
};

export type RhRelatorioResumo = {
  total: number;
  recontratados: number;
  reincidentes: number;
  custo_rescisoes: number;
  integridade_sem_posto?: number;
};

export type RhRelatorioPeriodoInfo = {
  inicio?: string | null;
  fim?: string | null;
  label?: string | null;
};

export type RhRelatorioReincidenciaPayload = {
  data: RhRelatorioReincidenciaItem[];
  resumo: RhRelatorioResumo | null;
  periodo: RhRelatorioPeriodoInfo | null;
  tipo: RhRelatorioTipoFiltro;
};

export async function fetchRhRelatorioReincidencia(params: {
  periodo: RhRelatorioPeriodoTipo;
  ano?: number;
  mes?: number;
  dataIni?: string;
  dataFim?: string;
  tipo?: RhRelatorioTipoFiltro;
}): Promise<RhRelatorioReincidenciaPayload> {
  const query = new URLSearchParams();
  query.set('periodo', params.periodo);
  if (params.ano) query.set('ano', String(params.ano));
  if (params.mes) query.set('mes', String(params.mes));
  if (params.dataIni) query.set('dataIni', params.dataIni);
  if (params.dataFim) query.set('dataFim', params.dataFim);
  if (params.tipo) query.set('tipo', params.tipo);
  const json = await api.get(`/api/rh/relatorios/reincidencia?${query.toString()}`);
  return {
    data: (json.data as RhRelatorioReincidenciaItem[]) ?? [],
    resumo: (json.resumo as RhRelatorioResumo) ?? null,
    periodo: (json.periodo as RhRelatorioPeriodoInfo) ?? null,
    tipo: (json.tipo as RhRelatorioTipoFiltro) ?? 'todos',
  };
}

// --- Configurações: Cargos/Setores/Rubricas/Tabela INSS/Tabela IRRF/
// Salário Mínimo/Parâmetros/Reajustes — endpoint confirmado pela Lovable em
// 20/08/2026 (/api/public/internal/rh-config). Reajuste tem 2 passos:
// criar rascunho (status=pendente) e depois aplicar (status=aplicado,
// grava em rh_salario_historico/rh_historico_beneficios do lado deles).

export type RhConfigCargo = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

export async function fetchRhConfigCargos(params: { ativo?: boolean; busca?: string } = {}): Promise<RhConfigCargo[]> {
  const query = new URLSearchParams();
  if (params.ativo !== undefined) query.set('ativo', String(params.ativo));
  if (params.busca) query.set('busca', params.busca);
  const qs = query.toString();
  const json = await api.get(`/api/rh/config/cargos${qs ? `?${qs}` : ''}`);
  return (json.data as RhConfigCargo[]) ?? [];
}

export async function createRhConfigCargo(
  body: { nome: string; descricao?: string | null; ativo?: boolean },
  actorId?: string | null
): Promise<RhConfigCargo> {
  const json = await api.post(withActorId('/api/rh/config/cargos', actorId), body);
  return json.data as RhConfigCargo;
}

export async function updateRhConfigCargo(
  id: string,
  body: { nome?: string; descricao?: string | null; ativo?: boolean },
  actorId?: string | null
): Promise<RhConfigCargo> {
  const json = await api.patch(withActorId(`/api/rh/config/cargos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigCargo;
}

export type RhConfigSetor = RhConfigCargo;

export async function fetchRhConfigSetores(params: { ativo?: boolean; busca?: string } = {}): Promise<RhConfigSetor[]> {
  const query = new URLSearchParams();
  if (params.ativo !== undefined) query.set('ativo', String(params.ativo));
  if (params.busca) query.set('busca', params.busca);
  const qs = query.toString();
  const json = await api.get(`/api/rh/config/setores${qs ? `?${qs}` : ''}`);
  return (json.data as RhConfigSetor[]) ?? [];
}

export async function createRhConfigSetor(
  body: { nome: string; descricao?: string | null; ativo?: boolean },
  actorId?: string | null
): Promise<RhConfigSetor> {
  const json = await api.post(withActorId('/api/rh/config/setores', actorId), body);
  return json.data as RhConfigSetor;
}

export async function updateRhConfigSetor(
  id: string,
  body: { nome?: string; descricao?: string | null; ativo?: boolean },
  actorId?: string | null
): Promise<RhConfigSetor> {
  const json = await api.patch(withActorId(`/api/rh/config/setores/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigSetor;
}

export type RhConfigRubricaTipo = 'provento' | 'desconto' | 'informativa';

export type RhConfigRubrica = {
  id: string;
  codigo: string;
  nome: string;
  tipo: RhConfigRubricaTipo;
  incide_inss: boolean;
  incide_irrf: boolean;
  incide_fgts: boolean;
  ordem: number;
  descricao: string | null;
  ativo: boolean;
};

export async function fetchRhConfigRubricas(
  params: { ativo?: boolean; tipo?: RhConfigRubricaTipo } = {}
): Promise<{ data: RhConfigRubrica[]; tipos: string[] }> {
  const query = new URLSearchParams();
  if (params.ativo !== undefined) query.set('ativo', String(params.ativo));
  if (params.tipo) query.set('tipo', params.tipo);
  const qs = query.toString();
  const json = await api.get(`/api/rh/config/rubricas${qs ? `?${qs}` : ''}`);
  return { data: (json.data as RhConfigRubrica[]) ?? [], tipos: (json.tipos as string[]) ?? [] };
}

export type RhConfigRubricaCreateBody = {
  codigo: string;
  nome: string;
  tipo: RhConfigRubricaTipo;
  incide_inss?: boolean;
  incide_irrf?: boolean;
  incide_fgts?: boolean;
  ordem?: number;
  descricao?: string | null;
  ativo?: boolean;
};

export async function createRhConfigRubrica(
  body: RhConfigRubricaCreateBody,
  actorId?: string | null
): Promise<RhConfigRubrica> {
  const json = await api.post(withActorId('/api/rh/config/rubricas', actorId), body);
  return json.data as RhConfigRubrica;
}

export async function updateRhConfigRubrica(
  id: string,
  body: Partial<RhConfigRubricaCreateBody>,
  actorId?: string | null
): Promise<RhConfigRubrica> {
  const json = await api.patch(withActorId(`/api/rh/config/rubricas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigRubrica;
}

export async function deleteRhConfigRubrica(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/config/rubricas/${encodeURIComponent(id)}`, actorId));
}

export type RhConfigFaixaInss = {
  id?: string;
  faixa_ordem: number;
  valor_ate: number;
  aliquota: number;
  parcela_deduzir: number;
};

export type RhConfigVigenciaInss = {
  vigencia_inicio: string;
  vigencia_fim: string | null;
  vigente: boolean;
  faixas: RhConfigFaixaInss[];
};

export async function fetchRhConfigTabelaInss(): Promise<{ data: RhConfigVigenciaInss[]; faixas: RhConfigFaixaInss[] }> {
  const json = await api.get('/api/rh/config/inss');
  return { data: (json.data as RhConfigVigenciaInss[]) ?? [], faixas: (json.faixas as RhConfigFaixaInss[]) ?? [] };
}

export async function createRhConfigTabelaInss(
  body: { vigencia_inicio: string; vigencia_fim?: string | null; faixas: Omit<RhConfigFaixaInss, 'id'>[] },
  actorId?: string | null
): Promise<RhConfigVigenciaInss> {
  const json = await api.post(withActorId('/api/rh/config/inss', actorId), body);
  return json.data as RhConfigVigenciaInss;
}

export async function updateRhConfigFaixaInss(
  id: string,
  body: Partial<RhConfigFaixaInss>,
  actorId?: string | null
): Promise<RhConfigFaixaInss> {
  const json = await api.patch(withActorId(`/api/rh/config/inss/faixa/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigFaixaInss;
}

export type RhConfigFaixaIrrf = RhConfigFaixaInss & { deducao_dependente: number };

export type RhConfigVigenciaIrrf = {
  vigencia_inicio: string;
  vigencia_fim: string | null;
  vigente: boolean;
  deducao_dependente: number;
  faixas: RhConfigFaixaIrrf[];
};

export async function fetchRhConfigTabelaIrrf(): Promise<{ data: RhConfigVigenciaIrrf[]; faixas: RhConfigFaixaIrrf[] }> {
  const json = await api.get('/api/rh/config/irrf');
  return { data: (json.data as RhConfigVigenciaIrrf[]) ?? [], faixas: (json.faixas as RhConfigFaixaIrrf[]) ?? [] };
}

export async function createRhConfigTabelaIrrf(
  body: {
    vigencia_inicio: string;
    vigencia_fim?: string | null;
    deducao_dependente?: number;
    faixas: Omit<RhConfigFaixaIrrf, 'id'>[];
  },
  actorId?: string | null
): Promise<RhConfigVigenciaIrrf> {
  const json = await api.post(withActorId('/api/rh/config/irrf', actorId), body);
  return json.data as RhConfigVigenciaIrrf;
}

export async function updateRhConfigFaixaIrrf(
  id: string,
  body: Partial<RhConfigFaixaIrrf>,
  actorId?: string | null
): Promise<RhConfigFaixaIrrf> {
  const json = await api.patch(withActorId(`/api/rh/config/irrf/faixa/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigFaixaIrrf;
}

export type RhConfigSalarioMinimoVigencia = {
  id?: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  valor: number;
  vigente: boolean;
};

export async function fetchRhConfigSalarioMinimo(): Promise<RhConfigSalarioMinimoVigencia[]> {
  const json = await api.get('/api/rh/config/salario-minimo');
  return (json.data as RhConfigSalarioMinimoVigencia[]) ?? [];
}

export async function createRhConfigSalarioMinimo(
  body: { vigencia_inicio: string; valor: number },
  actorId?: string | null
): Promise<RhConfigSalarioMinimoVigencia> {
  const json = await api.post(withActorId('/api/rh/config/salario-minimo', actorId), body);
  return json.data as RhConfigSalarioMinimoVigencia;
}

export type RhConfigParametro = {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  descricao: string | null;
};

export async function fetchRhConfigParametros(): Promise<RhConfigParametro[]> {
  const json = await api.get('/api/rh/config/parametros');
  return (json.data as RhConfigParametro[]) ?? [];
}

export async function updateRhConfigParametro(
  id: string,
  body: { valor: string },
  actorId?: string | null
): Promise<RhConfigParametro> {
  const json = await api.patch(withActorId(`/api/rh/config/parametros/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigParametro;
}

export type RhConfigReajusteTipo = 'dissidio' | 'reajuste_salario' | 'reajuste_vr' | 'reajuste_va';
export type RhConfigReajusteModo = 'percentual' | 'valor_fixo';
export type RhConfigReajusteStatus = 'pendente' | 'aplicado';

export type RhConfigReajuste = {
  id: string;
  tipo: RhConfigReajusteTipo;
  modo: RhConfigReajusteModo;
  data_vigencia: string;
  percentual: number | null;
  valor_fixo: number | null;
  descricao: string | null;
  status: RhConfigReajusteStatus;
  total_colaboradores_afetados: number | null;
  aplicado_em: string | null;
  aplicado_por: string | null;
};

export async function fetchRhConfigReajustes(): Promise<RhConfigReajuste[]> {
  const json = await api.get('/api/rh/config/reajustes');
  return (json.data as RhConfigReajuste[]) ?? [];
}

export type RhConfigReajusteCreateBody = {
  tipo: RhConfigReajusteTipo;
  modo: RhConfigReajusteModo;
  data_vigencia: string;
  percentual?: number | null;
  valor_fixo?: number | null;
  descricao?: string | null;
};

export async function createRhConfigReajuste(
  body: RhConfigReajusteCreateBody,
  actorId?: string | null
): Promise<RhConfigReajuste> {
  const json = await api.post(withActorId('/api/rh/config/reajustes', actorId), body);
  return json.data as RhConfigReajuste;
}

export async function updateRhConfigReajuste(
  id: string,
  body: Partial<RhConfigReajusteCreateBody>,
  actorId?: string | null
): Promise<RhConfigReajuste> {
  const json = await api.patch(withActorId(`/api/rh/config/reajustes/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhConfigReajuste;
}

export async function deleteRhConfigReajuste(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/config/reajustes/${encodeURIComponent(id)}`, actorId));
}

export async function aplicarRhConfigReajuste(id: string, actorId?: string | null): Promise<RhConfigReajuste> {
  const json = await api.post(withActorId(`/api/rh/config/reajustes/${encodeURIComponent(id)}/aplicar`, actorId), {});
  return json.data as RhConfigReajuste;
}

// --- Autenticação (login real via Supabase Auth, por trás da af360-api) ---

export type AuthIdentity = {
  profileId: string;
  email: string;
  fullName: string | null;
  role: 'colaborador' | 'rh' | 'diretoria' | 'administrador' | 'financeiro';
  // Lista de painéis que esse login pode abrir de verdade (pode ter mais de
  // 1 — ex: alguém com módulo RH que também tem ficha de colaborador
  // vinculada vê ['rh', 'colaborador']; contas master também podem ter
  // 'administrador' aqui). 'role' acima é só o primeiro/principal, mantido
  // por compatibilidade; o app decide se mostra a tela de seleção de painel
  // com base neste array.
  availableRoles: Array<'colaborador' | 'rh' | 'diretoria' | 'administrador' | 'financeiro'>;
  colaboradorId: string | null;
  empresaId: string | null;
};

export async function login(email: string, password: string): Promise<AuthIdentity> {
  const json = await api.post('/api/auth/login', { email, password });
  return json.data as AuthIdentity;
}

// --- Verificação em duas etapas (2FA) por e-mail — endpoints confirmados
// pela Lovable em 07/08/2026 (código de 6 dígitos, validade 10min, máx. 5
// tentativas erradas, 1 reenvio a cada 30s). "codigo_invalido"/"expirado"/
// "tentativas_excedidas" são resultados normais da verificação (a tela
// decide o que mostrar), não exceções — só erro de rede/servidor lança.

export type Send2faResult =
  | {
      ok: true;
      profileId: string;
      canais: string[];
      destinoEmail: string | null;
      expiraEmSegundos: number | null;
      reenvioEmSegundos: number | null;
    }
  | { ok: false; rateLimited: true; retryAposSegundos: number };

export async function send2faCode(params: { profileId?: string; email?: string }): Promise<Send2faResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/2fa/enviar`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(params.profileId ? { profileId: params.profileId } : { email: params.email }),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 'network_error', 0);
  }
  const json = await response.json().catch(() => null);

  if (response.ok && json?.ok) {
    const data = json.data ?? json;
    return {
      ok: true,
      profileId: data.profile_id,
      canais: data.canais ?? [],
      destinoEmail: data.destino?.email ?? null,
      expiraEmSegundos: data.expira_em_segundos ?? null,
      reenvioEmSegundos: data.reenvio_em_segundos ?? null,
    };
  }

  if (response.status === 429) {
    return { ok: false, rateLimited: true, retryAposSegundos: json?.retry_apos_segundos ?? 30 };
  }

  const message = json?.message || json?.error || `Erro ${response.status}`;
  throw new ApiError(message, json?.error ?? null, response.status);
}

export type Verify2faResult =
  | { ok: true; profileId: string; verificadoEm: string }
  | {
      ok: false;
      motivo: 'codigo_invalido' | 'expirado' | 'nao_encontrado' | 'tentativas_excedidas';
      tentativasRestantes: number | null;
    };

export async function verify2faCode(profileId: string, codigo: string): Promise<Verify2faResult> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/2fa/verificar`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, codigo }),
    });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 'network_error', 0);
  }
  const json = await response.json().catch(() => null);

  if (response.ok && json?.ok) {
    const data = json.data ?? json;
    return { ok: true, profileId: data.profile_id, verificadoEm: data.verificado_em };
  }

  if (json?.motivo) {
    return { ok: false, motivo: json.motivo, tentativasRestantes: json.tentativas_restantes ?? null };
  }

  const message = json?.message || json?.error || `Erro ${response.status}`;
  throw new ApiError(message, json?.error ?? null, response.status);
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
  anexoUrl: string | null;
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

// --- Colaborador (self-service): Reembolsos (rh_reembolsos — endpoint
// confirmado pela Lovable em 03/08/2026). Enum de status: rascunho | enviado
// | aprovado | pago | recusado — aprovado_por/aprovado_em e pago_em são
// preenchidos do lado deles a partir do x-actor-id, não mandamos na mão. ---

export type ColaboradorReembolsoItem = {
  id: string;
  colaborador_id: string;
  descricao: string;
  categoria: string | null;
  data_despesa: string | null;
  valor: number;
  status: 'rascunho' | 'enviado' | 'aprovado' | 'pago' | 'recusado';
  comprovante_url: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  pago_em: string | null;
  observacoes: string | null;
  [key: string]: unknown;
};

export async function fetchColaboradorReembolsos(colaboradorId: string): Promise<ColaboradorReembolsoItem[]> {
  const json = await api.get(`/api/rh/reembolsos?colaboradorId=${encodeURIComponent(colaboradorId)}`);
  return (json.data as ColaboradorReembolsoItem[]) ?? [];
}

export async function createColaboradorReembolso(body: {
  colaborador_id: string;
  descricao: string;
  categoria?: string;
  data_despesa?: string;
  valor: number;
  comprovante_url?: string;
  observacoes?: string;
}): Promise<ColaboradorReembolsoItem> {
  const json = await api.post('/api/rh/reembolsos', body);
  return json.data as ColaboradorReembolsoItem;
}

export async function updateRhReembolso(
  id: string,
  body: Record<string, unknown>,
  actorId?: string | null
): Promise<ColaboradorReembolsoItem> {
  const json = await api.patch(withActorId(`/api/rh/reembolsos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as ColaboradorReembolsoItem;
}

export async function deleteRhReembolso(id: string): Promise<void> {
  await api.delete(`/api/rh/reembolsos/${encodeURIComponent(id)}`);
}

// --- Férias: escrita (leitura já existe em GET /api/rh/dashboard/ferias e
// GET /api/rh/colaboradores/:id/ferias). Enum rh_ferias_status: programada |
// em_andamento | concluida | cancelada — não há "aprovada/recusada"
// explícito ainda (recusar = marcar cancelada). ---

export async function updateRhFeriasStatus(
  id: string,
  status: 'programada' | 'em_andamento' | 'concluida' | 'cancelada'
): Promise<Record<string, unknown>> {
  const json = await api.patch(`/api/rh/ferias/${encodeURIComponent(id)}`, { status });
  return json.data;
}

// --- Colaborador: Férias (lista individual + criação, tela de detalhe do RH).
// GET usa o subrecurso que já existe em colaboradores.js (rh_ferias filtrado
// por colaborador_id). POST usa o endpoint de escrita confirmado pela Lovable
// em 03/08/2026 (mesmo de cima). ---

export type ColaboradorFeriasItem = {
  id: string;
  colaborador_id: string;
  data_inicio: string | null;
  data_fim: string | null;
  dias_planejados: number | null;
  status: 'programada' | 'em_andamento' | 'concluida' | 'cancelada';
  observacoes: string | null;
  [key: string]: unknown;
};

export async function fetchColaboradorFerias(colaboradorId: string): Promise<ColaboradorFeriasItem[]> {
  const json = await api.get(`/api/rh/colaboradores/${encodeURIComponent(colaboradorId)}/ferias`);
  return (json.data as ColaboradorFeriasItem[]) ?? [];
}

export async function createColaboradorFerias(body: {
  colaborador_id: string;
  data_inicio: string;
  data_fim: string;
  dias_planejados?: number;
  observacoes?: string;
}): Promise<ColaboradorFeriasItem> {
  const json = await api.post('/api/rh/ferias', body);
  return json.data as ColaboradorFeriasItem;
}

// --- Colaborador: Contracheques por id (reaproveita fetchColaboradorContracheques
// acima, exportado com esse alias mais claro pra tela de detalhe do RH). ---
export const fetchContrachequesDoColaborador = fetchColaboradorContracheques;

// --- Colaborador (self-service): Minhas Solicitações — criação/resposta
// (leitura da lista simples já existe em fetchColaboradorSolicitacoes acima).
// Enums confirmados pela Lovable em 03/08/2026: setor = rh|dp|documentos|
// outros; assunto = rh_ferias|rh_beneficios|rh_atestado|rh_turno|
// rh_reclamacao|rh_outros|dp_holerite|dp_vt|dp_vr|dp_adiantamento|
// dp_rescisao|dp_outros|doc_atestado|doc_residencia|doc_rgcpf|doc_ctps|
// doc_diploma|doc_outros|out_sugestao|out_elogio|out_reclamacao|out_duvida. ---

// --- RH/liderança: lista completa de solicitações (rh_solicitacoes cru,
// mesmo endpoint dedicado acima) — usada no painel do RH pra gerenciar
// chamados de verdade (GET /api/rh/solicitacoes). ---

export type RhSolicitacaoItem = {
  id: string;
  protocolo: string | null;
  colaborador_id: string | null;
  setor: 'rh' | 'dp' | 'documentos' | 'outros' | null;
  assunto: string | null;
  titulo: string | null;
  mensagem: string | null;
  status: 'aberta' | 'em_analise' | 'respondida' | 'encerrada' | 'cancelada';
  atribuido_a: string | null;
  respondido_em: string | null;
  encerrado_em: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhSolicitacoes(params: {
  colaboradorId?: string;
  status?: string;
  setor?: string;
} = {}): Promise<RhSolicitacaoItem[]> {
  const search = new URLSearchParams();
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.status) search.set('status', params.status);
  if (params.setor) search.set('setor', params.setor);
  const json = await api.get(`/api/rh/solicitacoes?${search.toString()}`);
  return (json.data as RhSolicitacaoItem[]) ?? [];
}

export async function createColaboradorSolicitacao(body: {
  colaborador_id: string;
  setor: 'rh' | 'dp' | 'documentos' | 'outros';
  assunto: string;
  titulo?: string;
  mensagem: string;
}): Promise<Record<string, unknown>> {
  const json = await api.post('/api/rh/solicitacoes', body);
  return json.data;
}

export async function postSolicitacaoMensagem(
  id: string,
  body: { mensagem: string; e_interna?: boolean }
): Promise<Record<string, unknown>> {
  const json = await api.post(`/api/rh/solicitacoes/${encodeURIComponent(id)}/mensagens`, body);
  return json.data;
}

export async function updateRhSolicitacao(
  id: string,
  body: Record<string, unknown>,
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.patch(withActorId(`/api/rh/solicitacoes/${encodeURIComponent(id)}`, actorId), body);
  return json.data;
}

// --- Uniformes/EPI (tabelas rh_op_* — endpoint confirmado pela Lovable em
// 03/08/2026). Usado tanto por "Meus Uniformes" (colaborador) quanto por
// "Aprovações da Equipe" (liderança). rh_op_pedidos.status: pendente_ciencia
// | em_aprovacao | aguardando_gerente | aguardando_gestao | aprovado |
// pendente_entrega | entregue | recusado | cancelado. ---

export type RhUniformeItemCatalogo = {
  id: string;
  nome: string;
  unidade: string | null;
  [key: string]: unknown;
};

export type RhUniformeKitItem = {
  item_id: string;
  item?: RhUniformeItemCatalogo;
  [key: string]: unknown;
};

export type RhUniformeEntrega = {
  id: string;
  item_id: string;
  tamanho: string | null;
  quantidade: number;
  entregue_em: string | null;
  valido_ate: string | null;
  devolvido: boolean | null;
  [key: string]: unknown;
};

export type RhUniformePedidoItem = {
  item_id: string;
  tamanho: string | null;
  quantidade: number;
  estado_devolucao: string | null;
  valor_cobrar: number | null;
  // Embed do Supabase vem com o nome da tabela (rh_op_itens), não "item" —
  // confirmado pela Lovable em 20/08/2026. Só existe no GET (leitura); no
  // eco do POST de criação o item não vem embutido.
  rh_op_itens?: { nome: string; unidade?: string | null } | null;
  [key: string]: unknown;
};

export type RhUniformePedido = {
  id: string;
  colaborador_id: string;
  tipo: string | null;
  status: string;
  aprovacao_nivel: string | null;
  justificativa: string | null;
  aprovador_id: string | null;
  aprovado_em: string | null;
  motivo_recusa: string | null;
  observacoes?: string | null;
  ciencia_em: string | null;
  entregue_em: string | null;
  entregue_por: string | null;
  created_at?: string;
  // "itens" é o nome amigável usado pelo app; o GET da Lovable devolve o
  // embed como "rh_op_pedido_itens" (nome da tabela) — normalizado em
  // fetchRhUniformesPedidos/fetchRhUniformePedidoDetalhe pra sempre
  // preencher `itens` também, então o resto do app pode continuar lendo
  // só `pedido.itens`.
  itens?: RhUniformePedidoItem[];
  rh_op_pedido_itens?: RhUniformePedidoItem[];
  [key: string]: unknown;
};

// Normaliza o embed de itens: GET devolve em rh_op_pedido_itens, o eco do
// POST de criação devolve em itens — sempre expõe os dois preenchidos.
function normalizeUniformePedido(row: RhUniformePedido): RhUniformePedido {
  const itens = row.itens ?? row.rh_op_pedido_itens ?? [];
  return { ...row, itens, rh_op_pedido_itens: itens };
}

export async function fetchRhUniformesKit(cargoId: string): Promise<RhUniformeKitItem[]> {
  const json = await api.get(`/api/rh/uniformes?recurso=kit&cargoId=${encodeURIComponent(cargoId)}`);
  return (json.data as RhUniformeKitItem[]) ?? [];
}

export async function fetchRhUniformesEntregas(colaboradorId: string): Promise<RhUniformeEntrega[]> {
  const json = await api.get(
    `/api/rh/uniformes?recurso=entregas&colaboradorId=${encodeURIComponent(colaboradorId)}&devolvido=false`
  );
  return (json.data as RhUniformeEntrega[]) ?? [];
}

// tipo/limit/offset/id adicionados em 20/08/2026 pra suportar a tela admin
// "Recursos Operacionais" (filtro por tipo, paginação e detalhe de um pedido).
export async function fetchRhUniformesPedidos(
  params: { colaboradorId?: string; status?: string; tipo?: string; limit?: number; offset?: number } = {}
): Promise<RhUniformePedido[]> {
  const search = new URLSearchParams();
  search.set('recurso', 'pedidos');
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.status) search.set('status', params.status);
  if (params.tipo) search.set('tipo', params.tipo);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const json = await api.get(`/api/rh/uniformes?${search.toString()}`);
  const data = json.data;
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as RhUniformePedido[];
  return rows.map(normalizeUniformePedido);
}

// Detalhe de um pedido específico (usado no modal "Detalhes do pedido" —
// itens vêm em rh_op_pedido_itens, normalizado pra `itens` também).
export async function fetchRhUniformePedidoDetalhe(id: string): Promise<RhUniformePedido | null> {
  const json = await api.get(`/api/rh/uniformes?recurso=pedidos&id=${encodeURIComponent(id)}`);
  const data = json.data;
  if (Array.isArray(data)) return data[0] ? normalizeUniformePedido(data[0] as RhUniformePedido) : null;
  return data ? normalizeUniformePedido(data as RhUniformePedido) : null;
}

export async function fetchRhUniformesItens(): Promise<RhUniformeItemCatalogo[]> {
  const json = await api.get('/api/rh/uniformes?recurso=itens');
  return (json.data as RhUniformeItemCatalogo[]) ?? [];
}

export async function criarPedidoUniforme(body: {
  colaborador_id: string;
  tipo: string;
  justificativa?: string;
  itens: Array<{ item_id: string; tamanho: string; quantidade: number }>;
}): Promise<RhUniformePedido> {
  const json = await api.post('/api/rh/uniformes/pedidos', body);
  return json.data as RhUniformePedido;
}

export async function aprovarPedidoUniforme(id: string, actorId?: string | null): Promise<RhUniformePedido> {
  const json = await api.patch(withActorId(`/api/rh/uniformes/pedidos/${encodeURIComponent(id)}/aprovar`, actorId), {});
  return json.data as RhUniformePedido;
}

export async function recusarPedidoUniforme(
  id: string,
  motivoRecusa: string,
  actorId?: string | null
): Promise<RhUniformePedido> {
  const json = await api.patch(
    withActorId(`/api/rh/uniformes/pedidos/${encodeURIComponent(id)}/recusar`, actorId),
    { motivo_recusa: motivoRecusa }
  );
  return json.data as RhUniformePedido;
}

export async function registrarEntregaUniforme(body: {
  pedido_id: string;
  colaborador_id: string;
  item_id: string;
  tamanho: string;
  quantidade: number;
  valido_ate?: string;
}): Promise<RhUniformeEntrega> {
  const json = await api.post('/api/rh/uniformes/entregas', body);
  return json.data as RhUniformeEntrega;
}

// --- Recursos Operacionais (admin) — cobranças, estoque, itens & grade com
// escrita, kit por cargo com escrita e termo de responsabilidade versionado.
// Contrato estendido confirmado pela Lovable em 20/08/2026, mesmo endpoint
// unificado /api/rh/uniformes (recurso=cobrancas/estoque/movimentacoes/
// categorias/termo/termos via querystring, escritas em rotas dedicadas).

export type RhUniformeCobrancaStatus = 'pendente' | 'lancada' | 'cancelada';

export type RhUniformeCobranca = {
  id: string;
  colaborador_id: string;
  pedido_id: string | null;
  pedido_item_id: string | null;
  valor: number;
  descricao: string | null;
  competencia: string | null;
  status: RhUniformeCobrancaStatus;
  lancamento_folha_id: string | null;
  motivo_cancelamento: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhUniformesCobrancas(
  params: { status?: RhUniformeCobrancaStatus; colaboradorId?: string } = {}
): Promise<RhUniformeCobranca[]> {
  const search = new URLSearchParams();
  search.set('recurso', 'cobrancas');
  if (params.status) search.set('status', params.status);
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  const json = await api.get(`/api/rh/uniformes?${search.toString()}`);
  return (json.data as RhUniformeCobranca[]) ?? [];
}

export async function createRhUniformeCobranca(
  body: {
    colaborador_id: string;
    pedido_id?: string;
    pedido_item_id?: string;
    valor: number;
    descricao: string;
    competencia?: string;
  },
  actorId?: string | null
): Promise<RhUniformeCobranca> {
  const json = await api.post(withActorId('/api/rh/uniformes/cobrancas', actorId), body);
  return json.data as RhUniformeCobranca;
}

export async function updateRhUniformeCobranca(
  id: string,
  body: { status: RhUniformeCobrancaStatus; motivo_cancelamento?: string },
  actorId?: string | null
): Promise<RhUniformeCobranca> {
  const json = await api.patch(withActorId(`/api/rh/uniformes/cobrancas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhUniformeCobranca;
}

export async function deleteRhUniformeCobranca(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/cobrancas/${encodeURIComponent(id)}`, actorId));
}

export type RhUniformeEstoqueLinha = {
  item_id: string;
  item_nome: string;
  unidade?: string | null;
  possui_grade?: boolean;
  ativo?: boolean;
  categoria?: string | null;
  tamanho: string | null;
  saldo: number;
  sem_tamanhos?: boolean;
  item?: RhUniformeItemCatalogo;
  [key: string]: unknown;
};

export async function fetchRhUniformesEstoque(): Promise<RhUniformeEstoqueLinha[]> {
  const json = await api.get('/api/rh/uniformes?recurso=estoque');
  return (json.data as RhUniformeEstoqueLinha[]) ?? [];
}

export type RhUniformeMovimentacaoTipo = 'entrada' | 'saida' | 'ajuste' | 'devolucao';

export type RhUniformeMovimentacao = {
  id: string;
  item_id: string;
  tamanho: string | null;
  tipo: RhUniformeMovimentacaoTipo;
  quantidade: number;
  pedido_id: string | null;
  motivo: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhUniformesMovimentacoes(
  params: { itemId?: string; limit?: number } = {}
): Promise<RhUniformeMovimentacao[]> {
  const search = new URLSearchParams();
  search.set('recurso', 'movimentacoes');
  if (params.itemId) search.set('itemId', params.itemId);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  const json = await api.get(`/api/rh/uniformes?${search.toString()}`);
  return (json.data as RhUniformeMovimentacao[]) ?? [];
}

export async function createRhUniformeMovimentacao(
  body: {
    item_id: string;
    tamanho?: string | null;
    tipo: RhUniformeMovimentacaoTipo;
    quantidade: number;
    pedido_id?: string;
    motivo?: string;
  },
  actorId?: string | null
): Promise<RhUniformeMovimentacao> {
  const json = await api.post(withActorId('/api/rh/uniformes/movimentacoes', actorId), body);
  return json.data as RhUniformeMovimentacao;
}

export async function deleteRhUniformeMovimentacao(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/movimentacoes/${encodeURIComponent(id)}`, actorId));
}

export type RhUniformeCategoria = {
  id: string;
  slug: 'uniforme' | 'epi' | 'outros';
  nome?: string;
  [key: string]: unknown;
};

export async function fetchRhUniformesCategorias(): Promise<RhUniformeCategoria[]> {
  const json = await api.get('/api/rh/uniformes?recurso=categorias');
  return (json.data as RhUniformeCategoria[]) ?? [];
}

export type RhUniformeTamanho = {
  id: string;
  item_id: string;
  tamanho: string;
  ordem: number | null;
  ativo: boolean;
};

export type RhUniformeItemCreateBody = {
  categoria_id: string;
  nome: string;
  descricao?: string;
  possui_grade: boolean;
  unidade?: string;
  prazo_troca_meses?: number;
  faixa_gerente_pct?: number;
  valor_unit?: number;
  tamanhos?: string[];
};

export async function createRhUniformeItem(
  body: RhUniformeItemCreateBody,
  actorId?: string | null
): Promise<RhUniformeItemCatalogo> {
  const json = await api.post(withActorId('/api/rh/uniformes/itens', actorId), body);
  return json.data as RhUniformeItemCatalogo;
}

export async function updateRhUniformeItem(
  id: string,
  body: Partial<Omit<RhUniformeItemCreateBody, 'tamanhos'>> & { ativo?: boolean },
  actorId?: string | null
): Promise<RhUniformeItemCatalogo> {
  const json = await api.patch(withActorId(`/api/rh/uniformes/itens/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhUniformeItemCatalogo;
}

export async function deleteRhUniformeItem(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/itens/${encodeURIComponent(id)}`, actorId));
}

export async function createRhUniformeTamanho(
  body: { item_id: string; tamanho: string; ordem?: number },
  actorId?: string | null
): Promise<RhUniformeTamanho> {
  const json = await api.post(withActorId('/api/rh/uniformes/tamanhos', actorId), body);
  return json.data as RhUniformeTamanho;
}

export async function updateRhUniformeTamanho(
  id: string,
  body: Partial<{ tamanho: string; ordem: number; ativo: boolean }>,
  actorId?: string | null
): Promise<RhUniformeTamanho> {
  const json = await api.patch(withActorId(`/api/rh/uniformes/tamanhos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhUniformeTamanho;
}

export async function deleteRhUniformeTamanho(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/tamanhos/${encodeURIComponent(id)}`, actorId));
}

// Kit por cargo — POST substitui a lista inteira do cargo.
export async function saveRhUniformeKitCargo(
  body: { cargo_id: string; itens: Array<{ item_id: string; quantidade: number }> },
  actorId?: string | null
): Promise<RhUniformeKitItem[]> {
  const json = await api.post(withActorId('/api/rh/uniformes/kit', actorId), body);
  return (json.data as RhUniformeKitItem[]) ?? [];
}

export async function deleteRhUniformeKitItem(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/kit/${encodeURIComponent(id)}`, actorId));
}

export async function deleteRhUniformeKitCargo(cargoId: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/uniformes/kit-cargo/${encodeURIComponent(cargoId)}`, actorId));
}

export type RhUniformeTermo = {
  id: string;
  versao: number;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  vigencia_inicio: string | null;
  created_at?: string;
  created_by?: string | null;
};

// Versão ativa (a que aparece no app pro colaborador dar ciência).
export async function fetchRhUniformeTermo(): Promise<RhUniformeTermo | null> {
  const json = await api.get('/api/rh/uniformes?recurso=termo');
  const data = json.data;
  if (Array.isArray(data)) return (data[0] as RhUniformeTermo) ?? null;
  return (data as RhUniformeTermo) ?? null;
}

// Histórico de versões (mais recente primeiro).
export async function fetchRhUniformeTermos(): Promise<RhUniformeTermo[]> {
  const json = await api.get('/api/rh/uniformes?recurso=termos');
  return (json.data as RhUniformeTermo[]) ?? [];
}

// Cria versão nova e desativa a anterior — nunca sobrescreve a existente.
export async function saveRhUniformeTermo(
  body: { titulo: string; conteudo: string },
  actorId?: string | null
): Promise<RhUniformeTermo> {
  const json = await api.post(withActorId('/api/rh/uniformes/termo', actorId), body);
  return json.data as RhUniformeTermo;
}

// --- Calendário (rh_calendario_eventos; endpoint confirmado pela Lovable em
// 03/08/2026, CRUD completo). Sem colaborador_id = evento global (aparece pra
// todo mundo da empresa). Por padrão o GET já traz colaborador + globais
// (incluirGlobais), ordenado por inicio_em asc — bom pra "Próximos eventos"
// (de=hoje, limit=3). Enum rh_calendario_tipo: feriado | folga | escala |
// treinamento | reuniao | evento | outros. ---

export type RhCalendarioEvento = {
  id: string;
  titulo: string;
  tipo: 'feriado' | 'folga' | 'escala' | 'treinamento' | 'reuniao' | 'evento' | 'outros';
  inicio_em: string;
  fim_em: string | null;
  dia_inteiro: boolean | null;
  descricao: string | null;
  empresa_id: string | null;
  colaborador_id: string | null;
  [key: string]: unknown;
};

export async function fetchRhCalendarioEventos(params: {
  colaboradorId?: string | null;
  empresaId?: string | null;
  tipo?: string;
  de?: string;
  ate?: string;
  incluirGlobais?: boolean;
  limit?: number;
} = {}): Promise<RhCalendarioEvento[]> {
  const search = new URLSearchParams();
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.empresaId) search.set('empresaId', params.empresaId);
  if (params.tipo) search.set('tipo', params.tipo);
  if (params.de) search.set('de', params.de);
  if (params.ate) search.set('ate', params.ate);
  if (params.incluirGlobais !== undefined) search.set('incluirGlobais', params.incluirGlobais ? '1' : '0');
  if (params.limit) search.set('limit', String(params.limit));
  const json = await api.get(`/api/rh/calendario?${search.toString()}`);
  return (json.data as RhCalendarioEvento[]) ?? [];
}

export async function createRhCalendarioEvento(
  body: {
    titulo: string;
    tipo: string;
    inicio_em: string;
    fim_em?: string;
    dia_inteiro?: boolean;
    descricao?: string;
    empresa_id?: string;
    colaborador_id?: string;
  },
  actorId?: string | null
): Promise<RhCalendarioEvento> {
  const json = await api.post(withActorId('/api/rh/calendario', actorId), body);
  return json.data as RhCalendarioEvento;
}

export async function updateRhCalendarioEvento(
  id: string,
  body: Record<string, unknown>,
  actorId?: string | null
): Promise<RhCalendarioEvento> {
  const json = await api.patch(withActorId(`/api/rh/calendario/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhCalendarioEvento;
}

export async function deleteRhCalendarioEvento(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/calendario/${encodeURIComponent(id)}`, actorId));
}

// --- Treinamentos: conteúdo real (rh_treinamentos, rh_treinamento_aulas,
// rh_treinamento_questoes, rh_treinamento_inscricoes, rh_treinamento_
// respostas) — GET confirmado pela Lovable em 03/08/2026. Somente leitura por
// enquanto: a Lovable ainda não confirmou endpoint de escrita (responder
// prova / atualizar inscrição), então não existe função de criar/atualizar
// aqui — não fabricar isso na UI enquanto não vier confirmação. O gabarito
// (correta/explicacao) só deve ser pedido a partir do painel do RH, nunca do
// app do colaborador. ---

export type RhTreinamentoCatalogo = {
  id: string;
  titulo: string;
  subtitulo: string | null;
  descricao: string | null;
  categoria: string | null;
  capa_url: string | null;
  video_url: string | null;
  conteudo_url: string | null;
  tipo: string | null;
  obrigatorio: boolean | null;
  ativo: boolean | null;
  carga_horaria_min: number | null;
  prova_min_acerto: number | null;
  prova_tempo_limite_min: number | null;
  [key: string]: unknown;
};

// Progresso de uma aula em vídeo pra uma inscrição (rh_treinamento_progresso
// — confirmado pela Lovable em 19/08/2026). segundos_max é o maior ponto já
// atingido (o servidor nunca deixa "voltar"); segundos_assistidos costuma
// refletir a posição atual do player.
export type RhTreinamentoProgressoAula = {
  inscricao_id: string;
  aula_id: string;
  segundos_assistidos: number | null;
  segundos_max: number | null;
  duracao_segundos: number | null;
  concluida: boolean | null;
  iniciado_em: string | null;
  ultimo_acesso_em: string | null;
  [key: string]: unknown;
};

export type RhTreinamentoAula = {
  id: string;
  treinamento_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  duracao_min: number | null;
  video_url: string | null;
  video_storage_path: string | null;
  progresso?: RhTreinamentoProgressoAula | null;
  [key: string]: unknown;
};

export type RhTreinamentoQuestao = {
  id: string;
  treinamento_id: string;
  ordem: number;
  enunciado: string;
  alternativas: Array<{ chave: string; texto: string }>;
  correta?: string;
  explicacao?: string | null;
  [key: string]: unknown;
};

async function fetchRhTreinamentosRecurso<T>(
  recurso: 'treinamentos' | 'aulas' | 'questoes' | 'inscricoes' | 'respostas' | 'progresso-aulas' | 'atribuicoes',
  params: {
    treinamentoId?: string;
    colaboradorId?: string;
    inscricaoId?: string;
    aulaId?: string;
    status?: string;
    ativo?: boolean;
    incluirGabarito?: boolean;
  } = {}
): Promise<T[]> {
  const search = new URLSearchParams();
  search.set('recurso', recurso);
  if (params.treinamentoId) search.set('treinamentoId', params.treinamentoId);
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.inscricaoId) search.set('inscricaoId', params.inscricaoId);
  if (params.aulaId) search.set('aulaId', params.aulaId);
  if (params.status) search.set('status', params.status);
  if (params.ativo !== undefined) search.set('ativo', params.ativo ? 'true' : 'false');
  if (params.incluirGabarito) search.set('incluirGabarito', '1');
  const json = await api.get(`/api/rh/treinamentos-conteudo?${search.toString()}`);
  return (json.data as T[]) ?? [];
}

// Passar inscricaoId traz o campo "progresso" já embutido em cada aula
// (posição assistida, se concluiu) — ideal pra tela de detalhe da aula.
export async function fetchRhTreinamentoAulas(
  treinamentoId: string,
  inscricaoId?: string | null
): Promise<RhTreinamentoAula[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoAula>('aulas', {
    treinamentoId,
    inscricaoId: inscricaoId ?? undefined,
  });
}

// Leitura crua de progresso por aula — alternativa a reler "aulas" quando já
// se tem a inscrição em mãos. Sem aulaId, traz o progresso de todas as aulas
// da inscrição.
export async function fetchRhTreinamentoProgressoAulas(
  inscricaoId: string,
  aulaId?: string
): Promise<RhTreinamentoProgressoAula[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoProgressoAula>('progresso-aulas', { inscricaoId, aulaId });
}

// incluirGabarito NUNCA deve ser passado true a partir do app do colaborador.
export async function fetchRhTreinamentoQuestoes(
  treinamentoId: string,
  incluirGabarito = false
): Promise<RhTreinamentoQuestao[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoQuestao>('questoes', { treinamentoId, incluirGabarito });
}

export async function fetchRhTreinamentoDetalhe(treinamentoId: string): Promise<RhTreinamentoCatalogo | null> {
  const items = await fetchRhTreinamentosRecurso<RhTreinamentoCatalogo>('treinamentos', { treinamentoId });
  return items[0] ?? null;
}

// Wrapper aditivo — apenas expõe a listagem completa (sem treinamentoId) do
// recurso interno 'treinamentos' já existente, pra tela de gestão do RH
// listar todos os treinamentos do catálogo (com filtro opcional de ativo).
export async function fetchRhTreinamentos(params: { ativo?: boolean } = {}): Promise<RhTreinamentoCatalogo[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoCatalogo>('treinamentos', params);
}

export async function fetchRhTreinamentoInscricoes(params: {
  colaboradorId?: string;
  treinamentoId?: string;
  status?: string;
} = {}): Promise<Record<string, unknown>[]> {
  return fetchRhTreinamentosRecurso<Record<string, unknown>>('inscricoes', params);
}

// --- Treinamentos: escrita (respostas/prova/inscrições) — endpoint
// confirmado pela Lovable em 03/08/2026. Preferir postRhTreinamentoProva
// (fluxo completo) — ela já grava as respostas corrigidas no servidor e
// atualiza a inscrição; postRhTreinamentoResposta fica pra registrar uma
// resposta isolada, se algum fluxo precisar disso separadamente. ---

export type RhTreinamentoProvaResultado = {
  acertos: number;
  total: number;
  nota: number;
  prova_min_acerto: number;
  aprovado: boolean;
  tentativa: number;
  [key: string]: unknown;
};

export async function postRhTreinamentoResposta(
  body: { inscricao_id: string; questao_id: string; resposta: string; tempo_ms?: number; tentativa?: number },
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/respostas', actorId), body);
  return json.data;
}

export async function submeterProvaTreinamento(
  body: {
    inscricao_id: string;
    respostas: Array<{ questao_id: string; resposta: string; tempo_ms?: number }>;
    tempo_gasto_min?: number;
  },
  actorId?: string | null
): Promise<{ inscricao: Record<string, unknown>; resultado: RhTreinamentoProvaResultado }> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/prova', actorId), body);
  return { inscricao: json.data, resultado: json.resultado as RhTreinamentoProvaResultado };
}

export async function updateRhTreinamentoInscricao(
  id: string,
  body: Record<string, unknown>,
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.patch(
    withActorId(`/api/rh/treinamentos-conteudo/inscricoes/${encodeURIComponent(id)}`, actorId),
    body
  );
  return json.data;
}

// Upsert de progresso por aula — endpoint confirmado pela Lovable em
// 19/08/2026 (rh_treinamento_progresso, UNIQUE em inscricao_id+aula_id). O
// servidor mantém o progresso monotônico (nunca "volta") e marca concluida
// automaticamente perto do fim do vídeo.
export async function upsertRhTreinamentoProgressoAula(
  body: {
    inscricao_id: string;
    aula_id: string;
    posicao_atual_seg: number;
    duracao_total_seg: number;
    concluida?: boolean;
    ultima_visualizacao?: string;
  },
  actorId?: string | null
): Promise<{ data: RhTreinamentoProgressoAula; percentual?: number }> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/progresso-aula', actorId), body);
  return { data: json.data, percentual: json.percentual };
}

// --- Treinamentos (RH/admin): CRUD de treinamento/aulas/questões, upload de
// vídeo via signed URL, atribuição em massa e respostas agregadas —
// endpoint confirmado pela Lovable em 20/08/2026 (mesmo
// /api/public/internal/rh-treinamentos usado pelo colaborador).

export type RhTreinamentoCreateBody = {
  titulo: string;
  subtitulo?: string | null;
  descricao?: string | null;
  categoria: string;
  carga_horaria_min: number;
  obrigatorio?: boolean;
  ativo?: boolean;
  rascunho?: boolean;
  prova_min_acerto: number;
  prova_tempo_limite_min: number;
  capa_url?: string | null;
  video_url?: string | null;
  conteudo_url?: string | null;
  tipo?: 'video' | 'leitura' | 'presencial' | 'outro';
};

export async function createRhTreinamento(
  body: RhTreinamentoCreateBody,
  actorId?: string | null
): Promise<RhTreinamentoCatalogo> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo', actorId), body);
  return json.data as RhTreinamentoCatalogo;
}

export async function updateRhTreinamento(
  id: string,
  body: Partial<RhTreinamentoCreateBody>,
  actorId?: string | null
): Promise<RhTreinamentoCatalogo> {
  const json = await api.patch(withActorId(`/api/rh/treinamentos-conteudo/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhTreinamentoCatalogo;
}

export async function deleteRhTreinamento(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/treinamentos-conteudo/${encodeURIComponent(id)}`, actorId));
}

export type RhTreinamentoAulaCreateBody = {
  treinamento_id: string;
  ordem?: number;
  titulo: string;
  descricao?: string | null;
  duracao_min?: number | null;
  video_url?: string | null;
  video_storage_path?: string | null;
};

export async function createRhTreinamentoAula(
  body: RhTreinamentoAulaCreateBody,
  actorId?: string | null
): Promise<RhTreinamentoAula> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/aulas', actorId), body);
  return json.data as RhTreinamentoAula;
}

export async function updateRhTreinamentoAula(
  id: string,
  body: Partial<RhTreinamentoAulaCreateBody>,
  actorId?: string | null
): Promise<RhTreinamentoAula> {
  const json = await api.patch(withActorId(`/api/rh/treinamentos-conteudo/aulas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhTreinamentoAula;
}

export async function deleteRhTreinamentoAula(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/treinamentos-conteudo/aulas/${encodeURIComponent(id)}`, actorId));
}

export type RhTreinamentoVideoUploadUrl = {
  bucket: string;
  path: string;
  signed_url: string;
  token: string;
  video_url: string;
  video_storage_path: string;
};

export async function requestRhTreinamentoVideoUploadUrl(
  body: { filename: string; treinamento_id?: string },
  actorId?: string | null
): Promise<RhTreinamentoVideoUploadUrl> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/video-upload-url', actorId), body);
  return json.data as RhTreinamentoVideoUploadUrl;
}

export type RhTreinamentoQuestaoCreateBody = {
  treinamento_id: string;
  ordem?: number;
  enunciado: string;
  alternativas: Array<{ chave: string; texto: string }>;
  correta: string;
  explicacao?: string | null;
};

export async function createRhTreinamentoQuestao(
  body: RhTreinamentoQuestaoCreateBody,
  actorId?: string | null
): Promise<RhTreinamentoQuestao> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/questoes', actorId), body);
  return json.data as RhTreinamentoQuestao;
}

export async function updateRhTreinamentoQuestao(
  id: string,
  body: Partial<RhTreinamentoQuestaoCreateBody>,
  actorId?: string | null
): Promise<RhTreinamentoQuestao> {
  const json = await api.patch(
    withActorId(`/api/rh/treinamentos-conteudo/questoes/${encodeURIComponent(id)}`, actorId),
    body
  );
  return json.data as RhTreinamentoQuestao;
}

export async function deleteRhTreinamentoQuestao(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/treinamentos-conteudo/questoes/${encodeURIComponent(id)}`, actorId));
}

export type RhTreinamentoAtribuicaoTipo = 'todos' | 'cargo' | 'grupo' | 'colaborador';

export type RhTreinamentoAtribuicao = {
  id: string;
  treinamento_id: string;
  tipo: RhTreinamentoAtribuicaoTipo;
  cargo?: string | null;
  grupo_slug?: string | null;
  colaborador_id?: string | null;
  [key: string]: unknown;
};

export async function fetchRhTreinamentoAtribuicoes(treinamentoId: string): Promise<RhTreinamentoAtribuicao[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoAtribuicao>('atribuicoes', { treinamentoId });
}

export async function atribuirRhTreinamento(
  body: {
    treinamento_id: string;
    tipo: RhTreinamentoAtribuicaoTipo;
    cargos?: string[];
    grupos?: string[];
    colaboradores?: string[];
    inscrever?: boolean;
  },
  actorId?: string | null
): Promise<{ data: RhTreinamentoAtribuicao[]; inscritos: number }> {
  const json = await api.post(withActorId('/api/rh/treinamentos-conteudo/atribuir', actorId), body);
  return { data: (json.data as RhTreinamentoAtribuicao[]) ?? [], inscritos: (json.inscritos as number) ?? 0 };
}

export type RhTreinamentoRespostaAgregadaLinha = {
  inscricao_id: string;
  colaborador_id: string;
  nome_completo: string;
  matricula: string | null;
  cargo: string | null;
  status: string;
  nota: number | null;
  tentativas: number;
  iniciado_em: string | null;
  concluido_em: string | null;
  [key: string]: unknown;
};

export type RhTreinamentoRespostasResumo = {
  inscritos: number;
  concluiram: number;
  em_andamento: number;
  nao_iniciaram: number;
  nota_media: number | null;
};

export async function fetchRhTreinamentoRespostasAgregadas(
  treinamentoId: string
): Promise<{ data: RhTreinamentoRespostaAgregadaLinha[]; resumo: RhTreinamentoRespostasResumo | null }> {
  const json = await api.get(`/api/rh/treinamentos-conteudo?recurso=respostas-agregadas&treinamentoId=${encodeURIComponent(treinamentoId)}`);
  const payload = (json.data ?? {}) as { data?: RhTreinamentoRespostaAgregadaLinha[]; resumo?: RhTreinamentoRespostasResumo };
  return { data: payload.data ?? [], resumo: payload.resumo ?? null };
}

export type RhTreinamentoDetalhePercurso = {
  iniciado_em: string | null;
  ultimo_acesso_em: string | null;
  aulas_concluidas: number;
  aulas_total: number;
  tempo_assistido_seg: number;
};

export type RhTreinamentoDetalheAula = {
  aula_id: string;
  titulo: string;
  ordem: number;
  posicao_max_seg: number;
  duracao_seg: number;
  pct: number;
  concluida: boolean;
  atualizado_em: string | null;
};

export type RhTreinamentoTentativaResposta = {
  questao_id: string;
  enunciado: string;
  alternativas: Array<{ chave: string; texto: string }>;
  resposta: string;
  resposta_texto: string | null;
  correta: string;
  acertou: boolean;
  explicacao: string | null;
};

export type RhTreinamentoTentativa = {
  tentativa_numero: number;
  respondido_em: string | null;
  acertos: number;
  total: number;
  nota: number;
  aprovado: boolean;
  respostas: RhTreinamentoTentativaResposta[];
};

export type RhTreinamentoDetalheColaborador = {
  percurso: RhTreinamentoDetalhePercurso;
  aulas: RhTreinamentoDetalheAula[];
  tentativas: RhTreinamentoTentativa[];
  prova_min_acerto: number;
};

export async function fetchRhTreinamentoRespostasColaborador(
  treinamentoId: string,
  colaboradorId: string
): Promise<RhTreinamentoDetalheColaborador> {
  const json = await api.get(
    `/api/rh/treinamentos-conteudo?recurso=respostas-agregadas&treinamentoId=${encodeURIComponent(
      treinamentoId
    )}&colaboradorId=${encodeURIComponent(colaboradorId)}`
  );
  const data = (json.data ?? {}) as Partial<RhTreinamentoDetalheColaborador>;
  return {
    percurso: data.percurso ?? {
      iniciado_em: null,
      ultimo_acesso_em: null,
      aulas_concluidas: 0,
      aulas_total: 0,
      tempo_assistido_seg: 0,
    },
    aulas: data.aulas ?? [],
    tentativas: data.tentativas ?? [],
    prova_min_acerto: data.prova_min_acerto ?? 0,
  };
}

// --- Comunicados: escrita real (rh_comunicados) — endpoint dedicado
// confirmado pela Lovable em 03/08/2026. A leitura simples do colaborador
// (dashboard/lista) continua vindo de /api/rh/dashboard/comunicados; este
// bloco é usado pelo painel do RH pra criar/editar/excluir comunicado de
// verdade, e por qualquer tela que precise marcar "lido". ---

export type RhComunicadoItem = {
  id: string;
  titulo: string;
  conteudo: string;
  publico: 'todos' | 'empresa' | 'grupo' | 'colaborador';
  empresa_id: string | null;
  grupo_id: string | null;
  colaborador_id: string | null;
  publicar_em: string | null;
  expira_em: string | null;
  anexo_url: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhComunicados(params: {
  empresaId?: string | null;
  grupoId?: string | null;
  colaboradorId?: string | null;
  publico?: string;
  vigentes?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<RhComunicadoItem[]> {
  const search = new URLSearchParams();
  if (params.empresaId) search.set('empresaId', params.empresaId);
  if (params.grupoId) search.set('grupoId', params.grupoId);
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.publico) search.set('publico', params.publico);
  if (params.vigentes !== undefined) search.set('vigentes', params.vigentes ? '1' : '0');
  if (params.limit) search.set('limit', String(params.limit));
  if (params.offset) search.set('offset', String(params.offset));
  const json = await api.get(`/api/rh/comunicados?${search.toString()}`);
  return (json.data as RhComunicadoItem[]) ?? [];
}

export async function createRhComunicado(
  body: {
    titulo: string;
    conteudo: string;
    publico?: 'todos' | 'empresa' | 'grupo' | 'colaborador';
    empresa_id?: string;
    grupo_id?: string;
    colaborador_id?: string;
    publicar_em?: string;
    expira_em?: string;
    anexo_url?: string;
  },
  actorId?: string | null
): Promise<RhComunicadoItem> {
  const json = await api.post(withActorId('/api/rh/comunicados', actorId), body);
  return json.data as RhComunicadoItem;
}

export async function updateRhComunicado(
  id: string,
  body: Record<string, unknown>,
  actorId?: string | null
): Promise<RhComunicadoItem> {
  const json = await api.patch(withActorId(`/api/rh/comunicados/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhComunicadoItem;
}

export async function deleteRhComunicado(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/comunicados/${encodeURIComponent(id)}`, actorId));
}

// Lista de quem já visualizou o comunicado ("olho" no painel do RH) — nome/
// cargo/empresa de cada leitura são resolvidos no componente, cruzando com
// fetchRhColaboradores()/fetchRhUnidades() que a tela já carrega.
export type RhComunicadoLeituraItem = { colaborador_id: string; lido_em: string };

export async function fetchRhComunicadoLeituras(comunicadoId: string): Promise<RhComunicadoLeituraItem[]> {
  const json = await api.get(`/api/rh/comunicados/${encodeURIComponent(comunicadoId)}/leituras`);
  return (json.data as RhComunicadoLeituraItem[]) ?? [];
}

// --- Importar PDF (rh_pdf_imports). Leitura + escrita (upload/IA, aplicar
// admissão/desligamento, excluir, reprocessar) confirmadas pela Lovable em
// 21/07/2026 e 12/08/2026. ---

export type RhPdfImportItem = {
  id: string;
  arquivo_nome: string | null;
  arquivo_path: string | null;
  arquivo_mime: string | null;
  tipo: 'admissao' | 'desligamento' | 'experiencia' | 'outro' | null;
  status: 'pendente' | 'processando' | 'pronto' | 'aplicado' | 'erro';
  confianca: number | null;
  cpf_extraido: string | null;
  nome_extraido: string | null;
  colaborador_id: string | null;
  erro: string | null;
  aplicado_em: string | null;
  aplicado_por: string | null;
  created_at?: string;
  [key: string]: unknown;
};

export async function fetchRhPdfImports(params: { status?: string; tipo?: string } = {}): Promise<RhPdfImportItem[]> {
  const search = new URLSearchParams();
  if (params.status) search.set('status', params.status);
  if (params.tipo) search.set('tipo', params.tipo);
  const json = await api.get(`/api/rh/importacoes-pdf?${search.toString()}`);
  return (json.data as RhPdfImportItem[]) ?? [];
}

export type RhPdfImportArquivo = {
  nome_arquivo: string;
  arquivo_base64: string;
  mime_type: string;
};

// Upload de um ou mais PDFs + disparo da extração por IA. Com
// processar=false, cria as linhas só como "pendente" sem rodar a IA agora
// (reprocessar depois). Devolve as linhas criadas (já com status
// pronto/erro se processado na hora) e eventuais erros por arquivo.
export async function uploadRhPdfImport(
  arquivos: RhPdfImportArquivo[],
  opts: { processar?: boolean } = {},
  actorId?: string | null
): Promise<{ itens: RhPdfImportItem[]; erros: Array<{ arquivo?: string; error: string }> }> {
  const body = arquivos.length === 1 ? arquivos[0] : { arquivos };
  let path = '/api/rh/importacoes-pdf';
  if (opts.processar === false) path += '?processar=0';
  const json = await api.post(withActorId(path, actorId), body);
  return { itens: (json.itens as RhPdfImportItem[]) ?? [], erros: (json.erros as Array<{ arquivo?: string; error: string }>) ?? [] };
}

export async function fetchRhPdfImportDetalhe(
  id: string,
  actorId?: string | null
): Promise<{ data: RhPdfImportItem | null; url: string | null }> {
  const json = await api.get(withActorId(`/api/rh/importacoes-pdf/${encodeURIComponent(id)}`, actorId));
  return { data: (json.data as RhPdfImportItem) ?? null, url: json.url ?? null };
}

export async function aplicarRhPdfImportAdmissao(
  id: string,
  body: Record<string, unknown> = {},
  actorId?: string | null
): Promise<RhPdfImportItem> {
  const json = await api.post(withActorId(`/api/rh/importacoes-pdf/${encodeURIComponent(id)}/aplicar-admissao`, actorId), body);
  return json.data as RhPdfImportItem;
}

export async function aplicarRhPdfImportDesligamento(
  id: string,
  body: Record<string, unknown> = {},
  actorId?: string | null
): Promise<RhPdfImportItem> {
  const json = await api.post(
    withActorId(`/api/rh/importacoes-pdf/${encodeURIComponent(id)}/aplicar-desligamento`, actorId),
    body
  );
  return json.data as RhPdfImportItem;
}

export async function reprocessarRhPdfImport(id: string, actorId?: string | null): Promise<RhPdfImportItem> {
  const json = await api.post(withActorId(`/api/rh/importacoes-pdf/${encodeURIComponent(id)}/reprocessar`, actorId), {});
  return json.data as RhPdfImportItem;
}

export async function deleteRhPdfImport(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/importacoes-pdf/${encodeURIComponent(id)}`, actorId));
}

// --- Metas de RH (rh_metas) — endpoint confirmado pela Lovable em
// 19/08/2026 (/api/public/internal/rh-metas via nosso proxy /api/rh/metas).
// "publico" define o escopo (todos/empresa/grupo/cargo/colaborador); os
// campos *_ids cobrem escopo múltiplo quando publico não é "todos".
// "medicao" automática exige "fonte_auto" e é recalculada sob demanda
// (recalcularRhMetas), lendo o espelho Quality no período/escopo da meta.
export type RhMetaPublico = 'todos' | 'empresa' | 'grupo' | 'cargo' | 'colaborador';
export type RhMetaMedicao = 'manual' | 'automatica';
export type RhMetaStatus = 'aberta' | 'atingida' | 'nao_atingida' | 'cancelada';
export type RhMetaFonteAuto =
  | 'faturamento'
  | 'cupons'
  | 'litros_total'
  | 'litros_gasolina'
  | 'litros_etanol'
  | 'litros_diesel'
  | 'litros_gnv';

export type RhMetaItem = {
  id: string;
  titulo: string;
  descricao: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  meta_alvo: number;
  resultado: number | null;
  status: RhMetaStatus;
  avaliacao: string | null;
  publico: RhMetaPublico;
  medicao: RhMetaMedicao;
  fonte_auto: RhMetaFonteAuto | null;
  resultado_atualizado_em: string | null;
  empresa_id: string | null;
  grupo_id: string | null;
  cargo_id: string | null;
  empresa_ids: string[] | null;
  grupo_ids: string[] | null;
  cargo_ids: string[] | null;
  colaborador_ids: string[] | null;
  colaborador_nome?: string | null;
  colaboradores_nomes?: string[] | null;
  empresa_nome?: string | null;
  empresas_nomes?: string[] | null;
  percentual?: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  [key: string]: unknown;
};

export type RhMetasResumo = { total: number; abertas: number; atingidas: number; automaticas: number };

export async function fetchRhMetas(
  params: {
    busca?: string;
    status?: RhMetaStatus;
    medicao?: RhMetaMedicao;
    colaboradorId?: string;
    empresaId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: RhMetaItem[]; count: number; resumo: RhMetasResumo }> {
  const search = new URLSearchParams();
  if (params.busca) search.set('busca', params.busca);
  if (params.status) search.set('status', params.status);
  if (params.medicao) search.set('medicao', params.medicao);
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.empresaId) search.set('empresaId', params.empresaId);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  const json = await api.get(`/api/rh/metas${qs ? `?${qs}` : ''}`);
  return {
    items: (json.data as RhMetaItem[]) ?? [],
    count: json.count ?? 0,
    resumo: json.resumo ?? { total: 0, abertas: 0, atingidas: 0, automaticas: 0 },
  };
}

export type RhMetaCreateBody = {
  titulo: string;
  descricao?: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  meta_alvo: number;
  publico?: RhMetaPublico;
  medicao?: RhMetaMedicao;
  fonte_auto?: RhMetaFonteAuto;
  status?: RhMetaStatus;
  empresa_ids?: string[];
  grupo_ids?: string[];
  cargo_ids?: string[];
  colaborador_ids?: string[];
};

export async function createRhMeta(body: RhMetaCreateBody, actorId?: string | null): Promise<RhMetaItem> {
  const json = await api.post(withActorId('/api/rh/metas', actorId), body);
  return json.data as RhMetaItem;
}

export async function updateRhMeta(
  id: string,
  body: Partial<RhMetaCreateBody> & { resultado?: number; avaliacao?: string },
  actorId?: string | null
): Promise<RhMetaItem> {
  const json = await api.patch(withActorId(`/api/rh/metas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhMetaItem;
}

export async function deleteRhMeta(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/metas/${encodeURIComponent(id)}`, actorId));
}

// Sem id, recalcula todas as metas automáticas da rede; com id, só uma.
export async function recalcularRhMetas(
  metaId?: string,
  actorId?: string | null
): Promise<{ total: number; atualizadas: number }> {
  const path = metaId
    ? `/api/rh/metas/recalcular?id=${encodeURIComponent(metaId)}`
    : '/api/rh/metas/recalcular';
  const json = await api.post(withActorId(path, actorId), {});
  return { total: json.total ?? 0, atualizadas: json.atualizadas ?? 0 };
}

// --- Jornadas (rh_jornadas) — endpoint confirmado pela Lovable em
// 19/08/2026 (/api/public/internal/rh-jornadas via nosso proxy
// /api/rh/jornadas). empresa_id nulo = jornada global ("Todas as
// empresas"). DELETE pode devolver 409 se houver colaborador vinculado
// (rh_colaboradores.jornada_id) — nesse caso, inativar em vez de excluir.
export type RhRegimeJornada = '44h' | '40h' | '36h' | '30h' | '12x36' | 'escala';

export type RhJornadaItem = {
  id: string;
  empresa_id: string | null;
  nome: string;
  entrada: string;
  saida: string;
  intervalo_minutos: number;
  regime: RhRegimeJornada;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string | null;
  empresas?: { id: string; razao_social?: string | null; nome_fantasia?: string | null; apelido?: string | null } | null;
  [key: string]: unknown;
};

export async function fetchRhJornadas(
  params: {
    empresaId?: string;
    ativo?: boolean;
    busca?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ items: RhJornadaItem[]; count: number }> {
  const search = new URLSearchParams();
  if (params.empresaId) search.set('empresaId', params.empresaId);
  if (params.ativo !== undefined) search.set('ativo', String(params.ativo));
  if (params.busca) search.set('busca', params.busca);
  if (params.limit !== undefined) search.set('limit', String(params.limit));
  if (params.offset !== undefined) search.set('offset', String(params.offset));
  const qs = search.toString();
  const json = await api.get(`/api/rh/jornadas${qs ? `?${qs}` : ''}`);
  return {
    items: (json.data as RhJornadaItem[]) ?? [],
    count: json.count ?? 0,
  };
}

export type RhJornadaCreateBody = {
  nome: string;
  empresa_id?: string | null;
  entrada: string;
  saida: string;
  intervalo_minutos: number;
  regime: RhRegimeJornada;
  ativo?: boolean;
};

export async function createRhJornada(body: RhJornadaCreateBody, actorId?: string | null): Promise<RhJornadaItem> {
  const json = await api.post(withActorId('/api/rh/jornadas', actorId), body);
  return json.data as RhJornadaItem;
}

export async function updateRhJornada(
  id: string,
  body: Partial<RhJornadaCreateBody>,
  actorId?: string | null
): Promise<RhJornadaItem> {
  const json = await api.patch(withActorId(`/api/rh/jornadas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as RhJornadaItem;
}

export async function deleteRhJornada(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/rh/jornadas/${encodeURIComponent(id)}`, actorId));
}

export async function marcarComunicadoLido(
  comunicadoId: string,
  colaboradorId: string,
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId(`/api/rh/comunicados/${encodeURIComponent(comunicadoId)}/lido`, actorId), {
    colaborador_id: colaboradorId,
  });
}

// --- Comunicados: upload de imagem/anexo (bucket público rh-comunicados,
// endpoint confirmado pela Lovable em 12/08/2026). Sem comunicadoId, salva
// em avulsos/ e só devolve a url (grave em anexo_url ao criar o comunicado);
// com comunicadoId, já atualiza o comunicado sozinho do lado deles. Limite:
// 8MB, jpg/png/webp/pdf. URL retornada é pública (sem expiração). ---

export async function uploadComunicadoAnexo(body: {
  comunicado_id?: string;
  nome_arquivo: string;
  arquivo_base64: string;
  mime_type: string;
}): Promise<{ url: string | null }> {
  const json = await api.post('/api/rh/comunicados-upload', body);
  return { url: json.url ?? null };
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

export type AdminModuleItem = {
  id: string;
  slug: string | null;
  name: string | null;
  icon: string | null;
  description: string | null;
  color: string | null;
  order_index: number | null;
  is_active: boolean;
};
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

export async function updateAdminModulo(
  id: string,
  body: Partial<{
    is_active: boolean;
    name: string;
    description: string;
    icon: string;
    color: string;
    gradient: string;
    order_index: number;
  }>,
  actorId?: string | null
): Promise<AdminModuleItem> {
  const json = await api.patch(withActorId(`/api/admin/modulos/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminModuleItem;
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

// Shape exato do jsonb empresas.servicos, confirmado pelo Lovable em
// 29/07/2026 — geladeira_tipo só é relevante quando geladeira=true.
export type AdminUnidadeServicos = {
  horario_funcionamento?: string | null;
  conveniencia?: boolean;
  troca_oleo?: boolean;
  geladeira?: boolean;
  geladeira_tipo?: 'pista' | 'gelo' | null;
  lava_jato?: boolean;
  estacionamento?: boolean;
};

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
  email: string | null;
  telefone: string | null;
  dataCadastro: string | null;
  dataPrimeiraVenda: string | null;
  contabilidadeId: string | null;
  servicos: AdminUnidadeServicos;
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
  cd_rede?: string | null;
  regiao?: string | null;
  proprietario?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  endereco_texto?: string | null;
  ipiranga_habilitado?: boolean;
  email?: string | null;
  telefone?: string | null;
  data_cadastro?: string | null;
  data_primeira_venda?: string | null;
  contabilidade_id?: string | null;
  servicos?: AdminUnidadeServicos;
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

// --- Admin: Contabilidades (tabela própria public.contabilidades,
// confirmada pelo Lovable em 29/07/2026 — empresas.contabilidade_id) ---

export type AdminContabilidadeItem = {
  id: string;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  apelido: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  responsavel: string | null;
  rua: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  observacoes: string | null;
  isActive: boolean;
  unidadesVinculadas: number;
};

export type AdminContabilidadesDetalhe = { count: number; contabilidades: AdminContabilidadeItem[] };

export async function fetchAdminContabilidades(q?: string): Promise<AdminContabilidadesDetalhe> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const json = await api.get(`/api/admin/contabilidades${query}`);
  return json.data as AdminContabilidadesDetalhe;
}

export type AdminContabilidadeWriteBody = {
  razao_social?: string;
  nome_fantasia?: string | null;
  apelido?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  responsavel?: string | null;
  rua?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
  cidade?: string | null;
  estado?: string | null;
  observacoes?: string | null;
  is_active?: boolean;
};

export async function createAdminContabilidade(
  body: AdminContabilidadeWriteBody,
  actorId?: string | null
): Promise<AdminContabilidadeItem> {
  const json = await api.post(withActorId('/api/admin/contabilidades', actorId), body);
  return json.data as AdminContabilidadeItem;
}

export async function updateAdminContabilidade(
  id: string,
  body: AdminContabilidadeWriteBody,
  actorId?: string | null
): Promise<AdminContabilidadeItem> {
  const json = await api.patch(withActorId(`/api/admin/contabilidades/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminContabilidadeItem;
}

export async function deleteAdminContabilidade(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/contabilidades/${encodeURIComponent(id)}`, actorId));
}

// --- Contabilidades: Responsáveis (tabela contabilidade_responsaveis,
// confirmada pela Lovable em 04/08/2026). "acesso" é derivado do profile_id
// do lado deles (liberado/sem_acesso) — não é o mesmo que "ativo". Liberar
// acesso cria/reseta o login real no Portal do Contador. ---

export type AdminContabilidadeResponsavelAcesso = 'liberado' | 'sem_acesso';

export type AdminContabilidadeResponsavelItem = {
  id: string;
  contabilidadeId: string | null;
  profileId: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  acesso: AdminContabilidadeResponsavelAcesso;
  ultimoAcessoEm: string | null;
  createdAt: string | null;
};

export type AdminContabilidadeResponsaveisDetalhe = {
  count: number;
  limit: number | null;
  offset: number | null;
  responsaveis: AdminContabilidadeResponsavelItem[];
};

export async function fetchAdminContabilidadeResponsaveis(opts: {
  contabilidadeId: string;
  q?: string;
  ativo?: boolean;
  limit?: number;
  offset?: number;
  actorId?: string | null;
}): Promise<AdminContabilidadeResponsaveisDetalhe> {
  const params = new URLSearchParams();
  params.set('contabilidade_id', opts.contabilidadeId);
  if (opts.q) params.set('q', opts.q);
  if (opts.ativo !== undefined) params.set('ativo', String(opts.ativo));
  if (opts.limit) params.set('limit', String(opts.limit));
  if (opts.offset) params.set('offset', String(opts.offset));
  const path = `/api/admin/contabilidades/responsaveis?${params.toString()}`;
  const json = await api.get(withActorId(path, opts.actorId));
  return json.data as AdminContabilidadeResponsaveisDetalhe;
}

export type AdminContabilidadeResponsavelWriteBody = {
  contabilidade_id?: string;
  nome?: string;
  email?: string;
  telefone?: string | null;
  ativo?: boolean;
};

export async function createAdminContabilidadeResponsavel(
  body: AdminContabilidadeResponsavelWriteBody,
  actorId?: string | null
): Promise<AdminContabilidadeResponsavelItem> {
  const json = await api.post(withActorId('/api/admin/contabilidades/responsaveis', actorId), body);
  return json.data as AdminContabilidadeResponsavelItem;
}

export async function updateAdminContabilidadeResponsavel(
  id: string,
  body: AdminContabilidadeResponsavelWriteBody,
  actorId?: string | null
): Promise<AdminContabilidadeResponsavelItem> {
  const json = await api.patch(
    withActorId(`/api/admin/contabilidades/responsaveis/${encodeURIComponent(id)}`, actorId),
    body
  );
  return json.data as AdminContabilidadeResponsavelItem;
}

export async function deleteAdminContabilidadeResponsavel(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/contabilidades/responsaveis/${encodeURIComponent(id)}`, actorId));
}

export type AdminLiberarAcessoResultado = { email: string | null; senha: string | null; profileId: string | null };

export async function liberarAcessoAdminContabilidadeResponsavel(
  id: string,
  actorId?: string | null
): Promise<AdminLiberarAcessoResultado> {
  const json = await api.post(
    withActorId(`/api/admin/contabilidades/responsaveis/${encodeURIComponent(id)}/liberar-acesso`, actorId),
    {}
  );
  return json.data as AdminLiberarAcessoResultado;
}

// --- Admin: Domínios permitidos de login (tabela adm_dominios_permitidos,
// confirmada pelo Lovable em 30/07/2026) ---

export type AdminDominioItem = {
  id: string;
  dominio: string | null;
  descricao: string | null;
  isActive: boolean;
  createdAt: string | null;
};

export type AdminDominiosDetalhe = { count: number; dominios: AdminDominioItem[] };

export async function fetchAdminDominios(q?: string): Promise<AdminDominiosDetalhe> {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  const json = await api.get(`/api/admin/dominios${query}`);
  return json.data as AdminDominiosDetalhe;
}

export type AdminDominioWriteBody = { dominio?: string; descricao?: string | null; ativo?: boolean };

export async function createAdminDominio(
  body: AdminDominioWriteBody,
  actorId?: string | null
): Promise<AdminDominioItem> {
  const json = await api.post(withActorId('/api/admin/dominios', actorId), body);
  return json.data as AdminDominioItem;
}

export async function updateAdminDominio(
  id: string,
  body: AdminDominioWriteBody,
  actorId?: string | null
): Promise<AdminDominioItem> {
  const json = await api.patch(withActorId(`/api/admin/dominios/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminDominioItem;
}

export async function deleteAdminDominio(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/dominios/${encodeURIComponent(id)}`, actorId));
}

// --- Admin: Domínio de e-mail por cargo (tabela rh_cargo_dominio,
// confirmada pelo Lovable em 30/07/2026) ---

export type AdminCargoDominioProvider = 'migadu' | 'google';

export type AdminCargoDominioItem = {
  id: string;
  cargo: string | null;
  dominio: string | null;
  provider: AdminCargoDominioProvider | null;
  isActive: boolean;
};

export type AdminCargoDominioDetalhe = { count: number; itens: AdminCargoDominioItem[] };

export async function fetchAdminCargoDominio(params?: {
  q?: string;
  provider?: AdminCargoDominioProvider;
}): Promise<AdminCargoDominioDetalhe> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.provider) search.set('provider', params.provider);
  const query = search.toString() ? `?${search.toString()}` : '';
  const json = await api.get(`/api/admin/cargo-dominio${query}`);
  return json.data as AdminCargoDominioDetalhe;
}

export type AdminCargoDominioWriteBody = {
  cargo?: string;
  dominio?: string;
  provider?: AdminCargoDominioProvider;
  ativo?: boolean;
};

export async function createAdminCargoDominio(
  body: AdminCargoDominioWriteBody,
  actorId?: string | null
): Promise<AdminCargoDominioItem> {
  const json = await api.post(withActorId('/api/admin/cargo-dominio', actorId), body);
  return json.data as AdminCargoDominioItem;
}

export async function updateAdminCargoDominio(
  id: string,
  body: AdminCargoDominioWriteBody,
  actorId?: string | null
): Promise<AdminCargoDominioItem> {
  const json = await api.patch(withActorId(`/api/admin/cargo-dominio/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminCargoDominioItem;
}

export async function deleteAdminCargoDominio(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/cargo-dominio/${encodeURIComponent(id)}`, actorId));
}

// --- Admin: Temas visuais (tabela adm_temas, confirmada pelo Lovable em
// 30/07/2026) — só leitura + toggle de ativo, sem criar/excluir pelo app. ---

export type AdminTemaCores = { primary: string | null; accent: string | null; bg: string | null; secondary: string | null };

export type AdminTemaItem = {
  slug: string;
  nome: string | null;
  descricao: string | null;
  cores: AdminTemaCores;
  isActive: boolean;
  isProtected: boolean;
};

export async function fetchAdminTemas(): Promise<AdminTemaItem[]> {
  const json = await api.get('/api/admin/temas');
  return json.data as AdminTemaItem[];
}

export async function updateAdminTema(
  slug: string,
  body: { ativo: boolean },
  actorId?: string | null
): Promise<AdminTemaItem> {
  const json = await api.patch(withActorId(`/api/admin/temas/${encodeURIComponent(slug)}`, actorId), body);
  return json.data as AdminTemaItem;
}

// --- Admin: Versões (changelog de produto do AF360 — conteúdo único servido
// pelo Lovable a partir de VersoesTab.tsx, confirmado em 30/07/2026; sem
// tabela por trás, só leitura). ---

export type AdminVersaoTipoKey = 'novo' | 'melhoria' | 'correcao' | 'seguranca' | 'schema';

export type AdminVersaoTipo = {
  key: AdminVersaoTipoKey;
  label: string | null;
  cor: string | null;
};

export type AdminVersaoItem = {
  titulo: string | null;
  tipo: AdminVersaoTipoKey | null;
  descricao: string | null;
  detalhes: string[];
};

export type AdminVersaoRow = {
  versao: string | null;
  data: string | null;
  rotulo: string | null;
  destaque: boolean;
  itens: AdminVersaoItem[];
};

export type AdminVersoesResponse = {
  versoes: AdminVersaoRow[];
  tipos: AdminVersaoTipo[];
  totais: Partial<Record<AdminVersaoTipoKey, number>>;
  count: number;
};

export async function fetchAdminVersoes(): Promise<AdminVersoesResponse> {
  const json = await api.get('/api/admin/versoes');
  return json.data as AdminVersoesResponse;
}

// --- Admin: Notificações — Rotinas (tabela <modulo>_notificacoes, uma por
// módulo) e Templates (tabela única notif_templates, compartilhada via
// coluna modulo) — confirmado pelo Lovable em 30/07/2026. Escrita usa os
// nomes de coluna do banco direto no body (mesmo padrão de dominios). ---

export type AdminNotifGatilho = 'recorrente' | 'evento' | 'manual';
export type AdminNotifCanal = 'app' | 'email' | 'whatsapp';
export type AdminNotifPublicoTipo = 'todos' | 'colaboradores' | 'postos' | 'cargos';

export type AdminNotifRotinaItem = {
  id: string;
  nome: string | null;
  titulo: string | null;
  mensagem: string | null;
  templateId: string | null;
  isActive: boolean;
  tipoGatilho: AdminNotifGatilho;
  cronExpressao: string | null;
  eventoCodigo: string | null;
  canais: AdminNotifCanal[];
  publicoTipo: AdminNotifPublicoTipo;
  publicoIds: string[];
  ultimaExecucao: string | null;
  proximaExecucao: string | null;
  totalDestinos: number;
  totalEnviados: number;
  status: string | null;
  agendadaPara: string | null;
};

export type AdminNotifRotinasResponse = { rotinas: AdminNotifRotinaItem[]; count: number };

export async function fetchAdminNotifRotinas(
  modulo: string,
  params?: { q?: string; ativa?: boolean }
): Promise<AdminNotifRotinasResponse> {
  const search = new URLSearchParams();
  search.set('modulo', modulo);
  if (params?.q) search.set('q', params.q);
  if (params?.ativa !== undefined) search.set('ativa', String(params.ativa));
  const json = await api.get(`/api/admin/notif-rotinas?${search.toString()}`);
  return json.data as AdminNotifRotinasResponse;
}

export type AdminNotifRotinaWriteBody = {
  nome?: string;
  titulo?: string;
  mensagem?: string;
  template_id?: string | null;
  ativa?: boolean;
  tipo_gatilho?: AdminNotifGatilho;
  cron_expressao?: string | null;
  evento_codigo?: string | null;
  canais?: AdminNotifCanal[];
  publico_tipo?: AdminNotifPublicoTipo;
  publico_ids?: string[];
};

export async function createAdminNotifRotina(
  modulo: string,
  body: AdminNotifRotinaWriteBody,
  actorId?: string | null
): Promise<AdminNotifRotinaItem> {
  const json = await api.post(withActorId(`/api/admin/notif-rotinas?modulo=${encodeURIComponent(modulo)}`, actorId), body);
  return json.data as AdminNotifRotinaItem;
}

export async function updateAdminNotifRotina(
  modulo: string,
  id: string,
  body: AdminNotifRotinaWriteBody,
  actorId?: string | null
): Promise<AdminNotifRotinaItem> {
  const json = await api.patch(
    withActorId(`/api/admin/notif-rotinas/${encodeURIComponent(id)}?modulo=${encodeURIComponent(modulo)}`, actorId),
    body
  );
  return json.data as AdminNotifRotinaItem;
}

export async function deleteAdminNotifRotina(modulo: string, id: string, actorId?: string | null): Promise<void> {
  await api.delete(
    withActorId(`/api/admin/notif-rotinas/${encodeURIComponent(id)}?modulo=${encodeURIComponent(modulo)}`, actorId)
  );
}

export async function executarAdminNotifRotina(
  modulo: string,
  id: string,
  actorId?: string | null
): Promise<AdminNotifRotinaItem> {
  const json = await api.post(
    withActorId(
      `/api/admin/notif-rotinas/${encodeURIComponent(id)}/executar?modulo=${encodeURIComponent(modulo)}`,
      actorId
    )
  );
  return json.data as AdminNotifRotinaItem;
}

export type AdminNotifTemplateItem = {
  id: string;
  modulo: string | null;
  codigo: string | null;
  nome: string | null;
  titulo: string | null;
  mensagem: string | null;
  variaveis: string[];
  isPadrao: boolean;
  isActive: boolean;
};

export type AdminNotifTemplatesResponse = { templates: AdminNotifTemplateItem[]; count: number };

export async function fetchAdminNotifTemplates(params?: {
  modulo?: string;
  q?: string;
  ativo?: boolean;
}): Promise<AdminNotifTemplatesResponse> {
  const search = new URLSearchParams();
  if (params?.modulo) search.set('modulo', params.modulo);
  if (params?.q) search.set('q', params.q);
  if (params?.ativo !== undefined) search.set('ativo', String(params.ativo));
  const query = search.toString() ? `?${search.toString()}` : '';
  const json = await api.get(`/api/admin/notif-templates${query}`);
  return json.data as AdminNotifTemplatesResponse;
}

export type AdminNotifTemplateWriteBody = {
  modulo?: string;
  codigo?: string;
  nome?: string;
  titulo?: string;
  mensagem?: string;
  variaveis?: string[];
  ativo?: boolean;
};

export async function createAdminNotifTemplate(
  body: AdminNotifTemplateWriteBody,
  actorId?: string | null
): Promise<AdminNotifTemplateItem> {
  const json = await api.post(withActorId('/api/admin/notif-templates', actorId), body);
  return json.data as AdminNotifTemplateItem;
}

export async function updateAdminNotifTemplate(
  id: string,
  body: AdminNotifTemplateWriteBody,
  actorId?: string | null
): Promise<AdminNotifTemplateItem> {
  const json = await api.patch(withActorId(`/api/admin/notif-templates/${encodeURIComponent(id)}`, actorId), body);
  return json.data as AdminNotifTemplateItem;
}

export async function deleteAdminNotifTemplate(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/admin/notif-templates/${encodeURIComponent(id)}`, actorId));
}

// --- Admin: Logs de auditoria (tabela audit_log, liberada pelo Lovable em
// 30/07/2026 — imutável, só leitura). ---

export type AdminLogItem = {
  id: string;
  createdAt: string | null;
  action: string | null;
  moduleSlug: string | null;
  tableName: string | null;
  userId: string | null;
  ipAddress: string | null;
  recordId: string | null;
  oldData: unknown;
  newData: unknown;
};

export type AdminLogsResponse = { logs: AdminLogItem[]; count: number };

export async function fetchAdminLogs(params?: {
  action?: string;
  moduleSlug?: string;
  tableName?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminLogsResponse> {
  const search = new URLSearchParams();
  if (params?.action) search.set('action', params.action);
  if (params?.moduleSlug) search.set('moduleSlug', params.moduleSlug);
  if (params?.tableName) search.set('tableName', params.tableName);
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.offset) search.set('offset', String(params.offset));
  const query = search.toString() ? `?${search.toString()}` : '';
  const json = await api.get(`/api/admin/logs${query}`);
  return json.data as AdminLogsResponse;
}

// --- Admin: Integrações — WhatsApp (tabela real wa_config, singleton;
// confirmado pela Lovable em 30/07/2026). Rota dedicada (não passa pela
// allowlist genérica porque wa_config guarda token/segredo em claro). ---

export type AdminWaProvider = 'zapresponder' | 'meta_cloud';

export type AdminWaTemplateItem = {
  id: string | null;
  templateName: string | null;
  language: string | null;
  category: string | null;
  status: string | null;
  components: unknown;
  lastSyncedAt: string | null;
};

export type AdminWaConfig = {
  provider: AdminWaProvider | null;
  enabled: boolean;
  apiUrl: string | null;
  apiTokenMasked: string | null;
  hasApiToken: boolean;
  departmentId: string | null;
  webhookUrl: string | null;
  webhookSecretMasked: string | null;
  metaBusinessId: string | null;
  metaAccessTokenMasked: string | null;
  hasMetaAccessToken: boolean;
  metaPhoneNumberId: string | null;
  updatedAt: string | null;
  templates: AdminWaTemplateItem[];
  // wa_templates ficou sem GRANT até 30/07/2026 — se a leitura falhar de
  // novo, o backend expõe o motivo aqui em vez de simplesmente devolver [].
  templatesError?: string | null;
  // Os 4 campos abaixo só vêm preenchidos quando
  // fetchAdminWaConfig({ reveal: true }) é chamado (exige actorId de
  // usuário master no backend) — confirmado pela Lovable em 30/07/2026.
  webhookSecret?: string | null;
  apiToken?: string | null;
  metaAccessToken?: string | null;
};

export async function fetchAdminWaConfig(opts?: {
  reveal?: boolean;
  actorId?: string | null;
}): Promise<AdminWaConfig> {
  const path = `/api/admin/integracoes/whatsapp${opts?.reveal ? '?reveal=1' : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as AdminWaConfig;
}

// Colunas exatas de wa_config — campos de token omitidos/vazios preservam o
// valor já salvo (o Lovable não apaga com string vazia).
export type AdminWaConfigWriteBody = {
  provider?: AdminWaProvider;
  enabled?: boolean;
  api_url?: string;
  api_token?: string;
  department_id?: string;
  meta_business_id?: string;
  meta_access_token?: string;
  meta_phone_number_id?: string;
};

export async function updateAdminWaConfig(
  body: AdminWaConfigWriteBody,
  actorId?: string | null
): Promise<AdminWaConfig> {
  const json = await api.patch(withActorId('/api/admin/integracoes/whatsapp', actorId), body);
  return json.data as AdminWaConfig;
}

export async function testAdminWaConnection(actorId?: string | null): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/whatsapp/testar', actorId), {});
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function rotateAdminWaWebhookSecret(
  actorId?: string | null
): Promise<{ webhookSecret: string | null; webhookUrl: string | null }> {
  const json = await api.post(withActorId('/api/admin/integracoes/whatsapp/rotacionar-secret', actorId), {});
  return json.data as { webhookSecret: string | null; webhookUrl: string | null };
}

export async function syncAdminWaTemplates(
  actorId?: string | null
): Promise<{ templates: AdminWaTemplateItem[]; templatesError?: string | null }> {
  const json = await api.post(withActorId('/api/admin/integracoes/whatsapp/sincronizar-templates', actorId), {});
  return json.data as { templates: AdminWaTemplateItem[]; templatesError?: string | null };
}

export async function testAdminWaTemplate(
  body: { phone: string; templateName: string; language?: string; variables?: string[] },
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/whatsapp/testar-template', actorId), body);
  return (json.data ?? {}) as Record<string, unknown>;
}

// --- Integrações: Google Meu Negócio (gmb_config/gmb_locations/
// gmb_reviews/gmb_sync_runs — schema/endpoints confirmados pela Lovable em
// 30/07/2026). Rota dedicada (gmb_config guarda refresh_token em claro). ---

export type AdminGmbStatus = {
  conectado: boolean;
  accountName: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  reviewsApiOk: boolean;
  aviso: string | null;
};

export type AdminGmbLocation = {
  id: string;
  empresaId: string | null;
  googleLocationName: string | null;
  title: string | null;
  address: string | null;
  phone: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  lastSyncedAt: string | null;
};

export type AdminGmbSyncRun = {
  startedAt: string | null;
  finishedAt: string | null;
  status: string | null;
  locationsSincronizadas: number | null;
  reviewsNovos: number | null;
  reviewsAtualizados: number | null;
  erro: string | null;
};

export type AdminGmbData = {
  status: AdminGmbStatus;
  locations: AdminGmbLocation[];
  locationsCount: number;
  syncRuns: AdminGmbSyncRun[];
};

export async function fetchAdminGmb(opts?: {
  limit?: number;
  offset?: number;
  actorId?: string | null;
}): Promise<AdminGmbData> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const path = `/api/admin/integracoes/google${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as AdminGmbData;
}

export async function vincularAdminGmbLocation(
  body: { locationId: string; empresaId: string | null },
  actorId?: string | null
): Promise<void> {
  await api.patch(withActorId('/api/admin/integracoes/google', actorId), body);
}

export async function sincronizarAdminGmb(actorId?: string | null): Promise<void> {
  await api.post(withActorId('/api/admin/integracoes/google/sincronizar', actorId), {});
}

export async function desconectarAdminGmb(actorId?: string | null): Promise<void> {
  await api.post(withActorId('/api/admin/integracoes/google/desconectar', actorId), {});
}

export async function setAdminGmbAccountName(
  accountName: string,
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/google/account-name', actorId), { accountName });
  return (json.data ?? {}) as Record<string, unknown>;
}

// --- Integrações: Busca PF (Infosimples + Fonte Data) — endpoint
// /api/public/internal/busca-pf confirmado pela Lovable em 30/07/2026. Não
// existe tabela de credenciais (tokens são secrets do backend deles) — só
// dá pra saber se está configurado via status.

export type AdminBuscaPfProvider = 'infosimples' | 'fontedata';

export type AdminBuscaPfProviderStatus = {
  configurado: boolean;
  tokenMascarado: string | null;
};

export type AdminBuscaPfStatus = {
  credenciais: Partial<Record<AdminBuscaPfProvider, AdminBuscaPfProviderStatus>>;
  servicos: Record<string, unknown>;
};

export async function fetchAdminBuscaPfStatus(actorId?: string | null): Promise<AdminBuscaPfStatus> {
  const json = await api.get(withActorId('/api/admin/integracoes/busca-pf/status', actorId));
  return (json.data ?? { credenciais: {}, servicos: {} }) as AdminBuscaPfStatus;
}

export async function testAdminBuscaPfConexao(
  provedor: AdminBuscaPfProvider,
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/busca-pf/testar', actorId), { provedor });
  return (json.data ?? {}) as Record<string, unknown>;
}

export type AdminBuscaPfConsultaResult = {
  provedor: AdminBuscaPfProvider;
  service: string;
  resultado: Record<string, unknown>;
};

export async function executarAdminBuscaPfConsulta(
  body: { provedor: AdminBuscaPfProvider; service: string; params: Record<string, string> },
  actorId?: string | null
): Promise<AdminBuscaPfConsultaResult> {
  const json = await api.post(withActorId('/api/admin/integracoes/busca-pf/consultar', actorId), body);
  return json.data as AdminBuscaPfConsultaResult;
}

export type AdminBuscaPfHistoricoItem = {
  id: string;
  provedor: AdminBuscaPfProvider | null;
  service: string | null;
  params: unknown;
  responseCode: number | string | null;
  requestId: string | null;
  costBrl: number | null;
  cpf: string | null;
  nome: string | null;
  responseData: unknown;
  createdBy: string | null;
  createdAt: string | null;
};

export async function fetchAdminBuscaPfHistorico(opts?: {
  provedor?: AdminBuscaPfProvider;
  limit?: number;
  offset?: number;
  search?: string;
  service?: string;
  actorId?: string | null;
}): Promise<{ rows: AdminBuscaPfHistoricoItem[]; count: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (opts?.provedor) params.set('provedor', opts.provedor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.search) params.set('search', opts.search);
  if (opts?.service) params.set('service', opts.service);
  const qs = params.toString();
  const path = `/api/admin/integracoes/busca-pf/historico${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as { rows: AdminBuscaPfHistoricoItem[]; count: number; limit: number; offset: number };
}

// Shape confirmado pela Lovable em 03/08/2026: já vem quebrado por mês (do mais
// recente pro mais antigo). custoTotalComFranquia é por mês (franquia de
// R$100 aplicada mês a mês) — pra total do período é só somar os meses.
export type AdminBuscaPfUsoMes = {
  mes: string | null;
  total: number | null;
  billable: number | null;
  custoBase: number | null;
  custoAdicional: number | null;
  custoTotal: number | null;
  custoTotalComFranquia: number | null;
  franquiaAplicada: boolean;
  porServico: Record<string, { count: number | null; custo: number | null }>;
};

export type AdminBuscaPfUso = {
  franquiaMinimaMensal: number | null;
  meses: AdminBuscaPfUsoMes[];
};

export async function fetchAdminBuscaPfUso(opts?: {
  provedor?: AdminBuscaPfProvider;
  months?: number;
  actorId?: string | null;
}): Promise<AdminBuscaPfUso> {
  const params = new URLSearchParams();
  if (opts?.provedor) params.set('provedor', opts.provedor);
  if (opts?.months) params.set('months', String(opts.months));
  const qs = params.toString();
  const path = `/api/admin/integracoes/busca-pf/uso${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as AdminBuscaPfUso;
}

// --- Integrações: Jurídico — Datajud (CNJ). Endpoint /api/public/internal/
// datajud confirmado pela Lovable em 03/08/2026 — API pública/gratuita do
// CNJ, chamada pela própria Lovable (sem secret nosso, sem custo real).

export type AdminDatajudStatus = {
  baseUrl: string | null;
  apiKeyMascarada: string | null;
  configurado: boolean;
};

export async function fetchAdminDatajudStatus(actorId?: string | null): Promise<AdminDatajudStatus> {
  const json = await api.get(withActorId('/api/admin/integracoes/juridico/datajud/status', actorId));
  return (json.data ?? { baseUrl: null, apiKeyMascarada: null, configurado: false }) as AdminDatajudStatus;
}

export async function testAdminDatajudConexao(actorId?: string | null): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/juridico/datajud/testar', actorId), {});
  return (json.data ?? {}) as Record<string, unknown>;
}

export type AdminDatajudConsultaResult = {
  resultado: Record<string, unknown>;
};

export async function executarAdminDatajudConsulta(
  body: {
    tribunal: string;
    service: string;
    params: Record<string, string | number>;
    cnpjAlvo?: string;
  },
  actorId?: string | null
): Promise<AdminDatajudConsultaResult> {
  const json = await api.post(withActorId('/api/admin/integracoes/juridico/datajud/consultar', actorId), body);
  return { resultado: (json.data ?? {}) as Record<string, unknown> };
}

export type AdminDatajudHistoricoItem = {
  id: string;
  tribunal: string | null;
  service: string | null;
  params: unknown;
  responseCode: number | string | null;
  responseData: unknown;
  createdBy: string | null;
  createdAt: string | null;
};

export async function fetchAdminDatajudHistorico(opts?: {
  limit?: number;
  offset?: number;
  search?: string;
  tribunal?: string;
  service?: string;
  actorId?: string | null;
}): Promise<{ rows: AdminDatajudHistoricoItem[]; count: number; limit: number; offset: number }> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  if (opts?.search) params.set('search', opts.search);
  if (opts?.tribunal) params.set('tribunal', opts.tribunal);
  if (opts?.service) params.set('service', opts.service);
  const qs = params.toString();
  const path = `/api/admin/integracoes/juridico/datajud/historico${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as { rows: AdminDatajudHistoricoItem[]; count: number; limit: number; offset: number };
}

export type AdminDatajudUsoMes = {
  mes: string | null;
  total: number | null;
  custoTotal: number | null;
  porTribunal: Record<string, { count: number | null; custo: number | null }>;
  porServico: Record<string, { count: number | null; custo: number | null }>;
};

export type AdminDatajudUso = {
  meses: AdminDatajudUsoMes[];
};

export async function fetchAdminDatajudUso(opts?: {
  months?: number;
  actorId?: string | null;
}): Promise<AdminDatajudUso> {
  const params = new URLSearchParams();
  if (opts?.months) params.set('months', String(opts.months));
  const qs = params.toString();
  const path = `/api/admin/integracoes/juridico/datajud/uso${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return (json.data ?? { meses: [] }) as AdminDatajudUso;
}

// --- Integrações: Leva+ (fidelidade/cashback). Endpoint /api/public/internal/
// leva-mais confirmado pela Lovable em 03/08/2026 — credenciais próprias
// (mk_integracoes), dados sempre lidos ao vivo da API externa.

export type AdminLevaMaisStatus = {
  ativo: boolean;
  apiUrl: string | null;
  apiTokenMascarado: string | null;
  ultimoStatus: string | null;
  ultimaSincronizacao: string | null;
  endpoints: string[];
  // Só vem preenchido quando opts.reveal=true (exige actorId master) — ver
  // fetchAdminLevaMaisStatus.
  apiToken?: string | null;
};

export async function fetchAdminLevaMaisStatus(
  opts?: { reveal?: boolean; actorId?: string | null } | string | null
): Promise<AdminLevaMaisStatus> {
  // Aceita a assinatura antiga (actorId direto) e a nova (objeto com reveal).
  const normalized = typeof opts === 'object' && opts !== null ? opts : { actorId: opts };
  const path = normalized.reveal
    ? '/api/admin/integracoes/leva-mais/status?reveal=1'
    : '/api/admin/integracoes/leva-mais/status';
  const json = await api.get(withActorId(path, normalized.actorId));
  return (json.data ?? {
    ativo: false,
    apiUrl: null,
    apiTokenMascarado: null,
    ultimoStatus: null,
    ultimaSincronizacao: null,
    endpoints: [],
  }) as AdminLevaMaisStatus;
}

export async function testAdminLevaMaisConexao(actorId?: string | null): Promise<Record<string, unknown>> {
  const json = await api.post(withActorId('/api/admin/integracoes/leva-mais/testar', actorId), {});
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function updateAdminLevaMaisConfig(
  body: { ativo?: boolean; apiUrl?: string; apiToken?: string },
  actorId?: string | null
): Promise<void> {
  await api.patch(withActorId('/api/admin/integracoes/leva-mais/config', actorId), body);
}

export async function fetchAdminLevaMaisLojas(actorId?: string | null): Promise<Record<string, unknown>> {
  const json = await api.get(withActorId('/api/admin/integracoes/leva-mais/lojas', actorId));
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function fetchAdminLevaMaisFrentistas(actorId?: string | null): Promise<Record<string, unknown>> {
  const json = await api.get(withActorId('/api/admin/integracoes/leva-mais/frentistas', actorId));
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function fetchAdminLevaMaisClientes(opts?: {
  limit?: number;
  page?: number;
  actorId?: string | null;
}): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.page) params.set('page', String(opts.page));
  const qs = params.toString();
  const path = `/api/admin/integracoes/leva-mais/clientes${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function fetchAdminLevaMaisMetricas(opts: {
  startDate: string;
  endDate: string;
  storeId?: string;
  actorId?: string | null;
}): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  params.set('startDate', opts.startDate);
  params.set('endDate', opts.endDate);
  if (opts.storeId) params.set('storeId', opts.storeId);
  const path = `/api/admin/integracoes/leva-mais/metricas?${params.toString()}`;
  const json = await api.get(withActorId(path, opts.actorId));
  return (json.data ?? {}) as Record<string, unknown>;
}

export async function fetchAdminLevaMaisSaldo(
  cpf: string,
  actorId?: string | null
): Promise<Record<string, unknown>> {
  const path = `/api/admin/integracoes/leva-mais/saldo?cpf=${encodeURIComponent(cpf)}`;
  const json = await api.get(withActorId(path, actorId));
  return (json.data ?? {}) as Record<string, unknown>;
}

// --- Admin: Dashboard (2 RPCs Postgres expostas pelo Lovable via proxy
// interno em 03/08/2026 — mesmo padrão x-internal-secret + x-actor-id.
// Formato é o JSON cru das RPCs, sem transformação nenhuma no backend.

export type AdminDashboardPerformance = {
  now: string;
  db: { bytes: number; max_connections: number };
  conexoes: { total: number; ativas: number; ociosas: number; idle_tx: number; aguardando: number };
  cache: {
    hit_ratio: number;
    commits: number;
    rollbacks: number;
    deadlocks: number;
    temp_files: number;
    temp_bytes: number;
    segundos_desde_reset: number;
  };
  top_tabelas: Array<{ tabela: string; bytes: number; linhas: number }>;
  sessoes: { online_5min: number; online_1h: number; online_24h: number };
  volumes: {
    profiles: number;
    colaboradores: number;
    solicitacoes: number;
    notificacoes: number;
    audit_log: number;
  };
};

export async function fetchAdminDashboardPerformance(
  actorId?: string | null
): Promise<AdminDashboardPerformance> {
  const json = await api.get(withActorId('/api/admin/dashboard/performance', actorId));
  return json.data as AdminDashboardPerformance;
}

export type AdminDashboardKpis = {
  periodo: { mes: number; ano: number };
  snapshot: {
    colaboradores_ativos: number;
    colaboradores_total: number;
    usuarios_ativos: number;
    usuarios_total: number;
    colaboradores_sem_login: number;
    logaram_30d: number;
  };
  mes: {
    novos_colaboradores: number;
    solicitacoes: number;
    logins_no_mes: number;
    notificacoes: number;
  };
  // Sempre relativa a "hoje" — ignora o mês/ano selecionado (confirmado pelo Lovable).
  serie_novos_colaboradores: Array<{ mes: string; novos: number }>;
  // Top 5 (não é configurável) — métrica: nº de colaboradores ativos por unidade.
  top_unidades: Array<{ unidade: string; qtd: number }>;
  db_size_bytes: number;
};

export async function fetchAdminDashboardKpis(opts?: {
  mes?: number;
  ano?: number;
  actorId?: string | null;
}): Promise<AdminDashboardKpis> {
  const params = new URLSearchParams();
  if (opts?.mes) params.set('mes', String(opts.mes));
  if (opts?.ano) params.set('ano', String(opts.ano));
  const qs = params.toString();
  const path = `/api/admin/dashboard/kpis${qs ? `?${qs}` : ''}`;
  const json = await api.get(withActorId(path, opts?.actorId));
  return json.data as AdminDashboardKpis;
}

// --- Diretoria: painel de Vendas/Margem/Estoques/Métricas GNV — endpoint
// unificado confirmado pela Lovable em 04/08/2026 (/api/public/internal/
// diretoria-vendas, via proxy /api/diretoria-painel). "recurso" pode ser
// resumo|rede|margem|estoques|gnv|postos|periodo; sem de/ate vem o mês
// corrente até a última data com movimento. O shape de "dados" é o mesmo DTO
// que a UI deles consome (FlashDiarioPayload/MargensPayload/
// EstoqueDiretoriaPayload/etc.) — mantido como "any" aqui de propósito: os
// nomes de campo exatos vieram só por descrição, não por um schema formal, e
// prefiro validar/ajustar contra o retorno real na primeira carga em vez de
// arriscar um tipo rígido errado.

export type DiretoriaPainelRecurso =
  | 'resumo'
  | 'rede'
  | 'margem'
  | 'estoques'
  | 'gnv'
  | 'postos'
  | 'periodo'
  | 'lava-rapido'
  | 'estoque-parado';

export type DiretoriaPainelResponse<T = any> = {
  recurso: string;
  de?: string;
  ate?: string;
  postos?: unknown;
  dados: T;
};

export async function fetchDiretoriaPainel<T = any>(
  recurso: DiretoriaPainelRecurso,
  params: {
    de?: string;
    ate?: string;
    posto?: string;
    placa?: string;
    pagina?: number;
    porPagina?: number;
    faixa?: string;
    busca?: string;
  } = {},
  actorId?: string | null
): Promise<DiretoriaPainelResponse<T>> {
  const search = new URLSearchParams();
  search.set('recurso', recurso);
  if (params.de) search.set('de', params.de);
  if (params.ate) search.set('ate', params.ate);
  if (params.posto) search.set('posto', params.posto);
  if (params.placa) search.set('placa', params.placa);
  if (params.pagina) search.set('pagina', String(params.pagina));
  if (params.porPagina) search.set('porPagina', String(params.porPagina));
  if (params.faixa) search.set('faixa', params.faixa);
  if (params.busca) search.set('busca', params.busca);
  const path = `/api/diretoria-painel?${search.toString()}`;
  const json = await api.get(withActorId(path, actorId));
  return { recurso: json.recurso ?? recurso, de: json.de, ate: json.ate, postos: json.postos, dados: json.dados as T };
}

// --- Diretoria: Lava Rápido (lavagens via ANPR — api-placas.vercel.app por
// trás, hoje só o posto Ceprano tem câmera) e Estoque Parado (produtos sem
// reposição há 45+ dias, view vw_produtos_loja_parados) — os dois novos
// recursos acima, confirmados pela Lovable em 18/08/2026. Tipados (em vez de
// "any" como os outros recursos) porque o shape exato do retorno veio
// especificado por eles desta vez.

export type DiretoriaLavaRapidoRegistro = {
  placa: string;
  camera: string | null;
  posto: string | null;
  entrada: string;
  saida: string | null;
  permanencia_segundos: number | null;
};

export type DiretoriaLavaRapidoPayload = {
  resumo: {
    total: number;
    tempo_medio_min: number | null;
    tempo_min_min: number | null;
    tempo_max_min: number | null;
    faturamento: number;
    preco_unitario: number;
  };
  porDia: Array<{ dia: string; total: number }>;
  ultimas: DiretoriaLavaRapidoRegistro[];
  historico: {
    total: number;
    pagina: number;
    porPagina: number;
    linhas: DiretoriaLavaRapidoRegistro[];
    preco_unitario: number;
  };
  exportUrl?: string | null;
};

export type DiretoriaEstoqueParadoProduto = {
  produto_codigo: string;
  produto_nome: string;
  data_recebimento: string | null;
  dias_parado: number;
  estoque_atual_estimado: number;
};

export type DiretoriaEstoqueParadoPosto = {
  posto_id: string;
  posto_nome: string;
  total_produtos: number;
  media_dias_parado: number;
  estoque_estimado: number;
  produtos: DiretoriaEstoqueParadoProduto[];
};

export type DiretoriaEstoqueParadoPayload = {
  faixa?: string;
  posto?: string;
  atualizadoEm?: string | null;
  observacao?: string | null;
  resumo: {
    produtos_parados: number;
    postos_afetados: number;
    media_dias_parado: number;
    estoque_estimado: number;
  };
  postos: DiretoriaEstoqueParadoPosto[];
};

// --- Diretoria: Mapa de Processos (gst_processos + gst_processo_etapas) —
// endpoint confirmado pela Lovable em 04/08/2026 (/api/public/internal/
// gst-processos, via proxy /api/diretoria-processos). Não vem fluxograma_json
// na leitura de propósito. Escrita confirmada em 07/08/2026: o endpoint
// interno (x-internal-secret + x-actor-id validado como master) permite
// criar/editar/excluir mesmo com a RLS continuando master-only.

export type DiretoriaProcessoStatus = 'rascunho' | 'ativo' | 'em_revisao' | 'descontinuado';

export type DiretoriaProcessoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  area: string | null;
  departamento: string | null;
  modulo_slug: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  status: DiretoriaProcessoStatus;
  tags: string[] | null;
  versao: string | null;
  created_at: string;
  updated_at: string;
  documentacao?: string | null;
};

export type DiretoriaProcessoEtapaRow = {
  id: string;
  processo_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  prazo_dias: number | null;
  created_at: string;
  updated_at: string;
};

export async function fetchDiretoriaProcessos(
  params: { departamento?: string; status?: DiretoriaProcessoStatus; q?: string } = {},
  actorId?: string | null
): Promise<{ total: number; processos: DiretoriaProcessoRow[] }> {
  const search = new URLSearchParams();
  if (params.departamento) search.set('departamento', params.departamento);
  if (params.status) search.set('status', params.status);
  if (params.q) search.set('q', params.q);
  const qs = search.toString();
  const json = await api.get(withActorId(`/api/diretoria-processos${qs ? `?${qs}` : ''}`, actorId));
  return { total: json.total ?? 0, processos: json.processos ?? [] };
}

export async function fetchDiretoriaProcessoDetalhe(
  id: string,
  actorId?: string | null
): Promise<{ processo: DiretoriaProcessoRow | null; etapas: DiretoriaProcessoEtapaRow[] }> {
  const json = await api.get(withActorId(`/api/diretoria-processos?id=${encodeURIComponent(id)}`, actorId));
  return { processo: json.processo ?? null, etapas: json.etapas ?? [] };
}

export type DiretoriaProcessoEtapaWrite = {
  ordem: number;
  titulo: string;
  descricao?: string;
  responsavel_id?: string | null;
  prazo_dias?: number | null;
};

export type DiretoriaProcessoBlocoWrite = {
  tipo: 'inicio' | 'processo' | 'decisao' | 'fim';
  rotulo: string;
};

export type DiretoriaProcessoWriteBody = {
  nome?: string;
  descricao?: string;
  departamento?: string;
  modulo_vinculado?: string;
  responsavel_id?: string | null;
  status?: DiretoriaProcessoStatus;
  versao?: number;
  tags?: string[];
  documentacao?: string;
  etapas?: DiretoriaProcessoEtapaWrite[];
  blocos?: DiretoriaProcessoBlocoWrite[];
};

export async function createDiretoriaProcesso(
  body: DiretoriaProcessoWriteBody,
  actorId?: string | null
): Promise<{ id: string }> {
  const json = await api.post(withActorId('/api/diretoria-processos', actorId), body);
  return { id: json.id };
}

export async function updateDiretoriaProcesso(
  id: string,
  body: DiretoriaProcessoWriteBody,
  actorId?: string | null
): Promise<void> {
  await api.patch(withActorId(`/api/diretoria-processos?id=${encodeURIComponent(id)}`, actorId), body);
}

export async function deleteDiretoriaProcesso(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/diretoria-processos?id=${encodeURIComponent(id)}`, actorId));
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

// --- Financeiro (Gestão de Caixa) — endpoint confirmado pela Lovable em
// 21/08/2026: /api/public/internal/financeiro (via proxy /api/financeiro,
// mesma auth x-internal-secret + x-actor-id). IMPORTANTE: não existe
// nenhuma tabela rf_* — o módulo é 99% read-through da API Quality em tempo
// real (cache em memória do lado deles). Só 4 coisas ficam no banco de
// verdade: fin_dre_chaves (postos/chave da integração — NÃO é rh_unidades),
// fin_conciliacoes, fin_ia_predicoes/fin_ia_feedback/fin_ia_regras/
// fin_ia_historico e fin_notificacoes.

async function fetchFinanceiroRecurso<T>(
  recurso: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<{ data: T; count?: number }> {
  const search = new URLSearchParams();
  search.set('recurso', recurso);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    search.set(key, String(value));
  });
  const json = await api.get(`/api/financeiro?${search.toString()}`);
  return { data: json.data as T, count: json.count as number | undefined };
}

// A Lovable retorna listas ora como array puro, ora como { linhas: [...] }
// (confirmado ao vivo em 21/08/2026 pra contas/conciliacao/fornecedores/
// centros-custo/contas-bancarias/ia-predicoes/titulos-conciliar/relatorio —
// só "config" e "projecoes" usam objeto com chaves nomeadas). Esse helper
// extrai a lista com segurança, sem quebrar se o formato mudar de novo.
function extrairFinanceiroLista<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.linhas)) return obj.linhas as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.itens)) return obj.itens as T[];
    if (Array.isArray(obj.meses)) return obj.meses as T[];
    if (Array.isArray(obj.periodos)) return obj.periodos as T[];
    // Quando o período pedido é 1 mês só, algumas rotas (ex: balancete)
    // devolvem o objeto do mês direto, sem embrulhar numa lista — se o
    // objeto tem cara de item de período (campo "periodo" ou "label"),
    // tratamos como uma lista de 1 item em vez de mostrar "sem dados".
    if (('periodo' in obj || 'label' in obj) && !Array.isArray(obj)) {
      return [obj as T];
    }
  }
  return [];
}

// --- Filtros comuns confirmados pela Lovable em 21/08/2026 (2ª rodada,
// dispatch completo do /api/public/internal/financeiro): dataInicial/
// dataFinal (YYYY-MM-DD, default = mês corrente até hoje) e unidadeIds
// (lista de uuid separada por vírgula — é o campo `id` de FinanceiroPostoConfig,
// NÃO o empresaCodigo; sem unidadeIds = todos os postos ativos). ---

export type FinanceiroFiltroComum = {
  dataInicial?: string;
  dataFinal?: string;
  unidadeIds?: string[];
};

function financeiroFiltroParams(filtro?: FinanceiroFiltroComum): { dataInicial?: string; dataFinal?: string; unidadeIds?: string } {
  return {
    dataInicial: filtro?.dataInicial,
    dataFinal: filtro?.dataFinal,
    unidadeIds: filtro?.unidadeIds && filtro.unidadeIds.length > 0 ? filtro.unidadeIds.join(',') : undefined,
  };
}

// --- Dashboard ---

export type FinanceiroCurvaPonto = { periodo: string; recebimentos: number; pagamentos: number; saldo: number };
export type FinanceiroProjecaoPonto = { periodo: string; faturamento: number; pagamentos: number };
export type FinanceiroPagamentoResumo = {
  descricao: string;
  contraparte: string;
  valor: number;
  vencimento?: string;
  posto?: string;
  [key: string]: unknown;
};

export type FinanceiroDashboardData = {
  curva: FinanceiroCurvaPonto[];
  projecao: FinanceiroProjecaoPonto[];
  pagamentosHoje: FinanceiroPagamentoResumo[];
  pagamentos7d: FinanceiroPagamentoResumo[];
  receberHoje: number;
  pagarHoje: number;
};

export async function fetchFinanceiroDashboard(filtro: FinanceiroFiltroComum = {}): Promise<FinanceiroDashboardData> {
  const { data } = await fetchFinanceiroRecurso<Partial<FinanceiroDashboardData>>('dashboard', financeiroFiltroParams(filtro));
  return {
    curva: data.curva ?? [],
    projecao: data.projecao ?? [],
    pagamentosHoje: data.pagamentosHoje ?? [],
    pagamentos7d: data.pagamentos7d ?? [],
    receberHoje: data.receberHoje ?? 0,
    pagarHoje: data.pagarHoje ?? 0,
  };
}

// --- Contas a Pagar / Contas a Receber (TITULO_PAGAR / TITULO_RECEBER, Quality) ---

export type FinanceiroContaStatus = 'aberto' | 'pago' | 'vencido';

export type FinanceiroContaItem = {
  id: string;
  codigo: string;
  empresaCodigo: number;
  posto: string;
  vencimento: string;
  dataPagamento: string | null;
  descricao: string;
  contraparte: string;
  categoria: string | null;
  valor: number;
  status: FinanceiroContaStatus;
  [key: string]: unknown;
};

export async function fetchFinanceiroContas(
  params: { tipo: 'pagar' | 'receber'; busca?: string; ultimoCodigo?: string } & FinanceiroFiltroComum
): Promise<{ data: FinanceiroContaItem[]; ultimoCodigo: string | null }> {
  const { tipo, busca, ultimoCodigo, ...filtro } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('contas', {
    tipo,
    busca,
    ultimoCodigo,
    ...financeiroFiltroParams(filtro),
  });
  const linhas = extrairFinanceiroLista<FinanceiroContaItem>(data);
  const ultimo =
    data && typeof data === 'object' && !Array.isArray(data)
      ? ((data as Record<string, unknown>).ultimoCodigo as string | null | undefined) ?? null
      : null;
  return { data: linhas, ultimoCodigo: ultimo };
}

// --- Fluxo de Caixa (MOVIMENTO_CONTA + CONTA.saldoAtual) ---

export type FinanceiroContaBancaria = {
  contaCodigo: string;
  empresaCodigo: number;
  posto: string;
  descricao: string;
  saldoAtual: number;
  ativo: boolean;
  usaOfx?: boolean;
  [key: string]: unknown;
};

export type FinanceiroFluxoCaixaData = {
  entradasPeriodo: number;
  saidasPeriodo: number;
  extrato: Array<{ data: string; entradas: number; saidas: number; saldoAcumulado: number }>;
  contas: FinanceiroContaBancaria[];
  [key: string]: unknown;
};

export async function fetchFinanceiroFluxoCaixa(filtro: FinanceiroFiltroComum = {}): Promise<FinanceiroFluxoCaixaData> {
  const { data } = await fetchFinanceiroRecurso<
    Partial<FinanceiroFluxoCaixaData> & {
      creditos?: number;
      debitos?: number;
      dias?: Array<{ dia: string; creditos: number; debitos: number; saldo: number }>;
    }
  >('fluxo-caixa', financeiroFiltroParams(filtro));
  // Formato real confirmado ao vivo em 21/08/2026: creditos/debitos/dias
  // (dia/creditos/debitos/saldo) em vez de entradasPeriodo/saidasPeriodo/extrato.
  const extrato =
    data.extrato ??
    (data.dias ?? []).map((d) => ({
      data: d.dia,
      entradas: d.creditos,
      saidas: d.debitos,
      saldoAcumulado: d.saldo,
    }));
  return {
    entradasPeriodo: data.entradasPeriodo ?? data.creditos ?? 0,
    saidasPeriodo: data.saidasPeriodo ?? data.debitos ?? 0,
    extrato,
    contas: data.contas ?? [],
  };
}

// --- Conciliação (MOVIMENTO_CONTA + sugestão em runtime + fin_conciliacoes) ---

export type FinanceiroMovimentoTipo = 'credito' | 'debito';

export type FinanceiroMovimentoItem = {
  codigo: string;
  empresaCodigo: number;
  posto: string;
  contaCodigo: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: FinanceiroMovimentoTipo;
  origemTipo?: string | null;
  origemCodigo?: string | null;
  conciliadoQuality?: boolean;
  sugestao?: {
    tituloTipo: 'pagar' | 'receber';
    tituloCodigo: string;
    tituloDescricao: string;
    tituloContraparte: string;
    tituloVencimento: string;
    tituloValor: number;
  } | null;
  conciliacao?: FinanceiroConciliacaoItem | null;
  [key: string]: unknown;
};

export type FinanceiroConciliacaoItem = {
  empresaCodigo: number;
  contaCodigo: string;
  movimentoCodigo: string;
  movimentoData: string;
  movimentoValor: number;
  movimentoDescricao: string;
  tituloTipo: 'pagar' | 'receber';
  tituloCodigo: string;
  tituloVencimento: string;
  tituloValor: number;
  tituloDescricao: string;
  tituloContraparte: string;
  origem: 'manual' | 'automatica';
  observacao?: string | null;
  createdBy?: string | null;
  [key: string]: unknown;
};

export type FinanceiroConciliacaoResumo = { conciliados: number; pendentes: number; comSugestao: number };

// Formato real confirmado ao vivo em 21/08/2026: a lista vem em "linhas"
// (não "movimentos"), e cada linha traz "sugestoes" (array de títulos
// compatíveis, não "sugestao" singular) e "vinculo" (não "conciliacao").
// Mapeamos aqui pro formato que o app já usa internamente.
type FinanceiroConciliacaoLinhaRaw = {
  codigo: string | number;
  empresaCodigo: number;
  posto: string;
  contaCodigo: string | number;
  data: string;
  descricao: string;
  valor: number;
  tipo: FinanceiroMovimentoTipo;
  origemTipo?: string | null;
  origemCodigo?: string | number | null;
  conciliadoQuality?: boolean;
  vinculo?: Record<string, unknown> | null;
  sugestoes?: Array<{
    codigo: string | number;
    descricao: string;
    contraparte: string;
    vencimento: string;
    valor: number;
  }>;
};

function mapFinanceiroConciliacaoLinha(l: FinanceiroConciliacaoLinhaRaw): FinanceiroMovimentoItem {
  const primeiraSugestao = l.sugestoes && l.sugestoes.length > 0 ? l.sugestoes[0] : null;
  return {
    codigo: String(l.codigo),
    empresaCodigo: l.empresaCodigo,
    posto: l.posto,
    contaCodigo: String(l.contaCodigo),
    data: l.data,
    descricao: l.descricao,
    valor: l.valor,
    tipo: l.tipo,
    origemTipo: l.origemTipo ?? null,
    origemCodigo: l.origemCodigo != null ? String(l.origemCodigo) : null,
    conciliadoQuality: l.conciliadoQuality,
    sugestao: primeiraSugestao
      ? {
          // origemTipo (TITULO_PAGAR/TITULO_RECEBER) ou o próprio tipo do
          // movimento (debito=pagamento, credito=recebimento) indicam o lado.
          tituloTipo: l.origemTipo === 'TITULO_RECEBER' || l.tipo === 'credito' ? 'receber' : 'pagar',
          tituloCodigo: String(primeiraSugestao.codigo),
          tituloDescricao: primeiraSugestao.descricao,
          tituloContraparte: primeiraSugestao.contraparte,
          tituloVencimento: primeiraSugestao.vencimento,
          tituloValor: primeiraSugestao.valor,
        }
      : null,
    conciliacao: (l.vinculo as FinanceiroConciliacaoItem | null) ?? null,
  };
}

export async function fetchFinanceiroConciliacao(
  params: { busca?: string } & FinanceiroFiltroComum = {}
): Promise<{ movimentos: FinanceiroMovimentoItem[]; resumo: FinanceiroConciliacaoResumo | null }> {
  const { busca, ...filtro } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('conciliacao', { busca, ...financeiroFiltroParams(filtro) });
  const linhas = extrairFinanceiroLista<FinanceiroConciliacaoLinhaRaw>(data);
  const resumo =
    data && typeof data === 'object' && !Array.isArray(data)
      ? ((data as Record<string, unknown>).resumo as FinanceiroConciliacaoResumo | undefined) ?? null
      : null;
  return { movimentos: linhas.map(mapFinanceiroConciliacaoLinha), resumo };
}

// Lista de títulos (pagar/receber) em aberto disponíveis pra vincular
// manualmente a um movimento — recurso novo confirmado em 21/08/2026.
export async function fetchFinanceiroTitulosConciliar(
  params: { tipo?: 'pagar' | 'receber'; busca?: string } & FinanceiroFiltroComum = {}
): Promise<FinanceiroContaItem[]> {
  const { tipo, busca, ...filtro } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('titulos-conciliar', {
    tipo,
    busca,
    ...financeiroFiltroParams(filtro),
  });
  return extrairFinanceiroLista<FinanceiroContaItem>(data);
}

export async function conciliarFinanceiroMovimento(
  body: {
    empresa_codigo: number;
    conta_codigo: string;
    movimento_codigo: string;
    movimento_data: string;
    movimento_valor: number;
    movimento_descricao: string;
    titulo_tipo: 'pagar' | 'receber';
    titulo_codigo: string;
    titulo_vencimento: string;
    titulo_valor: number;
    titulo_descricao: string;
    titulo_contraparte: string;
    origem: 'manual' | 'automatica';
    observacao?: string | null;
  },
  actorId?: string | null
): Promise<FinanceiroConciliacaoItem> {
  const json = await api.post(withActorId('/api/financeiro/conciliar', actorId), body);
  return json.data as FinanceiroConciliacaoItem;
}

export async function desvincularFinanceiroMovimento(movimentoCodigo: string, actorId?: string | null): Promise<void> {
  await api.post(withActorId('/api/financeiro/desconciliar', actorId), { movimento_codigo: movimentoCodigo });
}

// --- Balancete / DRE (INTEGRACAO/DRE) ---

export type FinanceiroDreGrupo = { grupo: string; venda: number; cmv: number; margem: number };
export type FinanceiroDreContaValor = { conta: string; valor: number };

export type FinanceiroDreMes = {
  periodo: string;
  label: string;
  receitaBruta: number;
  deducaoFiscal: number;
  receitaLiquida: number;
  outrasReceitas: number;
  entradas: number;
  cmv: number;
  despesas: number;
  saidas: number;
  resultado: number;
  margem: number;
  gruposVenda: FinanceiroDreGrupo[];
  despesasPorConta: FinanceiroDreContaValor[];
  receitasPorConta: FinanceiroDreContaValor[];
  [key: string]: unknown;
};

export async function fetchFinanceiroBalancete(
  params: { ano: number; mesIni: number; mesFim: number; apuracaoCaixa?: boolean } & Pick<FinanceiroFiltroComum, 'unidadeIds'>
): Promise<FinanceiroDreMes[]> {
  const { ano, mesIni, mesFim, apuracaoCaixa, unidadeIds } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('balancete', {
    ano,
    mesIni,
    mesFim,
    apuracaoCaixa,
    ...financeiroFiltroParams({ unidadeIds }),
  });
  return extrairFinanceiroLista<FinanceiroDreMes>(data);
}

// --- Fornecedores (agregação dos títulos a pagar + cadastro FORNECEDOR) ---

export type FinanceiroFornecedorPorPosto = { posto: string; titulos: number; valor: number };

export type FinanceiroFornecedorItem = {
  fornecedorCodigo: string;
  razao: string;
  fantasia: string | null;
  cnpjCpf: string;
  cidade: string | null;
  uf: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  postos: string[];
  titulos: number;
  valorTotal: number;
  valorAberto?: number;
  ultimoVencimento?: string | null;
  porPosto?: FinanceiroFornecedorPorPosto[];
  ultimosTitulos?: FinanceiroContaItem[];
  [key: string]: unknown;
};

export async function fetchFinanceiroFornecedores(
  params: { busca?: string } & FinanceiroFiltroComum = {}
): Promise<FinanceiroFornecedorItem[]> {
  const { busca, ...filtro } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('fornecedores', {
    busca,
    ...financeiroFiltroParams(filtro),
  });
  return extrairFinanceiroLista<FinanceiroFornecedorItem>(data);
}

export async function fetchFinanceiroFornecedorDetalhe(
  fornecedorCodigo: string,
  filtro: FinanceiroFiltroComum = {}
): Promise<FinanceiroFornecedorItem | null> {
  const { data } = await fetchFinanceiroRecurso<unknown>('fornecedores', {
    ...financeiroFiltroParams(filtro),
    fornecedorCodigo,
  });
  return extrairFinanceiroLista<FinanceiroFornecedorItem>(data)[0] ?? null;
}

// --- Centros de Custo (CENTRO_CUSTO, lista global) ---

export type FinanceiroCentroCustoItem = { centroCustoCodigo: string; descricao: string; tipo: string };

export async function fetchFinanceiroCentrosCusto(): Promise<FinanceiroCentroCustoItem[]> {
  const { data } = await fetchFinanceiroRecurso<unknown>('centros-custo');
  return extrairFinanceiroLista<FinanceiroCentroCustoItem>(data);
}

// --- Contas Bancárias (CONTA) ---

export async function fetchFinanceiroContasBancarias(
  params: { busca?: string } & Pick<FinanceiroFiltroComum, 'unidadeIds'> = {}
): Promise<FinanceiroContaBancaria[]> {
  const { busca, unidadeIds } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('contas-bancarias', {
    busca,
    ...financeiroFiltroParams({ unidadeIds }),
  });
  return extrairFinanceiroLista<FinanceiroContaBancaria>(data);
}

// --- Inteligência IA (fin_ia_predicoes / fin_ia_feedback / fin_ia_regras) ---

export type FinanceiroIaStatus = 'pendente' | 'confirmado' | 'rejeitado' | 'suprimido';

export type FinanceiroIaPredicaoItem = {
  id: string;
  empresa_codigo: number;
  posto: string;
  tipo: string;
  fornecedor_nome: string;
  fornecedor_doc: string | null;
  competencia: string;
  valor_esperado: number;
  periodicidade: string;
  confianca: number;
  mensagem: string;
  detalhe?: string | null;
  ocorrencias: number;
  status: FinanceiroIaStatus;
  modelo?: string | null;
  gerado_em: string;
  [key: string]: unknown;
};

export async function fetchFinanceiroIaPredicoes(
  params: { status?: FinanceiroIaStatus; incluirRespondidos?: boolean } & Pick<FinanceiroFiltroComum, 'unidadeIds'> = {}
): Promise<FinanceiroIaPredicaoItem[]> {
  const { status, incluirRespondidos, unidadeIds } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('ia-predicoes', {
    status,
    incluirRespondidos,
    ...financeiroFiltroParams({ unidadeIds }),
  });
  return extrairFinanceiroLista<FinanceiroIaPredicaoItem>(data);
}

export async function responderFinanceiroIaPredicao(
  body: { predicao_id: string; resposta: 'sim' | 'nao'; justificativa?: string },
  actorId?: string | null
): Promise<void> {
  await api.post(withActorId('/api/financeiro/ia-responder', actorId), body);
}

export async function reanalisarFinanceiroIa(actorId?: string | null): Promise<void> {
  await api.post(withActorId('/api/financeiro/ia-reanalisar', actorId), {});
}

// --- Projeções (saldo atual + títulos em aberto + média histórica) ---

export type FinanceiroProjecaoMes = {
  mes: string;
  label: string;
  receberPrevisto: number;
  pagarPrevisto: number;
  receberMedia: number;
  pagarMedia: number;
  receberTotal: number;
  pagarTotal: number;
  resultado: number;
  saldoBase: number;
  saldoOtimista: number;
  saldoPessimista: number;
  alerta?: string | null;
  [key: string]: unknown;
};

export type FinanceiroProjecoesData = {
  saldoInicial: number;
  mediaReceber: number;
  mediaPagar: number;
  meses: FinanceiroProjecaoMes[];
};

export async function fetchFinanceiroProjecoes(
  params: { horizonteMeses?: number; mesesHistorico?: number } & Pick<FinanceiroFiltroComum, 'unidadeIds'> = {}
): Promise<FinanceiroProjecoesData> {
  const { horizonteMeses, mesesHistorico, unidadeIds } = params;
  const { data } = await fetchFinanceiroRecurso<Partial<FinanceiroProjecoesData>>('projecoes', {
    horizonteMeses,
    mesesHistorico,
    ...financeiroFiltroParams({ unidadeIds }),
  });
  return {
    saldoInicial: data.saldoInicial ?? 0,
    mediaReceber: data.mediaReceber ?? 0,
    mediaPagar: data.mediaPagar ?? 0,
    meses: data.meses ?? [],
  };
}

// --- Relatórios (mesmos dados de Contas/Conciliação/Fornecedores/Centros de Custo) ---

export async function fetchFinanceiroRelatorio<T = Record<string, unknown>>(
  params: { tipo: 'contas' | 'conciliacoes' | 'fornecedores' | 'centros_custo' } & FinanceiroFiltroComum
): Promise<T[]> {
  const { tipo, ...filtro } = params;
  const { data } = await fetchFinanceiroRecurso<unknown>('relatorio', { tipo, ...financeiroFiltroParams(filtro) });
  return extrairFinanceiroLista<T>(data);
}

// --- Configurações (fin_dre_chaves — postos/chave da integração DRE).
// Contrato completo (leitura + escrita) confirmado pela Lovable em
// 21/08/2026: chave é global da rede (grava em todas as linhas de
// fin_dre_chaves); postos herdam a chave global automaticamente ao serem
// criados. ---

export type FinanceiroPostoConfig = {
  id: string;
  nome: string;
  empresaCodigo: number;
  idq: string | null;
  ativo: boolean;
  atualizadoEm: string | null;
  temChave: boolean;
};

export type FinanceiroConfigData = {
  chaveMascarada: string | null;
  chaveDefinida: boolean;
  postos: FinanceiroPostoConfig[];
  cache?: unknown;
};

export async function fetchFinanceiroConfig(): Promise<FinanceiroConfigData> {
  const { data } = await fetchFinanceiroRecurso<Partial<FinanceiroConfigData>>('config');
  return {
    chaveMascarada: data.chaveMascarada ?? null,
    chaveDefinida: data.chaveDefinida ?? false,
    postos: data.postos ?? [],
    cache: data.cache,
  };
}

export async function salvarFinanceiroConfigChave(
  chave: string,
  actorId?: string | null
): Promise<{ chaveMascarada: string | null }> {
  const json = await api.post(withActorId('/api/financeiro/config/chave', actorId), { chave });
  return json.data as { chaveMascarada: string | null };
}

export async function testarFinanceiroConexaoQuality(
  actorId?: string | null
): Promise<{ ok: boolean; mensagem: string; ms?: number }> {
  const json = await api.post(withActorId('/api/financeiro/config/testar', actorId));
  return json.data as { ok: boolean; mensagem: string; ms?: number };
}

export async function criarFinanceiroConfigPosto(
  body: { nome: string; empresaCodigo: number | null; idq?: string; ativo?: boolean },
  actorId?: string | null
): Promise<FinanceiroPostoConfig> {
  const json = await api.post(withActorId('/api/financeiro/config/posto', actorId), body);
  return json.data as FinanceiroPostoConfig;
}

export async function atualizarFinanceiroConfigPosto(
  id: string,
  body: Partial<{ nome: string; empresaCodigo: number | null; idq: string | null; ativo: boolean }>,
  actorId?: string | null
): Promise<FinanceiroPostoConfig> {
  const json = await api.patch(withActorId(`/api/financeiro/config/posto/${encodeURIComponent(id)}`, actorId), body);
  return json.data as FinanceiroPostoConfig;
}

export async function excluirFinanceiroConfigPosto(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/financeiro/config/posto/${encodeURIComponent(id)}`, actorId));
}

export async function limparFinanceiroConfigCache(actorId?: string | null): Promise<{ removidos: number }> {
  const json = await api.post(withActorId('/api/financeiro/config/limpar-cache', actorId));
  return json.data as { removidos: number };
}

// --- Notificações (Rotinas + Templates) — sistema genérico já usado pelo
// Administrador, fixado no servidor em modulo=fin (tabela fin_notificacoes),
// confirmado pela Lovable em 21/08/2026. ---

export type FinanceiroNotifGatilho = 'recorrente' | 'evento' | 'manual';
export type FinanceiroNotifCanal = 'app' | 'email' | 'whatsapp';
export type FinanceiroNotifPublicoTipo = 'todos' | 'colaboradores' | 'postos' | 'cargos';

export type FinanceiroNotifRotinaItem = {
  id: string;
  nome: string | null;
  titulo: string | null;
  mensagem: string | null;
  templateId: string | null;
  isActive: boolean;
  tipoGatilho: FinanceiroNotifGatilho;
  cronExpressao: string | null;
  eventoCodigo: string | null;
  canais: FinanceiroNotifCanal[];
  publicoTipo: FinanceiroNotifPublicoTipo;
  publicoIds: string[];
  ultimaExecucao: string | null;
  proximaExecucao: string | null;
  totalDestinos: number;
  totalEnviados: number;
  status: string | null;
  agendadaPara: string | null;
};

export type FinanceiroNotifRotinasResponse = { rotinas: FinanceiroNotifRotinaItem[]; count: number };

export async function fetchFinanceiroNotifRotinas(params?: {
  q?: string;
  ativa?: boolean;
}): Promise<FinanceiroNotifRotinasResponse> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.ativa !== undefined) search.set('ativa', String(params.ativa));
  const query = search.toString() ? `?${search.toString()}` : '';
  const json = await api.get(`/api/financeiro/notif-rotinas${query}`);
  return json.data as FinanceiroNotifRotinasResponse;
}

export type FinanceiroNotifRotinaWriteBody = {
  nome?: string;
  titulo?: string;
  mensagem?: string;
  template_id?: string | null;
  ativa?: boolean;
  tipo_gatilho?: FinanceiroNotifGatilho;
  cron_expressao?: string | null;
  evento_codigo?: string | null;
  canais?: FinanceiroNotifCanal[];
  publico_tipo?: FinanceiroNotifPublicoTipo;
  publico_ids?: string[];
};

export async function createFinanceiroNotifRotina(
  body: FinanceiroNotifRotinaWriteBody,
  actorId?: string | null
): Promise<FinanceiroNotifRotinaItem> {
  const json = await api.post(withActorId('/api/financeiro/notif-rotinas', actorId), body);
  return json.data as FinanceiroNotifRotinaItem;
}

export async function updateFinanceiroNotifRotina(
  id: string,
  body: FinanceiroNotifRotinaWriteBody,
  actorId?: string | null
): Promise<FinanceiroNotifRotinaItem> {
  const json = await api.patch(withActorId(`/api/financeiro/notif-rotinas/${encodeURIComponent(id)}`, actorId), body);
  return json.data as FinanceiroNotifRotinaItem;
}

export async function deleteFinanceiroNotifRotina(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/financeiro/notif-rotinas/${encodeURIComponent(id)}`, actorId));
}

export async function executarFinanceiroNotifRotina(
  id: string,
  actorId?: string | null
): Promise<FinanceiroNotifRotinaItem> {
  const json = await api.post(withActorId(`/api/financeiro/notif-rotinas/${encodeURIComponent(id)}/executar`, actorId));
  return json.data as FinanceiroNotifRotinaItem;
}

export type FinanceiroNotifTemplateItem = {
  id: string;
  modulo: string | null;
  codigo: string | null;
  nome: string | null;
  titulo: string | null;
  mensagem: string | null;
  variaveis: string[];
  isPadrao: boolean;
  isActive: boolean;
};

export type FinanceiroNotifTemplatesResponse = { templates: FinanceiroNotifTemplateItem[]; count: number };

export async function fetchFinanceiroNotifTemplates(params?: {
  q?: string;
  ativo?: boolean;
}): Promise<FinanceiroNotifTemplatesResponse> {
  const search = new URLSearchParams();
  if (params?.q) search.set('q', params.q);
  if (params?.ativo !== undefined) search.set('ativo', String(params.ativo));
  const query = search.toString() ? `?${search.toString()}` : '';
  const json = await api.get(`/api/financeiro/notif-templates${query}`);
  return json.data as FinanceiroNotifTemplatesResponse;
}

export type FinanceiroNotifTemplateWriteBody = {
  codigo?: string;
  nome?: string;
  titulo?: string;
  mensagem?: string;
  variaveis?: string[];
  ativo?: boolean;
};

export async function createFinanceiroNotifTemplate(
  body: FinanceiroNotifTemplateWriteBody,
  actorId?: string | null
): Promise<FinanceiroNotifTemplateItem> {
  const json = await api.post(withActorId('/api/financeiro/notif-templates', actorId), body);
  return json.data as FinanceiroNotifTemplateItem;
}

export async function updateFinanceiroNotifTemplate(
  id: string,
  body: FinanceiroNotifTemplateWriteBody,
  actorId?: string | null
): Promise<FinanceiroNotifTemplateItem> {
  const json = await api.patch(withActorId(`/api/financeiro/notif-templates/${encodeURIComponent(id)}`, actorId), body);
  return json.data as FinanceiroNotifTemplateItem;
}

export async function deleteFinanceiroNotifTemplate(id: string, actorId?: string | null): Promise<void> {
  await api.delete(withActorId(`/api/financeiro/notif-templates/${encodeURIComponent(id)}`, actorId));
}
