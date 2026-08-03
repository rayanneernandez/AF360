const express = require('express');
const { postRhFerias, patchRhFerias } = require('../lovable');

const router = express.Router();

// Escrita em rh_ferias (leitura já existe em GET /api/rh/dashboard/ferias e
// GET /api/rh/colaboradores/:id/ferias). Endpoint de escrita confirmado pela
// Lovable em 03/08/2026. Enum rh_ferias_status: programada | em_andamento |
// concluida | cancelada — não existe "aprovada/recusada" explícito no banco
// (recusar hoje = marcar cancelada).

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/ferias?actorId=
router.post('/', async (req, res) => {
  try {
    const json = await postRhFerias(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/ferias POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/ferias/:id?actorId= — body: { status }
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhFerias(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/ferias PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
