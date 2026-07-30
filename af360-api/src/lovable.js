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

async function lovableGet(path, params = {}) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    headers: { 'x-internal-secret': getSecret() },
  });
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
};
