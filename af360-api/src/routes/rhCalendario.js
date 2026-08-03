const express = require('express');
const { getRhCalendario, postRhCalendario, patchRhCalendario, deleteRhCalendario } = require('../lovable');

const router = express.Router();

// rh_calendario_eventos (tabela + endpoint confirmados pela Lovable em
// 03/08/2026). Colunas: titulo, tipo (enum rh_calendario_tipo: feriado|folga|
// escala|treinamento|reuniao|evento|outros), inicio_em, fim_em, dia_inteiro,
// descricao, empresa_id, colaborador_id (null = evento global da empresa).
// GET por padrão traz eventos do colaborador + globais (incluir_globais=1),
// ordenado por inicio_em asc.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/calendario?colaboradorId=&empresaId=&tipo=&de=&ate=&incluirGlobais=&limit=&offset=
router.get('/', async (req, res) => {
  try {
    const { colaboradorId, empresaId, tipo, de, ate, incluirGlobais, limit, offset, actorId } = req.query;
    const json = await getRhCalendario(
      {
        colaboradorId,
        empresaId,
        tipo,
        de,
        ate,
        incluirGlobais: incluirGlobais === undefined ? undefined : incluirGlobais === '1' || incluirGlobais === 'true',
        limit,
        offset,
      },
      actorId
    );
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/calendario GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/calendario?actorId= — body: { titulo, tipo, inicio_em, fim_em?, dia_inteiro?, descricao?, empresa_id?, colaborador_id? }
router.post('/', async (req, res) => {
  try {
    const json = await postRhCalendario(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/calendario/:id?actorId=
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhCalendario(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/calendario/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    const json = await deleteRhCalendario(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
