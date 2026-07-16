const express = require('express');
const { fetchTable, patchDirContato } = require('../lovable');

const router = express.Router();

function isPendente(contato) {
  if (!contato.last_inbound_at) return false;
  if (!contato.last_outbound_at) return true;
  return new Date(contato.last_inbound_at) > new Date(contato.last_outbound_at);
}

// dir_mensagens.direction já é o enum 'in'/'out' (confirmado na doc oficial
// do Lovable) — antes assumíamos 'inbound'/'outbound' por engano.
function mapDirection(direction) {
  return direction === 'out' ? 'out' : 'in';
}

// GET /api/diretoria/conversas?q=busca
// Lista os contatos reais de dir_contatos (fonte de verdade do "Fale com a
// Diretoria"), com a última mensagem e contagem de pendentes de cada um.
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filters = {};
    if (q) filters.display_name__ilike = `%${q}%`;

    const contatosJson = await fetchTable('dir_contatos', {
      order: 'last_inbound_at:desc',
      limit: 500,
      filters,
    });
    const contatos = contatosJson.data || [];

    const data = await Promise.all(
      contatos.map(async (contato) => {
        const [ultimaMsgJson, pendentesJson] = await Promise.all([
          fetchTable('dir_mensagens', {
            filters: { phone: contato.phone },
            order: 'created_at:desc',
            limit: 1,
          }).catch(() => ({ data: [] })),
          fetchTable('dir_mensagens', {
            filters: { phone: contato.phone, direction: 'in' },
            limit: 1,
            count: true,
          }).catch(() => ({ count: 0 })),
        ]);

        const ultimaMsg = ultimaMsgJson.data?.[0];

        return {
          telefone: contato.phone,
          nome_contato: contato.display_name,
          texto: ultimaMsg?.message ?? null,
          tipo_mensagem: ultimaMsg?.message_type ?? 'text',
          direcao: ultimaMsg ? mapDirection(ultimaMsg.direction) : 'in',
          criado_em: ultimaMsg?.created_at ?? contato.last_inbound_at ?? contato.last_outbound_at,
          total_mensagens: null,
          pendentes: isPendente(contato) ? pendentesJson.count ?? 1 : 0,
          chat_status: contato.chat_status,
          blocked: contato.blocked,
          muted: contato.muted,
          metadata: contato.metadata,
        };
      })
    );

    data.sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0));

    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error('[diretoria/conversas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/conversas/:telefone/mensagens
// Histórico completo (dir_mensagens) de um contato, em ordem cronológica.
router.get('/:telefone/mensagens', async (req, res) => {
  try {
    const { telefone } = req.params;
    const json = await fetchTable('dir_mensagens', {
      filters: { phone: telefone },
      order: 'created_at:asc',
      limit: 2000,
    });
    const data = (json.data || []).map((m) => ({
      id: m.id,
      mensagem_id_zapi: null,
      telefone: m.phone,
      nome_contato: m.sender_name ?? null,
      direcao: mapDirection(m.direction),
      tipo_mensagem: m.message_type,
      texto: m.message,
      audio_url: m.message_type === 'audio' ? m.media_url : null,
      criado_em: m.created_at,
      metadata: m.metadata,
    }));
    res.json({ ok: true, count: data.length, data });
  } catch (err) {
    console.error('[diretoria/conversas/:telefone/mensagens] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// PATCH /api/diretoria/conversas/:telefone
// Atualiza status (fila/ativo/finalizado) e/ou tags+notas (dentro de metadata,
// merge raso feito pelo próprio endpoint do Lovable).
router.patch('/:telefone', async (req, res) => {
  try {
    const { telefone } = req.params;
    const { chat_status, metadata } = req.body || {};
    if (!chat_status && !metadata) {
      return res.status(400).json({ ok: false, error: 'nothing_to_update' });
    }
    const body = {};
    if (chat_status) body.chat_status = chat_status;
    if (metadata) body.metadata = metadata;
    const json = await patchDirContato(telefone, body);
    res.json({ ok: true, data: json.data ?? json });
  } catch (err) {
    console.error('[diretoria/conversas/:telefone PATCH] erro:', err.message);
    res.status(500).json({ ok: false, error: 'update_failed', message: err.message });
  }
});

module.exports = router;
