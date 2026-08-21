const express = require('express');
const {
  getFinanceiroDashboard,
  getFinanceiroContas,
  getFinanceiroFluxoCaixa,
  getFinanceiroConciliacao,
  postFinanceiroConciliar,
  deleteFinanceiroConciliar,
  getFinanceiroBalancete,
  getFinanceiroFornecedores,
  getFinanceiroCentrosCusto,
  getFinanceiroContasBancarias,
  getFinanceiroIaPredicoes,
  postFinanceiroIaResponder,
  postFinanceiroIaReanalisar,
  getFinanceiroProjecoes,
  getFinanceiroRelatorio,
  postFinanceiroDesconciliar,
  getFinanceiroTitulosConciliar,
  getFinanceiroConfig,
  postFinanceiroConfigChave,
  postFinanceiroConfigTestar,
  postFinanceiroConfigPosto,
  patchFinanceiroConfigPosto,
  deleteFinanceiroConfigPosto,
  postFinanceiroConfigLimparCache,
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

// Módulo fixo pro sistema genérico de Notificações (Rotinas/Templates) —
// confirmado pela Lovable em 21/08/2026: o Financeiro usa modulo=fin (tabela
// fin_notificacoes), NUNCA "financeiro". Fixado aqui no servidor pra não
// depender do que o app manda.
const FINANCEIRO_NOTIF_MODULO = 'fin';

const router = express.Router();

// Financeiro (Gestão de Caixa) — endpoint confirmado pela Lovable em
// 21/08/2026: /api/public/internal/financeiro. NÃO existe tabela rf_* — é
// 99% read-through da API Quality em tempo real; só fin_dre_chaves,
// fin_conciliacoes, fin_ia_* e fin_notificacoes ficam no banco de verdade.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/financeiro?recurso=dashboard|contas|fluxo-caixa|conciliacao|balancete|fornecedores|centros-custo|contas-bancarias|ia-predicoes|projecoes|relatorio|config&...
router.get('/', async (req, res) => {
  const { recurso, actorId, ...params } = req.query;
  try {
    let json;
    switch (recurso) {
      case 'dashboard':
        json = await getFinanceiroDashboard(params, actorId);
        break;
      case 'contas':
        json = await getFinanceiroContas(params, actorId);
        break;
      case 'fluxo-caixa':
        json = await getFinanceiroFluxoCaixa(params, actorId);
        break;
      case 'conciliacao':
        json = await getFinanceiroConciliacao(params, actorId);
        break;
      case 'balancete':
        json = await getFinanceiroBalancete(params, actorId);
        break;
      case 'fornecedores':
        json = await getFinanceiroFornecedores(params, actorId);
        break;
      case 'centros-custo':
        json = await getFinanceiroCentrosCusto(actorId);
        break;
      case 'contas-bancarias':
        json = await getFinanceiroContasBancarias(params, actorId);
        break;
      case 'ia-predicoes':
        json = await getFinanceiroIaPredicoes(params, actorId);
        break;
      case 'projecoes':
        json = await getFinanceiroProjecoes(params, actorId);
        break;
      case 'relatorio':
        json = await getFinanceiroRelatorio(params, actorId);
        break;
      case 'titulos-conciliar':
        json = await getFinanceiroTitulosConciliar(params, actorId);
        break;
      case 'config':
        json = await getFinanceiroConfig(actorId);
        break;
      default:
        return res.status(400).json({ ok: false, error: 'recurso_invalido' });
    }
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[financeiro GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/financeiro/conciliar?actorId= — vincular manualmente (upsert em fin_conciliacoes)
router.post('/conciliar', async (req, res) => {
  try {
    const json = await postFinanceiroConciliar(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro conciliar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/financeiro/conciliar/:movimentoCodigo?actorId= — desvincular
// (mantido por compatibilidade; o dispatch completo da Lovable, confirmado em
// 21/08/2026, usa a AÇÃO "desconciliar" via POST — ver rota abaixo).
router.delete('/conciliar/:movimentoCodigo', async (req, res) => {
  try {
    await deleteFinanceiroConciliar(req.params.movimentoCodigo, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[financeiro conciliar DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/desconciliar?actorId= — body: { movimento_codigo }
router.post('/desconciliar', async (req, res) => {
  try {
    const json = await postFinanceiroDesconciliar(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro desconciliar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/ia-responder?actorId= — body: { predicao_id, resposta: 'sim'|'nao', justificativa? }
router.post('/ia-responder', async (req, res) => {
  try {
    const json = await postFinanceiroIaResponder(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro ia-responder] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/ia-reanalisar?actorId= — dispara a mesma geração do cron sob demanda
router.post('/ia-reanalisar', async (req, res) => {
  try {
    const json = await postFinanceiroIaReanalisar(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro ia-reanalisar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: escrita (chave global, testar conexão, CRUD de posto) —
// confirmado pela Lovable em 21/08/2026. ---

// POST /api/financeiro/config/chave?actorId= — body: { chave } (mín. 8 chars)
router.post('/config/chave', async (req, res) => {
  try {
    const json = await postFinanceiroConfigChave(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro config/chave POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/config/testar?actorId= — testa a chave já salva na Quality
router.post('/config/testar', async (req, res) => {
  try {
    const json = await postFinanceiroConfigTestar(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro config/testar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/config/posto?actorId= — body: { nome, empresaCodigo, idq?, ativo? }
router.post('/config/posto', async (req, res) => {
  try {
    const json = await postFinanceiroConfigPosto(req.body ?? {}, req.query.actorId);
    res.status(201).json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro config/posto POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/financeiro/config/posto/:id?actorId= — campos parciais
router.patch('/config/posto/:id', async (req, res) => {
  try {
    const json = await patchFinanceiroConfigPosto(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro config/posto PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/financeiro/config/posto/:id?actorId=
router.delete('/config/posto/:id', async (req, res) => {
  try {
    await deleteFinanceiroConfigPosto(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[financeiro config/posto DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/config/limpar-cache?actorId=
router.post('/config/limpar-cache', async (req, res) => {
  try {
    const json = await postFinanceiroConfigLimparCache(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[financeiro config/limpar-cache POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Notificações (Rotinas + Templates) — sistema genérico já usado pelo
// Administrador, aqui fixado em modulo=fin (tabela fin_notificacoes),
// confirmado pela Lovable em 21/08/2026. ---

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

// GET /api/financeiro/notif-rotinas?q=&ativa=&limit=&offset=
router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(FINANCEIRO_NOTIF_MODULO, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[financeiro/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/financeiro/notif-rotinas?actorId=
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(FINANCEIRO_NOTIF_MODULO, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[financeiro/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/financeiro/notif-rotinas/:id?actorId=
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(FINANCEIRO_NOTIF_MODULO, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[financeiro/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/financeiro/notif-rotinas/:id?actorId=
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(FINANCEIRO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[financeiro/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/financeiro/notif-rotinas/:id/executar?actorId=
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(FINANCEIRO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[financeiro/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/financeiro/notif-templates?q=&ativo=
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: FINANCEIRO_NOTIF_MODULO, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[financeiro/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/financeiro/notif-templates?actorId= — modulo é sempre forçado pra 'fin'
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate({ ...(req.body ?? {}), modulo: FINANCEIRO_NOTIF_MODULO }, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[financeiro/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/financeiro/notif-templates/:id?actorId=
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[financeiro/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/financeiro/notif-templates/:id?actorId= — 409 se for padrão do sistema
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[financeiro/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
