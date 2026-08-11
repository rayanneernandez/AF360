const express = require('express');
const { postRhSalarioHistorico, patchRhSalarioHistorico, deleteRhSalarioHistorico } = require('../lovable');

const router = express.Router();

// rh_salario_historico (tela "Promoções") — endpoint de escrita confirmado
// pela Lovable em 11/08/2026. Obrigatórios: colaborador_id, salario_novo,
// vigencia_inicio. Por padrão ("atualizar_colaborador" != false) já grava o
// novo salário em rh_colaboradores.salario_base — resposta traz
// colaborador_atualizado.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/promocoes
router.post('/', async (req, res) => {
  try {
    const json = await postRhSalarioHistorico(req.body ?? {});
    res.status(201).json({ ok: true, data: json?.data ?? json, colaboradorAtualizado: json?.colaborador_atualizado });
  } catch (err) {
    console.error('[rh/promocoes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/promocoes/:id
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhSalarioHistorico(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/promocoes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/promocoes/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhSalarioHistorico(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/promocoes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
