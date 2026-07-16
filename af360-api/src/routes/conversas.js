const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/diretoria/conversas?q=busca
// Lista uma linha por telefone (última mensagem), com contagem total e
// pendentes (mensagens recebidas depois da última resposta enviada).
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const params = [];
    let filtro = '';
    if (q) {
      params.push(`%${q}%`);
      filtro = `where nome_contato ilike $${params.length} or telefone ilike $${params.length}`;
    }
    // "desconhecido" é um tipo real gravado pela Z-API para eventos que ela
    // não conseguiu classificar (webhooks de protocolo, números/lids sem
    // conteúdo real). Não são conversas de verdade, então ficam de fora.
    const sql = `
      with mensagens_validas as (
        select *
        from fale_diretoria_mensagens
        where tipo_mensagem <> 'desconhecido'
      ),
      last_out as (
        select telefone, max(criado_em) as last_out_em
        from mensagens_validas
        where direcao = 'out'
        group by telefone
      ),
      agg as (
        select
          m.telefone,
          count(*) as total_mensagens,
          count(*) filter (
            where m.direcao = 'in'
              and (lo.last_out_em is null or m.criado_em > lo.last_out_em)
          ) as pendentes
        from mensagens_validas m
        left join last_out lo on lo.telefone = m.telefone
        group by m.telefone
      ),
      last_msg as (
        select distinct on (telefone) telefone, nome_contato, texto, tipo_mensagem, direcao, criado_em
        from mensagens_validas
        order by telefone, criado_em desc
      )
      select lm.telefone, lm.nome_contato, lm.texto, lm.tipo_mensagem, lm.direcao, lm.criado_em,
             a.total_mensagens, a.pendentes
      from last_msg lm
      join agg a on a.telefone = lm.telefone
      ${filtro}
      order by lm.criado_em desc
    `;
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/conversas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/conversas/:telefone/mensagens
// Histórico completo de uma conversa, em ordem cronológica.
router.get('/:telefone/mensagens', async (req, res) => {
  try {
    const { telefone } = req.params;
    const result = await query(
      `select id, mensagem_id_zapi, telefone, nome_contato, direcao, tipo_mensagem, texto, audio_url, criado_em, metadata
       from fale_diretoria_mensagens
       where telefone = $1 and tipo_mensagem <> 'desconhecido'
       order by criado_em asc`,
      [telefone]
    );
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/conversas/:telefone/mensagens] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
