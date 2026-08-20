const express = require('express');
const {
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
} = require('../lovable');

const router = express.Router();

// Workflow (Hierarquia por Posto + Fluxos de Aprovação) — proxy fino pro
// endpoint unificado confirmado pela Lovable em 20/08/2026
// (/api/public/internal/rh-workflow).

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/workflow/postos?busca=&filtro=&actorId=
router.get('/postos', async (req, res) => {
  try {
    const { busca, filtro, actorId } = req.query;
    const json = await getRhWorkflowPostos({ busca, filtro }, actorId);
    res.json({ ok: true, data: json?.data ?? [], resumo: json?.resumo ?? null, tipos_lideranca: json?.tipos_lideranca ?? [] });
  } catch (err) {
    console.error('[rh/workflow postos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/workflow/lideranca?postoId=&actorId=
router.get('/lideranca', async (req, res) => {
  try {
    const { postoId, actorId } = req.query;
    const json = await getRhWorkflowLideranca(postoId, actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow lideranca] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/workflow/historico?postoId=|colaboradorId=&actorId=
router.get('/historico', async (req, res) => {
  try {
    const { postoId, colaboradorId, actorId } = req.query;
    const json = await getRhWorkflowHistorico({ postoId, colaboradorId }, actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/workflow historico] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/workflow/colaboradores?actorId= — lista pro select de líder
router.get('/colaboradores', async (req, res) => {
  try {
    const json = await getRhWorkflowColaboradores(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/workflow colaboradores] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/workflow/fluxos?actorId=
router.get('/fluxos', async (req, res) => {
  try {
    const json = await getRhWorkflowFluxos(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow fluxos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/workflow/instancias?actorId=
router.get('/instancias', async (req, res) => {
  try {
    const { actorId, ...params } = req.query;
    const json = await getRhWorkflowInstancias(params, actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/workflow instancias] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/workflow/atribuir?actorId= — body: { posto_id, colaborador_id, tipo_lideranca, data_inicio, substituir? }
router.post('/atribuir', async (req, res) => {
  try {
    const json = await postRhWorkflowAtribuir(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow atribuir] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/workflow/encerrar?actorId= — body: { id, data_fim, motivo }
router.post('/encerrar', async (req, res) => {
  try {
    const json = await postRhWorkflowEncerrar(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow encerrar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/workflow/transferir?actorId= — body: { id, posto_destino_id }
router.post('/transferir', async (req, res) => {
  try {
    const json = await postRhWorkflowTransferir(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow transferir] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/workflow/recalcular?actorId=
router.post('/recalcular', async (req, res) => {
  try {
    const json = await postRhWorkflowRecalcular(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow recalcular] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/workflow/fluxo?actorId=
router.post('/fluxo', async (req, res) => {
  try {
    const json = await postRhWorkflowFluxo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow fluxo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/workflow/fluxo/:id?actorId=
router.patch('/fluxo/:id', async (req, res) => {
  try {
    const json = await patchRhWorkflowFluxo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow fluxo PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/workflow/fluxo/:id?actorId=
router.delete('/fluxo/:id', async (req, res) => {
  try {
    await deleteRhWorkflowFluxo(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/workflow fluxo DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/workflow/lideranca/:id?actorId=
router.patch('/lideranca/:id', async (req, res) => {
  try {
    const json = await patchRhWorkflowLideranca(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/workflow lideranca PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/workflow/lideranca/:id?actorId=
router.delete('/lideranca/:id', async (req, res) => {
  try {
    await deleteRhWorkflowLideranca(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/workflow lideranca DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
