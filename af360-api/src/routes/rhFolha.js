const express = require('express');
const {
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
} = require('../lovable');

const router = express.Router();

// Folha de Pagamento — proxy fino pro endpoint unificado confirmado pela
// Lovable em 19/08/2026 (/api/public/internal/rh-folha). INSS/IRRF são
// calculados só do lado deles (RPC calcular_folha) — nunca aqui.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/folha?ano=&status=&actorId= — lista de competências
router.get('/', async (req, res) => {
  try {
    const { ano, status, actorId } = req.query;
    const json = await getRhFolhaCompetencias({ ano, status }, actorId);
    res.json({ ok: true, data: json?.data ?? [], resumo: json?.resumo ?? null });
  } catch (err) {
    console.error('[rh/folha GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/folha/historico?competenciaId=|folhaId=|colaboradorId=&actorId=
router.get('/historico', async (req, res) => {
  try {
    const { competenciaId, folhaId, colaboradorId, actorId } = req.query;
    const json = await getRhFolhaHistorico({ competenciaId, folhaId, colaboradorId }, actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/folha historico] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/folha/detalhe?competenciaId=&colaboradorId=&actorId=
router.get('/detalhe', async (req, res) => {
  try {
    const { competenciaId, colaboradorId, actorId } = req.query;
    const json = await getRhFolhaDetalheColaborador({ competenciaId, colaboradorId }, actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha detalhe] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// DELETE /api/rh/folha/lancamento/:id?actorId= — só remove lançamento manual
router.delete('/lancamento/:id', async (req, res) => {
  try {
    await deleteRhFolhaLancamento(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/folha lancamento DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/lancamento?actorId= — adiciona lançamento manual
router.post('/lancamento', async (req, res) => {
  try {
    const json = await postRhFolhaLancamento(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha lancamento POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/ponto?actorId= — upsert da apuração de ponto
router.post('/ponto', async (req, res) => {
  try {
    const json = await postRhFolhaPonto(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha ponto POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/folha/salario/:colaboradorId?actorId= — salário base + dependentes IRRF
router.patch('/salario/:colaboradorId', async (req, res) => {
  try {
    const json = await patchRhFolhaSalario(req.params.colaboradorId, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha salario PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/calcular?actorId= — body: { competencia_id, colaborador_id? }
router.post('/calcular', async (req, res) => {
  try {
    const json = await postRhFolhaCalcular(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, total: json?.total ?? 0, calculados: json?.calculados ?? 0, erros: json?.erros ?? [] });
  } catch (err) {
    console.error('[rh/folha calcular] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/:id/fechar?actorId=
router.post('/:id/fechar', async (req, res) => {
  try {
    const json = await postRhFolhaFechar(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha fechar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/:id/reabrir?actorId=
router.post('/:id/reabrir', async (req, res) => {
  try {
    const json = await postRhFolhaReabrir(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha reabrir] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha/:id/enviar-contracheques?actorId=
router.post('/:id/enviar-contracheques', async (req, res) => {
  try {
    const json = await postRhFolhaEnviarContracheques(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha enviar-contracheques] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/rh/folha/:id?actorId= — detalhe da competência (colaboradores + folhas + resumo)
router.get('/:id', async (req, res) => {
  try {
    const json = await getRhFolhaCompetencia(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha GET :id] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// PATCH /api/rh/folha/:id?actorId= — edita data/observação/status da competência
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhFolhaCompetencia(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha PATCH :id] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/folha/:id?actorId= — exclusão real em cascata
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhFolhaCompetencia(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/folha DELETE :id] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/folha?actorId= — cria competência: { mes, ano, data_pagamento? }
router.post('/', async (req, res) => {
  try {
    const json = await postRhFolhaCompetencia(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/folha POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
