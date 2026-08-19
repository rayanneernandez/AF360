const express = require('express');
const {
  getRhExperienciaLista,
  getRhExperienciaHistorico,
  postRhExperienciaAvaliacao,
  deleteRhExperienciaAvaliacao,
} = require('../lovable');

const router = express.Router();

// Período de Experiência (rh_experiencia_avaliacoes) — proxy fino pro
// endpoint confirmado pela Lovable em 19/08/2026
// (/api/public/internal/rh-experiencia). Etapas (1ª=45d/2ª=90d) são
// derivadas de rh_colaboradores.data_admissao do lado deles — não há tabela
// de etapas, só de decisões (aprovado/nao_aprovado).

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/experiencia?busca=&empresaId=&limit=&offset=&actorId=
router.get('/', async (req, res) => {
  try {
    const { busca, empresaId, limit, offset, actorId } = req.query;
    const json = await getRhExperienciaLista({ busca, empresaId, limit, offset }, actorId);
    res.json({
      ok: true,
      hoje: json?.hoje ?? null,
      total: json?.total ?? (Array.isArray(json?.data) ? json.data.length : 0),
      paginas: json?.paginas ?? 1,
      data: json?.data ?? [],
    });
  } catch (err) {
    console.error('[rh/experiencia GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/experiencia/historico?colaboradorId=&actorId=
router.get('/historico', async (req, res) => {
  try {
    const json = await getRhExperienciaHistorico(req.query.colaboradorId, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [] });
  } catch (err) {
    console.error('[rh/experiencia historico] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/experiencia?actorId= — registra aprovação/reprovação
router.post('/', async (req, res) => {
  try {
    const json = await postRhExperienciaAvaliacao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/experiencia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/experiencia/:id?actorId= — desfaz decisão lançada por engano
router.delete('/:id', async (req, res) => {
  try {
    const json = await deleteRhExperienciaAvaliacao(req.params.id, req.query.actorId);
    res.json({ ok: true, aviso: json?.aviso ?? null });
  } catch (err) {
    console.error('[rh/experiencia DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
