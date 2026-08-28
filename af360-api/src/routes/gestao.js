const express = require('express');
const {
  getGestaoPostos,
  getGestaoUltimaData,
  getGestaoDashboard,
  getGestaoVendas,
  getGestaoAbastecimentos,
  getGestaoMargem,
  getGestaoEncerrante,
  getAdminNotifRotinas,
  postAdminNotifRotina,
  patchAdminNotifRotina,
  deleteAdminNotifRotina,
  postAdminNotifRotinaExecutar,
  getAdminNotifTemplates,
  postAdminNotifTemplate,
  patchAdminNotifTemplate,
  deleteAdminNotifTemplate,
} = require('../lovable');

// Módulo fixo pro sistema genérico de Notificações (Rotinas/Templates),
// confirmado pela Lovable em 28/08/2026: o Gestão usa modulo=gst.
const GESTAO_NOTIF_MODULO = 'gst';

const router = express.Router();

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/gestao?recurso=postos|ultima-data|dashboard|vendas|abastecimentos|margem|encerrante&...
router.get('/', async (req, res) => {
  const { recurso, actorId, ...params } = req.query;
  try {
    let json;
    switch (recurso) {
      case 'postos':
        json = await getGestaoPostos(actorId);
        break;
      case 'ultima-data':
        json = await getGestaoUltimaData(actorId);
        break;
      case 'dashboard':
        json = await getGestaoDashboard(params, actorId);
        break;
      case 'vendas':
        json = await getGestaoVendas(params, actorId);
        break;
      case 'abastecimentos':
        json = await getGestaoAbastecimentos(params, actorId);
        break;
      case 'margem':
        json = await getGestaoMargem(params, actorId);
        break;
      case 'encerrante':
        json = await getGestaoEncerrante(params, actorId);
        break;
      default:
        return res.status(400).json({ ok: false, error: 'recurso_invalido' });
    }
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[gestao GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// --- Notificações (Rotinas + Templates) — mesmo sistema genérico do
// Financeiro/Admin, aqui fixado em modulo=gst. ---

function mapNotifRotinaRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    templateId: row.template_id ?? null,
    isActive: Boolean(row.ativa),
    tipoGatilho: row.tipo_gatilho ?? 'manual',
    cronExpressao: row.cron_expressao ?? null,
    eventoCodigo: row.evento_codigo ?? null,
    canais: Array.isArray(row.canais) ? row.canais : [],
    publicoTipo: row.publico_tipo ?? 'todos',
    publicoIds: Array.isArray(row.publico_ids) ? row.publico_ids : [],
    ultimaExecucao: row.ultima_execucao ?? null,
    proximaExecucao: row.proxima_execucao ?? null,
    totalDestinos: row.total_destinos ?? 0,
    totalEnviados: row.total_enviados ?? 0,
    status: row.status ?? null,
    agendadaPara: row.agendada_para ?? null,
  };
}

function mapNotifTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    modulo: row.modulo ?? null,
    codigo: row.codigo ?? null,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    variaveis: Array.isArray(row.variaveis) ? row.variaveis : [],
    isPadrao: Boolean(row.padrao),
    isActive: Boolean(row.ativo),
  };
}

// GET /api/gestao/notif-rotinas?q=&ativa=&limit=&offset=
router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(GESTAO_NOTIF_MODULO, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[gestao/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/gestao/notif-rotinas?actorId=
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(GESTAO_NOTIF_MODULO, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[gestao/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/gestao/notif-rotinas/:id?actorId=
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(GESTAO_NOTIF_MODULO, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[gestao/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/gestao/notif-rotinas/:id?actorId=
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(GESTAO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[gestao/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/gestao/notif-rotinas/:id/executar?actorId=
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(GESTAO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[gestao/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/gestao/notif-templates?q=&ativo=
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: GESTAO_NOTIF_MODULO, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[gestao/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/gestao/notif-templates?actorId= — modulo é sempre forçado pra 'gst'
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate({ ...(req.body ?? {}), modulo: GESTAO_NOTIF_MODULO }, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[gestao/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/gestao/notif-templates/:id?actorId=
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[gestao/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/gestao/notif-templates/:id?actorId= — 409 se for padrão do sistema
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[gestao/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
