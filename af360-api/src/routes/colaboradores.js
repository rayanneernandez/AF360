const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * Monta cláusulas WHERE dinâmicas a partir de filtros simples de igualdade.
 * Só aceita colunas de uma lista branca (evita SQL injection via nome de coluna).
 */
function buildWhere(filters, allowedColumns) {
  const clauses = [];
  const values = [];
  Object.entries(filters).forEach(([col, val]) => {
    if (val === undefined || val === null || val === '') return;
    if (!allowedColumns.includes(col)) return;
    values.push(val);
    clauses.push(`${col} = $${values.length}`);
  });
  const where = clauses.length ? `where ${clauses.join(' and ')}` : '';
  return { where, values };
}

// GET /api/rh/colaboradores
// Filtros aceitos: status, empresa_id, posto_id, setor_id, cargo_id
// Busca livre por nome/cpf: ?q=texto
router.get('/', async (req, res) => {
  try {
    const { limit = 200, offset = 0, q, status, empresa_id, posto_id, setor_id, cargo_id } = req.query;

    const allowed = ['status', 'empresa_id', 'posto_id', 'setor_id', 'cargo_id'];
    const { where, values } = buildWhere(
      { status, empresa_id, posto_id, setor_id, cargo_id },
      allowed
    );

    let sql = `select * from rh_colaboradores ${where}`;
    const params = [...values];

    if (q) {
      params.push(`%${q}%`);
      sql += `${where ? ' and' : ' where'} (nome ilike $${params.length} or cpf ilike $${params.length})`;
    }

    params.push(Number(limit), Number(offset));
    sql += ` order by nome limit $${params.length - 1} offset $${params.length}`;

    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[rh/colaboradores] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/colaboradores/stats -> contagem por status (para os pills Quadro/Ativos/Afastados/Férias/Desligados).
router.get('/stats', async (req, res) => {
  try {
    const result = await query(
      `select status, count(*)::int as total from rh_colaboradores group by status`
    );
    res.json({ ok: true, data: result.rows });
  } catch (err) {
    console.error('[rh/colaboradores/stats] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/colaboradores/:id -> dados completos de um colaborador.
router.get('/:id', async (req, res) => {
  try {
    const result = await query('select * from rh_colaboradores where id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    res.json({ ok: true, data: result.rows[0] });
  } catch (err) {
    console.error('[rh/colaboradores/:id] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

/**
 * Sub-recursos do colaborador. Cada um mapeia para uma tabela relacionada
 * por colaborador_id. Se a tabela real tiver outro nome de coluna de FK,
 * ajuste aqui (uma linha por sub-recurso).
 */
const subResources = [
  { path: 'documentos', table: 'rh_documentos' },
  { path: 'contracheques', table: 'rh_contracheques' },
  { path: 'treinamentos', table: 'rh_treinamentos' },
  { path: 'promocoes', table: 'rh_salario_historico' },
  { path: 'premiacoes', table: 'rh_premiacoes' },
  { path: 'transferencias', table: 'rh_transferencias' },
  { path: 'afastamentos', table: 'rh_afastamentos' },
  { path: 'ferias', table: 'rh_ferias' },
];

subResources.forEach(({ path, table }) => {
  router.get(`/:id/${path}`, async (req, res) => {
    try {
      const result = await query(
        `select * from ${table} where colaborador_id = $1 order by 1 desc`,
        [req.params.id]
      );
      res.json({ ok: true, count: result.rowCount, data: result.rows });
    } catch (err) {
      console.error(`[rh/colaboradores/:id/${path}] erro:`, err.message);
      res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
    }
  });
});

module.exports = router;
