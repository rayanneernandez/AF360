const express = require('express');
const {
  getRhUniformes,
  postRhUniformePedido,
  patchRhUniformePedidoAprovar,
  patchRhUniformePedidoRecusar,
  postRhUniformeEntrega,
} = require('../lovable');

const router = express.Router();

// Uniformes e EPI (tabelas rh_op_categorias, rh_op_itens, rh_op_item_tamanhos,
// rh_op_kit_cargo, rh_op_pedidos, rh_op_pedido_itens, rh_op_entregas,
// rh_op_movimentacoes, rh_op_cobrancas, rh_op_termos) — endpoint confirmado
// pela Lovable em 03/08/2026.
//
// GET ?recurso=kit&cargoId=        -> kit do cargo (rh_op_kit_cargo + item)
// GET ?recurso=entregas&colaboradorId=&devolvido=false -> entregas ativas do colaborador
// GET ?recurso=pedidos&colaboradorId= | &status=csv -> pedidos (do colaborador, ou por status pra aprovação da equipe)
// GET ?recurso=itens               -> catálogo + grade de tamanhos
//
// rh_op_pedidos.status: pendente_ciencia | em_aprovacao | aguardando_gerente |
// aguardando_gestao | aprovado | pendente_entrega | entregue | recusado |
// cancelado. Aprovar -> vira pendente_entrega (grava aprovador_id/aprovado_em
// do lado deles, a partir do x-actor-id). Recusar -> exige motivo_recusa.
// Quem aprova: rh_colaboradores.gestor_direto_id (nível gerente) e
// gestor_geral_id (nível gestão), conforme aprovacao_nivel do pedido.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// GET /api/rh/uniformes?recurso=kit|entregas|pedidos|itens&cargoId=&colaboradorId=&devolvido=&status=&actorId=
router.get('/', async (req, res) => {
  try {
    const { recurso, cargoId, colaboradorId, devolvido, status, actorId } = req.query;
    const json = await getRhUniformes({ recurso, cargoId, colaboradorId, devolvido, status }, actorId);
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/uniformes GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

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

module.exports = router;
