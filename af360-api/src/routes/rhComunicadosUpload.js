const express = require('express');
const { postRhComunicadoUpload, deleteRhComunicadoUpload } = require('../lovable');

const router = express.Router();

// Upload/exclusão de imagem/anexo de comunicado — bucket público
// rh-comunicados, endpoint confirmado pela Lovable em 12/08/2026. Limite:
// 8MB, mimes image/jpeg, image/png, image/webp, application/pdf. Retorna
// URL pública direta (sem expiração — diferente do upload de documentos do
// colaborador, que é privado e usa link assinado).

function writeErrorStatus(err) {
  if (err.lovableStatus === 413) return 413;
  if (err.lovableStatus === 415) return 415;
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/rh/comunicados-upload?actorId=
// body: { comunicado_id?, nome_arquivo, arquivo_base64, mime_type }
// Sem comunicado_id: salva em avulsos/ e só devolve a url (grave em
// anexo_url ao criar o comunicado). Com comunicado_id: já atualiza
// anexo_url sozinho do lado deles.
router.post('/', async (req, res) => {
  try {
    const json = await postRhComunicadoUpload(req.body ?? {}, req.query.actorId);
    res.status(201).json({ ok: true, data: json?.data ?? null, url: json?.url ?? null });
  } catch (err) {
    console.error('[rh/comunicados-upload POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/comunicados-upload?path=...&actorId=  ou  ?comunicadoId=...&actorId=
router.delete('/', async (req, res) => {
  try {
    await deleteRhComunicadoUpload({ path: req.query.path, comunicadoId: req.query.comunicadoId }, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/comunicados-upload DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
