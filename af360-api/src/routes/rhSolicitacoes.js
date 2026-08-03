const express = require('express');
const {
  getRhSolicitacoes,
  postRhSolicitacao,
  postRhSolicitacaoMensagem,
  postRhSolicitacaoAnexo,
  patchRhSolicitacao,
} = require('../lovable');

const router = express.Router();

// Escrita + detalhe de rh_solicitacoes / rh_solicitacao_mensagens /
// rh_solicitacao_anexos — endpoint confirmado pela Lovable em 03/08/2026.
// A lista simples pro card do colaborador já existe em
// GET /api/rh/dashboard/solicitacoes (não mexemos nela). Aqui: criar
// solicitação, ver detalhe com thread, responder/anexar, e mudar status
// (uso do RH/liderança).
//
// Enums: setor = rh|dp|documentos|outros; status = aberta|em_analise|
// respondida|encerrada|cancelada; assunto = rh_ferias, rh_beneficios,
// rh_atestado, rh_turno, rh_reclamacao, rh_outros, dp_holerite, dp_vt,
// dp_vr, dp_adiantamento, dp_rescisao, dp_outros, doc_atestado,
// doc_residencia, doc_rgcpf, doc_ctps, doc_diploma, doc_outros,
// out_sugestao, out_elogio, out_reclamacao, out_duvida.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/solicitacoes?colaboradorId=&status=&setor=&actorId= -> lista completa
router.get('/', async (req, res) => {
  try {
    const { colaboradorId, status, setor, actorId } = req.query;
    const json = await getRhSolicitacoes({ colaboradorId, status, setor }, actorId);
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/solicitacoes GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/solicitacoes/:id?actorId= -> detalhe (thread + anexos embutidos)
router.get('/:id', async (req, res) => {
  try {
    const json = await getRhSolicitacoes({ id: req.params.id }, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/solicitacoes/:id GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/solicitacoes/:id/mensagens?actorId=
router.get('/:id/mensagens', async (req, res) => {
  try {
    const json = await getRhSolicitacoes({ id: req.params.id, recurso: 'mensagens' }, req.query.actorId);
    const row = json?.data ?? json;
    res.json({ ok: true, count: Array.isArray(row) ? row.length : undefined, data: row });
  } catch (err) {
    console.error('[rh/solicitacoes/:id/mensagens GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/solicitacoes/:id/anexos?actorId=
router.get('/:id/anexos', async (req, res) => {
  try {
    const json = await getRhSolicitacoes({ id: req.params.id, recurso: 'anexos' }, req.query.actorId);
    const row = json?.data ?? json;
    res.json({ ok: true, count: Array.isArray(row) ? row.length : undefined, data: row });
  } catch (err) {
    console.error('[rh/solicitacoes/:id/anexos GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/solicitacoes?actorId= — body: { colaborador_id, setor, assunto, titulo?, mensagem }
router.post('/', async (req, res) => {
  try {
    const json = await postRhSolicitacao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/solicitacoes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/solicitacoes/:id/mensagens?actorId= — body: { mensagem, e_interna? }
router.post('/:id/mensagens', async (req, res) => {
  try {
    const json = await postRhSolicitacaoMensagem(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/solicitacoes/:id/mensagens POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/solicitacoes/:id/anexos?actorId= — body: { nome_arquivo, storage_path, mime_type?, tamanho_bytes? }
router.post('/:id/anexos', async (req, res) => {
  try {
    const json = await postRhSolicitacaoAnexo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/solicitacoes/:id/anexos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/solicitacoes/:id?actorId= — body: { status, atribuido_a? }
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhSolicitacao(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/solicitacoes/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
