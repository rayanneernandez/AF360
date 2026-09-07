const express = require('express');
const {
  getRecrutamentoDashboard,
  getRecrutamentoVagas,
  getRecrutamentoVaga,
  postRecrutamentoVaga,
  patchRecrutamentoVaga,
  deleteRecrutamentoVaga,
  getRecrutamentoCandidatos,
  getRecrutamentoCandidato,
  postRecrutamentoCandidato,
  patchRecrutamentoCandidato,
  deleteRecrutamentoCandidato,
  postRecrutamentoMoverEtapa,
  postRecrutamentoSugestaoIa,
  postRecrutamentoImportarCurriculo,
  getRecrutamentoImportacoes,
  postRecrutamentoProcessarImportacao,
  getRecrutamentoPendencias,
  postRecrutamentoPendenciaAcao,
  getRecrutamentoTriagemModelos,
  postRecrutamentoTriagemModelo,
  patchRecrutamentoTriagemModelo,
  deleteRecrutamentoTriagemModelo,
  patchRecrutamentoTriagemVaga,
  getRecrutamentoAvaliacoes,
  postRecrutamentoAvaliacao,
  patchRecrutamentoAvaliacao,
  deleteRecrutamentoAvaliacao,
  getRecrutamentoQuestoes,
  postRecrutamentoQuestao,
  patchRecrutamentoQuestao,
  deleteRecrutamentoQuestao,
  getRecrutamentoDocAdmissao,
  postRecrutamentoDocAdmissao,
  patchRecrutamentoDocAdmissao,
  deleteRecrutamentoDocAdmissao,
  getRecrutamentoAlertasIa,
  postRecrutamentoAlertaIa,
  patchRecrutamentoAlertaIa,
  deleteRecrutamentoAlertaIa,
  getRecrutamentoTelegram,
  patchRecrutamentoTelegram,
  patchRecrutamentoTelegramDestino,
  deleteRecrutamentoTelegramDestino,
  postRecrutamentoTelegramTeste,
} = require('../lovable');

const router = express.Router();

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// Mesmo padrão de extração usado nos outros módulos: prioriza "itens",
// depois "data", só cai no fallback genérico se nenhum dos dois existir.
function extractArrayPayload(json) {
  if (Array.isArray(json)) return { rows: json, count: json.length };
  if (Array.isArray(json?.itens)) return { rows: json.itens, count: json.total ?? json.count ?? json.itens.length };
  if (Array.isArray(json?.data)) return { rows: json.data, count: json.count ?? json.data.length };
  if (json && typeof json === 'object') {
    for (const key of Object.keys(json)) {
      if (Array.isArray(json[key])) {
        return { rows: json[key], count: json.count ?? json[key].length };
      }
    }
  }
  return { rows: [], count: 0 };
}

// GET /api/recrutamento?recurso=dashboard|vagas|vaga|candidatos|candidato|
//   importacoes|pendencias|triagem-modelos|avaliacoes|questoes|doc-admissao|
//   alertas-ia|telegram&...
router.get('/', async (req, res) => {
  const { recurso, actorId, ...params } = req.query;
  try {
    switch (recurso) {
      case 'dashboard': {
        const json = await getRecrutamentoDashboard(params, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'vagas': {
        const json = await getRecrutamentoVagas(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'vaga': {
        if (!params.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
        const json = await getRecrutamentoVaga(params.id, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'candidatos': {
        const json = await getRecrutamentoCandidatos(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'candidato': {
        if (!params.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
        const json = await getRecrutamentoCandidato(params.id, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'importacoes': {
        const json = await getRecrutamentoImportacoes(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'pendencias': {
        const json = await getRecrutamentoPendencias(params, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'triagem-modelos': {
        const json = await getRecrutamentoTriagemModelos(actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'avaliacoes': {
        const json = await getRecrutamentoAvaliacoes(actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'questoes': {
        if (!params.avaliacao_id) return res.status(400).json({ ok: false, error: 'avaliacao_id_obrigatorio' });
        const json = await getRecrutamentoQuestoes(params.avaliacao_id, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'doc-admissao': {
        const json = await getRecrutamentoDocAdmissao(actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows });
      }
      case 'alertas-ia': {
        const json = await getRecrutamentoAlertasIa(actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      case 'telegram': {
        const json = await getRecrutamentoTelegram(actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
      }
      default:
        return res.status(400).json({ ok: false, error: 'recurso_invalido' });
    }
  } catch (err) {
    console.error('[recrutamento GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// --- Vagas ---
router.post('/vaga', async (req, res) => {
  try {
    const json = await postRecrutamentoVaga(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/vaga POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/vaga', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoVaga(req.query.id, req.body ?? {}, req.query.acao, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/vaga PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/vaga', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoVaga(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/vaga DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Candidatos ---
router.post('/candidato', async (req, res) => {
  try {
    const json = await postRecrutamentoCandidato(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/candidato POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/candidato', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoCandidato(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/candidato PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/candidato', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoCandidato(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/candidato DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/mover-etapa', async (req, res) => {
  try {
    const json = await postRecrutamentoMoverEtapa(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/mover-etapa POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/sugestao-ia', async (req, res) => {
  try {
    const json = await postRecrutamentoSugestaoIa(req.body ?? {}, req.query.actorId);
    const { rows } = extractArrayPayload(json);
    res.json({ ok: true, data: rows });
  } catch (err) {
    console.error('[recrutamento/sugestao-ia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Importar Currículo ---
router.post('/importar-curriculo', async (req, res) => {
  try {
    const json = await postRecrutamentoImportarCurriculo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/importar-curriculo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/processar-importacao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await postRecrutamentoProcessarImportacao(req.query.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/processar-importacao POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Pendências ---
// POST /api/recrutamento/pendencia?actorId=&id=&acao=aprovar|recusar|cobrar
router.post('/pendencia', async (req, res) => {
  try {
    if (!req.query.id || !req.query.acao) return res.status(400).json({ ok: false, error: 'id_e_acao_obrigatorios' });
    const json = await postRecrutamentoPendenciaAcao(req.query.id, req.query.acao, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/pendencia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: Modelos de triagem ---
router.post('/triagem-modelo', async (req, res) => {
  try {
    const json = await postRecrutamentoTriagemModelo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/triagem-modelo POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/triagem-modelo', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoTriagemModelo(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/triagem-modelo PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/triagem-modelo', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoTriagemModelo(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/triagem-modelo DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/triagem-vaga', async (req, res) => {
  try {
    if (!req.query.vaga_id) return res.status(400).json({ ok: false, error: 'vaga_id_obrigatorio' });
    const json = await patchRecrutamentoTriagemVaga(req.query.vaga_id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/triagem-vaga PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: Provas e DISC ---
router.post('/avaliacao', async (req, res) => {
  try {
    const json = await postRecrutamentoAvaliacao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/avaliacao POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/avaliacao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoAvaliacao(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/avaliacao PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/avaliacao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoAvaliacao(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/avaliacao DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/questao', async (req, res) => {
  try {
    const json = await postRecrutamentoQuestao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/questao POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/questao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoQuestao(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/questao PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/questao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoQuestao(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/questao DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: catálogo de documentos de Admissão ---
router.post('/doc-admissao', async (req, res) => {
  try {
    const json = await postRecrutamentoDocAdmissao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/doc-admissao POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/doc-admissao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoDocAdmissao(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/doc-admissao PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/doc-admissao', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoDocAdmissao(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/doc-admissao DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: Alertas de IA ---
router.post('/alerta-ia', async (req, res) => {
  try {
    const json = await postRecrutamentoAlertaIa(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/alerta-ia POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/alerta-ia', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoAlertaIa(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/alerta-ia PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/alerta-ia', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoAlertaIa(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/alerta-ia DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Configurações: Telegram ---
router.patch('/telegram', async (req, res) => {
  try {
    const json = await patchRecrutamentoTelegram(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/telegram PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/telegram-destino', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    const json = await patchRecrutamentoTelegramDestino(req.query.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/telegram-destino PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/telegram-destino', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ ok: false, error: 'id_obrigatorio' });
    await deleteRecrutamentoTelegramDestino(req.query.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/telegram-destino DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/telegram-teste', async (req, res) => {
  try {
    const json = await postRecrutamentoTelegramTeste(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/telegram-teste POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
