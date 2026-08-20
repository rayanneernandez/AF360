const express = require('express');
const {
  getRhTreinamentos,
  postRhTreinamentoResposta,
  postRhTreinamentoProva,
  patchRhTreinamentoInscricao,
  postRhTreinamentoProgressoAula,
  postRhTreinamento,
  patchRhTreinamento,
  deleteRhTreinamento,
  postRhTreinamentoAula,
  patchRhTreinamentoAula,
  deleteRhTreinamentoAula,
  postRhTreinamentoVideoUploadUrl,
  postRhTreinamentoQuestao,
  patchRhTreinamentoQuestao,
  deleteRhTreinamentoQuestao,
  postRhTreinamentoAtribuir,
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

// GET /api/rh/treinamentos-conteudo?recurso=treinamentos|aulas|questoes|inscricoes|respostas|progresso-aulas&treinamentoId=&colaboradorId=&inscricaoId=&aulaId=&status=&ativo=&incluirGabarito=
router.get('/', async (req, res) => {
  try {
    const { recurso, treinamentoId, colaboradorId, inscricaoId, aulaId, status, ativo, incluirGabarito, actorId } =
      req.query;
    const json = await getRhTreinamentos(
      {
        recurso,
        treinamentoId,
        colaboradorId,
        inscricaoId,
        aulaId,
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

// POST /api/rh/treinamentos-conteudo/progresso-aula?actorId= — body: { inscricao_id, aula_id, posicao_atual_seg, duracao_total_seg, concluida?, ultima_visualizacao? }
// Upsert por (inscricao_id, aula_id) — grava quanto da aula em vídeo o
// colaborador já assistiu. O servidor nunca deixa o progresso "voltar".
router.post('/progresso-aula', async (req, res) => {
  try {
    const json = await postRhTreinamentoProgressoAula(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json, percentual: json?.percentual });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo progresso-aula] erro:', err.message);
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

// --- RH/admin: CRUD de treinamento/aulas/questões, upload de vídeo,
// atribuição em massa e respostas agregadas ---

// POST /api/rh/treinamentos-conteudo?actorId= — cria treinamento
router.post('/', async (req, res) => {
  try {
    const json = await postRhTreinamento(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/treinamentos-conteudo/:id?actorId=
router.patch('/:id', async (req, res) => {
  try {
    const json = await patchRhTreinamento(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/treinamentos-conteudo/:id?actorId=
router.delete('/:id', async (req, res) => {
  try {
    await deleteRhTreinamento(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/treinamentos-conteudo/aulas?actorId=
router.post('/aulas', async (req, res) => {
  try {
    const json = await postRhTreinamentoAula(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo aulas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/treinamentos-conteudo/aulas/:id?actorId=
router.patch('/aulas/:id', async (req, res) => {
  try {
    const json = await patchRhTreinamentoAula(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo aulas PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/treinamentos-conteudo/aulas/:id?actorId=
router.delete('/aulas/:id', async (req, res) => {
  try {
    await deleteRhTreinamentoAula(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo aulas DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/treinamentos-conteudo/video-upload-url?actorId= — body: { filename, treinamento_id? }
// Gera signed URL pra upload direto no Storage (bucket rh-treinamentos),
// sem passar o arquivo de vídeo pelo nosso backend (payload grande demais).
router.post('/video-upload-url', async (req, res) => {
  try {
    const json = await postRhTreinamentoVideoUploadUrl(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo video-upload-url] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/treinamentos-conteudo/questoes?actorId=
router.post('/questoes', async (req, res) => {
  try {
    const json = await postRhTreinamentoQuestao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo questoes POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/rh/treinamentos-conteudo/questoes/:id?actorId=
router.patch('/questoes/:id', async (req, res) => {
  try {
    const json = await patchRhTreinamentoQuestao(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo questoes PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/rh/treinamentos-conteudo/questoes/:id?actorId=
router.delete('/questoes/:id', async (req, res) => {
  try {
    await deleteRhTreinamentoQuestao(req.params.id, req.query.actorId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo questoes DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/rh/treinamentos-conteudo/atribuir?actorId= — body: { treinamento_id, tipo, cargos?, grupos?, colaboradores?, inscrever? }
router.post('/atribuir', async (req, res) => {
  try {
    const json = await postRhTreinamentoAtribuir(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? [], inscritos: json?.inscritos ?? 0 });
  } catch (err) {
    console.error('[rh/treinamentos-conteudo atribuir] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
