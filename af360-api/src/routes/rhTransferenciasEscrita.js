const express = require('express');
const { postRhTransferencia, patchRhTransferencia, deleteRhTransferencia } = require('../lovable');

const router = express.Router();

// rh_transferencias — endpoint de escrita confirmado pela Lovable em
// 11/08/2026. Obrigatórios: colaborador_id, empresa_destino_id,
// data_vigencia. Campos de origem são preenchidos com o snapshot atual do
// colaborador se vierem vazios. "efetivar": true (POST ou PATCH) já aplica
// no cadastro (empresa/cargo/setor/salário/gestor) — resposta traz
// colaborador_atualizado.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/transferencias-escrita?actorId=
router.post('/', async (req, res) => {
  try {
    const json = await postRhTransferencia(req.body ?? {}, req.query.actorId);
    res.status(201).json({ ok: true, data: json?.data ?? json, colaboradorAtualizado: json?.colaborador_atualizado });
  } catch (err) {
    console.error('[rh/transferencias-escrita POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/transferencias-escrita/:id?actorId= — ex: { efetivar: true }
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhTransferencia(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json, colaboradorAtualizado: json?.colaborador_atualizado });
  } catch (err) {
    console.error('[rh/transferencias-escrita PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/transferencias-escrita/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhTransferencia(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/transferencias-escrita DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
