const express = require('express');
const { fetchTable, fetchAllRows, fetchRhStats, postRhColaborador, patchRhColaborador, putRhBeneficios } = require('../lovable');

const router = express.Router();

// GET /api/rh/colaboradores
// Filtros aceitos: status (aceita csv, vira status__in), q (busca por nome_completo)
// ?all=1 (ou sem limit/offset) -> ignora o teto de 2000/1000 por chamada do
// Lovable e pagina internamente até trazer TODOS os colaboradores. Passe
// limit/offset explicitamente se quiser uma página só (ex: telas com scroll
// infinito no futuro).
router.get('/', async (req, res) => {
  try {
    const { limit, offset, q, status, all, empresaId } = req.query;
    const filters = {};
    if (status) filters['status__in'] = status;
    if (q) filters['nome_completo__ilike'] = `%${q}%`;
    // empresaId: usado pela tela Unidades (Admin) pra listar só os
    // colaboradores da unidade em questão (ex: modal "Vender unidade").
    if (empresaId) filters['empresa_id'] = empresaId;

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

// POST /api/rh/colaboradores -> cria um colaborador novo em rh_colaboradores
// (endpoint confirmado pelo Lovable em 10/08/2026). Obrigatórios no body:
// nome_completo e empresa_id — o resto tem default no Postgres. CPF repetido
// devolve 409 com { existente: { id, nome_completo, status } } no corpo (pra
// a tela oferecer abrir o cadastro já existente em vez de duplicar).
router.post('/', async (req, res) => {
  try {
    const json = await postRhColaborador(req.body ?? {});
    res.status(201).json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/colaboradores POST] erro:', err.message);
    if (err.lovableStatus === 409) {
      let parsedBody = null;
      try {
        parsedBody = err.lovableBody ? JSON.parse(err.lovableBody) : null;
      } catch (parseErr) {
        parsedBody = null;
      }
      return res.status(409).json({
        ok: false,
        error: 'cpf_duplicado',
        message: err.message,
        existente: parsedBody?.existente ?? null,
      });
    }
    const status = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
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

// PATCH /api/rh/colaboradores/:id -> grava dados pessoais/contrato/bancário/
// uniforme em rh_colaboradores (whitelist ampla confirmada pelo Lovable —
// endpoint /api/public/internal/rh-colaborador, aceita null). Body passa
// direto, sem whitelist própria aqui: o Lovable já valida enums (sexo,
// estado_civil, tipo_contrato, regime_jornada, grau_insalubridade) e devolve
// 400 com a mensagem original do Postgres se algo não bater.
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhColaborador(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/colaboradores/:id PATCH] erro:', err.message);
    const status = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET/PUT /api/rh/colaboradores/:id/beneficios -> rh_beneficios_colaborador
// (VR/VA/seguro de vida/plano de saúde/odontológico — relação 1:1 via
// colaborador_id UNIQUE). PUT é upsert de verdade no Lovable.
router.get('/:id/beneficios', async (req, res) => {
  try {
    const json = await fetchTable('rh_beneficios_colaborador', {
      filters: { colaborador_id: req.params.id },
      limit: 1,
    });
    res.json({ ok: true, data: json.data?.[0] ?? null });
  } catch (err) {
    console.error('[rh/colaboradores/:id/beneficios GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

router.put('/:id/beneficios', async (req, res) => {
  try {
    const json = await putRhBeneficios(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/colaboradores/:id/beneficios PUT] erro:', err.message);
    const status = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
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
  // Dependentes (rh_dependentes) — só leitura por enquanto. Ainda não existe
  // endpoint de escrita confirmado pela Lovable pra essa tabela (pedido em
  // 11/08/2026, ver mensagem-lovable-*.txt).
  { path: 'dependentes', table: 'rh_dependentes' },
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

// GET /api/rh/colaboradores/:id/historico-contratacoes -> passagens
// anteriores desse colaborador na rede (rh_historico_contratacoes). Tabela
// ainda não tem coluna created_at confirmada — ordena por data_admissao, que
// sempre existe.
router.get('/:id/historico-contratacoes', async (req, res) => {
  try {
    const json = await fetchTable('rh_historico_contratacoes', {
      filters: { colaborador_id: req.params.id },
      order: 'data_admissao:desc',
      limit: 200,
    });
    res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
  } catch (err) {
    console.error('[rh/colaboradores/:id/historico-contratacoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
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
