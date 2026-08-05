const express = require('express');
const { getGstProcessos } = require('../lovable');

const router = express.Router();

// GET /api/diretoria-processos?departamento=&status=&q=&actorId= — lista
// GET /api/diretoria-processos?id=<uuid>&actorId= — detalhe (processo + etapas)
// Proxy fino pro endpoint confirmado pela Lovable em 04/08/2026
// (/api/public/internal/gst-processos) — só leitura, sem remodelar aqui.
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

module.exports = router;
