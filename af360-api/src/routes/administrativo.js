const express = require('express');
const {
  getAdministrativoDashboard,
  getAdministrativoLicencas,
  postAdministrativoLicenca,
  patchAdministrativoLicenca,
  deleteAdministrativoLicenca,
  getAdministrativoChamados,
  postAdministrativoChamado,
  patchAdministrativoChamado,
  getAdministrativoInsumos,
  getAdministrativoSolicitacoes,
  postAdministrativoSolicitacao,
  getAdministrativoFrota,
  patchAdministrativoVeiculo,
  deleteAdministrativoVeiculo,
  postAdministrativoFrotaEvento,
  getAdministrativoFrotaEventos,
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

// Módulo fixo pro sistema genérico de Notificações (Rotinas/Templates),
// confirmado pela Lovable em 31/08/2026: o Administrativo usa modulo=adm —
// DIFERENTE do módulo 'admin' do painel Administrador (gestão da
// plataforma) que já existe no app. Sem conflito entre os dois.
const ADMINISTRATIVO_NOTIF_MODULO = 'adm';

const router = express.Router();

function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// Alguns endpoints de lista podem não devolver o array debaixo de "data"
// (varia por implementação) — em vez de assumir uma chave fixa e devolver
// [] silenciosamente quando ela não bate (o que parecia "sem erro, mas sem
// dado nenhum" no app), procura o primeiro array de verdade na resposta.
function extractArrayPayload(json) {
  if (Array.isArray(json)) return { rows: json, count: json.length };
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

const LIST_RECURSOS = new Set(['licencas', 'chamados', 'insumos', 'solicitacoes', 'frota', 'frota-eventos']);

// GET /api/administrativo?recurso=dashboard|licencas|chamados|insumos|solicitacoes|frota|frota-eventos&...
router.get('/', async (req, res) => {
  const { recurso, actorId, veiculoId, ...params } = req.query;
  try {
    let json;
    switch (recurso) {
      case 'dashboard':
        json = await getAdministrativoDashboard(params, actorId);
        break;
      case 'licencas':
        json = await getAdministrativoLicencas(params, actorId);
        break;
      case 'chamados':
        json = await getAdministrativoChamados(params, actorId);
        break;
      case 'insumos':
        json = await getAdministrativoInsumos(params, actorId);
        break;
      case 'solicitacoes':
        json = await getAdministrativoSolicitacoes(params, actorId);
        break;
      case 'frota':
        json = await getAdministrativoFrota(params, actorId);
        break;
      case 'frota-eventos':
        json = await getAdministrativoFrotaEventos(veiculoId, actorId);
        break;
      default:
        return res.status(400).json({ ok: false, error: 'recurso_invalido' });
    }
    if (LIST_RECURSOS.has(recurso)) {
      const { rows, count } = extractArrayPayload(json);
      return res.json({ ok: true, count, data: rows });
    }
    const row = json?.data ?? json;
    res.json({ ok: true, count: json?.count ?? (Array.isArray(row) ? row.length : undefined), data: row });
  } catch (err) {
    console.error('[administrativo GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// --- Alvarás e Licenças (CRUD) ---

// POST /api/administrativo/licenca?actorId= — body: documento, orgao,
// vencimento (obrigatórios); numero, empresa_id, emissao, observacao (opcionais).
router.post('/licenca', async (req, res) => {
  try {
    const json = await postAdministrativoLicenca(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/licenca POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/administrativo/licenca/:id?actorId=
router.patch('/licenca/:id', async (req, res) => {
  try {
    const json = await patchAdministrativoLicenca(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/licenca/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/administrativo/licenca/:id?actorId= — inativa (não exclui de verdade).
router.delete('/licenca/:id', async (req, res) => {
  try {
    await deleteAdministrativoLicenca(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[administrativo/licenca/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Manutenções (Chamados) ---

// POST /api/administrativo/chamado?actorId= — body: titulo (obrigatório);
// descricao, local, empresa_id, prioridade (alta|media|baixa), responsavel (opcionais).
router.post('/chamado', async (req, res) => {
  try {
    const json = await postAdministrativoChamado(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/chamado POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/administrativo/chamado/:id?actorId= — body: { status } entre
// aberto|em_andamento|aguardando_peca|concluido|cancelado (concluido grava concluido_em).
router.patch('/chamado/:id', async (req, res) => {
  try {
    const json = await patchAdministrativoChamado(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/chamado/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Almoxarifado ---

// POST /api/administrativo/solicitacao?actorId= — body: { insumo_id, empresa_id, quantidade, observacao }.
router.post('/solicitacao', async (req, res) => {
  try {
    const json = await postAdministrativoSolicitacao(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/solicitacao POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Frota ---

// PATCH /api/administrativo/veiculo/:id?actorId= — editar dados do veículo.
router.patch('/veiculo/:id', async (req, res) => {
  try {
    const json = await patchAdministrativoVeiculo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/veiculo/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/administrativo/veiculo/:id?actorId=
router.delete('/veiculo/:id', async (req, res) => {
  try {
    await deleteAdministrativoVeiculo(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[administrativo/veiculo/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/administrativo/frota-evento?actorId= — body: { veiculo_id, tipo:
// saida|retorno|manutencao|abastecimento|sinistro, km, observacao }. "km" atualiza o veículo.
router.post('/frota-evento', async (req, res) => {
  try {
    const json = await postAdministrativoFrotaEvento(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[administrativo/frota-evento POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Notificações (Rotinas + Templates) — mesmo sistema genérico do
// Financeiro/Gestão, aqui fixado em modulo=adm. ---

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

// GET /api/administrativo/notif-rotinas?q=&ativa=&limit=&offset=
router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(ADMINISTRATIVO_NOTIF_MODULO, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[administrativo/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/administrativo/notif-rotinas?actorId=
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(ADMINISTRATIVO_NOTIF_MODULO, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[administrativo/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/administrativo/notif-rotinas/:id?actorId=
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(ADMINISTRATIVO_NOTIF_MODULO, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[administrativo/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/administrativo/notif-rotinas/:id?actorId=
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(ADMINISTRATIVO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[administrativo/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/administrativo/notif-rotinas/:id/executar?actorId=
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(ADMINISTRATIVO_NOTIF_MODULO, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[administrativo/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/administrativo/notif-templates?q=&ativo=
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: ADMINISTRATIVO_NOTIF_MODULO, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[administrativo/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/administrativo/notif-templates?actorId= — modulo é sempre forçado pra 'adm'
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate({ ...(req.body ?? {}), modulo: ADMINISTRATIVO_NOTIF_MODULO }, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[administrativo/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/administrativo/notif-templates/:id?actorId=
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[administrativo/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/administrativo/notif-templates/:id?actorId= — 409 se for padrão do sistema
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[administrativo/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
