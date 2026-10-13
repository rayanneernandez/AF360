const express = require('express');
const { fetchTable, postNotifInboxLidas } = require('../lovable');

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

// Igual ao painel web: tipo vazio conta como alerta. Como "tipo diferente de
// fluxo" não pega vazio no banco, alerta = (tipo 'alerta') + (tipo vazio).
function tipoFilters(tipo) {
  return tipo === 'fluxo' ? [{ tipo: 'fluxo' }] : [{ tipo: 'alerta' }, { tipo__is: 'null' }];
}

function countNaoLidas(colaboradorId, tipo) {
  return Promise.all(
    tipoFilters(tipo).map((f) =>
      fetchTable('notif_inbox', {
        select: 'id',
        limit: 1,
        count: true,
        filters: { colaborador_id: colaboradorId, ...f, lido_em__is: 'null' },
      }).then((json) => json?.count ?? 0)
    )
  ).then((counts) => counts.reduce((a, b) => a + b, 0));
}

// Lista (e total) de um tipo, juntando as consultas de tipoFilters.
async function listarPorTipo(colaboradorId, tipo, somenteNaoLidas, limit, offset) {
  const parts = await Promise.all(
    tipoFilters(tipo).map((f) => {
      const filters = { colaborador_id: colaboradorId, ...f };
      if (somenteNaoLidas) filters.lido_em__is = 'null';
      return fetchTable('notif_inbox', {
        select: SELECT,
        filters,
        order: 'created_at:desc',
        limit: offset + limit,
        offset: 0,
        count: true,
      });
    })
  );
  const rows = parts
    .flatMap((p) => p?.data || [])
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(offset, offset + limit);
  const total = parts.reduce((acc, p) => acc + (p?.count ?? 0), 0);
  return { data: rows, count: total };
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

    const [lista, naoLidasAlerta, naoLidasFluxo] = await Promise.all([
      listarPorTipo(colaboradorId, tipo, somenteNaoLidas, limit, offset),
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

function writeErrorStatus(err) {
  if (err.lovableStatus === 404) return 404;
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/notificacoes/lida  { colaboradorId, id }
router.post('/lida', async (req, res) => {
  try {
    const { colaboradorId, id } = req.body ?? {};
    if (!colaboradorId || !id) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId_or_id' });
    }
    const json = await postNotifInboxLidas({ colaborador_id: colaboradorId, id });
    res.json({ ok: true, data: json ?? {} });
  } catch (err) {
    console.error('[notificacoes/lida POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/notificacoes/lidas-todas  { colaboradorId, tipo? }
router.post('/lidas-todas', async (req, res) => {
  try {
    const { colaboradorId, tipo } = req.body ?? {};
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }
    const body = { colaborador_id: colaboradorId, todas: true };
    if (tipo === 'alerta' || tipo === 'fluxo') body.tipo = tipo;
    const json = await postNotifInboxLidas(body);
    res.json({ ok: true, data: json ?? {} });
  } catch (err) {
    console.error('[notificacoes/lidas-todas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
