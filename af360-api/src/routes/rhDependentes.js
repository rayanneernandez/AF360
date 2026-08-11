const express = require('express');
const { postRhDependente, patchRhDependente, deleteRhDependente } = require('../lovable');

const router = express.Router();

// rh_dependentes — endpoint de escrita confirmado pela Lovable em 11/08/2026.
// Obrigatórios: colaborador_id, nome. grau_parentesco é enum (ver mapeamento
// no app); demais campos opcionais têm default no Postgres.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/dependentes
router.post('/', async (req, res) => {
  try {
    const json = await postRhDependente(req.body ?? {});
    res.status(201).json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/dependentes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/dependentes/:id
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhDependente(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/dependentes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/dependentes/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhDependente(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/dependentes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
