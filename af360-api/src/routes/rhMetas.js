const express = require('express');
const { getRhMetas, postRhMeta, patchRhMeta, deleteRhMeta, postRhMetasRecalcular } = require('../lovable');

const router = express.Router();

// Metas de RH (rh_metas) — proxy fino pro endpoint unificado confirmado pela
// Lovable em 19/08/2026 (/api/public/internal/rh-metas). O "resumo" (total/
// abertas/atingidas/automaticas) que a Lovable devolve é sempre da rede
// toda, independente dos filtros — não recalcular aqui.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/metas?busca=&status=&medicao=&colaboradorId=&empresaId=&limit=&offset=
router.get('/', async (req, res) => {
  try {
    const { busca, status, medicao, colaboradorId, empresaId, limit, offset, actorId } = req.query;
    const json = await getRhMetas({ busca, status, medicao, colaboradorId, empresaId, limit, offset }, actorId);
    res.json({
      ok: true,
      data: json?.data ?? [],
      count: json?.count ?? (Array.isArray(json?.data) ? json.data.length : 0),
      resumo: json?.resumo ?? { total: 0, abertas: 0, atingidas: 0, automaticas: 0 },
    });
  } catch (err) {
    console.error('[rh/metas GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/metas?actorId= — cria uma meta
router.post('/', async (req, res) => {
  try {
    const json = await postRhMeta(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/metas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/metas/recalcular?actorId=&id= (id opcional — sem id recalcula todas as automáticas)
router.post('/recalcular', async (req, res) => {
  try {
    const json = await postRhMetasRecalcular(req.query.id, req.query.actorId);
    res.json({ ok: true, total: json?.total ?? 0, atualizadas: json?.atualizadas ?? 0 });
  } catch (err) {
    console.error('[rh/metas recalcular] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/metas/:id?actorId= — edita (inclui "atualizar resultado": { resultado })
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhMeta(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/metas PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/metas/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhMeta(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/metas DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
