const express = require('express');
const {
  getRhComunicados,
  postRhComunicado,
  patchRhComunicado,
  deleteRhComunicado,
  postRhComunicadoLeitura,
  getRhComunicadoLeituras,
} = require('../lovable');

const router = express.Router();

// rh_comunicados (endpoint dedicado confirmado pela Lovable em 03/08/2026).
// Colunas: titulo*, conteudo*, publico (enum rh_comunicado_publico: todos|
// empresa|grupo|colaborador; default todos), empresa_id, grupo_id,
// colaborador_id, publicar_em (default agora), expira_em, anexo_url.
// A leitura simples (dashboard/lista do colaborador) continua vindo de
// rhDashboard.js via fetchAllRows — este módulo é a escrita real (criar/
// editar/excluir comunicado pelo painel do RH) + marcar "lido".

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/comunicados?empresaId=&grupoId=&colaboradorId=&publico=&vigentes=&limit=&offset=
router.get('/', async (req, res) => {
  try {
    const { empresaId, grupoId, colaboradorId, publico, vigentes, limit, offset, actorId } = req.query;
    const json = await getRhComunicados(
      { empresaId, grupoId, colaboradorId, publico, vigentes: vigentes === '1' || vigentes === 'true', limit, offset },
      actorId
    );
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/comunicados GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/comunicados?actorId= — body: { titulo, conteudo, publico?, empresa_id?, grupo_id?, colaborador_id?, publicar_em?, expira_em?, anexo_url? }
router.post('/', async (req, res) => {
  try {
    const json = await postRhComunicado(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/comunicados POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/comunicados/:id?actorId=
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhComunicado(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/comunicados PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/comunicados/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    const json = await deleteRhComunicado(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/comunicados DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/rh/comunicados/:id/leituras -> lista { colaborador_id, lido_em }
// de quem já visualizou (usada no painel do RH pro botão "olho" — nome/
// cargo/empresa de cada colaborador são resolvidos no frontend, cruzando
// com a lista de colaboradores/unidades que a tela já carrega).
router.get('/:id/leituras', async (req, res) => {
  try {
    const json = await getRhComunicadoLeituras(req.params.id);
    const row = json?.data ?? [];
    res.json({ ok: true, count: json?.count ?? row.length, data: row });
  } catch (err) {
    console.error('[rh/comunicados/:id/leituras GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/comunicados/:id/lido?actorId= — body: { colaborador_id } — upsert em rh_comunicado_leituras
router.post('/:id/lido', async (req, res) => {
  try {
    const colaboradorId = req.body?.colaborador_id;
    if (!colaboradorId) {
      res.status(400).json({ ok: false, error: 'missing_colaborador_id', message: 'colaborador_id é obrigatório.' });
      return;
    }
    const json = await postRhComunicadoLeitura(req.params.id, colaboradorId, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/comunicados lido] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
