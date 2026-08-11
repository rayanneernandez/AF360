const express = require('express');
const { postRhPremiacao, patchRhPremiacao, deleteRhPremiacao } = require('../lovable');

const router = express.Router();

// rh_premiacoes — endpoint de escrita confirmado pela Lovable em 11/08/2026.
// Obrigatórios: colaborador_id, valor. "tipo" (texto) é resolvido/criado do
// lado deles em rh_premiacao_tipos; competencia usa dia 1 do mês corrente se
// omitida.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/premiacoes-escrita
router.post('/', async (req, res) => {
  try {
    const json = await postRhPremiacao(req.body ?? {});
    res.status(201).json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/premiacoes-escrita POST] erro:', err.message);
    if (err.lovableStatus === 400) {
      return res.status(400).json({ ok: false, error: 'bad_request', message: err.message, body: err.lovableBody });
    }
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/premiacoes-escrita/:id
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhPremiacao(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/premiacoes-escrita PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/premiacoes-escrita/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhPremiacao(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/premiacoes-escrita DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
