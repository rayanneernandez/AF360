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
  getFinanceiroConfig,
} = require('../lovable');

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
router.delete('/conciliar/:movimentoCodigo', async (req, res) => {
  try {
    await deleteFinanceiroConciliar(req.params.movimentoCodigo, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[financeiro conciliar DELETE] erro:', err.message);
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

module.exports = router;
