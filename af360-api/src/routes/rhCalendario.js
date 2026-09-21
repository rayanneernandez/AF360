const express = require('express');
const {
  getRhCalendario,
  postRhCalendario,
  patchRhCalendario,
  deleteRhCalendario,
  getRhAgendaAssinatura,
  postRhAgendaAssinatura,
  postRhAgendaAssinaturaRotacionar,
  deleteRhAgendaAssinatura,
} = require('../lovable');

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

// --- Assinatura da agenda pessoal (.ics) — recurso='assinatura' no mesmo
// endpoint do calendário (contrato confirmado pela Lovable em 21/09/2026).
// Token fixo por colaborador, sem expiração; GET cria na hora se ainda não
// existir (a menos que criar=0). Rotas específicas ANTES de '/:id' abaixo,
// senão o Express casaria '/assinatura' com o parâmetro :id.

// GET /api/rh/calendario/assinatura?colaboradorId=&criar=0
router.get('/assinatura', async (req, res) => {
  try {
    const { colaboradorId, criar, actorId } = req.query;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaborador_id', message: 'colaboradorId é obrigatório.' });
    }
    const json = await getRhAgendaAssinatura(colaboradorId, criar === '0' || criar === 'false' ? false : undefined, actorId);
    res.json({ ok: true, data: json?.data ?? null });
  } catch (err) {
    console.error('[rh/calendario/assinatura GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/rh/calendario/assinatura?colaboradorId=&actorId= — cria/garante o registro
router.post('/assinatura', async (req, res) => {
  try {
    const { colaboradorId, actorId } = req.query;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaborador_id', message: 'colaboradorId é obrigatório.' });
    }
    const json = await postRhAgendaAssinatura(colaboradorId, actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario/assinatura POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/calendario/assinatura/rotacionar?colaboradorId=&actorId= — troca o token (revoga o link antigo)
router.post('/assinatura/rotacionar', async (req, res) => {
  try {
    const { colaboradorId, actorId } = req.query;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaborador_id', message: 'colaboradorId é obrigatório.' });
    }
    const json = await postRhAgendaAssinaturaRotacionar(colaboradorId, actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario/assinatura/rotacionar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/calendario/assinatura?colaboradorId=&actorId= — revoga sem gerar outro
router.delete('/assinatura', async (req, res) => {
  try {
    const { colaboradorId, actorId } = req.query;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaborador_id', message: 'colaboradorId é obrigatório.' });
    }
    const json = await deleteRhAgendaAssinatura(colaboradorId, actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/calendario/assinatura DELETE] erro:', err.message);
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
