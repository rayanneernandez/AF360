const express = require('express');
const { getRhJornadas, postRhJornada, patchRhJornada, deleteRhJornada } = require('../lovable');

const router = express.Router();

// Jornadas (rh_jornadas) — proxy fino pro endpoint confirmado pela Lovable
// em 19/08/2026 (/api/public/internal/rh-jornadas). empresa_id nulo =
// jornada global ("Todas as empresas"). DELETE pode devolver 409 se tiver
// colaborador vinculado (rh_colaboradores.jornada_id) — nesse caso o
// frontend deve sugerir inativar em vez de excluir.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/jornadas?empresaId=&ativo=&busca=&limit=&offset=&actorId=
router.get('/', async (req, res) => {
  try {
    const { empresaId, ativo, busca, limit, offset, actorId } = req.query;
    const json = await getRhJornadas({ empresaId, ativo, busca, limit, offset }, actorId);
    res.json({
      ok: true,
      data: json?.data ?? [],
      count: json?.count ?? (Array.isArray(json?.data) ? json.data.length : 0),
      regimes: json?.regimes ?? null,
    });
  } catch (err) {
    console.error('[rh/jornadas GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/jornadas?actorId= — cria uma jornada
router.post('/', async (req, res) => {
  try {
    const json = await postRhJornada(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/jornadas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/jornadas/:id?actorId= — edita (inclui toggle ativa/inativa: { ativo })
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhJornada(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/jornadas PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/jornadas/:id?actorId= — 409 se houver colaborador vinculado
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhJornada(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/jornadas DELETE] erro:', err.message);
    if (err.lovableStatus === 409) {
      return res.status(409).json({
        ok: false,
        error: 'colaborador_vinculado',
        message: err.message || 'Há colaboradores vinculados a essa jornada. Inative em vez de excluir.',
      });
    }
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
