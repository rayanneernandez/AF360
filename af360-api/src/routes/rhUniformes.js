const express = require('express');
const {
  getRhUniformes,
  postRhUniformePedido,
  patchRhUniformePedidoAprovar,
  patchRhUniformePedidoRecusar,
  postRhUniformeEntrega,
  getRhUniformesCobrancas,
  postRhUniformeCobranca,
  patchRhUniformeCobranca,
  deleteRhUniformeCobranca,
  getRhUniformesEstoque,
  getRhUniformesMovimentacoes,
  postRhUniformeMovimentacao,
  deleteRhUniformeMovimentacao,
  getRhUniformesCategorias,
  postRhUniformeItem,
  postRhUniformeTamanho,
  patchRhUniformeItem,
  patchRhUniformeTamanho,
  deleteRhUniformeItem,
  deleteRhUniformeTamanho,
  postRhUniformeKitCargo,
  deleteRhUniformeKitItem,
  deleteRhUniformeKitCargo,
  getRhUniformeTermo,
  getRhUniformeTermos,
  postRhUniformeTermo,
} = require('../lovable');

const router = express.Router();

// Uniformes e EPI (tabelas rh_op_* — categorias, itens, tamanhos, kit por
// cargo, pedidos, itens do pedido, entregas, movimentações, cobranças,
// termos). Fluxo colaborador/liderança confirmado pela Lovable em
// 03/08/2026; ampliado em 20/08/2026 pra cobrir a tela admin "Recursos
// Operacionais" (cobranças, estoque, itens & grade com escrita, kit com
// escrita, termo versionado) — mesmo endpoint único
// /api/public/internal/rh-uniformes.
//
// GET / com "recurso" no querystring cobre TODAS as leituras (kit, entregas,
// pedidos, itens, categorias, cobrancas, estoque, movimentacoes, termo,
// termos) — repassado direto pra getRhUniformes(). As escritas (POST/PATCH/
// DELETE) ficam em rotas dedicadas abaixo, uma por ação.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/uniformes?recurso=kit|entregas|pedidos|itens|categorias|cobrancas|estoque|movimentacoes|termo|termos
//   &cargoId=&colaboradorId=&devolvido=&status=&tipo=&id=&itemId=&limit=&offset=&actorId=
router.get('/', async (req, res) => {
  try {
    const { recurso, cargoId, colaboradorId, devolvido, status, tipo, id, itemId, limit, offset, actorId } = req.query;
    const json = await getRhUniformes(
      { recurso, cargoId, colaboradorId, devolvido, status, tipo, id: id ?? itemId, limit, offset },
      actorId
    );
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/uniformes GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---- Pedidos (colaborador solicita, liderança aprova/recusa) ----

// POST /api/rh/uniformes/pedidos?actorId= — body: { colaborador_id, tipo, justificativa?, itens: [{item_id, tamanho, quantidade}] }
router.post('/pedidos', async (req, res) => {
  try {
    const json = await postRhUniformePedido(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/pedidos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/uniformes/pedidos/:id/aprovar?actorId=
router.patch('/pedidos/:id/aprovar', async (req, res) => {
  try {
    const json = await patchRhUniformePedidoAprovar(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/pedidos/:id/aprovar PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/uniformes/pedidos/:id/recusar?actorId= — body: { motivo_recusa }
router.patch('/pedidos/:id/recusar', async (req, res) => {
  try {
    const motivo = req.body?.motivo_recusa ?? req.body?.motivoRecusa ?? '';
    const json = await patchRhUniformePedidoRecusar(req.params.id, motivo, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/pedidos/:id/recusar PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/uniformes/entregas?actorId= — body: { pedido_id, colaborador_id, item_id, tamanho, quantidade, valido_ate }
router.post('/entregas', async (req, res) => {
  try {
    const json = await postRhUniformeEntrega(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/entregas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---- Cobranças (rh_op_cobrancas) ----

// POST /api/rh/uniformes/cobrancas?actorId=
router.post('/cobrancas', async (req, res) => {
  try {
    const json = await postRhUniformeCobranca(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/cobrancas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/uniformes/cobrancas/:id?actorId= — body: { status } (lancada|cancelada[+motivo_cancelamento])
router.patch('/cobrancas/:id', async (req, res) => {
  try {
    const json = await patchRhUniformeCobranca(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/cobrancas PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/cobrancas/:id?actorId=
router.delete('/cobrancas/:id', async (req, res) => {
  try {
    await deleteRhUniformeCobranca(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/cobrancas DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---- Estoque / movimentações (rh_op_movimentacoes + view rh_op_estoque_vw) ----

// POST /api/rh/uniformes/movimentacoes?actorId= — body: { item_id, tamanho?, tipo, quantidade, pedido_id?, motivo? }
router.post('/movimentacoes', async (req, res) => {
  try {
    const json = await postRhUniformeMovimentacao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/movimentacoes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/movimentacoes/:id?actorId=
router.delete('/movimentacoes/:id', async (req, res) => {
  try {
    await deleteRhUniformeMovimentacao(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/movimentacoes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---- Itens & Grade (rh_op_itens + rh_op_item_tamanhos) ----

// POST /api/rh/uniformes/itens?actorId= — body pode incluir tamanhos: ["P","M","G"]
router.post('/itens', async (req, res) => {
  try {
    const json = await postRhUniformeItem(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/itens POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/uniformes/itens/:id?actorId=
router.patch('/itens/:id', async (req, res) => {
  try {
    const json = await patchRhUniformeItem(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/itens PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/itens/:id?actorId=
router.delete('/itens/:id', async (req, res) => {
  try {
    await deleteRhUniformeItem(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/itens DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/uniformes/tamanhos?actorId= — body: { item_id, tamanho, ordem? }
router.post('/tamanhos', async (req, res) => {
  try {
    const json = await postRhUniformeTamanho(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/tamanhos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/uniformes/tamanhos/:id?actorId=
router.patch('/tamanhos/:id', async (req, res) => {
  try {
    const json = await patchRhUniformeTamanho(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/tamanhos PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/tamanhos/:id?actorId=
router.delete('/tamanhos/:id', async (req, res) => {
  try {
    await deleteRhUniformeTamanho(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/tamanhos DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---- Kit por cargo (rh_op_kit_cargo) ----

// POST /api/rh/uniformes/kit?actorId= — body: { cargo_id, itens: [{item_id, quantidade}] } — substitui o kit inteiro
router.post('/kit', async (req, res) => {
  try {
    const json = await postRhUniformeKitCargo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/kit POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/kit-cargo/:cargoId?actorId= — limpa o kit inteiro do cargo
router.delete('/kit-cargo/:cargoId', async (req, res) => {
  try {
    await deleteRhUniformeKitCargo(req.params.cargoId, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/kit-cargo DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/uniformes/kit/:id?actorId= — remove um item do kit
router.delete('/kit/:id', async (req, res) => {
  try {
    await deleteRhUniformeKitItem(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/uniformes/kit DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---- Termo de Responsabilidade (rh_op_termos, versionado) ----

// POST /api/rh/uniformes/termo?actorId= — body: { titulo, conteudo } — cria versão nova, desativa a anterior
router.post('/termo', async (req, res) => {
  try {
    const json = await postRhUniformeTermo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/uniformes/termo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
