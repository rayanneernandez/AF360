// Cliente para os endpoints internos que o Lovable expôs no backend
// Supabase real do app (RH, Fale com a Diretoria, etc). Esse Supabase é
// diferente do Postgres self-hosted (db.js) — moram lá as tabelas rh_*,
// dir_contatos/dir_mensagens, empresas, profiles.
//
// Protocolo: header x-internal-secret + endpoints:
//   GET   /api/public/internal/table?name=...&<filtros>
//   GET   /api/public/internal/rh-stats
//   PATCH /api/public/internal/dir-contato?phone=...

const LOVABLE_BASE_URL = process.env.LOVABLE_BASE_URL || 'https://af-360-hub.lovable.app';

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

async function lovablePatch(path, params = {}, body = {}) {
  const url = buildUrl(path, params);
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'x-internal-secret': getSecret(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

async function fetchRhStats() {
  return lovableGet('/api/public/internal/rh-stats');
}

async function patchDirContato(phone, body) {
  return lovablePatch('/api/public/internal/dir-contato', { phone }, body);
}

module.exports = { fetchTable, fetchRhStats, patchDirContato };
