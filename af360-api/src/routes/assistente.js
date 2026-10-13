const express = require('express');
const { postChatPortalDisponivel, postChatPortalMensagem } = require('../lovable');

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

module.exports = router;
