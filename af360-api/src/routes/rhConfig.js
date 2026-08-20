const express = require('express');
const {
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
} = require('../lovable');

const router = express.Router();

// Configurações (Cargos/Setores/Rubricas/Tabela INSS/Tabela IRRF/Salário
// Mínimo/Parâmetros/Reajustes) — proxy fino pro endpoint unificado
// confirmado pela Lovable em 20/08/2026 (/api/public/internal/rh-config).

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// --- Cargos ---
router.get('/cargos', async (req, res) => {
  try {
    const { ativo, busca, actorId } = req.query;
    const json = await getRhConfigCargos({ ativo, busca }, actorId);
    res.json({ ok: true, data: json?.data ?? [], count: json?.count ?? 0 });
  } catch (err) {
    console.error('[rh/config cargos GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/cargos', async (req, res) => {
  try {
    const json = await postRhConfigCargo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config cargos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/cargos/:id', async (req, res) => {
  try {
    const json = await patchRhConfigCargo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config cargos PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Setores ---
router.get('/setores', async (req, res) => {
  try {
    const { ativo, busca, actorId } = req.query;
    const json = await getRhConfigSetores({ ativo, busca }, actorId);
    res.json({ ok: true, data: json?.data ?? [], count: json?.count ?? 0 });
  } catch (err) {
    console.error('[rh/config setores GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/setores', async (req, res) => {
  try {
    const json = await postRhConfigSetor(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config setores POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/setores/:id', async (req, res) => {
  try {
    const json = await patchRhConfigSetor(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config setores PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Rubricas ---
router.get('/rubricas', async (req, res) => {
  try {
    const { ativo, tipo, actorId } = req.query;
    const json = await getRhConfigRubricas({ ativo, tipo }, actorId);
    res.json({ ok: true, data: json?.data ?? [], tipos: json?.tipos ?? [] });
  } catch (err) {
    console.error('[rh/config rubricas GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/rubricas', async (req, res) => {
  try {
    const json = await postRhConfigRubrica(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config rubricas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/rubricas/:id', async (req, res) => {
  try {
    const json = await patchRhConfigRubrica(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config rubricas PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/rubricas/:id', async (req, res) => {
  try {
    await deleteRhConfigRubrica(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/config rubricas DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Tabela INSS ---
router.get('/inss', async (req, res) => {
  try {
    const json = await getRhConfigTabelaInss(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [], faixas: json?.faixas ?? [] });
  } catch (err) {
    console.error('[rh/config inss GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/inss', async (req, res) => {
  try {
    const json = await postRhConfigTabelaInss(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config inss POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/inss/faixa/:id', async (req, res) => {
  try {
    const json = await patchRhConfigFaixaInss(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config inss faixa PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Tabela IRRF ---
router.get('/irrf', async (req, res) => {
  try {
    const json = await getRhConfigTabelaIrrf(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [], faixas: json?.faixas ?? [] });
  } catch (err) {
    console.error('[rh/config irrf GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/irrf', async (req, res) => {
  try {
    const json = await postRhConfigTabelaIrrf(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config irrf POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/irrf/faixa/:id', async (req, res) => {
  try {
    const json = await patchRhConfigFaixaIrrf(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config irrf faixa PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Salário Mínimo ---
router.get('/salario-minimo', async (req, res) => {
  try {
    const json = await getRhConfigSalarioMinimo(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/config salario-minimo GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/salario-minimo', async (req, res) => {
  try {
    const json = await postRhConfigSalarioMinimo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config salario-minimo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Parâmetros ---
router.get('/parametros', async (req, res) => {
  try {
    const json = await getRhConfigParametros(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/config parametros GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.patch('/parametros/:id', async (req, res) => {
  try {
    const json = await patchRhConfigParametro(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config parametros PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Reajustes ---
router.get('/reajustes', async (req, res) => {
  try {
    const json = await getRhConfigReajustes(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/config reajustes GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/reajustes', async (req, res) => {
  try {
    const json = await postRhConfigReajuste(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config reajustes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/reajustes/:id', async (req, res) => {
  try {
    const json = await patchRhConfigReajuste(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config reajustes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/reajustes/:id', async (req, res) => {
  try {
    await deleteRhConfigReajuste(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/config reajustes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/reajustes/:id/aplicar', async (req, res) => {
  try {
    const json = await postRhConfigReajusteAplicar(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/config reajustes aplicar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
