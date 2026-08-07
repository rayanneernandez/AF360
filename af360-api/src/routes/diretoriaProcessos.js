const express = require('express');
const { getGstProcessos, postGstProcesso, patchGstProcesso, deleteGstProcesso } = require('../lovable');

const router = express.Router();

// GET /api/diretoria-processos?departamento=&status=&q=&actorId= — lista
// GET /api/diretoria-processos?id=<uuid>&actorId= — detalhe (processo + etapas)
// Proxy fino pro endpoint confirmado pela Lovable em 04/08/2026
// (/api/public/internal/gst-processos) — leitura.
router.get('/', async (req, res) => {
  try {
    const { departamento, status, q, id, actorId } = req.query;
    const json = await getGstProcessos({ departamento, status, q, id }, actorId);
    res.json({ ok: true, ...json });
  } catch (err) {
    console.error('[diretoria-processos] erro:', err.message);
    const status4xx = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500;
    res.status(status4xx ? err.lovableStatus : 500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/diretoria-processos?actorId= — cria processo (+ etapas + blocos
// de fluxograma). Escrita confirmada pela Lovable em 07/08/2026: RLS
// continua master-only, mas o endpoint interno valida x-actor-id como
// master (lovable.js já injeta isso via writeHeaders).
router.post('/', async (req, res) => {
  try {
    const { actorId } = req.query;
    const json = await postGstProcesso(req.body, actorId);
    res.status(201).json({ ok: true, ...json });
  } catch (err) {
    console.error('[diretoria-processos] erro ao criar:', err.message);
    const status4xx = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500;
    res.status(status4xx ? err.lovableStatus : 500).json({ ok: false, error: 'create_failed', message: err.message });
  }
});

// PATCH /api/diretoria-processos?id=<uuid>&actorId= — edita processo
// (campos omitidos preservam o valor atual; etapas/blocos omitidos também).
router.patch('/', async (req, res) => {
  try {
    const { id, actorId } = req.query;
    if (!id) {
      res.status(400).json({ ok: false, error: 'missing_id', message: 'Informe ?id=<uuid>' });
      return;
    }
    const json = await patchGstProcesso(id, req.body, actorId);
    res.json({ ok: true, ...json });
  } catch (err) {
    console.error('[diretoria-processos] erro ao editar:', err.message);
    const status4xx = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500;
    res.status(status4xx ? err.lovableStatus : 500).json({ ok: false, error: 'update_failed', message: err.message });
  }
});

// DELETE /api/diretoria-processos?id=<uuid>&actorId= — exclui processo.
router.delete('/', async (req, res) => {
  try {
    const { id, actorId } = req.query;
    if (!id) {
      res.status(400).json({ ok: false, error: 'missing_id', message: 'Informe ?id=<uuid>' });
      return;
    }
    const json = await deleteGstProcesso(id, actorId);
    res.json({ ok: true, ...json });
  } catch (err) {
    console.error('[diretoria-processos] erro ao excluir:', err.message);
    const status4xx = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500;
    res.status(status4xx ? err.lovableStatus : 500).json({ ok: false, error: 'delete_failed', message: err.message });
  }
});

module.exports = router;
