const express = require('express');
const { fetchTable } = require('../lovable');

const router = express.Router();

// Caixa de notificações (notif_inbox) — mesma tabela e mesmos campos do sino
// do painel web (confirmado pela Lovable em 13/10/2026): modulo é a etiqueta
// (ex.: n8n-ranking-gerente), tipo é 'alerta' | 'fluxo' (definido pelo n8n),
// anexo_url é um link temporário (90 dias) de um único PDF e lido_em vazio
// significa não lida. Quem recebe é identificado pelo colaborador_id.
const SELECT = 'id,colaborador_id,modulo,titulo,mensagem,tipo,anexo_url,created_at,lido_em';
const PAGE_SIZE_DEFAULT = 30;
const PAGE_SIZE_MAX = 100;

function mapRow(row) {
  return {
    id: row.id,
    titulo: row.titulo ?? '',
    mensagem: row.mensagem ?? '',
    tag: row.modulo ?? null,
    tipo: row.tipo === 'fluxo' ? 'fluxo' : 'alerta',
    anexoUrl: row.anexo_url ?? null,
    createdAt: row.created_at ?? null,
    unread: !row.lido_em,
  };
}

function countNaoLidas(colaboradorId, tipo) {
  return fetchTable('notif_inbox', {
    select: 'id',
    limit: 1,
    count: true,
    filters: { colaborador_id: colaboradorId, tipo, lido_em__is: 'null' },
  }).then((json) => json?.count ?? 0);
}

// GET /api/notificacoes/inbox?colaboradorId=&tipo=alerta|fluxo&somenteNaoLidas=1&limit=&offset=
router.get('/inbox', async (req, res) => {
  try {
    const { colaboradorId } = req.query;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }
    const tipo = req.query.tipo === 'fluxo' ? 'fluxo' : 'alerta';
    const somenteNaoLidas = req.query.somenteNaoLidas === '1' || req.query.somenteNaoLidas === 'true';
    const limit = Math.min(Math.max(Number(req.query.limit) || PAGE_SIZE_DEFAULT, 1), PAGE_SIZE_MAX);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const filters = { colaborador_id: colaboradorId, tipo };
    if (somenteNaoLidas) filters.lido_em__is = 'null';

    const [lista, naoLidasAlerta, naoLidasFluxo] = await Promise.all([
      fetchTable('notif_inbox', {
        select: SELECT,
        filters,
        order: 'created_at:desc',
        limit,
        offset,
        count: true,
      }),
      countNaoLidas(colaboradorId, 'alerta'),
      countNaoLidas(colaboradorId, 'fluxo'),
    ]);

    const items = (lista?.data || []).map(mapRow);
    res.json({
      ok: true,
      data: {
        items,
        total: lista?.count ?? items.length,
        naoLidas: { alerta: naoLidasAlerta, fluxo: naoLidasFluxo },
      },
    });
  } catch (err) {
    console.error('[notificacoes/inbox] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
