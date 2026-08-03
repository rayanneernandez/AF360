const express = require('express');
const {
  getRhTreinamentos,
  postRhTreinamentoResposta,
  postRhTreinamentoProva,
  patchRhTreinamentoInscricao,
} = require('../lovable');

const router = express.Router();

// Conteúdo real de treinamentos (rh_treinamentos, rh_treinamento_aulas,
// rh_treinamento_questoes, rh_treinamento_inscricoes, rh_treinamento_
// respostas) — GET e escrita confirmados pela Lovable em 03/08/2026.
//
// IMPORTANTE: nunca repassar incluirGabarito=true numa chamada originada do
// app do colaborador — só o painel do RH deve pedir o gabarito.

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

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

// POST /api/rh/treinamentos-conteudo/respostas?actorId= — body: { inscricao_id, questao_id, resposta, tempo_ms, tentativa? }
// Uma resposta isolada. Preferir /prova (abaixo) pro fluxo completo.
router.post('/respostas', async (req, res) => {
  try {
    const json = await postRhTreinamentoResposta(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo respostas] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/treinamentos-conteudo/prova?actorId= — body: { inscricao_id, respostas: [{questao_id, resposta, tempo_ms}], tempo_gasto_min? }
// Fluxo completo: grava todas as respostas corrigidas no servidor, calcula
// nota vs. prova_min_acerto e já atualiza a inscrição. Retorna
// { data: inscricao, resultado: { acertos, total, nota, prova_min_acerto, aprovado, tentativa } }.
router.post('/prova', async (req, res) => {
  try {
    const json = await postRhTreinamentoProva(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json, resultado: json?.resultado });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo prova] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/treinamentos-conteudo/inscricoes/:id?actorId= — body pode incluir status/iniciado_em/tempo_gasto_min/certificado_url
router.patch('/inscricoes/:id', async (req, res) => {
  try {
    const json = await patchRhTreinamentoInscricao(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo inscricoes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
