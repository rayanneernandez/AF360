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
  role: 'colaborador' | 'rh' | 'diretoria' | 'administrador';
  // Lista de painéis que esse login pode abrir de verdade (pode ter mais de
  // 1 — ex: alguém com módulo RH que também tem ficha de colaborador
  // vinculada vê ['rh', 'colaborador']; contas master também podem ter
  // 'administrador' aqui). 'role' acima é só o primeiro/principal, mantido
  // por compatibilidade; o app decide se mostra a tela de seleção de painel
  // com base neste array.
  availableRoles: Array<'colaborador' | 'rh' | 'diretoria' | 'administrador'>;
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
  ciencia_em: string | null;
  entregue_em: string | null;
  entregue_por: string | null;
  itens?: RhUniformePedidoItem[];
  [key: string]: unknown;
};

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

export async function fetchRhUniformesPedidos(
  params: { colaboradorId?: string; status?: string } = {}
): Promise<RhUniformePedido[]> {
  const search = new URLSearchParams();
  search.set('recurso', 'pedidos');
  if (params.colaboradorId) search.set('colaboradorId', params.colaboradorId);
  if (params.status) search.set('status', params.status);
  const json = await api.get(`/api/rh/uniformes?${search.toString()}`);
  return (json.data as RhUniformePedido[]) ?? [];
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

export type RhTreinamentoAula = {
  id: string;
  treinamento_id: string;
  ordem: number;
  titulo: string;
  descricao: string | null;
  duracao_min: number | null;
  video_url: string | null;
  video_storage_path: string | null;
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
  recurso: 'treinamentos' | 'aulas' | 'questoes' | 'inscricoes' | 'respostas',
  params: {
    treinamentoId?: string;
    colaboradorId?: string;
    inscricaoId?: string;
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
  if (params.status) search.set('status', params.status);
  if (params.ativo !== undefined) search.set('ativo', params.ativo ? 'true' : 'false');
  if (params.incluirGabarito) search.set('incluirGabarito', '1');
  const json = await api.get(`/api/rh/treinamentos-conteudo?${search.toString()}`);
  return (json.data as T[]) ?? [];
}

export async function fetchRhTreinamentoAulas(treinamentoId: string): Promise<RhTreinamentoAula[]> {
  return fetchRhTreinamentosRecurso<RhTreinamentoAula>('aulas', { treinamentoId });
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

export type DiretoriaPainelRecurso = 'resumo' | 'rede' | 'margem' | 'estoques' | 'gnv' | 'postos' | 'periodo';

export type DiretoriaPainelResponse<T = any> = {
  recurso: string;
  de?: string;
  ate?: string;
  postos?: unknown;
  dados: T;
};

export async function fetchDiretoriaPainel<T = any>(
  recurso: DiretoriaPainelRecurso,
  params: { de?: string; ate?: string; posto?: string } = {},
  actorId?: string | null
): Promise<DiretoriaPainelResponse<T>> {
  const search = new URLSearchParams();
  search.set('recurso', recurso);
  if (params.de) search.set('de', params.de);
  if (params.ate) search.set('ate', params.ate);
  if (params.posto) search.set('posto', params.posto);
  const path = `/api/diretoria-painel?${search.toString()}`;
  const json = await api.get(withActorId(path, actorId));
  return { recurso: json.recurso ?? recurso, de: json.de, ate: json.ate, postos: json.postos, dados: json.dados as T };
}

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
