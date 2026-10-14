const express = require('express');
const {
  postChatPortalDisponivel,
  postChatPortalMensagem,
  postAssistenteMensagens,
  postAssistenteLidas,
  postAssistenteNaoLidas,
} = require('../lovable');

const router = express.Router();

// Assistente AF360 — mesmas regras do chat do painel web (confirmado pela
// Lovable em 13/10/2026): acesso por cargo (diretor/supervisor/gerente) do
// colaborador ligado ao login; conversa única portal-{colaborador_id}.
const MENSAGEM_MAX = 4000;

// POST /api/assistente/disponivel  { colaboradorId }
router.post('/disponivel', async (req, res) => {
  try {
    const { colaboradorId } = req.body ?? {};
    if (!colaboradorId) return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    const json = await postChatPortalDisponivel({ colaborador_id: colaboradorId });
    res.json({ ok: true, data: { disponivel: json?.disponivel === true, papel: json?.papel ?? null, motivo: json?.motivo ?? null } });
  } catch (err) {
    console.error('[assistente/disponivel] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/assistente/mensagem  { colaboradorId, mensagem }
router.post('/mensagem', async (req, res) => {
  try {
    const { colaboradorId } = req.body ?? {};
    const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem.trim() : '';
    if (!colaboradorId || !mensagem) return res.status(400).json({ ok: false, error: 'missing_colaboradorId_or_mensagem' });
    if (mensagem.length > MENSAGEM_MAX) return res.status(400).json({ ok: false, error: 'mensagem_muito_longa' });
    const json = await postChatPortalMensagem({ colaborador_id: colaboradorId, mensagem });
    if (json?.ok === true) return res.json({ ok: true, data: { resposta: String(json.resposta ?? '') } });
    res.json({ ok: false, error: json?.erro ?? 'falha', motivo: json?.motivo ?? null });
  } catch (err) {
    console.error('[assistente/mensagem] erro:', err.message);
    res.status(500).json({ ok: false, error: 'send_failed', message: err.message });
  }
});

// Conversa do Assistente: alertas, fluxos e chat juntos (chat_portal_mensagens
// + notif_inbox antiga), confirmado pela Lovable em 14/10/2026.
function writeErrorStatus(err) {
  if (err.lovableStatus === 404) return 404;
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/assistente/mensagens  { colaboradorId, tipo?, busca?, limite?, antesDe? }
router.post('/mensagens', async (req, res) => {
  try {
    const { colaboradorId, tipo, busca, limite, antesDe } = req.body ?? {};
    if (!colaboradorId) return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    const json = await postAssistenteMensagens({
      colaborador_id: colaboradorId,
      tipo: ['alerta', 'fluxo', 'chat'].includes(tipo) ? tipo : 'todos',
      busca: typeof busca === 'string' && busca.trim() ? busca.trim() : undefined,
      limite: Math.min(Math.max(Number(limite) || 50, 1), 100),
      antes_de: antesDe || undefined,
    });
    res.json({
      ok: true,
      data: {
        total: json?.total ?? 0,
        itens: Array.isArray(json?.itens) ? json.itens : [],
        temMais: json?.tem_mais === true,
        proximoAntesDe: json?.proximo_antes_de ?? null,
      },
    });
  } catch (err) {
    console.error('[assistente/mensagens] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/assistente/lidas  { colaboradorId, id? | todas?, tipo? }
router.post('/lidas', async (req, res) => {
  try {
    const { colaboradorId, id, todas, tipo } = req.body ?? {};
    if (!colaboradorId || (!id && !todas)) return res.status(400).json({ ok: false, error: 'missing_fields' });
    const body = { colaborador_id: colaboradorId };
    if (id) body.id = id;
    else {
      body.todas = true;
      if (['alerta', 'fluxo', 'chat'].includes(tipo)) body.tipo = tipo;
    }
    const json = await postAssistenteLidas(body);
    res.json({ ok: true, data: { marcadas: json?.marcadas ?? 0 } });
  } catch (err) {
    console.error('[assistente/lidas] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/assistente/nao-lidas  { colaboradorId }
router.post('/nao-lidas', async (req, res) => {
  try {
    const { colaboradorId } = req.body ?? {};
    if (!colaboradorId) return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    const json = await postAssistenteNaoLidas({ colaborador_id: colaboradorId });
    res.json({
      ok: true,
      data: {
        alerta: json?.alerta ?? 0,
        fluxo: json?.fluxo ?? 0,
        chat: json?.chat ?? 0,
        total: json?.total ?? 0,
      },
    });
  } catch (err) {
    console.error('[assistente/nao-lidas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
