const express = require('express');
const {
  getRhPdfImports,
  postRhPdfImportUpload,
  getRhPdfImportDetalhe,
  deleteRhPdfImport,
  postRhPdfImportAplicarAdmissao,
  postRhPdfImportAplicarDesligamento,
  postRhPdfImportReprocessar,
} = require('../lovable');

const router = express.Router();

// rh_pdf_imports — tabela liberada no allowlist da Lovable (LOVABLE_API.md
// §6.6, 21/07/2026): arquivo_path, arquivo_nome, arquivo_mime,
// arquivo_tamanho, tipo (admissao|desligamento|experiencia|outro), status
// (pendente|processando|pronto|aplicado|erro), extracao_json, modelo_ia,
// confianca, cpf_extraido, nome_extraido, colaborador_id, erro,
// aplicado_em, aplicado_por, resultado_aplicacao.
//
// Escrita (upload+IA, aplicar admissão/desligamento, excluir, reprocessar)
// confirmada pela Lovable em 12/08/2026: /api/public/internal/rh-pdf-import.

function writeErrorStatus(err) {
  if (err.lovableStatus === 409) return 409;
  if (err.lovableStatus === 413) return 413;
  if (err.lovableStatus === 415) return 415;
  if (err.lovableStatus === 422) return 422;
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/importacoes-pdf?status=&tipo= -> histórico (lista completa)
router.get('/', async (req, res) => {
  try {
    const { status, tipo } = req.query;
    const json = await getRhPdfImports({ status, tipo });
    const row = json?.data ?? [];
    res.json({ ok: true, count: json?.count ?? row.length, data: row });
  } catch (err) {
    console.error('[rh/importacoes-pdf GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/importacoes-pdf?processar=0&actorId=
// body: { nome_arquivo, arquivo_base64, mime_type } ou { arquivos: [...] }
// Sem ?processar=0, já dispara a extração por IA na hora.
router.post('/', async (req, res) => {
  try {
    const processar = req.query.processar === '0' || req.query.processar === 'false' ? false : undefined;
    const json = await postRhPdfImportUpload(req.body ?? {}, { processar }, req.query.actorId);
    res.status(201).json({ ok: true, itens: json?.itens ?? [], erros: json?.erros ?? [] });
  } catch (err) {
    console.error('[rh/importacoes-pdf POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/rh/importacoes-pdf/:id?actorId= -> detalhe + url assinada (polling)
router.get('/:id', async (req, res) => {
  try {
    const json = await getRhPdfImportDetalhe(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? null, url: json?.url ?? null });
  } catch (err) {
    console.error('[rh/importacoes-pdf GET :id] erro:', err.message);
    res.status(err.lovableStatus === 404 ? 404 : 500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/importacoes-pdf/:id/aplicar-admissao?actorId=
// body opcional: { pessoa, contrato, bancarios, empresa_id } (sobrescreve a
// extração revisada).
router.post('/:id/aplicar-admissao', async (req, res) => {
  try {
    const json = await postRhPdfImportAplicarAdmissao(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? null });
  } catch (err) {
    console.error('[rh/importacoes-pdf aplicar-admissao] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/importacoes-pdf/:id/aplicar-desligamento?actorId=
// body opcional: { colaborador_id?, cpf?, data_demissao?, motivo?, valor_rescisao_liquida? }
router.post('/:id/aplicar-desligamento', async (req, res) => {
  try {
    const json = await postRhPdfImportAplicarDesligamento(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? null });
  } catch (err) {
    console.error('[rh/importacoes-pdf aplicar-desligamento] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/importacoes-pdf/:id/reprocessar?actorId=
router.post('/:id/reprocessar', async (req, res) => {
  try {
    const json = await postRhPdfImportReprocessar(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? null });
  } catch (err) {
    console.error('[rh/importacoes-pdf reprocessar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/importacoes-pdf/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhPdfImport(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/importacoes-pdf DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
