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
  getRecrutamentoTriagemVaga,
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
  getMarketingWaConversas,
  getMarketingWaMensagens,
  postMarketingWaEnviar,
  postMarketingWaNova,
  patchMarketingWaConversa,
  getAdminNotifRotinas,
  postAdminNotifRotina,
  patchAdminNotifRotina,
  deleteAdminNotifRotina,
  postAdminNotifRotinaExecutar,
  getAdminNotifTemplates,
  postAdminNotifTemplate,
  patchAdminNotifTemplate,
  deleteAdminNotifTemplate,
} = require('../lovable');

// WhatsApp/Notificações reaproveitam o MESMO motor do Marketing (confirmado
// pela Lovable em 07/09/2026) — WhatsApp por canal='rs' (mesma tabela
// wa_conversas do Marketing, só filtrada), Notificações pelo sistema
// genérico modulo='recrutamento' (mesma infra do Financeiro/Gestão/Admin).
const RS_CANAL = 'rs';
const RS_NOTIF_MODULO = 'recrutamento';

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
      case 'triagem-vaga': {
        if (!params.vaga_id) return res.status(400).json({ ok: false, error: 'vaga_id_obrigatorio' });
        const json = await getRecrutamentoTriagemVaga(params.vaga_id, actorId);
        return res.json({ ok: true, data: json?.data ?? json ?? {} });
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
      case 'wa-conversas': {
        const json = await getMarketingWaConversas({ ...params, canal: RS_CANAL }, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows, contadores: json?.contadores ?? {} });
      }
      case 'wa-mensagens': {
        if (!params.phone) return res.status(400).json({ ok: false, error: 'phone_obrigatorio' });
        const json = await getMarketingWaMensagens({ ...params, canal: RS_CANAL }, actorId);
        const { rows, count } = extractArrayPayload(json);
        return res.json({ ok: true, count, data: rows, contato: json?.contato ?? null });
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

// --- WhatsApp (canal=rs) ---
router.post('/wa-enviar', async (req, res) => {
  try {
    const json = await postMarketingWaEnviar({ ...(req.body ?? {}), canal: RS_CANAL }, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/wa-enviar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/wa-nova', async (req, res) => {
  try {
    const json = await postMarketingWaNova({ ...(req.body ?? {}), canal: RS_CANAL }, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/wa-nova POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/wa-conversa/:phone', async (req, res) => {
  try {
    const json = await patchMarketingWaConversa(req.params.phone, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[recrutamento/wa-conversa PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Notificações (Rotinas + Templates) — mesmo sistema genérico do
// Marketing/Financeiro/Gestão/Administrativo, aqui fixado em
// modulo=recrutamento. ---

function mapNotifRotinaRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    templateId: row.template_id ?? null,
    isActive: Boolean(row.ativa),
    tipoGatilho: row.tipo_gatilho ?? 'manual',
    cronExpressao: row.cron_expressao ?? null,
    eventoCodigo: row.evento_codigo ?? null,
    canais: Array.isArray(row.canais) ? row.canais : [],
    publicoTipo: row.publico_tipo ?? 'todos',
    publicoIds: Array.isArray(row.publico_ids) ? row.publico_ids : [],
    ultimaExecucao: row.ultima_execucao ?? null,
    proximaExecucao: row.proxima_execucao ?? null,
    totalDestinos: row.total_destinos ?? 0,
    totalEnviados: row.total_enviados ?? 0,
    status: row.status ?? null,
    agendadaPara: row.agendada_para ?? null,
  };
}

function mapNotifTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    modulo: row.modulo ?? null,
    codigo: row.codigo ?? null,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    variaveis: Array.isArray(row.variaveis) ? row.variaveis : [],
    isPadrao: Boolean(row.padrao),
    isActive: Boolean(row.ativo),
  };
}

router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(RS_NOTIF_MODULO, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[recrutamento/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(RS_NOTIF_MODULO, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[recrutamento/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(RS_NOTIF_MODULO, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[recrutamento/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(RS_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(RS_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[recrutamento/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: RS_NOTIF_MODULO, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[recrutamento/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate({ ...(req.body ?? {}), modulo: RS_NOTIF_MODULO }, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[recrutamento/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[recrutamento/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[recrutamento/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
