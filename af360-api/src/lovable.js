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

function getDiretoriaVendas({ recurso, de, ate, posto } = {}, actorId) {
  return lovableGet('/api/public/internal/diretoria-vendas', { recurso, de, ate, posto }, actorId);
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

function getRhUniformes({ recurso, cargoId, colaboradorId, devolvido, status } = {}, actorId) {
  return lovableGet(
    '/api/public/internal/rh-uniformes',
    { recurso, cargo_id: cargoId, colaborador_id: colaboradorId, devolvido, status },
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
//   tempo_gasto_min, certificado_url). ---

function getRhTreinamentos(
  { recurso, treinamentoId, colaboradorId, inscricaoId, status, ativo, incluirGabarito } = {},
  actorId
) {
  return lovableGet(
    '/api/public/internal/rh-treinamentos',
    {
      recurso,
      treinamento_id: treinamentoId,
      colaborador_id: colaboradorId,
      inscricao_id: inscricaoId,
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

module.exports = {
  fetchTable,
  fetchAllRows,
  fetchRhStats,
  patchDirContato,
  patchRhColaborador,
  putRhBeneficios,
  postRhHistoricoContratacao,
  patchRhHistoricoContratacao,
  deleteRhHistoricoContratacao,
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
  getRhTreinamentos,
  postRhTreinamentoResposta,
  postRhTreinamentoProva,
  patchRhTreinamentoInscricao,
};
