const express = require('express');
const { postRhDocumentoUpload, getRhDocumento, deleteRhDocumentoUpload } = require('../lovable');

const router = express.Router();

// rh_documentos — upload/download/exclusão de arquivo real, endpoint
// confirmado pela Lovable em 11/08/2026 (mesmo bucket do painel web —
// aparece na hora lá também). Body sempre em JSON com arquivo_base64.
// Limite deles: 10MB, mimes application/pdf, image/jpeg, image/png,
// image/webp (415/413 se não bater). NOTA: o Vercel tem um teto próprio de
// tamanho de payload pras Serverless Functions (bem menor que os 15MB que
// liberamos aqui no express.json) — arquivos grandes podem falhar por causa
// disso mesmo estando dentro do limite da Lovable; se isso acontecer na
// prática, considerar upload direto do app pro Storage (URL assinada) em
// vez de passar o arquivo pelo nosso backend.

function writeErrorStatus(err) {
  if (err.lovableStatus === 413) return 413;
  if (err.lovableStatus === 415) return 415;
  if (err.lovableStatus === 404) return 404;
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/documentos?actorId=
// body: { colaborador_id, tipo, nome_arquivo, arquivo_base64, mime_type, data_validade?, data_emissao?, observacoes? }
router.post('/', async (req, res) => {
  try {
    const json = await postRhDocumentoUpload(req.body ?? {}, req.query.actorId);
    res.status(201).json({ ok: true, data: json?.data ?? json, url: json?.url ?? null });
  } catch (err) {
    console.error('[rh/documentos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/rh/documentos/:id?actorId= -> { data, url } (link assinado, 1h)
router.get('/:id', async (req, res) => {
  try {
    const json = await getRhDocumento(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? null, url: json?.url ?? null });
  } catch (err) {
    console.error('[rh/documentos GET] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// DELETE /api/rh/documentos/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhDocumentoUpload(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/documentos DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
