const express = require('express');
const {
  getMarketingDashboard,
  getMarketingOcorrencias,
  getMarketingOcorrencia,
  postMarketingOcorrencia,
  postMarketingMensagem,
  postMarketingAnexo,
  patchMarketingOcorrencia,
  getMarketingWaConversas,
  getMarketingWaMensagens,
  postMarketingWaEnviar,
  postMarketingWaNova,
  patchMarketingWaConversa,
  postMarketingWaSincronizar,
  getMarketingWaAgenda,
  getMarketingWaTags,
  postMarketingWaMarcarLido,
  getMarketingWaTemplates,
  postMarketingWaEnviarTemplate,
  getMarketingWaSugestoes,
  getMarketingWaRespostas,
  postMarketingWaResposta,
  deleteMarketingWaResposta,
  getMarketingWaAtendentes,
  getMarketingWaMidiaLimites,
  postMarketingWaUploadMidia,
  getGmb,
  getGmbReviews,
  postGmbResponderReview,
  getLevaMais,
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
// confirmado pela Lovable em 31/08/2026: aqui usa modulo=marketing (nome
// completo, diferente das siglas usadas por outros módulos como 'adm'/'gst').
const MARKETING_NOTIF_MODULO = 'marketing';

const router = express.Router();

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// Mesmo padrão de extração usado no Administrativo: prioriza "itens",
// depois "data", só cai no fallback genérico se nenhum dos dois existir.
function extractArrayPayload(json) {
  if (Array.isArray(json)) return { rows: json, count: json.length };
  if (Array.isArray(json?.itens)) return { rows: json.itens, count: json.total ?? json.count ?? json.itens.length };
  if (Array.isArray(json?.data)) return { rows: json.data, count: json.count ?? json.data.length };
  if (json && typeof json === 'object') {
    for (const key of Object.keys(json)) {
      if (Array.isArray(json[key])) {
        return { rows: json[key], count: json.count ?? json[key].length };
      }
    }
  }
  return { rows: [], count: 0 };
}

// GET /api/marketing?recurso=dashboard|ocorrencias|ocorrencia|wa-conversas|
//   wa-mensagens|gmb|gmb-reviews|leva-metricas|leva-lojas|leva-frentistas|leva-status&...
router.get('/', async (req, res) => {
  const { recurso, actorId, ...params } = req.query;
  try {
    switch (recurso) {
      case 'dashboard': {
        const json = await getMarketingDashboard(params, actorId);
        return res.json({ ok: true, data: json?.data ?? json });
      }
      case 'ocorrencias': {
        const json = await getMarketingOcorrencias(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({
          ok: true,
          count,
          data: rows,
          porStatus: json?.por_status ?? [],
          opcoes: json?.opcoes ?? {},
        });
      }
      case 'ocorrencia': {
        if (!params.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
        const json = await getMarketingOcorrencia(params.id, actorId);
        const row = json?.data ?? json ?? {};
        return res.json({ ok: true, data: row });
      }
      case 'wa-conversas': {
        const json = await getMarketingWaConversas(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows, contadores: json?.contadores ?? {} });
      }
      case 'wa-mensagens': {
        if (!params.phone) return res.status(400).json({ ok: false, error: 'phone_obrigatorio' });
        const json = await getMarketingWaMensagens(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows, contato: json?.contato ?? null });
      }
      case 'wa-agenda': {
        const json = await getMarketingWaAgenda(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'wa-tags': {
        const json = await getMarketingWaTags(actorId);
        const { rows } = extractArrayPayload(json);
        return res.json({ ok: true, data: rows });
      }
      case 'wa-templates': {
        const json = await getMarketingWaTemplates(params, actorId);
        const { rows } = extractArrayPayload(json);
        return res.json({ ok: true, data: rows });
      }
      case 'wa-sugestoes': {
        if (!params.phone) return res.status(400).json({ ok: false, error: 'phone_obrigatorio' });
        const json = await getMarketingWaSugestoes(params, actorId);
        const { rows } = extractArrayPayload(json);
        return res.json({ ok: true, data: rows });
      }
      case 'wa-respostas': {
        const json = await getMarketingWaRespostas(actorId);
        const { rows } = extractArrayPayload(json);
        return res.json({ ok: true, data: rows });
      }
      case 'wa-atendentes': {
        const json = await getMarketingWaAtendentes(actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'wa-midia-limites': {
        const json = await getMarketingWaMidiaLimites(actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'gmb': {
        const json = await getGmb({ limit: params.limit, offset: params.offset, runs: 10, actorId });
        const data = json?.data ?? json ?? {};
        return res.json({
          ok: true,
          data: {
            status: data.status ?? null,
            locations: data.locations ?? [],
            locationsCount: data.locations_count ?? (data.locations ?? []).length,
          },
        });
      }
      case 'gmb-reviews': {
        const json = await getGmbReviews(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, status: json?.status ?? null, data: rows });
      }
      case 'leva-metricas': {
        const json = await getLevaMais(
          { recurso: 'metricas', startDate: params.startDate, endDate: params.endDate, storeId: params.storeId },
          actorId
        );
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'leva-lojas': {
        const json = await getLevaMais({ recurso: 'lojas' }, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'leva-frentistas': {
        const json = await getLevaMais({ recurso: 'frentistas' }, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'leva-status': {
        const json = await getLevaMais({ recurso: 'status' }, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      default:
        return res.status(400).json({ ok: false, error: 'recurso_invalido' });
    }
  } catch (err) {
    console.error('[marketing GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// --- Ocorrências (CRUD + histórico) ---

// POST /api/marketing/ocorrencia?actorId= — body: assunto (obrigatório);
// canal, prioridade, cliente_nome, cliente_email, cliente_telefone,
// responsavel_id, descricao, link (opcionais). SLA calculado no servidor.
router.post('/ocorrencia', async (req, res) => {
  try {
    const json = await postMarketingOcorrencia(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/ocorrencia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/marketing/ocorrencia/:id?actorId= — body: { status, prioridade, responsavel_id }.
router.patch('/ocorrencia/:id', async (req, res) => {
  try {
    const json = await patchMarketingOcorrencia(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/ocorrencia/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/ocorrencia/:id/mensagem?actorId= — body: { mensagem, interna }.
router.post('/ocorrencia/:id/mensagem', async (req, res) => {
  try {
    const json = await postMarketingMensagem(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/ocorrencia/:id/mensagem POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/ocorrencia/:id/anexo?actorId= — body: { nome_arquivo, arquivo_base64, mime_type }.
router.post('/ocorrencia/:id/anexo', async (req, res) => {
  try {
    const json = await postMarketingAnexo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/ocorrencia/:id/anexo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- WhatsApp (inbox) ---

// POST /api/marketing/wa-enviar?actorId= — body: { phone, mensagem, ... }.
router.post('/wa-enviar', async (req, res) => {
  try {
    const json = await postMarketingWaEnviar(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-enviar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-nova?actorId= — body: { phone, display_name, mensagem, ... }.
router.post('/wa-nova', async (req, res) => {
  try {
    const json = await postMarketingWaNova(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-nova POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/marketing/wa-conversa/:phone?actorId= — body: { chat_status,
// atendente_id, display_name, tags: [], notas, muted, blocked }.
router.patch('/wa-conversa/:phone', async (req, res) => {
  try {
    const json = await patchMarketingWaConversa(req.params.phone, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-conversa/:phone PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-sincronizar?actorId= — botão de refresh da lista.
router.post('/wa-sincronizar', async (req, res) => {
  try {
    const json = await postMarketingWaSincronizar(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-sincronizar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-marcar-lido?actorId= — body: { phone }.
router.post('/wa-marcar-lido', async (req, res) => {
  try {
    const json = await postMarketingWaMarcarLido(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-marcar-lido POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-enviar-template?actorId= — body: { phone, template_name, language?, variables }.
router.post('/wa-enviar-template', async (req, res) => {
  try {
    const json = await postMarketingWaEnviarTemplate(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-enviar-template POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-upload-midia?actorId= — body: { tipo, mime_type,
// file_name?, media_base64 }. Devolve { media_url, path, mime_type,
// file_name, tamanho_bytes, tipo, expira_em }.
router.post('/wa-upload-midia', async (req, res) => {
  try {
    const json = await postMarketingWaUploadMidia(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-upload-midia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/wa-resposta?actorId= — body: { id?, atalho, texto }.
router.post('/wa-resposta', async (req, res) => {
  try {
    const json = await postMarketingWaResposta(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/wa-resposta POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/marketing/wa-resposta?actorId=&id=
router.delete('/wa-resposta', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteMarketingWaResposta(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[marketing/wa-resposta DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Google (avaliações) ---

// POST /api/marketing/gmb-review/responder?actorId= — body: { reviewId, texto }.
router.post('/gmb-review/responder', async (req, res) => {
  try {
    const json = await postGmbResponderReview(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[marketing/gmb-review/responder POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Notificações (Rotinas + Templates) — mesmo sistema genérico do
// Financeiro/Gestão/Administrativo, aqui fixado em modulo=marketing. ---

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

// GET /api/marketing/notif-rotinas?q=&ativa=&limit=&offset=
router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(MARKETING_NOTIF_MODULO, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[marketing/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/marketing/notif-rotinas?actorId=
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(MARKETING_NOTIF_MODULO, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[marketing/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/marketing/notif-rotinas/:id?actorId=
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(MARKETING_NOTIF_MODULO, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[marketing/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/marketing/notif-rotinas/:id?actorId=
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(MARKETING_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[marketing/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/marketing/notif-rotinas/:id/executar?actorId=
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(MARKETING_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[marketing/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/marketing/notif-templates?q=&ativo=
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: MARKETING_NOTIF_MODULO, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[marketing/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/marketing/notif-templates?actorId= — modulo é sempre forçado pra 'marketing'
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate({ ...(req.body ?? {}), modulo: MARKETING_NOTIF_MODULO }, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[marketing/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/marketing/notif-templates/:id?actorId=
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[marketing/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/marketing/notif-templates/:id?actorId= — 409 se for padrão do sistema
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[marketing/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
