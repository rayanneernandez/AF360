const express = require('express');
const { getRhTreinamentos } = require('../lovable');

const router = express.Router();

// Conteúdo real de treinamentos (rh_treinamentos, rh_treinamento_aulas,
// rh_treinamento_questoes, rh_treinamento_inscricoes, rh_treinamento_
// respostas) — GET confirmado pela Lovable em 03/08/2026 via "recurso".
// Somente leitura por enquanto: a Lovable ainda não confirmou endpoint de
// escrita (responder prova / atualizar inscrição), então este módulo não
// tem POST/PATCH — não fabricar isso no frontend enquanto não vier.
//
// IMPORTANTE: nunca repassar incluirGabarito=true numa chamada originada do
// app do colaborador — só o painel do RH deve pedir o gabarito.

// GET /api/rh/treinamentos-conteudo?recurso=treinamentos|aulas|questoes|inscricoes|respostas&treinamentoId=&colaboradorId=&inscricaoId=&status=&ativo=&incluirGabarito=
router.get('/', async (req, res) => {
  try {
    const { recurso, treinamentoId, colaboradorId, inscricaoId, status, ativo, incluirGabarito, actorId } = req.query;
    const json = await getRhTreinamentos(
      {
        recurso,
        treinamentoId,
        colaboradorId,
        inscricaoId,
        status,
        ativo,
        incluirGabarito: incluirGabarito === '1' || incluirGabarito === 'true',
      },
      actorId
    );
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
