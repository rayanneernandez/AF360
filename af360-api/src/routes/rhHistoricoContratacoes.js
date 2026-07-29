const express = require('express');
const {
  postRhHistoricoContratacao,
  patchRhHistoricoContratacao,
  deleteRhHistoricoContratacao,
} = require('../lovable');

const router = express.Router();

// Escrita em rh_historico_contratacoes ("passagens anteriores" do
// colaborador na rede — aba Histórico do Dados Pessoais). Leitura por
// colaborador já existe em GET /api/rh/colaboradores/:id/historico-contratacoes.
// Campos esperados no body: colaborador_id, cpf (obrigatório), empresa_id,
// cargo, data_admissao, data_demissao, motivo_desligamento, valor_rescisao_liquida,
// observacoes.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/historico-contratacoes
router.post('/', async (req, res) => {
  try {
    const json = await postRhHistoricoContratacao(req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/historico-contratacoes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/historico-contratacoes/:id
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhHistoricoContratacao(req.params.id, req.body ?? {});
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/historico-contratacoes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/historico-contratacoes/:id
router.delete('/:id', async (req, res) => {
  try {
    const json = await deleteRhHistoricoContratacao(req.params.id);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/historico-contratacoes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
