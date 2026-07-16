const express = require('express');
const { fetchTable, fetchAllRows, fetchRhStats } = require('../lovable');

const router = express.Router();

// GET /api/rh/colaboradores
// Filtros aceitos: status (aceita csv, vira status__in), q (busca por nome_completo)
// ?all=1 (ou sem limit/offset) -> ignora o teto de 2000/1000 por chamada do
// Lovable e pagina internamente até trazer TODOS os colaboradores. Passe
// limit/offset explicitamente se quiser uma página só (ex: telas com scroll
// infinito no futuro).
router.get('/', async (req, res) => {
  try {
    const { limit, offset, q, status, all } = req.query;
    const filters = {};
    if (status) filters['status__in'] = status;
    if (q) filters['nome_completo__ilike'] = `%${q}%`;

    const wantsAll = all === '1' || (!limit && !offset);
    const json = wantsAll
      ? await fetchAllRows('rh_colaboradores', { order: 'nome_completo:asc', filters })
      : await fetchTable('rh_colaboradores', {
          limit: limit ?? 200,
          offset: offset ?? 0,
          order: 'nome_completo:asc',
          filters,
        });
    res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
  } catch (err) {
    console.error('[rh/colaboradores] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/colaboradores/stats -> contagem por status.
router.get('/stats', async (req, res) => {
  try {
    const json = await fetchRhStats();
    res.json({ ok: true, data: json });
  } catch (err) {
    console.error('[rh/colaboradores/stats] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/colaboradores/:id -> dados completos de um colaborador.
router.get('/:id', async (req, res) => {
  try {
    const json = await fetchTable('rh_colaboradores', { filters: { id: req.params.id }, limit: 1 });
    const row = json.data?.[0];
    if (!row) {
      return res.status(404).json({ ok: false, error: 'not_found' });
    }
    res.json({ ok: true, data: row });
  } catch (err) {
    console.error('[rh/colaboradores/:id] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

/**
 * Sub-recursos do colaborador, cada um filtrado por colaborador_id.
 * Nomes de tabela confirmados pela allowlist real do Lovable.
 * "afastamentos" não tem tabela própria — hoje é só um valor de
 * rh_colaboradores.status ('afastado'), então devolve lista vazia.
 */
const subResources = [
  { path: 'documentos', table: 'rh_documentos' },
  { path: 'contracheques', table: 'rh_contracheques' },
  { path: 'treinamentos', table: 'rh_treinamento_inscricoes' },
  { path: 'promocoes', table: 'rh_salario_historico' },
  { path: 'hierarquia', table: 'rh_hierarquia_historico' },
  { path: 'premiacoes', table: 'rh_premiacoes' },
  { path: 'transferencias', table: 'rh_transferencias' },
  { path: 'ferias', table: 'rh_ferias' },
];

subResources.forEach(({ path, table }) => {
  router.get(`/:id/${path}`, async (req, res) => {
    try {
      const json = await fetchTable(table, {
        filters: { colaborador_id: req.params.id },
        order: 'created_at:desc',
        limit: 500,
      });
      res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
    } catch (err) {
      console.error(`[rh/colaboradores/:id/${path}] erro:`, err.message);
      res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
    }
  });
});

// "afastamentos" não existe como tabela — devolve vazio com uma nota, em vez de erro.
router.get('/:id/afastamentos', async (req, res) => {
  res.json({
    ok: true,
    count: 0,
    data: [],
    nota: 'Não existe tabela de afastamentos — hoje é apenas o valor "afastado" em rh_colaboradores.status.',
  });
});

module.exports = router;
