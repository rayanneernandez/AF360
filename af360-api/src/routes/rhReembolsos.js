const express = require('express');
const { getRhReembolsos, postRhReembolso, patchRhReembolso, deleteRhReembolso } = require('../lovable');

const router = express.Router();

// rh_reembolsos (tabela + endpoint confirmados pela Lovable em 03/08/2026).
// Colunas: colaborador_id, descricao, categoria, data_despesa, valor, status,
// comprovante_url, aprovado_por, aprovado_em, pago_em, observacoes.
// Enum rh_reembolso_status: rascunho | enviado | aprovado | pago | recusado.
// PATCH com status=aprovado/recusado preenche aprovado_por/aprovado_em a
// partir do x-actor-id; status=pago preenche pago_em — feito do lado deles.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/reembolsos?colaboradorId=&status=&limit=&offset=
router.get('/', async (req, res) => {
  try {
    const { colaboradorId, status, limit, offset, actorId } = req.query;
    const json = await getRhReembolsos({ colaboradorId, status, limit, offset }, actorId);
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/reembolsos GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/reembolsos?actorId= — body: { colaborador_id, descricao, categoria, data_despesa, valor, comprovante_url?, observacoes? }
router.post('/', async (req, res) => {
  try {
    const json = await postRhReembolso(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/reembolsos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/reembolsos/:id?actorId= — body pode incluir status: rascunho|enviado|aprovado|pago|recusado
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhReembolso(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/reembolsos PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/reembolsos/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    const json = await deleteRhReembolso(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/reembolsos DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
