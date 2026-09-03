// Cliente para os endpoints internos que o Lovable expôs no backend
// Supabase real do app (RH, Fale com a Diretoria, etc). Esse Supabase é
// diferente do Postgres self-hosted (db.js) — moram lá as tabelas rh_*,
// dir_contatos/dir_mensagens, empresas, profiles.
//
// Protocolo: header x-internal-secret + endpoints:
//   GET   /api/public/internal/table?name=...&<filtros>
//   GET   /api/public/internal/rh-stats
//   PATCH /api/public/internal/dir-contato?phone=...

// URL estável de produção (não muda mesmo se o domínio custom mudar de nome).
// af-360-hub.lovable.app e americanfuel.com.br também funcionam depois do
// publish, mas essa é a recomendada pelo próprio Lovable.
const LOVABLE_BASE_URL =
  process.env.LOVABLE_BASE_URL || 'https://project--f9a2d9ec-6a30-46c7-8ddd-b5e275064f7b.lovable.app';

function getSecret() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error('INTERNAL_API_SECRET não configurado nas variáveis de ambiente.');
  }
  return secret;
}

function buildUrl(path, params = {}) {
  const url = new URL(`${LOVABLE_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url;
}

async function parseResponse(response, url) {
  const rawText = await response.text().catch(() => '');
  let json = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch (e) {
    json = null;
  }
  if (!response.ok) {
    const message = json?.message || json?.error || `Lovable API respondeu ${response.status}`;
    const err = new Error(message);
    err.lovableUrl = url.toString();
    err.lovableStatus = response.status;
    err.lovableBody = rawText?.slice(0, 500);
    throw err;
  }
  return json;
}

// actorId opcional (3º parâmetro): alguns GETs (ex: wa-config?reveal=1)
// também exigem x-actor-id pra validar is_master no Lovable.
async function lovableGet(path, params = {}, actorId) {
  const url = buildUrl(path, params);
  const headers = { 'x-internal-secret': getSecret() };
  if (actorId) headers['x-actor-id'] = actorId;
  const response = await fetch(url, { headers });
  return parseResponse(response, url);
}

// actorId (opcional): profiles.id de quem está fazendo a ação — os endpoints
// admin-* usam isso (header x-actor-id) pra validar is_master no Lovable.
// Para as ações que não são de escrita "geral" (RH), simplesmente não passar.
function writeHeaders(actorId) {
  const headers = {
    'x-internal-secret': getSecret(),
    'Content-Type': 'application/json',
  };
  if (actorId) headers['x-actor-id'] = actorId;
  return headers;
}

async function lovablePost(path, params = {}, body = {}, actorId) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'POST',
    headers: writeHeaders(actorId),
    body: JSON.stringify(body),
  });
  return parseResponse(response, url);
}

async function lovablePatch(path, params = {}, body = {}, actorId) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: writeHeaders(actorId),
    body: JSON.stringify(body),
  });
  return parseResponse(response, url);
}

async function lovablePut(path, params = {}, body = {}, actorId) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'PUT',
    headers: writeHeaders(actorId),
    body: JSON.stringify(body),
  });
  return parseResponse(response, url);
}

async function lovableDelete(path, params = {}, actorId) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: writeHeaders(actorId),
  });
  return parseResponse(response, url);
}

/**
 * Lê uma tabela da allowlist do Lovable.
 * filters: objeto simples { coluna: valor } (eq) ou { 'coluna__op': valor }
 * (op em eq|neq|gt|gte|lt|lte|like|ilike|in|is). Valores de "in" podem ser
 * um array (vira CSV automaticamente).
 */
async function fetchTable(name, { select, limit, offset, order, count, filters = {} } = {}) {
  const normalizedFilters = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    normalizedFilters[key] = Array.isArray(value) ? value.join(',') : value;
  });

  return lovableGet('/api/public/internal/table', {
    name,
    select,
    limit,
    offset,
    order,
    count: count ? 1 : undefined,
    ...normalizedFilters,
  });
}

/**
 * Igual a fetchTable, mas ignora o teto de 2000 por chamada (e um possível
 * "Max Rows" configurado no Supabase deles, que corta silenciosamente em
 * 1000 mesmo pedindo mais) — pagina em pedaços de 1000 até a página vir
 * incompleta, e junta tudo. Use para telas que precisam da lista inteira
 * (ex: Colaboradores), não para buscas já filtradas/pequenas.
 */
async function fetchAllRows(name, { select, order, filters = {}, pageSize = 1000, hardCap = 20000 } = {}) {
  const allRows = [];
  let offset = 0;
  for (let i = 0; i < Math.ceil(hardCap / pageSize); i++) {
    const json = await fetchTable(name, { select, order, filters, limit: pageSize, offset });
    const rows = json.data || [];
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return { data: allRows, count: allRows.length };
}

async function fetchRhStats() {
  return lovableGet('/api/public/internal/rh-stats');
}

async function patchDirContato(phone, body) {
  return lovablePatch('/api/public/internal/dir-contato', { phone }, body);
}

// ---------------------------------------------------------------------------
// Endpoints de escrita confirmados pelo time do Lovable em 29/07/2026 (ver
// combinado no chat) — todos exigem x-internal-secret; os admin-* aceitam
// x-actor-id (uuid do profile master) opcional pra validação de is_master.
// ---------------------------------------------------------------------------

// --- RH ---

// Cadastro de colaborador confirmado pelo Lovable em 10/08/2026. Obrigatórios
// no body: nome_completo e empresa_id — o resto tem default no Postgres
// (status='ativo', portal_status='nao_ativado', grau_insalubridade='nenhum',
// tem_periculosidade=false, usa_vt=true, dependentes_irrf=0,
// celular_whatsapp=false). CPF repetido devolve 409 (corpo com o registro
// existente em err.lovableBody, tratado na rota).
function postRhColaborador(body) {
  return lovablePost('/api/public/internal/rh-colaborador', {}, body);
}

function patchRhColaborador(id, body) {
  return lovablePatch('/api/public/internal/rh-colaborador', { id }, body);
}

function putRhBeneficios(colaboradorId, body) {
  return lovablePut('/api/public/internal/rh-beneficios', { colaborador_id: colaboradorId }, body);
}

function postRhHistoricoContratacao(body) {
  return lovablePost('/api/public/internal/rh-historico-contratacoes', {}, body);
}

function patchRhHistoricoContratacao(id, body) {
  return lovablePatch('/api/public/internal/rh-historico-contratacoes', { id }, body);
}

function deleteRhHistoricoContratacao(id) {
  return lovableDelete('/api/public/internal/rh-historico-contratacoes', { id });
}

// --- RH: Dependentes, Promoções (salário histórico), Premiações e
// Transferências — 4 endpoints de escrita confirmados pela Lovable em
// 11/08/2026, mesmo padrão x-internal-secret dos demais. ---

function postRhDependente(body) {
  return lovablePost('/api/public/internal/rh-dependente', {}, body);
}

function patchRhDependente(id, body) {
  return lovablePatch('/api/public/internal/rh-dependente', { id }, body);
}

function deleteRhDependente(id) {
  return lovableDelete('/api/public/internal/rh-dependente', { id });
}

// salario_novo/vigencia_inicio obrigatórios; salario_anterior/percentual são
// calculados do lado deles se omitidos; "atualizar_colaborador" (default
// true) já grava o novo salário em rh_colaboradores.salario_base — resposta
// traz colaborador_atualizado.
function postRhSalarioHistorico(body) {
  return lovablePost('/api/public/internal/rh-salario-historico', {}, body);
}

function patchRhSalarioHistorico(id, body) {
  return lovablePatch('/api/public/internal/rh-salario-historico', { id }, body);
}

function deleteRhSalarioHistorico(id) {
  return lovableDelete('/api/public/internal/rh-salario-historico', { id });
}

// tipo_id é FK NOT NULL — mandar "tipo": "Nome" que a Lovable resolve/cria em
// rh_premiacao_tipos. competencia é NOT NULL (default dia 1 do mês corrente
// se omitida).
function postRhPremiacao(body) {
  return lovablePost('/api/public/internal/rh-premiacao', {}, body);
}

function patchRhPremiacao(id, body) {
  return lovablePatch('/api/public/internal/rh-premiacao', { id }, body);
}

function deleteRhPremiacao(id) {
  return lovableDelete('/api/public/internal/rh-premiacao', { id });
}

// Campos de origem (empresa_origem_id, setor_origem, cargo_origem,
// salario_anterior, gestor_direto_anterior_id) são preenchidos do lado deles
// com o snapshot atual do colaborador se vierem vazios. Por padrão fica
// "pendente"; "efetivar": true (no POST ou no PATCH) já aplica no cadastro
// (empresa_id/cargo/setor/salario_base/gestor_direto_id) e carimba
// aprovado/efetivado a partir do x-actor-id — resposta traz
// colaborador_atualizado.
function postRhTransferencia(body, actorId) {
  return lovablePost('/api/public/internal/rh-transferencia', {}, body, actorId);
}

function patchRhTransferencia(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-transferencia', { id }, body, actorId);
}

function deleteRhTransferencia(id, actorId) {
  return lovableDelete('/api/public/internal/rh-transferencia', { id }, actorId);
}

// --- RH: Documentos — upload/download/exclusão de arquivo (bucket privado
// documentos-colaboradores, mesmo do painel web). Endpoint confirmado pela
// Lovable em 11/08/2026: /api/public/internal/rh-documento-upload. Mandamos
// sempre em JSON com arquivo_base64 (mais simples que multipart num proxy
// Express); limite deles é 10MB/arquivo, mimes application/pdf, image/jpeg,
// image/png, image/webp. GET ?id= devolve { data, url } (link assinado,
// válido 1h); DELETE ?id= apaga arquivo + registro.

function postRhDocumentoUpload(body, actorId) {
  return lovablePost('/api/public/internal/rh-documento-upload', {}, body, actorId);
}

function getRhDocumento(id, actorId) {
  return lovableGet('/api/public/internal/rh-documento-upload', { id }, actorId);
}

function deleteRhDocumentoUpload(id, actorId) {
  return lovableDelete('/api/public/internal/rh-documento-upload', { id }, actorId);
}

// --- RH: Conformidade de Admissões (rs_admissoes + filhas). Endpoint
// unificado confirmado pela Lovable em 12/08/2026:
// /api/public/internal/admissao-conformidade. GET sem "recurso" devolve
// { resumo, por_etapa, por_responsavel, linhas, prazos, filtros } já
// filtrado pelos query params (inicio/fim sobre created_at, empresa_id,
// responsavel_id, etapa, status, busca, incluir_encerradas). GET
// ?recurso=prazos lista só admissao_prazos (SLA por etapa). PATCH
// ?recurso=prazos com { id, dias } grava o novo SLA (mesma função
// salvarPrazoAdmissao do site, mínimo 1 dia).

function getAdmissaoConformidade(params = {}, actorId) {
  return lovableGet('/api/public/internal/admissao-conformidade', params, actorId);
}

function getAdmissaoPrazos(actorId) {
  return lovableGet('/api/public/internal/admissao-conformidade', { recurso: 'prazos' }, actorId);
}

function patchAdmissaoPrazo(id, dias, actorId) {
  return lovablePatch('/api/public/internal/admissao-conformidade', { recurso: 'prazos' }, { id, dias }, actorId);
}

// --- RH: Comunicados — upload/exclusão de imagem/anexo (bucket público
// rh-comunicados, separado do bucket privado de documentos do colaborador —
// esse não exige colaborador_id). Endpoint confirmado pela Lovable em
// 12/08/2026: /api/public/internal/rh-comunicado-upload. Sem comunicado_id
// no POST, salva em avulsos/ e só devolve a URL (pra gravar em anexo_url
// depois, ex: antes de criar o comunicado); com comunicado_id, já grava
// anexo_url sozinho. Limite: 8MB, jpg/png/webp/pdf. URL pública, sem
// expiração — não precisa de link assinado igual documentos.

function postRhComunicadoUpload(body, actorId) {
  return lovablePost('/api/public/internal/rh-comunicado-upload', {}, body, actorId);
}

function deleteRhComunicadoUpload({ path, comunicadoId } = {}, actorId) {
  return lovableDelete('/api/public/internal/rh-comunicado-upload', { path, comunicado_id: comunicadoId }, actorId);
}

// --- Admin ---

function postAdminUsuario(body, actorId) {
  return lovablePost('/api/public/internal/admin-usuarios', {}, body, actorId);
}

function postAdminUsuarioResetSenha(userId, password, actorId) {
  return lovablePost(
    '/api/public/internal/admin-usuarios',
    { action: 'reset-senha' },
    { user_id: userId, password },
    actorId
  );
}

function postAdminUsuarioToggleAtivo(userId, isActive, actorId) {
  return lovablePost(
    '/api/public/internal/admin-usuarios',
    { action: 'toggle-ativo' },
    { user_id: userId, is_active: isActive },
    actorId
  );
}

function patchAdminUsuario(userId, body, actorId) {
  return lovablePatch('/api/public/internal/admin-usuarios', { user_id: userId }, body, actorId);
}

function deleteAdminUsuario(userId, actorId) {
  return lovableDelete('/api/public/internal/admin-usuarios', { user_id: userId }, actorId);
}

function postAdminRole(body, actorId) {
  return lovablePost('/api/public/internal/admin-roles', {}, body, actorId);
}

function patchAdminRole(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-roles', { id }, body, actorId);
}

function deleteAdminRole(id, actorId) {
  return lovableDelete('/api/public/internal/admin-roles', { id }, actorId);
}

function putAdminRolePermissions(roleId, permissions, actorId) {
  return lovablePut('/api/public/internal/admin-role-permissions', { role_id: roleId }, { permissions }, actorId);
}

function putAdminUserPermissions(userId, permissions, actorId) {
  return lovablePut('/api/public/internal/admin-user-permissions', { user_id: userId }, { permissions }, actorId);
}

function postAdminUserModule(userId, { moduleId, moduleSlug } = {}, actorId) {
  const body = { user_id: userId };
  if (moduleId) body.module_id = moduleId;
  else if (moduleSlug) body.module_slug = moduleSlug;
  return lovablePost('/api/public/internal/admin-user-modules', {}, body, actorId);
}

function postAdminUserModulesReset(userId, actorId) {
  return lovablePost('/api/public/internal/admin-user-modules', { action: 'reset' }, { user_id: userId }, actorId);
}

function deleteAdminUserModule(userId, moduleId, actorId) {
  return lovableDelete('/api/public/internal/admin-user-modules', { user_id: userId, module_id: moduleId }, actorId);
}

// --- Grupos (tabela própria public.grupos, confirmada pelo Lovable em
// 29/07/2026 — roles.group_type = grupos.slug). Contagem de cargos vem
// pronta do endpoint deles (cargos_count), não precisa ser recalculada. ---

function getAdminGrupos({ limit, offset, q, order } = {}) {
  return lovableGet('/api/public/internal/admin-grupos', { limit, offset, q, order });
}

function postAdminGrupo(body, actorId) {
  return lovablePost('/api/public/internal/admin-grupos', {}, body, actorId);
}

function patchAdminGrupo(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-grupos', { id }, body, actorId);
}

function deleteAdminGrupo(id, actorId) {
  return lovableDelete('/api/public/internal/admin-grupos', { id }, actorId);
}

// --- Unidades (tabela própria public.empresas, schema completo confirmado
// pelo Lovable em 29/07/2026) e a ação especial "Vender unidade" (uma
// chamada só: marca a unidade como vendida/inativa e transfere/desliga em
// lote os colaboradores ativos dela). ---

function getAdminUnidades({ limit, offset, q, order, is_active, vendida } = {}) {
  return lovableGet('/api/public/internal/admin-unidades', { limit, offset, q, order, is_active, vendida });
}

function postAdminUnidade(body, actorId) {
  return lovablePost('/api/public/internal/admin-unidades', {}, body, actorId);
}

function patchAdminUnidade(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-unidades', { id }, body, actorId);
}

function deleteAdminUnidade(id, actorId) {
  return lovableDelete('/api/public/internal/admin-unidades', { id }, actorId);
}

function postAdminVenderUnidade(body, actorId) {
  return lovablePost('/api/public/internal/admin-vender-unidade', {}, body, actorId);
}

// --- Contabilidades (tabela própria public.contabilidades, confirmada pelo
// Lovable em 29/07/2026 — empresas.contabilidade_id -> contabilidades.id). ---

function getAdminContabilidades({ limit, offset, q, order, is_active } = {}) {
  return lovableGet('/api/public/internal/admin-contabilidades', { limit, offset, q, order, is_active });
}

function postAdminContabilidade(body, actorId) {
  return lovablePost('/api/public/internal/admin-contabilidades', {}, body, actorId);
}

function patchAdminContabilidade(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-contabilidades', { id }, body, actorId);
}

function deleteAdminContabilidade(id, actorId) {
  return lovableDelete('/api/public/internal/admin-contabilidades', { id }, actorId);
}

// --- Contabilidades: Responsáveis (tabela contabilidade_responsaveis,
// confirmada pelo Lovable em 04/08/2026 — cada responsável pode ganhar login
// real no Portal do Contador via "liberar-acesso"). Mesmo padrão
// x-internal-secret + x-actor-id (actor valida is_master nos writes). ---

function getAdminContabilidadeResponsaveis({ contabilidade_id, q, ativo, limit, offset } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/admin-contabilidade-responsaveis',
    { contabilidade_id, q, ativo, limit, offset },
    actorId
  );
}

function postAdminContabilidadeResponsavel(body, actorId) {
  return lovablePost('/api/public/internal/admin-contabilidade-responsaveis', {}, body, actorId);
}

function patchAdminContabilidadeResponsavel(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-contabilidade-responsaveis', { id }, body, actorId);
}

function deleteAdminContabilidadeResponsavel(id, actorId) {
  return lovableDelete('/api/public/internal/admin-contabilidade-responsaveis', { id }, actorId);
}

// Cria/reseta o login do responsável no Portal do Contador (senha inicial
// fixa "AF360@contador", com troca obrigatória do lado deles).
function postAdminContabilidadeResponsavelLiberarAcesso(id, actorId) {
  return lovablePost(
    '/api/public/internal/admin-contabilidade-responsaveis',
    { id, action: 'liberar-acesso' },
    {},
    actorId
  );
}

// --- Módulos (tabela própria public.modules, leitura já existente via
// fetchAllRows; escrita — toggle de is_active e edição de campos — confirmada
// pelo Lovable em 30/07/2026). ---

function getAdminModulos() {
  return lovableGet('/api/public/internal/admin-modulos');
}

function patchAdminModulo(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-modulos', { id }, body, actorId);
}

// --- Domínios permitidos de login (tabela adm_dominios_permitidos,
// confirmada pelo Lovable em 30/07/2026). ---

function getAdminDominios({ limit, offset, q, ativo } = {}) {
  return lovableGet('/api/public/internal/admin-dominios', { limit, offset, q, ativo });
}

function postAdminDominio(body, actorId) {
  return lovablePost('/api/public/internal/admin-dominios', {}, body, actorId);
}

function patchAdminDominio(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-dominios', { id }, body, actorId);
}

function deleteAdminDominio(id, actorId) {
  return lovableDelete('/api/public/internal/admin-dominios', { id }, actorId);
}

// --- Domínio de e-mail por cargo (tabela rh_cargo_dominio, confirmada pelo
// Lovable em 30/07/2026 — provider é o enum rh_email_provider: 'migadu' |
// 'google'). ---

function getAdminCargoDominio({ limit, offset, q, provider, ativo } = {}) {
  return lovableGet('/api/public/internal/admin-cargo-dominio', { limit, offset, q, provider, ativo });
}

function postAdminCargoDominio(body, actorId) {
  return lovablePost('/api/public/internal/admin-cargo-dominio', {}, body, actorId);
}

function patchAdminCargoDominio(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-cargo-dominio', { id }, body, actorId);
}

function deleteAdminCargoDominio(id, actorId) {
  return lovableDelete('/api/public/internal/admin-cargo-dominio', { id }, actorId);
}

// --- Temas visuais (tabela adm_temas, confirmada pelo Lovable em
// 30/07/2026). Só leitura + toggle de ativo — sem criar/excluir tema pelo
// app, como definido com eles. ---

function getAdminTemas() {
  return lovableGet('/api/public/internal/admin-temas');
}

function patchAdminTema(slug, body, actorId) {
  return lovablePatch('/api/public/internal/admin-temas', { slug }, body, actorId);
}

// --- Versões (changelog de produto do AF360 — extraído pelo Lovable de
// VersoesTab.tsx para uma fonte única em 30/07/2026; site e app leem o
// mesmo conteúdo, sem tabela por trás). Só leitura. ---

function getAdminVersoes() {
  return lovableGet('/api/public/internal/admin-versoes');
}

// --- Notificações: Rotinas (uma tabela <modulo>_notificacoes por módulo,
// ex: admin_notificacoes) e Templates (tabela única notif_templates,
// compartilhada entre módulos via coluna `modulo`) — confirmado pelo
// Lovable em 30/07/2026. "Executar agora" dispara envio real (inbox/Resend
// /n8n) e só então atualiza ultima_execucao/total_destinos/total_enviados. ---

function getAdminNotifRotinas(modulo, { q, ativa, limit, offset } = {}) {
  return lovableGet('/api/public/internal/admin-notif-rotinas', { modulo, q, ativa, limit, offset });
}

function postAdminNotifRotina(modulo, body, actorId) {
  return lovablePost('/api/public/internal/admin-notif-rotinas', { modulo }, body, actorId);
}

function patchAdminNotifRotina(modulo, id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-notif-rotinas', { modulo, id }, body, actorId);
}

function deleteAdminNotifRotina(modulo, id, actorId) {
  return lovableDelete('/api/public/internal/admin-notif-rotinas', { modulo, id }, actorId);
}

function postAdminNotifRotinaExecutar(modulo, id, actorId) {
  return lovablePost('/api/public/internal/admin-notif-rotinas', { modulo, id, acao: 'executar' }, {}, actorId);
}

function getAdminNotifTemplates({ modulo, q, ativo } = {}) {
  return lovableGet('/api/public/internal/admin-notif-templates', { modulo, q, ativo });
}

function postAdminNotifTemplate(body, actorId) {
  return lovablePost('/api/public/internal/admin-notif-templates', {}, body, actorId);
}

function patchAdminNotifTemplate(id, body, actorId) {
  return lovablePatch('/api/public/internal/admin-notif-templates', { id }, body, actorId);
}

function deleteAdminNotifTemplate(id, actorId) {
  return lovableDelete('/api/public/internal/admin-notif-templates', { id }, actorId);
}

// --- Integrações: WhatsApp (tabela real wa_config, singleton) — confirmado
// pelo Lovable em 30/07/2026. Não está na allowlist genérica de leitura
// (tem api_token/meta_access_token/webhook_secret em claro), por isso rota
// dedicada própria. GET sem reveal vem mascarado; GET ?reveal=1 exige
// x-actor-id de um usuário master e devolve webhook_secret/webhook_url
// completos. "acao" (query string no POST) pode ser: testar,
// rotacionar-secret, sincronizar-templates, testar-template. ---

function getWaConfig({ reveal, actorId } = {}) {
  return lovableGet('/api/public/internal/wa-config', reveal ? { reveal: 1 } : {}, actorId);
}

function patchWaConfig(body, actorId) {
  return lovablePatch('/api/public/internal/wa-config', {}, body, actorId);
}

function postWaConfigAcao(acao, body, actorId) {
  return lovablePost('/api/public/internal/wa-config', { acao }, body ?? {}, actorId);
}

// --- Integrações: Google Meu Negócio (gmb_config singleton + gmb_locations
// + gmb_reviews + gmb_sync_runs) — confirmado pelo Lovable em 30/07/2026.
// Rota dedicada própria (gmb_config guarda refresh_token/access_token_cache,
// não está na allowlist genérica). GET devolve { status, locations,
// locations_count, sync_runs } — locations paginado (limit/offset, default
// 50, max 500), sync_runs embutido via "runs" (max 50). PATCH vincula/
// desvincula empresa AF de uma location (body { locationId, empresaId }).
// "acao" no POST pode ser: sincronizar, desconectar, account-name (body
// { accountName }).

function getGmb({ limit, offset, runs, actorId } = {}) {
  return lovableGet('/api/public/internal/gmb', { limit, offset, runs }, actorId);
}

function patchGmbLocation(body, actorId) {
  return lovablePatch('/api/public/internal/gmb', {}, body, actorId);
}

function postGmbAcao(acao, body, actorId) {
  return lovablePost('/api/public/internal/gmb', { acao }, body ?? {}, actorId);
}

// --- Integrações: Busca PF (Infosimples + Fonte Data) — endpoint confirmado
// pela Lovable em 30/07/2026. Não existe tabela de credenciais (tokens são
// secrets do backend deles: INFOSIMPLES_TOKEN, FONTEDATA_API_KEY) — só dá
// pra saber se está configurado via ?recurso=status. "recurso" no GET pode
// ser: status, historico, uso. "acao" no POST pode ser: testar (body vazio,
// params { provedor }), consultar (body { provedor, service, params }).

function getBuscaPf(params = {}, actorId) {
  return lovableGet('/api/public/internal/busca-pf', params, actorId);
}

function postBuscaPfAcao(acao, params = {}, body = {}, actorId) {
  return lovablePost('/api/public/internal/busca-pf', { acao, ...params }, body, actorId);
}

// --- Integrações: Jurídico — Datajud (CNJ). Endpoint confirmado pela Lovable
// em 03/08/2026: /api/public/internal/datajud (headers x-internal-secret +
// x-actor-id). "recurso" no GET pode ser: status, historico, uso. "acao" no
// POST pode ser: testar (sem body), consultar (body { tribunal, service,
// params: { numero_processo | classe | orgao, size }, cnpj_alvo? }). A
// própria Lovable consulta a API pública do CNJ e loga em adm_datajud_consultas
// — não chamamos o CNJ direto daqui.

function getDatajud(params = {}, actorId) {
  return lovableGet('/api/public/internal/datajud', params, actorId);
}

function postDatajudAcao(acao, params = {}, body = {}, actorId) {
  return lovablePost('/api/public/internal/datajud', { acao, ...params }, body, actorId);
}

// --- Integrações: Leva+ (fidelidade/cashback) — endpoint confirmado pela
// Lovable em 03/08/2026: /api/public/internal/leva-mais. Credenciais próprias
// (não são secret do backend deles) ficam em mk_integracoes (plataforma=
// 'fidelidade'), por isso tem PATCH de config aqui (igual ao wa-config).
// "recurso" no GET pode ser: status, lojas, frentistas, clientes, metricas,
// saldo. "acao" no POST pode ser: testar, transacao.

function getLevaMais(params = {}, actorId) {
  return lovableGet('/api/public/internal/leva-mais', params, actorId);
}

function postLevaMaisAcao(acao, params = {}, body = {}, actorId) {
  return lovablePost('/api/public/internal/leva-mais', { acao, ...params }, body, actorId);
}

function patchLevaMaisConfig(body, actorId) {
  return lovablePatch('/api/public/internal/leva-mais', {}, body, actorId);
}

// --- Integrações: Dashboard (2 RPCs Postgres SECURITY DEFINER, expostas pelo
// Lovable em 03/08/2026 pelo mesmo proxy interno — antes exigiam JWT real do
// usuário master via auth.uid(), agora tem versão _internal() só p/
// service_role). GET dashboard-performance sem params, chamado a cada 10s
// pelo app (mesmos campos que o site usa: db, conexoes, cache, top_tabelas,
// sessoes, volumes). GET dashboard-kpis?mes=&ano= (sem params = mês atual em
// America/Sao_Paulo; aceita 1-12 e 2000-2100) — snapshot, mes,
// serie_novos_colaboradores (sempre relativa a hoje, ignora mês selecionado),
// top_unidades (top 5) e db_size_bytes.

function getDashboardPerformance(actorId) {
  return lovableGet('/api/public/internal/dashboard-performance', {}, actorId);
}

function getDashboardKpis({ mes, ano, actorId } = {}) {
  return lovableGet('/api/public/internal/dashboard-kpis', { mes, ano }, actorId);
}

// --- Diretoria: painel de Vendas/Margem/Estoques/Métricas GNV — endpoint
// unificado confirmado pela Lovable em 04/08/2026:
// /api/public/internal/diretoria-vendas. "recurso" no GET pode ser:
// resumo|rede|margem|estoques|gnv|postos|periodo. "de"/"ate" (YYYY-MM-DD)
// filtram o período; sem eles vem o mês corrente até a última data com
// movimento. "posto" filtra por idq de posto (repetível/CSV; omitir ou
// posto=todos = rede inteira). Retorno: { recurso, de, ate, postos, dados }.
// Fontes por baixo: espelhos Quality no Postgres AF360 deles + metas/alertas
// (config_metas_margem, quality_alerta_custo) + API de relatórios GNV.
//
// Dois recursos extras confirmados pela Lovable em 18/08/2026, no mesmo
// endpoint:
// - recurso=lava-rapido: lavagens via ANPR (API pública api-placas.vercel.app
//   por trás — hoje só o posto Ceprano tem câmera). Valor derivado (carros ×
//   R$14,99). Só tem dado a partir de ontem. Params extras: placa, pagina,
//   porPagina (5-200, padrão 25). Retorno: { ..., dados: { resumo, porDia,
//   ultimas, historico, exportUrl } }.
// - recurso=estoque-parado: produtos parados (view vw_produtos_loja_parados,
//   fechamento Quality + compras - vendas, exclui tipo_produto='U'). Sem
//   período (foto atual) — de/ate não se aplicam aqui. Params extras: faixa
//   (todas|45_90|90_180|180_365|365), busca (nome/código do produto). Retorno:
//   { ..., resumo, postos: [{ posto_id, posto_nome, total_produtos,
//   media_dias_parado, estoque_estimado, produtos: [...] }] } (sem "dados"
//   por baixo, o payload já vem "achatado" nesse recurso).

function getDiretoriaVendas(
  { recurso, de, ate, posto, placa, pagina, porPagina, faixa, busca } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/diretoria-vendas',
    { recurso, de, ate, posto, placa, pagina, porPagina, faixa, busca },
    actorId
  );
}

// --- Autenticação: verificação em duas etapas (2FA) por e-mail — endpoints
// confirmados pela Lovable em 07/08/2026. Código de 6 dígitos, validade
// 10min, máx. 5 tentativas erradas, 1 reenvio a cada 30s, cada novo envio
// invalida o código anterior, código guardado só como hash do lado deles.
// Aceita "canal": "whatsapp"/"ambos" via Z-API no futuro, mas por ora só
// usamos e-mail (decisão da Rayanne em 07/08/2026, sem custo). ---

function postAuth2faEnviar(body) {
  return lovablePost('/api/public/internal/auth/2fa/enviar', {}, body);
}

function postAuth2faVerificar(body) {
  return lovablePost('/api/public/internal/auth/2fa/verificar', {}, body);
}

// --- Diretoria: Mapa de Processos (gst_processos + gst_processo_etapas) —
// endpoint confirmado pela Lovable em 04/08/2026: /api/public/internal/
// gst-processos. GET sem id = lista (aceita departamento, status, q); GET
// ?id= = detalhe (processo + etapas). Não devolve fluxograma_json na leitura
// de propósito. Escrita confirmada em 07/08/2026: RLS continua master-only,
// mas o endpoint interno (x-internal-secret + x-actor-id validado como
// master) permite criar/editar/excluir pelo app. status real: rascunho|
// ativo|em_revisao|descontinuado. etapas[] faz full replace (delete+insert)
// em gst_processo_etapas. blocos[] simplificado ({tipo,rotulo}) é convertido
// pela Lovable em fluxograma jsonb {nodes,edges}.

function getGstProcessos({ departamento, status, q, id } = {}, actorId) {
  return lovableGet('/api/public/internal/gst-processos', { departamento, status, q, id }, actorId);
}

function postGstProcesso(body, actorId) {
  return lovablePost('/api/public/internal/gst-processos', {}, body, actorId);
}

function patchGstProcesso(id, body, actorId) {
  return lovablePatch('/api/public/internal/gst-processos', { id }, body, actorId);
}

function deleteGstProcesso(id, actorId) {
  return lovableDelete('/api/public/internal/gst-processos', { id }, actorId);
}

// --- Colaborador: Reembolsos (tabela rh_reembolsos, endpoint confirmado pela
// Lovable em 03/08/2026). Enum rh_reembolso_status: rascunho | enviado |
// aprovado | pago | recusado. PATCH com status=aprovado/recusado preenche
// aprovado_por/aprovado_em automaticamente (a partir do x-actor-id); status=
// pago preenche pago_em. ---

function getRhReembolsos({ colaboradorId, status, limit, offset } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-reembolsos',
    { colaborador_id: colaboradorId, status, limit, offset },
    actorId
  );
}

function postRhReembolso(body, actorId) {
  return lovablePost('/api/public/internal/rh-reembolsos', {}, body, actorId);
}

function patchRhReembolso(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-reembolsos', { id }, body, actorId);
}

function deleteRhReembolso(id, actorId) {
  return lovableDelete('/api/public/internal/rh-reembolsos', { id }, actorId);
}

// --- Férias: escrita (tabela rh_ferias já tinha leitura via /table; agora a
// Lovable confirmou endpoint dedicado com POST/PATCH em 03/08/2026). Enum
// rh_ferias_status: programada | em_andamento | concluida | cancelada — não
// existe "aprovada/recusada" explícito (recusar = cancelada). ---

function getRhFerias({ colaboradorId, status } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-ferias', { colaborador_id: colaboradorId, status }, actorId);
}

function postRhFerias(body, actorId) {
  return lovablePost('/api/public/internal/rh-ferias', {}, body, actorId);
}

function patchRhFerias(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-ferias', { id }, body, actorId);
}

// --- Colaborador: Solicitações — escrita (tabelas rh_solicitacoes,
// rh_solicitacao_mensagens, rh_solicitacao_anexos; endpoint confirmado pela
// Lovable em 03/08/2026). GET sem id = lista; GET com id = detalhe (thread +
// anexos embutidos); GET com id + recurso=mensagens|anexos = só aquele
// sub-recurso. POST sem acao = cria solicitação (protocolo é gerado por
// trigger deles). POST com acao=mensagem/anexo = responde/anexa numa
// solicitação existente. PATCH = muda status/atribuido_a. ---

function getRhSolicitacoes({ colaboradorId, status, setor, id, recurso } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-solicitacoes',
    { colaborador_id: colaboradorId, status, setor, id, recurso },
    actorId
  );
}

function postRhSolicitacao(body, actorId) {
  return lovablePost('/api/public/internal/rh-solicitacoes', {}, body, actorId);
}

function postRhSolicitacaoMensagem(id, body, actorId) {
  return lovablePost('/api/public/internal/rh-solicitacoes', { id, acao: 'mensagem' }, body, actorId);
}

function postRhSolicitacaoAnexo(id, body, actorId) {
  return lovablePost('/api/public/internal/rh-solicitacoes', { id, acao: 'anexo' }, body, actorId);
}

function patchRhSolicitacao(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-solicitacoes', { id }, body, actorId);
}

// --- Colaborador/Liderança: Uniformes e EPI (tabelas rh_op_* — categorias,
// itens, tamanhos, kit por cargo, pedidos, itens do pedido, entregas,
// movimentações, cobranças, termos; endpoint confirmado pela Lovable em
// 03/08/2026). "recurso" no GET pode ser: kit, entregas, pedidos, itens.
// Aprovar/recusar usa PATCH ?id=&acao=; registrar entrega fecha o pedido
// como entregue. ---

// id/tipo/limit/offset adicionados em 20/08/2026 pra suportar a tela admin
// "Recursos Operacionais" (lista de pedidos por status/tipo com paginação) —
// mesma função, mesmos recursos de sempre (kit/entregas/pedidos/itens),
// só com mais filtros passados direto pro Lovable.
function getRhUniformes(
  { recurso, cargoId, colaboradorId, devolvido, status, tipo, id, limit, offset } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-uniformes',
    { recurso, cargo_id: cargoId, colaborador_id: colaboradorId, devolvido, status, tipo, id, limit, offset },
    actorId
  );
}

function postRhUniformePedido(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'pedido' }, body, actorId);
}

function patchRhUniformePedidoAprovar(id, actorId) {
  return lovablePatch('/api/public/internal/rh-uniformes', { id, acao: 'aprovar' }, {}, actorId);
}

function patchRhUniformePedidoRecusar(id, motivoRecusa, actorId) {
  return lovablePatch(
    '/api/public/internal/rh-uniformes',
    { id, acao: 'recusar' },
    { motivo_recusa: motivoRecusa },
    actorId
  );
}

function postRhUniformeEntrega(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'entrega' }, body, actorId);
}

// --- Calendário (rh_calendario_eventos; endpoint confirmado pela Lovable em
// 03/08/2026, CRUD completo). Sem colaborador_id = evento global (aparece pra
// todo mundo da empresa). GET por padrão já traz colaborador + globais
// (incluir_globais=1); ordenado por inicio_em asc. Enum rh_calendario_tipo:
// feriado | folga | escala | treinamento | reuniao | evento | outros. ---

function getRhCalendario(
  { colaboradorId, empresaId, tipo, de, ate, incluirGlobais, limit, offset } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-calendario',
    {
      colaborador_id: colaboradorId,
      empresa_id: empresaId,
      tipo,
      de,
      ate,
      incluir_globais: incluirGlobais === undefined ? undefined : incluirGlobais ? 1 : 0,
      limit,
      offset,
    },
    actorId
  );
}

function postRhCalendario(body, actorId) {
  return lovablePost('/api/public/internal/rh-calendario', {}, body, actorId);
}

function patchRhCalendario(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-calendario', { id }, body, actorId);
}

function deleteRhCalendario(id, actorId) {
  return lovableDelete('/api/public/internal/rh-calendario', { id }, actorId);
}

// --- Comunicados (rh_comunicados; endpoint dedicado /api/public/internal/
// rh-comunicados confirmado pela Lovable em 03/08/2026, mesmo padrão "recurso"
// dos outros — recurso=comunicados|leituras). anexo_url aceita imagem ou PDF.
// recurso=leituras faz upsert por comunicado_id+colaborador_id (marcar
// "lido"). ---

function getRhComunicados(
  { empresaId, grupoId, colaboradorId, publico, vigentes, limit, offset } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-comunicados',
    {
      recurso: 'comunicados',
      empresa_id: empresaId,
      grupo_id: grupoId,
      colaborador_id: colaboradorId,
      publico,
      vigentes: vigentes ? 1 : undefined,
      limit,
      offset,
    },
    actorId
  );
}

function postRhComunicado(body, actorId) {
  return lovablePost('/api/public/internal/rh-comunicados', { recurso: 'comunicados' }, body, actorId);
}

function patchRhComunicado(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-comunicados', { recurso: 'comunicados', id }, body, actorId);
}

function deleteRhComunicado(id, actorId) {
  return lovableDelete('/api/public/internal/rh-comunicados', { recurso: 'comunicados', id }, actorId);
}

function postRhComunicadoLeitura(comunicadoId, colaboradorId, actorId) {
  return lovablePost(
    '/api/public/internal/rh-comunicados',
    { recurso: 'leituras' },
    { comunicado_id: comunicadoId, colaborador_id: colaboradorId },
    actorId
  );
}

// Lista de quem já visualizou um comunicado ("olho" no painel do RH) — não
// existe um GET dedicado por "recurso=leituras" confirmado, então lê direto
// da tabela rh_comunicado_leituras pelo endpoint genérico /table (mesmo
// mecanismo já usado em rhDashboard.js pra filtrar leituras por
// colaborador_id — aqui só inverte o filtro pra comunicado_id). O nome/
// cargo/empresa de quem leu é resolvido no frontend, juntando com a lista
// de colaboradores/unidades que a tela já busca.
function getRhComunicadoLeituras(comunicadoId) {
  return fetchAllRows('rh_comunicado_leituras', {
    select: 'colaborador_id,lido_em',
    filters: { comunicado_id: comunicadoId },
  });
}

// --- Importar PDF (rh_pdf_imports) — tabela liberada no allowlist da
// Lovable desde 21/07/2026 (ver LOVABLE_API.md §6.6), leitura pelo endpoint
// genérico /table. Escrita (upload+IA, aplicar admissão/desligamento,
// excluir, reprocessar) confirmada pela Lovable em 12/08/2026:
// /api/public/internal/rh-pdf-import. ---
function getRhPdfImports({ status, tipo } = {}) {
  return fetchAllRows('rh_pdf_imports', {
    select:
      'id,arquivo_nome,arquivo_path,arquivo_mime,tipo,status,confianca,cpf_extraido,nome_extraido,colaborador_id,erro,aplicado_em,aplicado_por,created_at',
    order: 'created_at:desc',
    filters: { tipo, status },
  });
}

// Upload + disparo da extração por IA. Body em JSON (mesmo padrão de
// rh-documento-upload/rh-comunicado-upload): { nome_arquivo, arquivo_base64,
// mime_type } para um arquivo só, ou { arquivos: [...] } para vários.
// Query processar=0 cria as linhas só como "pendente" sem rodar a IA agora
// (fica pra rodar depois via reprocessar); sem isso, processa na hora e já
// devolve status "pronto"/"erro". Resposta: { itens: [linha completa],
// erros: [{arquivo, error}] }.
function postRhPdfImportUpload(body, { processar } = {}, actorId) {
  return lovablePost(
    '/api/public/internal/rh-pdf-import',
    processar === false ? { processar: 0 } : {},
    body,
    actorId
  );
}

// GET ?id= — usado pra polling (status ainda pendente/processando) e pra
// pegar a URL assinada (1h) do arquivo original.
function getRhPdfImportDetalhe(id, actorId) {
  return lovableGet('/api/public/internal/rh-pdf-import', { id }, actorId);
}

function deleteRhPdfImport(id, actorId) {
  return lovableDelete('/api/public/internal/rh-pdf-import', { id }, actorId);
}

// body opcional sobrescreve a extração revisada: { pessoa, contrato,
// bancarios, empresa_id }. Cria o colaborador (mesmo contrato de
// postRhColaborador) e marca a linha como aplicado (aplicado_em/
// aplicado_por/resultado_aplicacao). 409 se CPF já cadastrado ou já
// aplicado; 422 se CPF inválido.
function postRhPdfImportAplicarAdmissao(id, body, actorId) {
  return lovablePost(`/api/public/internal/rh-pdf-import/${id}/aplicar-admissao`, {}, body ?? {}, actorId);
}

// body opcional: { colaborador_id?, cpf?, data_demissao?, motivo?,
// valor_rescisao_liquida? }. Marca rh_colaboradores.status="desligado" +
// data_demissao/motivo_desligamento e marca a linha de rh_pdf_imports como
// aplicado igual ao de admissão.
function postRhPdfImportAplicarDesligamento(id, body, actorId) {
  return lovablePost(`/api/public/internal/rh-pdf-import/${id}/aplicar-desligamento`, {}, body ?? {}, actorId);
}

// Volta uma linha com status "erro" pra "processando" e tenta a extração
// de novo.
function postRhPdfImportReprocessar(id, actorId) {
  return lovablePost(`/api/public/internal/rh-pdf-import/${id}/reprocessar`, {}, {}, actorId);
}

// --- Treinamentos: conteúdo real (rh_treinamentos, rh_treinamento_aulas,
// rh_treinamento_questoes, rh_treinamento_inscricoes, rh_treinamento_
// respostas; GET confirmado pela Lovable em 03/08/2026 via "recurso"). Sem
// incluir_gabarito=1 o GET de questoes NÃO traz correta/explicacao — use
// incluir_gabarito só no painel do RH, nunca pro colaborador.
//
// Escrita confirmada em 03/08/2026:
// - POST recurso=respostas: registra 1 resposta ({inscricao_id, questao_id,
//   resposta, tempo_ms, tentativa?}); acertou é calculado no servidor.
// - POST recurso=prova (fluxo completo, preferir este): {inscricao_id,
//   respostas:[{questao_id,resposta,tempo_ms}], tempo_gasto_min?}; incrementa
//   tentativas, grava respostas corrigidas, calcula nota e já atualiza a
//   inscrição (concluido+concluido_em se aprovado, senão continua
//   em_andamento). Retorna {data: inscricao, resultado: {acertos, total,
//   nota, prova_min_acerto, aprovado, tentativa}}.
// - PATCH recurso=inscricoes&id=: pra progresso de aula (status, iniciado_em,
//   tempo_gasto_min, certificado_url).
//
// Progresso por aula (rh_treinamento_progresso — UNIQUE em inscricao_id+
// aula_id — confirmado pela Lovable em 19/08/2026):
// - GET recurso=progresso-aulas&inscricaoId=&aulaId=: linhas cruas de
//   progresso (segundos_assistidos, segundos_max, duracao_segundos,
//   concluida, iniciado_em, ultimo_acesso_em). aulaId é opcional (filtra 1
//   aula); sem ele, traz todas as aulas da inscrição.
// - GET recurso=aulas&treinamentoId=&inscricaoId=: as aulas já vêm com o
//   campo "progresso" (objeto ou null) embutido — melhor forma pra tela de
//   detalhe da aula.
// - POST recurso=progresso-aula (aliases: progresso, progresso-aulas):
//   upsert por (inscricao_id, aula_id). Body: {inscricao_id, aula_id,
//   posicao_atual_seg, duracao_total_seg, concluida?, ultima_visualizacao?}
//   (aceita também os aliases segundos_assistidos/duracao_segundos/
//   ultimo_acesso_em). O servidor mantém segundos_max monotônico (nunca
//   "volta" o progresso), nunca desmarca concluida, e marca concluida
//   automaticamente ao chegar perto do fim (tolerância de 2s). Retorna
//   {data, percentual}. ---

function getRhTreinamentos(
  { recurso, treinamentoId, colaboradorId, inscricaoId, aulaId, status, ativo, incluirGabarito } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-treinamentos',
    {
      recurso,
      treinamento_id: treinamentoId,
      colaborador_id: colaboradorId,
      inscricao_id: inscricaoId,
      aula_id: aulaId,
      status,
      ativo,
      incluir_gabarito: incluirGabarito ? 1 : undefined,
    },
    actorId
  );
}

function postRhTreinamentoResposta(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'respostas' }, body, actorId);
}

function postRhTreinamentoProva(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'prova' }, body, actorId);
}

function patchRhTreinamentoInscricao(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-treinamentos', { recurso: 'inscricoes', id }, body, actorId);
}

// Upsert de progresso por aula (posição assistida, se concluiu, último acesso).
function postRhTreinamentoProgressoAula(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'progresso-aula' }, body, actorId);
}

// Leitura crua de progresso por aula (alternativa ao "progresso" embutido em
// recurso=aulas) — útil quando só se tem a inscrição, sem recarregar aulas.
function getRhTreinamentoProgressoAulas({ inscricaoId, aulaId } = {}, actorId) {
  return getRhTreinamentos({ recurso: 'progresso-aulas', inscricaoId, aulaId }, actorId);
}

// --- Treinamentos (RH/admin): CRUD de treinamento/aulas/questões,
// atribuição em massa e respostas agregadas — confirmado pela Lovable em
// 20/08/2026, mesmo endpoint /api/public/internal/rh-treinamentos.

function postRhTreinamento(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'treinamentos' }, body, actorId);
}
function patchRhTreinamento(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-treinamentos', { recurso: 'treinamentos', id }, body, actorId);
}
function deleteRhTreinamento(id, actorId) {
  return lovableDelete('/api/public/internal/rh-treinamentos', { recurso: 'treinamentos', id }, actorId);
}

function postRhTreinamentoAula(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'aulas' }, body, actorId);
}
function patchRhTreinamentoAula(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-treinamentos', { recurso: 'aulas', id }, body, actorId);
}
function deleteRhTreinamentoAula(id, actorId) {
  return lovableDelete('/api/public/internal/rh-treinamentos', { recurso: 'aulas', id }, actorId);
}

// Body: { filename, treinamento_id? } → { bucket, path, signed_url, token, video_url, video_storage_path }
function postRhTreinamentoVideoUploadUrl(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'video-upload-url' }, body, actorId);
}

function postRhTreinamentoQuestao(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'questoes' }, body, actorId);
}
function patchRhTreinamentoQuestao(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-treinamentos', { recurso: 'questoes', id }, body, actorId);
}
function deleteRhTreinamentoQuestao(id, actorId) {
  return lovableDelete('/api/public/internal/rh-treinamentos', { recurso: 'questoes', id }, actorId);
}

// Body: { treinamento_id, tipo, cargos?, grupos?, colaboradores?, inscrever? } → { data, inscritos }
function postRhTreinamentoAtribuir(body, actorId) {
  return lovablePost('/api/public/internal/rh-treinamentos', { recurso: 'atribuir' }, body, actorId);
}

// --- Metas de RH (rh_metas) — endpoint confirmado pela Lovable em
// 19/08/2026: /api/public/internal/rh-metas (mesma auth: x-internal-secret +
// x-actor-id).
//
// GET ?busca=&status=&medicao=&colaboradorId=&empresaId=&limit=&offset=
// Retorna { data, count, resumo: { total, abertas, atingidas, automaticas } }
// — resumo é sempre da rede toda, independente dos filtros aplicados. Cada
// linha já vem com percentual, colaborador_nome, colaboradores_nomes,
// empresa_nome, empresas_nomes prontos (sem precisar de join extra).
//
// Escrita:
// - POST: cria (obrigatórios titulo, periodo_inicio, periodo_fim, meta_alvo;
//   default medicao=manual, status=aberta). Aceita publico (todos|empresa|
//   grupo|cargo|colaborador) + os arrays empresa_ids/grupo_ids/cargo_ids/
//   colaborador_ids conforme o escopo, e medicao=automatica exige fonte_auto
//   (faturamento|cupons|litros_total|litros_gasolina|litros_etanol|
//   litros_diesel|litros_gnv).
// - PATCH ?id=: edita; mandar só { resultado } cobre "Atualizar resultado" e
//   já grava resultado_atualizado_em no servidor.
// - DELETE ?id=: exclui.
//
// Recalcular automáticas: POST ?recurso=recalcular (opcional &id=<metaId>)
// — retorna { total, atualizadas }; sob demanda (sem cron), lê o espelho
// Quality no período/escopo da meta e reavalia status quando o período já
// fechou.

function getRhMetas(
  { busca, status, medicao, colaboradorId, empresaId, limit, offset } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-metas',
    { busca, status, medicao, colaboradorId, empresaId, limit, offset },
    actorId
  );
}

function postRhMeta(body, actorId) {
  return lovablePost('/api/public/internal/rh-metas', {}, body, actorId);
}

function patchRhMeta(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-metas', { id }, body, actorId);
}

function deleteRhMeta(id, actorId) {
  return lovableDelete('/api/public/internal/rh-metas', { id }, actorId);
}

function postRhMetasRecalcular(metaId, actorId) {
  return lovablePost('/api/public/internal/rh-metas', { recurso: 'recalcular', id: metaId }, {}, actorId);
}

// --- Jornadas (rh_jornadas) — endpoint confirmado pela Lovable em
// 19/08/2026: /api/public/internal/rh-jornadas (mesma auth: x-internal-
// secret + x-actor-id). empresa_id nulo = jornada global ("Todas as
// empresas"). regime é enum fechado (rh_regime_jornada): 44h|40h|36h|30h|
// 12x36|escala.
//
// GET ?empresa_id=&ativo=true|false&busca=&limit=&offset= — retorna
// {data, count, regimes}; passar empresa_id também traz as jornadas globais
// (empresa_id null) junto com as da empresa. Cada linha já vem com
// empresas(id, razao_social, nome_fantasia, apelido) embutido.
// POST: cria (valida entrada/saida HH:MM, regime no enum, intervalo 0-600).
// PATCH ?id=: edita; toggle ativa/inativa é só {ativo: false/true}.
// DELETE ?id=: exclusão real — retorna 409 se tiver colaborador vinculado
// (rh_colaboradores.jornada_id); nesse caso, inativar em vez de excluir.
//
// Ligação: rh_colaboradores.jornada_id (FK nullable pra rh_jornadas.id).

function getRhJornadas({ empresaId, ativo, busca, limit, offset } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-jornadas',
    { empresa_id: empresaId, ativo, busca, limit, offset },
    actorId
  );
}

function postRhJornada(body, actorId) {
  return lovablePost('/api/public/internal/rh-jornadas', {}, body, actorId);
}

function patchRhJornada(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-jornadas', { id }, body, actorId);
}

function deleteRhJornada(id, actorId) {
  return lovableDelete('/api/public/internal/rh-jornadas', { id }, actorId);
}

// --- Período de Experiência (rh_experiencia_avaliacoes) — endpoint
// confirmado pela Lovable em 19/08/2026: /api/public/internal/rh-experiencia
// (mesma auth: x-internal-secret + x-actor-id). Não existe tabela de
// "etapas": as etapas (1ª=45d / 2ª=90d) são derivadas de
// rh_colaboradores.data_admissao pelo próprio endpoint; o que é persistido
// são as decisões (aprovado/nao_aprovado) em rh_experiencia_avaliacoes.
//
// GET ?recurso=lista&busca=&empresa_id=&limit=&offset= — retorna
// { hoje, total, paginas, data: [{ colaborador_id, nome_completo, matricula,
// cargo, setor, data_admissao, empresa, etapa, etapa_label, vencimento,
// dias_restantes, urgencia, primeira_avaliacao }] }. urgencia: vencido|
// critico|atencao|ok|tranquilo. Busca cobre nome, matrícula e cargo.
// GET ?recurso=historico&colaboradorId= — avaliações já lançadas p/ o
// colaborador (ícone de histórico, só leitura).
// POST { colaborador_id, etapa, decisao, justificativa, desligar?,
// vencimento? } — registra a decisão; reprovar com desligar=true dispara
// trigger deles que desliga o colaborador de verdade (status='desligado' +
// data_demissao). vencimento é calculado do lado deles se omitido.
// DELETE ?id= — desfaz uma decisão lançada por engano; NÃO reverte um
// desligamento já efetivado (aviso vem no corpo da resposta deles).

function getRhExperienciaLista({ busca, empresaId, limit, offset } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-experiencia',
    { recurso: 'lista', busca, empresa_id: empresaId, limit, offset },
    actorId
  );
}

function getRhExperienciaHistorico(colaboradorId, actorId) {
  return lovableGet(
    '/api/public/internal/rh-experiencia',
    { recurso: 'historico', colaboradorId },
    actorId
  );
}

function postRhExperienciaAvaliacao(body, actorId) {
  return lovablePost('/api/public/internal/rh-experiencia', {}, body, actorId);
}

function deleteRhExperienciaAvaliacao(id, actorId) {
  return lovableDelete('/api/public/internal/rh-experiencia', { id }, actorId);
}

// --- Folha de Pagamento (rh_folha_competencias + rh_folha + rh_rubricas +
// rh_folha_lancamentos + rh_ponto_apuracao + rh_folha_auditoria) — endpoint
// unificado confirmado pela Lovable em 19/08/2026:
// /api/public/internal/rh-folha (mesma auth: x-internal-secret +
// x-actor-id). INSS/IRRF são calculados 100% do lado deles (RPC
// calcular_folha, lendo rh_tabela_inss/rh_tabela_irrf) — nunca replicar
// tabela de alíquotas aqui. status da competência (rh_folha_status) tem 5
// valores (aberta|em_calculo|fechada|paga|cancelada), mas a UI só trata
// aberta/em_calculo como "aberta" e o resto como "fechada".
//
// recurso=competencias&ano=&status=  — lista + totais.
// recurso=competencia&id=            — competência + colaboradores ativos +
//   folhas + resumo.
// recurso=detalhe&competenciaId=&colaboradorId= — folha, lançamentos (com
//   rubrica), catálogo de rubricas ativas, ponto e dados salariais + histórico.
// recurso=historico&competenciaId=|folhaId=|colaboradorId= — auditoria.

function getRhFolhaCompetencias({ ano, status } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-folha', { recurso: 'competencias', ano, status }, actorId);
}

function getRhFolhaCompetencia(id, actorId) {
  return lovableGet('/api/public/internal/rh-folha', { recurso: 'competencia', id }, actorId);
}

function getRhFolhaDetalheColaborador({ competenciaId, colaboradorId } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-folha',
    { recurso: 'detalhe', competenciaId, colaboradorId },
    actorId
  );
}

function getRhFolhaHistorico({ competenciaId, folhaId, colaboradorId } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-folha',
    { recurso: 'historico', competenciaId, folhaId, colaboradorId },
    actorId
  );
}

// Body: { mes, ano, data_pagamento? }. 409 se já existir o mês/ano.
function postRhFolhaCompetencia(body, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'competencia' }, body, actorId);
}

// Body: { competencia_id, colaborador_id? }. Sem colaborador_id roda todos os
// ativos com salário > 0 (recalcula quem já tinha sido calculado também).
// Retorna {total, calculados, erros[]}. 409 se a competência estiver fechada.
function postRhFolhaCalcular(body, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'calcular' }, body, actorId);
}

// Body: { competencia_id }. Exige >=1 folha calculada.
function postRhFolhaFechar(competenciaId, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'fechar' }, { competencia_id: competenciaId }, actorId);
}

function postRhFolhaReabrir(competenciaId, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'reabrir' }, { competencia_id: competenciaId }, actorId);
}

// Só depois de fechada — marca status_envio='enviado' + data_envio em cada
// rh_folha ainda nao_enviado (libera o holerite no portal do colaborador).
function postRhFolhaEnviarContracheques(competenciaId, actorId) {
  return lovablePost(
    '/api/public/internal/rh-folha',
    { recurso: 'enviar-contracheques' },
    { competencia_id: competenciaId },
    actorId
  );
}

// Body: { competencia_id, colaborador_id (ou folha_id), rubrica_id, valor,
// observacao?, referencia? }. Exige folha já calculada.
function postRhFolhaLancamento(body, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'lancamento' }, body, actorId);
}

// Só remove lançamentos manuais (origem='manual').
function deleteRhFolhaLancamento(id, actorId) {
  return lovableDelete('/api/public/internal/rh-folha', { recurso: 'lancamento', id }, actorId);
}

// Upsert da apuração de ponto da competência (rh_ponto_apuracao). Body:
// { competencia_id, colaborador_id, horas_trabalhadas?, he_50?, he_100?,
// faltas_dias?, dsr_perdido_dias?, adicional_noturno_horas? }. Precisa
// recalcular depois pra refletir na folha.
function postRhFolhaPonto(body, actorId) {
  return lovablePost('/api/public/internal/rh-folha', { recurso: 'ponto' }, body, actorId);
}

// Edita data/observação/status da competência.
function patchRhFolhaCompetencia(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-folha', { recurso: 'competencia', id }, body, actorId);
}

// Body: { salario_base, dependentes_irrf } — grava rh_salario_historico
// automaticamente quando o salário muda.
function patchRhFolhaSalario(colaboradorId, body, actorId) {
  return lovablePatch('/api/public/internal/rh-folha', { recurso: 'salario', colaboradorId }, body, actorId);
}

// Exclusão real em cascata (folhas, lançamentos, ponto); bloqueada só se
// status='paga'.
function deleteRhFolhaCompetencia(id, actorId) {
  return lovableDelete('/api/public/internal/rh-folha', { recurso: 'competencia', id }, actorId);
}

// --- RH: Recursos Operacionais — parte ADMIN (cobranças, estoque,
// itens & grade com escrita, kit com escrita, termo de responsabilidade)
// da mesma tabela rh_op_* usada acima pelo fluxo colaborador/liderança.
// Contrato estendido confirmado pela Lovable em 20/08/2026, mesmo endpoint
// (/api/public/internal/rh-uniformes). Leituras de pedidos/kit/entregas/itens
// continuam pela função getRhUniformes() genérica acima — as funções abaixo
// cobrem só os recursos/ações que não existiam antes: cobrancas, estoque,
// movimentacoes, categorias, escrita de item/tamanho/kit, termo.

function getRhUniformesCobrancas({ status, colaboradorId } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-uniformes',
    { recurso: 'cobrancas', status, colaborador_id: colaboradorId },
    actorId
  );
}

// Body: { colaborador_id, pedido_id?, pedido_item_id?, valor, descricao, competencia? }
function postRhUniformeCobranca(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'cobranca' }, body, actorId);
}

// Body: { status } (lancada|cancelada) — cancelar exige motivo_cancelamento no body.
function patchRhUniformeCobranca(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-uniformes', { recurso: 'cobranca', id }, body, actorId);
}

function deleteRhUniformeCobranca(id, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'cobranca', id }, actorId);
}

function getRhUniformesEstoque(actorId) {
  return lovableGet('/api/public/internal/rh-uniformes', { recurso: 'estoque' }, actorId);
}

function getRhUniformesMovimentacoes({ itemId, limit } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-uniformes', { recurso: 'movimentacoes', item_id: itemId, limit }, actorId);
}

// Body: { item_id, tamanho?, tipo (entrada|saida|ajuste|devolucao), quantidade, pedido_id?, motivo? }
function postRhUniformeMovimentacao(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'movimentacao' }, body, actorId);
}

function deleteRhUniformeMovimentacao(id, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'movimentacao', id }, actorId);
}

function getRhUniformesCategorias(actorId) {
  return lovableGet('/api/public/internal/rh-uniformes', { recurso: 'categorias' }, actorId);
}

// Body: { categoria_id, nome, descricao?, possui_grade, unidade?, prazo_troca_meses?,
// faixa_gerente_pct?, valor_unit?, tamanhos?: ["P","M","G"] }
function postRhUniformeItem(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'item' }, body, actorId);
}

// Body: { item_id, tamanho, ordem? }
function postRhUniformeTamanho(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'tamanho' }, body, actorId);
}

function patchRhUniformeItem(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-uniformes', { recurso: 'item', id }, body, actorId);
}

function patchRhUniformeTamanho(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-uniformes', { recurso: 'tamanho', id }, body, actorId);
}

function deleteRhUniformeItem(id, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'item', id }, actorId);
}

function deleteRhUniformeTamanho(id, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'tamanho', id }, actorId);
}

// Body: { cargo_id, itens: [{item_id, quantidade}] } — substitui o kit inteiro.
function postRhUniformeKitCargo(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'kit' }, body, actorId);
}

function deleteRhUniformeKitItem(id, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'kit', id }, actorId);
}

function deleteRhUniformeKitCargo(cargoId, actorId) {
  return lovableDelete('/api/public/internal/rh-uniformes', { recurso: 'kit-cargo', cargo_id: cargoId }, actorId);
}

// Versão ativa do termo de responsabilidade.
function getRhUniformeTermo(actorId) {
  return lovableGet('/api/public/internal/rh-uniformes', { recurso: 'termo' }, actorId);
}

function getRhUniformeTermos(actorId) {
  return lovableGet('/api/public/internal/rh-uniformes', { recurso: 'termos' }, actorId);
}

// Body: { titulo, conteudo } — cria versão nova e desativa a anterior.
function postRhUniformeTermo(body, actorId) {
  return lovablePost('/api/public/internal/rh-uniformes', { acao: 'termo' }, body, actorId);
}

// --- Workflow (Hierarquia por Posto + Fluxos de Aprovação) — proxy fino
// pro endpoint unificado confirmado pela Lovable em 20/08/2026
// (/api/public/internal/rh-workflow). "Postos" = empresas com tipo='Posto';
// liderança fica em rh_posto_lideranca; troca de líder grava histórico em
// rh_hierarquia_historico e recalcula gestor_direto_id/gestor_geral_id do
// lado deles — nunca aqui.

function getRhWorkflowPostos({ busca, filtro } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-workflow', { recurso: 'postos', busca, filtro }, actorId);
}

function getRhWorkflowLideranca(postoId, actorId) {
  return lovableGet('/api/public/internal/rh-workflow', { recurso: 'lideranca', posto_id: postoId }, actorId);
}

function getRhWorkflowHistorico({ postoId, colaboradorId } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-workflow',
    { recurso: 'historico', posto_id: postoId, colaborador_id: colaboradorId },
    actorId
  );
}

function getRhWorkflowColaboradores(actorId) {
  return lovableGet('/api/public/internal/rh-workflow', { recurso: 'colaboradores' }, actorId);
}

function getRhWorkflowFluxos({ id } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-workflow', { recurso: 'fluxos', id }, actorId);
}

function getRhWorkflowInstancias(params = {}, actorId) {
  return lovableGet('/api/public/internal/rh-workflow', { recurso: 'instancias', ...params }, actorId);
}

// Body: { posto_id, colaborador_id, tipo_lideranca, data_inicio, substituir? }
function postRhWorkflowAtribuir(body, actorId) {
  return lovablePost('/api/public/internal/rh-workflow', { acao: 'atribuir' }, body, actorId);
}

// Body: { id, data_fim, motivo }
function postRhWorkflowEncerrar(body, actorId) {
  return lovablePost('/api/public/internal/rh-workflow', { acao: 'encerrar' }, body, actorId);
}

// Body: { id, posto_destino_id }
function postRhWorkflowTransferir(body, actorId) {
  return lovablePost('/api/public/internal/rh-workflow', { acao: 'transferir' }, body, actorId);
}

function postRhWorkflowRecalcular(actorId) {
  return lovablePost('/api/public/internal/rh-workflow', { acao: 'recalcular' }, {}, actorId);
}

function postRhWorkflowFluxo(body, actorId) {
  return lovablePost('/api/public/internal/rh-workflow', { acao: 'fluxo' }, body, actorId);
}

function patchRhWorkflowLideranca(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-workflow', { recurso: 'lideranca', id }, body, actorId);
}

function deleteRhWorkflowLideranca(id, actorId) {
  return lovableDelete('/api/public/internal/rh-workflow', { recurso: 'lideranca', id }, actorId);
}

function patchRhWorkflowFluxo(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-workflow', { recurso: 'fluxo', id }, body, actorId);
}

function deleteRhWorkflowFluxo(id, actorId) {
  return lovableDelete('/api/public/internal/rh-workflow', { recurso: 'fluxo', id }, actorId);
}

// --- Relatórios: Reincidência/Recontratação — endpoint criado pela
// Lovable em 20/08/2026 (/api/public/internal/rh-relatorios). Cálculo real
// feito no servidor (cruza rh_colaboradores + rh_historico_contratacoes +
// empresas) — nunca refazer essa conta aqui.

function getRhRelatorioReincidencia({ periodo, ano, mes, dataIni, dataFim, tipo } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-relatorios',
    { recurso: 'reincidencia', periodo, ano, mes, dataIni, dataFim, tipo },
    actorId
  );
}

// --- Configurações: Cargos/Setores/Rubricas/Tabela INSS/Tabela IRRF/
// Salário Mínimo/Parâmetros/Reajustes — endpoint unificado confirmado pela
// Lovable em 20/08/2026 (/api/public/internal/rh-config). Reajuste tem 2
// passos (POST cria rascunho status=pendente; POST ?acao=aplicar executa e
// grava em rh_salario_historico/rh_historico_beneficios do lado deles).

function getRhConfigCargos({ ativo, busca } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'cargos', ativo, busca }, actorId);
}
function postRhConfigCargo(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'cargos' }, body, actorId);
}
function patchRhConfigCargo(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'cargos', id }, body, actorId);
}

function getRhConfigSetores({ ativo, busca } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'setores', ativo, busca }, actorId);
}
function postRhConfigSetor(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'setores' }, body, actorId);
}
function patchRhConfigSetor(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'setores', id }, body, actorId);
}

function getRhConfigRubricas({ ativo, tipo } = {}, actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'rubricas', ativo, tipo }, actorId);
}
function postRhConfigRubrica(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'rubricas' }, body, actorId);
}
function patchRhConfigRubrica(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'rubricas', id }, body, actorId);
}
function deleteRhConfigRubrica(id, actorId) {
  return lovableDelete('/api/public/internal/rh-config', { recurso: 'rubricas', id }, actorId);
}

function getRhConfigTabelaInss(actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'inss' }, actorId);
}
function postRhConfigTabelaInss(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'inss' }, body, actorId);
}
function patchRhConfigFaixaInss(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'inss', id }, body, actorId);
}

function getRhConfigTabelaIrrf(actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'irrf' }, actorId);
}
function postRhConfigTabelaIrrf(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'irrf' }, body, actorId);
}
function patchRhConfigFaixaIrrf(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'irrf', id }, body, actorId);
}

function getRhConfigSalarioMinimo(actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'salario-minimo' }, actorId);
}
function postRhConfigSalarioMinimo(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'salario-minimo' }, body, actorId);
}

function getRhConfigParametros(actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'parametros' }, actorId);
}
function patchRhConfigParametro(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'parametros', id }, body, actorId);
}

function getRhConfigReajustes(actorId) {
  return lovableGet('/api/public/internal/rh-config', { recurso: 'reajustes' }, actorId);
}
function postRhConfigReajuste(body, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'reajustes' }, body, actorId);
}
function patchRhConfigReajuste(id, body, actorId) {
  return lovablePatch('/api/public/internal/rh-config', { recurso: 'reajustes', id }, body, actorId);
}
function deleteRhConfigReajuste(id, actorId) {
  return lovableDelete('/api/public/internal/rh-config', { recurso: 'reajustes', id }, actorId);
}
function postRhConfigReajusteAplicar(id, actorId) {
  return lovablePost('/api/public/internal/rh-config', { recurso: 'reajustes', acao: 'aplicar', id }, {}, actorId);
}

// --- Financeiro (Gestão de Caixa) — endpoint confirmado pela Lovable em
// 21/08/2026: /api/public/internal/financeiro (mesma auth: x-internal-secret
// + x-actor-id). Importante: NÃO existe nenhuma tabela rf_* — o módulo é 99%
// read-through da API Quality em tempo real (cache em memória do lado
// deles). Só 4 coisas ficam de fato no banco: fin_dre_chaves (postos/chave
// da integração — não é rh_unidades), fin_conciliacoes (vínculo
// movimento↔título gravado manualmente ou automático), fin_ia_predicoes/
// fin_ia_feedback/fin_ia_regras/fin_ia_historico (Inteligência IA) e
// fin_notificacoes (mesmo padrão de notificações de RH/Diretoria, só que
// tabela própria do módulo).

function getFinanceiroDashboard(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'dashboard', ...params }, actorId);
}

// params: { tipo: 'pagar'|'receber', periodo, dataIni, dataFim, posto (empresaCodigo), busca, ultimoCodigo }
// Paginado pela Quality via ultimoCodigo (não é offset/limit tradicional).
function getFinanceiroContas(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'contas', ...params }, actorId);
}

function getFinanceiroFluxoCaixa(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'fluxo-caixa', ...params }, actorId);
}

// GET conciliacao: movimentos brutos (MOVIMENTO_CONTA) + sugestão calculada
// em runtime (não gravada) + o que já está em fin_conciliacoes.
function getFinanceiroConciliacao(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'conciliacao', ...params }, actorId);
}

// Upsert em fin_conciliacoes por movimento_codigo (vincular manualmente).
function postFinanceiroConciliar(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'conciliar' }, body, actorId);
}

// Desvincular = DELETE por movimento_codigo.
function deleteFinanceiroConciliar(movimentoCodigo, actorId) {
  return lovableDelete('/api/public/internal/financeiro', { recurso: 'conciliar', movimentoCodigo }, actorId);
}

// Confirmado pela Lovable em 21/08/2026 (2ª rodada): "desconciliar" é uma
// AÇÃO via POST (não DELETE), igual conciliar/ia-responder/ia-reanalisar.
function postFinanceiroDesconciliar(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'desconciliar' }, body, actorId);
}

// Lista de títulos (pagar/receber) em aberto pra vincular manualmente a um
// movimento — recurso novo confirmado em 21/08/2026.
function getFinanceiroTitulosConciliar(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'titulos-conciliar', ...params }, actorId);
}

// params: { empresaCodigo(s)/filiais, dataInicial, dataFinal, apuracaoCaixa }
function getFinanceiroBalancete(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'balancete', ...params }, actorId);
}

function getFinanceiroFornecedores(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'fornecedores', ...params }, actorId);
}

// Lista global (sem posto) — só leitura, cadastro fica no Quality.
function getFinanceiroCentrosCusto(actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'centros-custo' }, actorId);
}

function getFinanceiroContasBancarias(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'contas-bancarias', ...params }, actorId);
}

// fin_ia_predicoes — status pendente|confirmado|rejeitado|suprimido.
function getFinanceiroIaPredicoes(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'ia-predicoes', ...params }, actorId);
}

// body: { predicao_id, resposta: 'sim'|'nao', justificativa? } — grava em
// fin_ia_feedback e muda o status da predição (NUNCA cria título nenhum).
function postFinanceiroIaResponder(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'ia-responder' }, body, actorId);
}

// Dispara a mesma geração do cron (fin-ia-sync) sob demanda.
function postFinanceiroIaReanalisar(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'ia-reanalisar' }, body, actorId);
}

// params: { unidadeIds, horizonteMeses (3-12), mesesHistorico (3-12) }
function getFinanceiroProjecoes(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'projecoes', ...params }, actorId);
}

// params: { tipo: 'contas'|'conciliacoes'|'fornecedores'|'centros-custo', posto, dataIni, dataFim }
function getFinanceiroRelatorio(params, actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'relatorio', ...params }, actorId);
}

// fin_dre_chaves (chave mascarada + postos vinculados). Escrita confirmada
// pela Lovable em 21/08/2026: config-chave (salvar chave global da rede),
// config-testar (chamada real na Quality com a chave salva), config-posto
// (criar/editar/excluir posto — herda a chave global automaticamente).
function getFinanceiroConfig(actorId) {
  return lovableGet('/api/public/internal/financeiro', { recurso: 'config' }, actorId);
}

function postFinanceiroConfigChave(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'config-chave' }, body, actorId);
}

function postFinanceiroConfigTestar(actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'config-testar' }, {}, actorId);
}

function postFinanceiroConfigPosto(body, actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'config-posto' }, body, actorId);
}

function patchFinanceiroConfigPosto(id, body, actorId) {
  return lovablePatch('/api/public/internal/financeiro', { recurso: 'config-posto', id }, body, actorId);
}

function deleteFinanceiroConfigPosto(id, actorId) {
  return lovableDelete('/api/public/internal/financeiro', { recurso: 'config-posto', id }, actorId);
}

function postFinanceiroConfigLimparCache(actorId) {
  return lovablePost('/api/public/internal/financeiro', { recurso: 'config-limpar-cache' }, {}, actorId);
}

// --- Gestão (painel de Vendas/Abastecimento/Margem/Encerrante da rede,
// espelho do painel web "Gestão") — endpoint confirmado pela Lovable em
// 28/08/2026: /api/public/internal/gestao (mesma auth: x-internal-secret +
// x-actor-id). Query params comuns: dataInicial, dataFinal (YYYY-MM-DD),
// postoIds (csv de idq; vazio = consolidado). "recurso" pode ser: postos,
// ultima-data, dashboard, vendas, abastecimentos, margem, encerrante.
// Encerrante ainda está bloqueado no backend deles (depende da coluna
// "encerrante" na base de abastecimentos, que não é capturada pelo robô em
// todos os postos ainda) — devolve { disponivel: false, mensagem }, nunca
// simular dados aqui. Notificações (rotinas/templates) usam a MESMA
// infraestrutura genérica do Financeiro/Admin (getAdminNotifRotinas/
// getAdminNotifTemplates já exportados abaixo), só com modulo='gst'.

function getGestaoPostos(actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'postos' }, actorId);
}

function getGestaoUltimaData(actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'ultima-data' }, actorId);
}

// params: { dataInicial, dataFinal, postoIds, agruparPor: 'frentista'|'posto' }
function getGestaoDashboard(params, actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'dashboard', ...params }, actorId);
}

// params: { dataInicial, dataFinal, postoIds, divisao: 'PISTA'|'LOJA' }
function getGestaoVendas(params, actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'vendas', ...params }, actorId);
}

// params: { dataInicial, dataFinal, postoIds }
function getGestaoAbastecimentos(params, actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'abastecimentos', ...params }, actorId);
}

// params: { postoIds, margemMin } — sem período (cadastro de produto por posto)
function getGestaoMargem(params, actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'margem', ...params }, actorId);
}

// { disponivel: false, mensagem } enquanto o backend deles não capturar a
// coluna "encerrante" em todos os postos — nunca simular dados aqui.
function getGestaoEncerrante(params, actorId) {
  return lovableGet('/api/public/internal/gestao', { recurso: 'encerrante', ...params }, actorId);
}

// --- Administrativo (Operação física dos postos: alvarás, manutenção,
// almoxarifado, frota) — endpoint confirmado pela Lovable em 31/08/2026:
// /api/public/internal/administrativo (mesma auth: x-internal-secret +
// x-actor-id). Query params comuns: postoIds (csv de empresas.id, vazio =
// rede toda), dataInicial/dataFinal (YYYY-MM-DD), busca, status, prioridade,
// categoria. IMPORTANTE: esse painel é diferente do "Administrador" (gestão
// da plataforma) já existente — notificações usam modulo=adm (não 'admin').

function getAdministrativoDashboard(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'dashboard', ...params }, actorId);
}

// --- Alvarás e Licenças ---
function getAdministrativoLicencas(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'licencas', ...params }, actorId);
}
// Obrigatórios: documento, orgao, vencimento. Opcionais: numero, empresa_id, emissao, observacao.
function postAdministrativoLicenca(body, actorId) {
  return lovablePost('/api/public/internal/administrativo', { recurso: 'licenca' }, body, actorId);
}
function patchAdministrativoLicenca(id, body, actorId) {
  return lovablePatch('/api/public/internal/administrativo', { recurso: 'licenca', id }, body, actorId);
}
// Inativa (não é exclusão física).
function deleteAdministrativoLicenca(id, actorId) {
  return lovableDelete('/api/public/internal/administrativo', { recurso: 'licenca', id }, actorId);
}

// --- Manutenções (Chamados) ---
function getAdministrativoChamados(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'chamados', ...params }, actorId);
}
// Obrigatório: titulo. Opcionais: descricao, local, empresa_id,
// prioridade (alta|media|baixa), responsavel. Protocolo CH-AAAA-NNNN é
// gerado por trigger do lado deles.
function postAdministrativoChamado(body, actorId) {
  return lovablePost('/api/public/internal/administrativo', { recurso: 'chamado' }, body, actorId);
}
// status: aberto|em_andamento|aguardando_peca|concluido|cancelado (concluido grava concluido_em).
function patchAdministrativoChamado(id, body, actorId) {
  return lovablePatch('/api/public/internal/administrativo', { recurso: 'chamado', id }, body, actorId);
}

// --- Almoxarifado ---
// Status (normal|atencao|zerado) já vem calculado do lado deles a partir de
// estoque_minimo — nunca recalcular aqui.
function getAdministrativoInsumos(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'insumos', ...params }, actorId);
}
function getAdministrativoSolicitacoes(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'solicitacoes', ...params }, actorId);
}
// Body: { insumo_id, empresa_id, quantidade, observacao }.
function postAdministrativoSolicitacao(body, actorId) {
  return lovablePost('/api/public/internal/administrativo', { recurso: 'solicitacao' }, body, actorId);
}

// --- Frota ---
function getAdministrativoFrota(params, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'frota', ...params }, actorId);
}
function patchAdministrativoVeiculo(id, body, actorId) {
  return lovablePatch('/api/public/internal/administrativo', { recurso: 'veiculo', id }, body, actorId);
}
function deleteAdministrativoVeiculo(id, actorId) {
  return lovableDelete('/api/public/internal/administrativo', { recurso: 'veiculo', id }, actorId);
}
// tipo: saida|retorno|manutencao|abastecimento|sinistro — "km" atualiza o veículo.
function postAdministrativoFrotaEvento(body, actorId) {
  return lovablePost('/api/public/internal/administrativo', { recurso: 'frota-evento' }, body, actorId);
}
function getAdministrativoFrotaEventos(veiculoId, actorId) {
  return lovableGet('/api/public/internal/administrativo', { recurso: 'frota-eventos', veiculoId }, actorId);
}

// --- Marketing & Fidelidade — endpoint confirmado pela Lovable em
// 31/08/2026: /api/public/internal/marketing (mesma auth: x-internal-secret
// + x-actor-id). Cobre Dashboard e Ocorrências (atendimento omnichannel);
// WhatsApp usa endpoint próprio (recurso wa-* no mesmo path); Google (gmb) e
// Leva+ (leva-mais) reaproveitam os endpoints já existentes usados pelo
// painel Administrador — ver getGmb*/getLevaMais* mais abaixo.

function getMarketingDashboard(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'dashboard', ...params }, actorId);
}

// --- Ocorrências (atendimento) ---
// params: q, status, canal, prioridade, responsavel, dataInicial, dataFinal, limit, offset.
function getMarketingOcorrencias(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'ocorrencias', ...params }, actorId);
}
function getMarketingOcorrencia(id, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'ocorrencia', id }, actorId);
}
// Obrigatório: assunto. Opcionais: canal, prioridade, cliente_nome,
// cliente_email, cliente_telefone, responsavel_id, descricao, link. SLA é
// calculado no servidor da Lovable.
function postMarketingOcorrencia(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'ocorrencia' }, body, actorId);
}
// Body: { mensagem, interna }.
function postMarketingMensagem(id, body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'mensagem', id }, body, actorId);
}
// Body: { nome_arquivo, arquivo_base64, mime_type }.
function postMarketingAnexo(id, body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'anexo', id }, body, actorId);
}
// Body: { status, prioridade, responsavel_id }.
function patchMarketingOcorrencia(id, body, actorId) {
  return lovablePatch('/api/public/internal/marketing', { recurso: 'ocorrencia', id }, body, actorId);
}

// --- WhatsApp (inbox) — REST puro, sem websocket. ---
// params: aba (todos|fila|ativos|finalizadas), channel, q.
function getMarketingWaConversas(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-conversas', ...params }, actorId);
}
// params: phone, limit, before.
function getMarketingWaMensagens(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-mensagens', ...params }, actorId);
}
function postMarketingWaEnviar(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-enviar' }, body, actorId);
}
function postMarketingWaNova(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-nova' }, body, actorId);
}
// Body pode ter { chat_status, atendente_id, display_name, tags: [], notas,
// muted, blocked } — contrato ampliado confirmado pela Lovable em 03/09/2026.
function patchMarketingWaConversa(phone, body, actorId) {
  return lovablePatch('/api/public/internal/marketing', { recurso: 'wa-conversa', phone }, body, actorId);
}

// --- WhatsApp — contrato ampliado confirmado pela Lovable em 03/09/2026
// (documentação completa no cabeçalho da rota /api/public/internal/marketing
// no código da Lovable). ---

// Ressincroniza as conversas com o provedor do WhatsApp (botão de refresh).
function postMarketingWaSincronizar(actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-sincronizar' }, {}, actorId);
}
// Agenda de contatos já conversados. params: q.
function getMarketingWaAgenda(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-agenda', ...params }, actorId);
}
// Lista de tags existentes (pra montar filtro/seleção).
function getMarketingWaTags(actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-tags' }, actorId);
}
// Marca a conversa como lida. Body: { phone }.
function postMarketingWaMarcarLido(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-marcar-lido' }, body, actorId);
}
// Templates aprovados pra iniciar/retomar conversa com a janela de 24h
// fechada. params: canal (geral|rs).
function getMarketingWaTemplates(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-templates', ...params }, actorId);
}
// Envia um template aprovado. Body: { phone, template_name, language?, variables }.
function postMarketingWaEnviarTemplate(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-enviar-template' }, body, actorId);
}
// Sugestões de resposta contextual (saudação + link etc.) já resolvidas pro
// número informado. params: phone.
function getMarketingWaSugestoes(params, actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-sugestoes', ...params }, actorId);
}
// Respostas rápidas cadastradas (atalho + texto).
function getMarketingWaRespostas(actorId) {
  return lovableGet('/api/public/internal/marketing', { recurso: 'wa-respostas' }, actorId);
}
// Cria ou edita (se enviar id) uma resposta rápida. Body: { id?, atalho, texto }.
function postMarketingWaResposta(body, actorId) {
  return lovablePost('/api/public/internal/marketing', { recurso: 'wa-resposta' }, body, actorId);
}
function deleteMarketingWaResposta(id, actorId) {
  return lovableDelete('/api/public/internal/marketing', { recurso: 'wa-resposta', id }, actorId);
}

// --- Google Meu Negócio — avaliações (mesmo endpoint /gmb já usado pelo
// painel Administrador; "reviews" foi adicionado pela Lovable em
// 31/08/2026 especificamente pro módulo Marketing). ---
// params: locationId, filtro (todas|sem_resposta|baixas|altas).
function getGmbReviews(params, actorId) {
  return lovableGet('/api/public/internal/gmb', { recurso: 'reviews', ...params }, actorId);
}
// Body: { reviewId, texto }.
function postGmbResponderReview(body, actorId) {
  return lovablePost('/api/public/internal/gmb', { acao: 'responder' }, body, actorId);
}

module.exports = {
  getRhUniformesCobrancas,
  postRhUniformeCobranca,
  patchRhUniformeCobranca,
  deleteRhUniformeCobranca,
  getRhUniformesEstoque,
  getRhUniformesMovimentacoes,
  postRhUniformeMovimentacao,
  deleteRhUniformeMovimentacao,
  getRhUniformesCategorias,
  postRhUniformeItem,
  postRhUniformeTamanho,
  patchRhUniformeItem,
  patchRhUniformeTamanho,
  deleteRhUniformeItem,
  deleteRhUniformeTamanho,
  postRhUniformeKitCargo,
  deleteRhUniformeKitItem,
  deleteRhUniformeKitCargo,
  getRhUniformeTermo,
  getRhUniformeTermos,
  postRhUniformeTermo,
  fetchTable,
  fetchAllRows,
  fetchRhStats,
  patchDirContato,
  postRhColaborador,
  patchRhColaborador,
  putRhBeneficios,
  postRhHistoricoContratacao,
  patchRhHistoricoContratacao,
  deleteRhHistoricoContratacao,
  postRhDependente,
  patchRhDependente,
  deleteRhDependente,
  postRhSalarioHistorico,
  patchRhSalarioHistorico,
  deleteRhSalarioHistorico,
  postRhPremiacao,
  patchRhPremiacao,
  deleteRhPremiacao,
  postRhTransferencia,
  patchRhTransferencia,
  deleteRhTransferencia,
  postRhDocumentoUpload,
  getRhDocumento,
  deleteRhDocumentoUpload,
  getAdmissaoConformidade,
  getAdmissaoPrazos,
  patchAdmissaoPrazo,
  postRhComunicadoUpload,
  deleteRhComunicadoUpload,
  postAdminUsuario,
  postAdminUsuarioResetSenha,
  postAdminUsuarioToggleAtivo,
  patchAdminUsuario,
  deleteAdminUsuario,
  postAdminRole,
  patchAdminRole,
  deleteAdminRole,
  putAdminRolePermissions,
  putAdminUserPermissions,
  postAdminUserModule,
  postAdminUserModulesReset,
  deleteAdminUserModule,
  getAdminGrupos,
  postAdminGrupo,
  patchAdminGrupo,
  deleteAdminGrupo,
  getAdminUnidades,
  postAdminUnidade,
  patchAdminUnidade,
  deleteAdminUnidade,
  postAdminVenderUnidade,
  getAdminContabilidades,
  postAdminContabilidade,
  patchAdminContabilidade,
  deleteAdminContabilidade,
  getAdminContabilidadeResponsaveis,
  postAdminContabilidadeResponsavel,
  patchAdminContabilidadeResponsavel,
  deleteAdminContabilidadeResponsavel,
  postAdminContabilidadeResponsavelLiberarAcesso,
  getAdminModulos,
  patchAdminModulo,
  getAdminDominios,
  postAdminDominio,
  patchAdminDominio,
  deleteAdminDominio,
  getAdminCargoDominio,
  postAdminCargoDominio,
  patchAdminCargoDominio,
  deleteAdminCargoDominio,
  getAdminTemas,
  patchAdminTema,
  getAdminVersoes,
  getAdminNotifRotinas,
  postAdminNotifRotina,
  patchAdminNotifRotina,
  deleteAdminNotifRotina,
  postAdminNotifRotinaExecutar,
  getAdminNotifTemplates,
  postAdminNotifTemplate,
  patchAdminNotifTemplate,
  deleteAdminNotifTemplate,
  getWaConfig,
  patchWaConfig,
  postWaConfigAcao,
  getGmb,
  patchGmbLocation,
  postGmbAcao,
  getBuscaPf,
  postBuscaPfAcao,
  getDatajud,
  postDatajudAcao,
  getLevaMais,
  postLevaMaisAcao,
  patchLevaMaisConfig,
  getDashboardPerformance,
  getDashboardKpis,
  getDiretoriaVendas,
  postAuth2faEnviar,
  postAuth2faVerificar,
  getGstProcessos,
  postGstProcesso,
  patchGstProcesso,
  deleteGstProcesso,
  getRhReembolsos,
  postRhReembolso,
  patchRhReembolso,
  deleteRhReembolso,
  getRhFerias,
  postRhFerias,
  patchRhFerias,
  getRhSolicitacoes,
  postRhSolicitacao,
  postRhSolicitacaoMensagem,
  postRhSolicitacaoAnexo,
  patchRhSolicitacao,
  getRhUniformes,
  postRhUniformePedido,
  patchRhUniformePedidoAprovar,
  patchRhUniformePedidoRecusar,
  postRhUniformeEntrega,
  getRhCalendario,
  postRhCalendario,
  patchRhCalendario,
  deleteRhCalendario,
  getRhComunicados,
  postRhComunicado,
  patchRhComunicado,
  deleteRhComunicado,
  postRhComunicadoLeitura,
  getRhComunicadoLeituras,
  getRhPdfImports,
  postRhPdfImportUpload,
  getRhPdfImportDetalhe,
  deleteRhPdfImport,
  postRhPdfImportAplicarAdmissao,
  postRhPdfImportAplicarDesligamento,
  postRhPdfImportReprocessar,
  getRhTreinamentos,
  postRhTreinamentoResposta,
  postRhTreinamentoProva,
  patchRhTreinamentoInscricao,
  postRhTreinamentoProgressoAula,
  getRhTreinamentoProgressoAulas,
  postRhTreinamento,
  patchRhTreinamento,
  deleteRhTreinamento,
  postRhTreinamentoAula,
  patchRhTreinamentoAula,
  deleteRhTreinamentoAula,
  postRhTreinamentoVideoUploadUrl,
  postRhTreinamentoQuestao,
  patchRhTreinamentoQuestao,
  deleteRhTreinamentoQuestao,
  postRhTreinamentoAtribuir,
  getRhMetas,
  postRhMeta,
  patchRhMeta,
  deleteRhMeta,
  postRhMetasRecalcular,
  getRhJornadas,
  postRhJornada,
  patchRhJornada,
  deleteRhJornada,
  getRhExperienciaLista,
  getRhExperienciaHistorico,
  postRhExperienciaAvaliacao,
  deleteRhExperienciaAvaliacao,
  getRhFolhaCompetencias,
  getRhFolhaCompetencia,
  getRhFolhaDetalheColaborador,
  getRhFolhaHistorico,
  postRhFolhaCompetencia,
  postRhFolhaCalcular,
  postRhFolhaFechar,
  postRhFolhaReabrir,
  postRhFolhaEnviarContracheques,
  postRhFolhaLancamento,
  deleteRhFolhaLancamento,
  postRhFolhaPonto,
  patchRhFolhaCompetencia,
  patchRhFolhaSalario,
  deleteRhFolhaCompetencia,
  getRhWorkflowPostos,
  getRhWorkflowLideranca,
  getRhWorkflowHistorico,
  getRhWorkflowColaboradores,
  getRhWorkflowFluxos,
  getRhWorkflowInstancias,
  postRhWorkflowAtribuir,
  postRhWorkflowEncerrar,
  postRhWorkflowTransferir,
  postRhWorkflowRecalcular,
  postRhWorkflowFluxo,
  patchRhWorkflowLideranca,
  deleteRhWorkflowLideranca,
  patchRhWorkflowFluxo,
  deleteRhWorkflowFluxo,
  getRhRelatorioReincidencia,
  getRhConfigCargos,
  postRhConfigCargo,
  patchRhConfigCargo,
  getRhConfigSetores,
  postRhConfigSetor,
  patchRhConfigSetor,
  getRhConfigRubricas,
  postRhConfigRubrica,
  patchRhConfigRubrica,
  deleteRhConfigRubrica,
  getRhConfigTabelaInss,
  postRhConfigTabelaInss,
  patchRhConfigFaixaInss,
  getRhConfigTabelaIrrf,
  postRhConfigTabelaIrrf,
  patchRhConfigFaixaIrrf,
  getRhConfigSalarioMinimo,
  postRhConfigSalarioMinimo,
  getRhConfigParametros,
  patchRhConfigParametro,
  getRhConfigReajustes,
  postRhConfigReajuste,
  patchRhConfigReajuste,
  deleteRhConfigReajuste,
  postRhConfigReajusteAplicar,
  getFinanceiroDashboard,
  getFinanceiroContas,
  getFinanceiroFluxoCaixa,
  getFinanceiroConciliacao,
  postFinanceiroConciliar,
  deleteFinanceiroConciliar,
  postFinanceiroDesconciliar,
  getFinanceiroTitulosConciliar,
  getFinanceiroBalancete,
  getFinanceiroFornecedores,
  getFinanceiroCentrosCusto,
  getFinanceiroContasBancarias,
  getFinanceiroIaPredicoes,
  postFinanceiroIaResponder,
  postFinanceiroIaReanalisar,
  getFinanceiroProjecoes,
  getFinanceiroRelatorio,
  getFinanceiroConfig,
  postFinanceiroConfigChave,
  postFinanceiroConfigTestar,
  postFinanceiroConfigPosto,
  patchFinanceiroConfigPosto,
  deleteFinanceiroConfigPosto,
  postFinanceiroConfigLimparCache,
  getGestaoPostos,
  getGestaoUltimaData,
  getGestaoDashboard,
  getGestaoVendas,
  getGestaoAbastecimentos,
  getGestaoMargem,
  getGestaoEncerrante,
  getAdministrativoDashboard,
  getAdministrativoLicencas,
  postAdministrativoLicenca,
  patchAdministrativoLicenca,
  deleteAdministrativoLicenca,
  getAdministrativoChamados,
  postAdministrativoChamado,
  patchAdministrativoChamado,
  getAdministrativoInsumos,
  getAdministrativoSolicitacoes,
  postAdministrativoSolicitacao,
  getAdministrativoFrota,
  patchAdministrativoVeiculo,
  deleteAdministrativoVeiculo,
  postAdministrativoFrotaEvento,
  getAdministrativoFrotaEventos,
  getMarketingDashboard,
  getMarketingOcorrencias,
  getMarketingOcorrencia,
  postMarketingOcorrencia,
  postMarketingMensagem,
  postMarketingAnexo,
  patchMarketingOcorrencia,
  getMarketingWaConversas,
  getMarketingWaMensagens,
  postMarketingWaEnviar,
  postMarketingWaNova,
  patchMarketingWaConversa,
  postMarketingWaSincronizar,
  getMarketingWaAgenda,
  getMarketingWaTags,
  postMarketingWaMarcarLido,
  getMarketingWaTemplates,
  postMarketingWaEnviarTemplate,
  getMarketingWaSugestoes,
  getMarketingWaRespostas,
  postMarketingWaResposta,
  deleteMarketingWaResposta,
  getGmbReviews,
  postGmbResponderReview,
};
