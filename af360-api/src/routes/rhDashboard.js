const express = require('express');
const { fetchAllRows, fetchTable } = require('../lovable');

const router = express.Router();

// ---------- Helpers de data (sem timezone) ----------
// rh_colaboradores.data_admissao/data_demissao são colunas "date" do
// Postgres — chegam como "YYYY-MM-DD". Nunca usar `new Date(str)` direto
// (o parser embutido interpreta como UTC e pode voltar um dia em fusos
// negativos). Construímos os componentes manualmente e usamos Date.UTC só
// para aritmética interna (comparação/diferença de dias), nunca para exibir.

function parseDateOnly(raw) {
  if (!raw) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return null;
  const [, y, m, d] = match;
  return Date.UTC(Number(y), Number(m) - 1, Number(d));
}

function monthRangeUTC(year, month) {
  // month: 1-12. Retorna [inicio, fimExclusivo) em ms UTC.
  return [Date.UTC(year, month - 1, 1), Date.UTC(year, month, 1)];
}

function yearRangeUTC(year) {
  return [Date.UTC(year, 0, 1), Date.UTC(year + 1, 0, 1)];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MOTIVO_LABELS = {
  pedido_demissao: { label: 'Pedido de demissão', color: '#D79A22' },
  sem_justa_causa: { label: 'Sem justa causa', color: '#E6213D' },
  justa_causa: { label: 'Justa causa', color: '#3457D5' },
  fim_contrato: { label: 'Fim de contrato', color: '#7A5AF8' },
  // Valor real confirmado no banco é a chave combinada abaixo — mantemos
  // as duas separadas ('experiencia'/'fim_contrato') por segurança, caso
  // apareçam soltas em algum registro antigo.
  fim_contrato_experiencia: { label: 'Fim do contrato de experiência', color: '#18955A' },
  experiencia: { label: 'Fim do contrato de experiência', color: '#18955A' },
  acordo: { label: 'Acordo', color: '#5E667D' },
  obito: { label: 'Óbito', color: '#5E667D' },
  rescicao_indireta: { label: 'Rescisão indireta', color: '#5E667D' },
  inadaptacao_aprendiz: { label: 'Inadaptação (aprendiz)', color: '#5E667D' },
  aposentadoria: { label: 'Aposentadoria', color: '#5E667D' },
};

function motivoMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return MOTIVO_LABELS[key] || { label: raw || 'Não informado', color: '#9AA1B5' };
}

function pctBR(value) {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function isVoluntario(motivoRaw) {
  return (motivoRaw ?? '').trim().toLowerCase() === 'pedido_demissao';
}

function isActiveAt(colaborador, atMs) {
  if (colaborador.admissaoMs === null || colaborador.admissaoMs >= atMs) return false;
  if (colaborador.demissaoMs !== null && colaborador.demissaoMs < atMs) return false;
  return true;
}

function computeTurnoverForRange(colaboradores, regiaoById, startMs, endMs) {
  // Pra período em andamento (mês atual), "hc" é o quadro de agora, não uma
  // projeção pro fim do mês que ainda não chegou — por isso usamos o menor
  // entre o fim do período e "agora" como referência do quadro ativo.
  const hcReferenceMs = Math.min(endMs, Date.now());
  const activeAtEnd = colaboradores.filter((c) => isActiveAt(c, hcReferenceMs));
  const desligados = colaboradores.filter(
    (c) => c.demissaoMs !== null && c.demissaoMs >= startMs && c.demissaoMs < endMs
  );

  const hc = activeAtEnd.length;
  const geral = desligados.length;
  const voluntario = desligados.filter((c) => isVoluntario(c.motivo_desligamento)).length;
  const involuntario = geral - voluntario;

  const regiaoMap = new Map();
  const regiaoOf = (c) => (c.empresa_id && regiaoById.has(c.empresa_id) ? regiaoById.get(c.empresa_id) : null) || 'Não informado';

  activeAtEnd.forEach((c) => {
    const nome = regiaoOf(c);
    if (!regiaoMap.has(nome)) regiaoMap.set(nome, { nome, hc: 0, saidas: 0 });
    regiaoMap.get(nome).hc += 1;
  });
  desligados.forEach((c) => {
    const nome = regiaoOf(c);
    if (!regiaoMap.has(nome)) regiaoMap.set(nome, { nome, hc: 0, saidas: 0 });
    regiaoMap.get(nome).saidas += 1;
  });

  const regioes = Array.from(regiaoMap.values())
    .map((r) => ({ ...r, taxaNum: r.hc > 0 ? (r.saidas / r.hc) * 100 : 0 }))
    .sort((a, b) => b.taxaNum - a.taxaNum)
    .map((r) => ({ nome: r.nome, hc: r.hc, saidas: r.saidas, taxa: pctBR(r.taxaNum) }));

  // Motivos de desligamento (só do período, pra montar o donut)
  const motivosMap = new Map();
  desligados.forEach((c) => {
    const meta = motivoMeta(c.motivo_desligamento);
    if (!motivosMap.has(meta.label)) motivosMap.set(meta.label, { label: meta.label, color: meta.color, count: 0 });
    motivosMap.get(meta.label).count += 1;
  });
  const motivos =
    geral > 0
      ? Array.from(motivosMap.values())
          .sort((a, b) => b.count - a.count)
          .map((m) => ({ ...m, pct: Math.round((m.count / geral) * 1000) / 10 }))
      : null;

  // Turnover até 90 dias: o numerador é "quem saiu no período com tempo de
  // casa real ≤ 90 dias" (não precisa ter sido contratado NESTE período —
  // alguém admitido em abril e desligado em julho por fim de experiência
  // também conta). O denominador é as admissões do próprio período — é uma
  // métrica-sinal (não um acompanhamento de coorte 1:1), do jeito que o
  // painel web mostra.
  const contratadosNoPeriodo = colaboradores.filter(
    (c) => c.admissaoMs !== null && c.admissaoMs >= startMs && c.admissaoMs < endMs
  ).length;
  const saidasPrecoces = desligados.filter(
    (c) => c.admissaoMs !== null && (c.demissaoMs - c.admissaoMs) / MS_PER_DAY <= 90
  ).length;
  const ate90diasPct = contratadosNoPeriodo > 0 ? (saidasPrecoces / contratadosNoPeriodo) * 100 : 0;

  let insight = null;
  if (geral > 0) {
    insight =
      voluntario > involuntario
        ? 'Saídas concentradas em pedido de demissão — atenção à atratividade e clima.'
        : involuntario > voluntario
        ? 'Saídas concentradas em desligamento pela empresa — investigar retenção pela liderança.'
        : 'Saídas divididas entre pedido de demissão e desligamento pela empresa.';
  }

  return {
    geralPct: pctBR(hc > 0 ? (geral / hc) * 100 : 0),
    geralMeta: `${geral} desligamento${geral === 1 ? '' : 's'} / ${hc} hc`,
    voluntarioPct: pctBR(hc > 0 ? (voluntario / hc) * 100 : 0),
    voluntarioMeta: `${voluntario} pediram demissão`,
    involuntarioPct: pctBR(hc > 0 ? (involuntario / hc) * 100 : 0),
    involuntarioMeta: `${involuntario} desligados pela empresa`,
    insight,
    regioes,
    ate90diasPct: pctBR(ate90diasPct),
    ate90diasMeta: `${saidasPrecoces} de ${contratadosNoPeriodo} contratados saíram em ≤ 90 dias`,
    motivos,
    motivosVazio: 'Sem desligamentos no período.',
    // Números crus, reaproveitados pelo /resumo (e pela série histórica
    // abaixo) sem precisar re-parsear as strings formatadas.
    raw: { hc, geral, voluntario, involuntario, admissoes: contratadosNoPeriodo },
  };
}

async function loadColaboradoresEEmpresas() {
  const [colaboradoresJson, empresasJson] = await Promise.all([
    // IMPORTANTE: fetchAllRows pagina em blocos de 1000 (rh_colaboradores tem
    // 1900+ linhas, então são pelo menos 2 páginas). Sem um "order" explícito
    // e ESTÁVEL, a ordem devolvida pelo Supabase/PostgREST entre uma página e
    // outra não é garantida — numa tabela viva (sendo editada o tempo todo
    // pelo RH), isso pode fazer a paginação por offset repetir algumas linhas
    // (contadas em dobro) e pular outras (nunca contadas), exatamente o tipo
    // de divergência pequena e "espalhada" entre regiões que a Rayanne
    // reportou (headcount total e por região batendo quase certo, mas não
    // exatamente, mesmo consultando web e app no mesmíssimo momento).
    // Corrigido: ordena por "id" (chave estável) pra garantir paginação
    // determinística — cada página sempre traz exatamente o próximo bloco,
    // sem repetir nem pular linhas.
    fetchAllRows('rh_colaboradores', {
      select:
        'id,nome_completo,empresa_id,cargo,status,setor,posto_trabalho,sexo,salario_base,data_admissao,data_demissao,motivo_desligamento,valor_rescisao_liquida,vencimento_experiencia,portal_status,portal_ativado_em',
      order: 'id:asc',
    }),
    fetchAllRows('empresas', { select: 'id,regiao,nome_fantasia,razao_social', order: 'id:asc' }),
  ]);

  const regiaoById = new Map();
  const empresaNomeById = new Map();
  (empresasJson.data || []).forEach((e) => {
    regiaoById.set(e.id, e.regiao || null);
    empresaNomeById.set(e.id, e.nome_fantasia || e.razao_social || null);
  });

  const colaboradores = (colaboradoresJson.data || []).map((c) => ({
    ...c,
    admissaoMs: parseDateOnly(c.data_admissao),
    demissaoMs: parseDateOnly(c.data_demissao),
    vencimentoExperienciaMs: parseDateOnly(c.vencimento_experiencia),
  }));

  return { colaboradores, regiaoById, empresaNomeById };
}

// Retorna os 12 meses (ano-mês) em ordem cronológica: Jan..Dez do ano
// selecionado (granularity "ano"), ou os últimos 12 meses terminando no mês
// selecionado (granularity "mes").
function monthsForHistory(granularity, year, month) {
  const months = [];
  if (granularity === 'ano') {
    for (let m = 1; m <= 12; m++) months.push([year, m]);
  } else {
    for (let i = 11; i >= 0; i--) {
      const idx = year * 12 + (month - 1) - i;
      months.push([Math.floor(idx / 12), (idx % 12) + 1]);
    }
  }
  return months;
}

function formatDiaMes(ms) {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatDiaMesAno(ms) {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

// ---------- Férias (rh_ferias) ----------
// O enum rh_ferias_status não está documentado no LOVABLE_API.md e, na data
// desta implementação, a tabela rh_ferias estava vazia em produção (checado
// via GET /api/health/lovable?table=rh_ferias — 0 linhas), então não deu pra
// confirmar os valores reais gravados pelo Lovable. Mapeamos os valores mais
// prováveis (programada/em_andamento/concluida/cancelada) e qualquer valor
// desconhecido cai no fallback abaixo (capitaliza a string crua) em vez de
// quebrar a tela.
const VACATION_STATUS_META = {
  programada: { label: 'Programada', color: '#3457D5', tint: '#E9EEFF' },
  em_andamento: { label: 'Em andamento', color: '#18955A', tint: '#E3F5EA' },
  andamento: { label: 'Em andamento', color: '#18955A', tint: '#E3F5EA' },
  concluida: { label: 'Concluída', color: '#7C8397', tint: '#F1F2F7' },
  cancelada: { label: 'Cancelada', color: '#E6213D', tint: '#FCE8EC' },
};

function vacationStatusMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  if (VACATION_STATUS_META[key]) {
    return { ...VACATION_STATUS_META[key], raw: key };
  }
  if (!key) {
    return { label: 'Não informado', color: '#5E667D', tint: '#F1F2F7', raw: 'nao_informado' };
  }
  // Fallback: string crua capitalizada, sem quebrar a tela.
  const fallbackLabel = key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return { label: fallbackLabel || raw, color: '#5E667D', tint: '#F1F2F7', raw: key };
}

const VACATION_STATUS_ORDER = { em_andamento: 0, andamento: 0, programada: 1, concluida: 2 };

// GET /api/rh/dashboard/ferias
router.get('/ferias', async (req, res) => {
  try {
    const [feriasJson, base] = await Promise.all([
      fetchAllRows('rh_ferias', {
        select: 'id,colaborador_id,data_inicio,data_fim,dias_planejados,status,observacoes',
      }),
      loadColaboradoresEEmpresas(),
    ]);

    const colaboradoresById = new Map();
    base.colaboradores.forEach((c) => colaboradoresById.set(c.id, c));

    const itens = (feriasJson.data || []).map((f) => {
      const colaborador = f.colaborador_id ? colaboradoresById.get(f.colaborador_id) : null;
      const inicioMs = parseDateOnly(f.data_inicio);
      const fimMs = parseDateOnly(f.data_fim);
      const diasPlanejados = Number(f.dias_planejados);
      const dias =
        diasPlanejados > 0
          ? diasPlanejados
          : inicioMs !== null && fimMs !== null
          ? Math.round((fimMs - inicioMs) / MS_PER_DAY) + 1
          : null;
      const meta = vacationStatusMeta(f.status);

      return {
        id: String(f.id),
        nome: colaborador?.nome_completo || '(sem nome)',
        unidade: colaborador?.posto_trabalho || 'Sem unidade',
        inicioLabel: inicioMs !== null ? formatDiaMes(inicioMs) : '—',
        fimLabel: fimMs !== null ? formatDiaMesAno(fimMs) : '—',
        dias,
        statusRaw: meta.raw,
        statusLabel: meta.label,
        statusColor: meta.color,
        statusTint: meta.tint,
        _order: VACATION_STATUS_ORDER[meta.raw] ?? 3,
        _inicioMs: inicioMs ?? 0,
      };
    });

    itens.sort((a, b) => a._order - b._order || a._inicioMs - b._inicioMs);
    itens.forEach((item) => {
      delete item._order;
      delete item._inicioMs;
    });

    const stats = {
      andamento: itens.filter((i) => i.statusRaw === 'em_andamento' || i.statusRaw === 'andamento').length,
      programadas: itens.filter((i) => i.statusRaw === 'programada').length,
      concluidas: itens.filter((i) => i.statusRaw === 'concluida').length,
    };

    res.json({ ok: true, data: { stats, itens } });
  } catch (err) {
    console.error('[rh/dashboard/ferias] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Período de Experiência (derivado de rh_colaboradores) ----------
// Não existe tabela própria: usamos rh_colaboradores.vencimento_experiencia +
// status = 'ativo'. totalDays/remainingDays são calculados a partir de
// datas reais (vencimento_experiencia - data_admissao / vencimento_experiencia - hoje).

// GET /api/rh/dashboard/experiencia
router.get('/experiencia', async (req, res) => {
  try {
    const { colaboradores } = await loadColaboradoresEEmpresas();
    const nowMs = Date.now();

    const emExperiencia = colaboradores.filter(
      (c) => (c.status ?? '').trim().toLowerCase() === 'ativo' && c.vencimentoExperienciaMs !== null
    );

    const itens = emExperiencia
      .map((c) => {
        const remainingDays = Math.round((c.vencimentoExperienciaMs - nowMs) / MS_PER_DAY);
        const totalDays =
          c.admissaoMs !== null
            ? Math.max(1, Math.round((c.vencimentoExperienciaMs - c.admissaoMs) / MS_PER_DAY))
            : null;
        return {
          id: String(c.id),
          nome: c.nome_completo || '(sem nome)',
          cargo: c.cargo || 'Sem cargo',
          unidade: c.posto_trabalho || 'Sem unidade',
          totalDays,
          remainingDays,
          dueLabel: formatDiaMes(c.vencimentoExperienciaMs),
        };
      })
      .sort((a, b) => a.remainingDays - b.remainingDays);

    const stats = {
      emExperiencia: itens.length,
      vencem7d: itens.filter((i) => i.remainingDays >= 0 && i.remainingDays <= 7).length,
      vencem30d: itens.filter((i) => i.remainingDays >= 0 && i.remainingDays <= 30).length,
    };

    res.json({ ok: true, data: { stats, itens } });
  } catch (err) {
    console.error('[rh/dashboard/experiencia] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// DD/MM/AAAA — usado nas telas de Transferências e Folha, que listam
// registros de vários anos (formatDiaMes acima omite o ano de propósito
// pra séries históricas de 12 meses, então não serve aqui).
function formatDataBR(ms) {
  const d = new Date(ms);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

const MONTH_NAMES_LONG = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// Valores reais do enum rh_transferencia_status ainda não confirmados em
// produção (tabela rh_transferencias está vazia hoje — ver LOVABLE_API.md).
// Mapeamos os valores prováveis (pendente/aprovado/rejeitado/efetivado, com
// variantes de gênero) e caímos num fallback neutro pra qualquer valor não
// mapeado, sem quebrar nem inventar rótulo.
const TRANSFER_STATUS_META = {
  pendente: { label: 'Pendente', color: '#B07A1E', tint: '#FCEFDA' },
  aprovado: { label: 'Aprovado', color: '#3457D5', tint: '#E9EEFF' },
  aprovada: { label: 'Aprovada', color: '#3457D5', tint: '#E9EEFF' },
  rejeitado: { label: 'Rejeitado', color: '#E6213D', tint: '#FCE7EA' },
  rejeitada: { label: 'Rejeitada', color: '#E6213D', tint: '#FCE7EA' },
  efetivado: { label: 'Efetivado', color: '#18955A', tint: '#E3F5EA' },
  efetivada: { label: 'Efetivada', color: '#18955A', tint: '#E3F5EA' },
};

function transferStatusMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return TRANSFER_STATUS_META[key] || { label: raw || 'Não informado', color: '#9AA1B5', tint: '#EEF0F5' };
}

// Idem para rh_folha_status — só confirmamos 'aberta' em produção até agora
// (única competência cadastrada). 'fechada' é o par documentado (default
// 'aberta' sugere ciclo aberta -> fechada); demais valores caem no fallback.
const FOLHA_STATUS_META = {
  aberta: { label: 'Aberta', color: '#3457D5', tint: '#E9EEFF' },
  fechada: { label: 'Fechada', color: '#18955A', tint: '#E3F5EA' },
};

function folhaStatusMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return FOLHA_STATUS_META[key] || { label: raw || 'Não informado', color: '#9AA1B5', tint: '#EEF0F5' };
}

function groupByLabel(items, keyFn, valueFn) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || 'Não informado';
    if (!map.has(key)) map.set(key, { label: key, count: 0, valorNum: 0 });
    const entry = map.get(key);
    entry.count += 1;
    entry.valorNum += valueFn(item);
  });
  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((e) => ({ label: e.label, count: e.count, value: formatBRL(e.valorNum) }));
}

// GET /api/rh/dashboard/turnover?granularity=mes&year=2026&month=7
//                              ou ?granularity=ano&year=2026
router.get('/turnover', async (req, res) => {
  try {
    const granularity = req.query.granularity === 'ano' ? 'ano' : 'mes';
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));

    const { colaboradores, regiaoById } = await loadColaboradoresEEmpresas();

    const [start, end] = granularity === 'ano' ? yearRangeUTC(year) : monthRangeUTC(year, month);
    const current = computeTurnoverForRange(colaboradores, regiaoById, start, end);

    // Série histórica: 12 meses. Em "mes", os últimos 12 meses terminando
    // no mês selecionado; em "ano", os 12 meses do próprio ano selecionado.
    const historicoLabels = [];
    const historicoGeral = [];
    const historicoVoluntario = [];

    monthsForHistory(granularity, year, month).forEach(([y, m]) => {
      const [s, e] = monthRangeUTC(y, m);
      const r = computeTurnoverForRange(colaboradores, regiaoById, s, e);
      historicoLabels.push(MONTH_NAMES_SHORT[m - 1]);
      historicoGeral.push(Math.round((r.raw.hc > 0 ? (r.raw.geral / r.raw.hc) * 100 : 0) * 10) / 10);
      historicoVoluntario.push(Math.round((r.raw.hc > 0 ? (r.raw.voluntario / r.raw.hc) * 100 : 0) * 10) / 10);
    });

    delete current.raw;

    res.json({
      ok: true,
      data: {
        ...current,
        historicoLabels,
        historicoGeral,
        historicoVoluntario,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/turnover] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

function formatBRL(value) {
  return `R$ ${Math.round(value).toLocaleString('pt-BR')}`;
}

// Variante com centavos — formatBRL() acima arredonda pra inteiro, o que
// serve bem pra KPIs agregados (folha total, ticket médio, etc.) mas
// esconderia centavos num valor individual como o líquido de um contracheque
// específico (ex: R$ 3.842,17 viraria "R$ 3.842").
function formatBRLCentavos(value) {
  return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function changePct(current, previous) {
  if (previous === 0) return current === 0 ? '—' : '↑100%';
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `↑${pct}%` : `↓${Math.abs(pct)}%`;
}

const GENDER_META = {
  m: { label: 'Masculino', color: '#3457D5' },
  masculino: { label: 'Masculino', color: '#3457D5' },
  f: { label: 'Feminino', color: '#E0559C' },
  feminino: { label: 'Feminino', color: '#E0559C' },
};

function generoMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return GENDER_META[key] || { label: 'Não informado', color: '#B7BDCC' };
}

function topN(items, keyFn, n = 5) {
  const map = new Map();
  items.forEach((item) => {
    const key = keyFn(item) || 'Não informado';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

// GET /api/rh/dashboard/resumo?granularity=mes&year=2026&month=7
// Alimenta os cards/gráficos principais do Dashboard de RH (tudo calculado
// em cima de rh_colaboradores + empresas — sem tabela de histórico/snapshot,
// então "quadro atual"/"engajamento" refletem o estado de agora, não do
// período selecionado; admissões/demissões/turnover é que respeitam o filtro).
router.get('/resumo', async (req, res) => {
  try {
    const granularity = req.query.granularity === 'ano' ? 'ano' : 'mes';
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));

    const { colaboradores, regiaoById, empresaNomeById } = await loadColaboradoresEEmpresas();
    const nowMs = Date.now();

    const [start, end] = granularity === 'ano' ? yearRangeUTC(year) : monthRangeUTC(year, month);
    const current = computeTurnoverForRange(colaboradores, regiaoById, start, end);

    const [prevStart, prevEnd] =
      granularity === 'ano' ? yearRangeUTC(year - 1) : monthRangeUTC(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
    const previous = computeTurnoverForRange(colaboradores, regiaoById, prevStart, prevEnd);

    // "Quadro atual" e "Engajamento" são sempre em relação a agora (não há
    // snapshot histórico pra reconstruir esses dois no passado).
    const ativosAgora = colaboradores.filter((c) => (c.status ?? '').trim().toLowerCase() === 'ativo');
    const feriasAgora = colaboradores.filter((c) => (c.status ?? '').trim().toLowerCase() === 'ferias' || (c.status ?? '').trim().toLowerCase() === 'férias');
    const afastadosAgora = colaboradores.filter((c) => (c.status ?? '').trim().toLowerCase() === 'afastado');
    // Corrigido: "Novos 90d" é uma métrica do "quadro atual" (mesma seção de
    // ativos/férias/afastados), então precisa ser sobre quem está ATIVO agora
    // e foi admitido nos últimos 90 dias — antes contava qualquer admissão no
    // período mesmo que a pessoa já tivesse sido desligada depois, inflando o
    // número em relação ao painel web.
    const novos90d = ativosAgora.filter(
      (c) => c.admissaoMs !== null && nowMs - c.admissaoMs <= 90 * MS_PER_DAY
    ).length;

    // "Folha (Ativos)" — preferimos o total REAL já calculado pela folha de
    // pagamento (rh_folha_competencias.total_bruto da competência mais
    // recente) em vez de somar salario_base dos ativos, que é só uma
    // estimativa (ignora horas extra, descontos, dias trabalhados, etc.) e
    // foi identificado como divergente do painel web. Cai no cálculo
    // estimado só se ainda não existir nenhuma competência de folha lançada.
    let folhaAtivosValor = null;
    try {
      const folhaCompetenciasJson = await fetchTable('rh_folha_competencias', {
        select: 'ano,mes,total_bruto,total_colaboradores,status',
        order: 'ano:desc,mes:desc',
        limit: 1,
      });
      const ultimaCompetencia = (folhaCompetenciasJson.data || [])[0] || null;
      if (ultimaCompetencia && ultimaCompetencia.total_bruto !== null && ultimaCompetencia.total_bruto !== undefined) {
        folhaAtivosValor = Number(ultimaCompetencia.total_bruto) || 0;
      }
    } catch (err) {
      console.error('[rh/dashboard/resumo] falha ao ler rh_folha_competencias (usando estimativa):', err.message);
    }
    const folhaAtivosEstimado = ativosAgora.reduce((sum, c) => sum + (Number(c.salario_base) || 0), 0);
    const folhaAtivos = folhaAtivosValor !== null ? folhaAtivosValor : folhaAtivosEstimado;

    // Cobertura do portal: OR com portal_ativado_em (timestamp, sinal
    // inequívoco) cobre o caso de o valor exato do enum de portal_status
    // divergir do texto esperado — aceitamos algumas variações plausíveis
    // ('ativado'/'ativo'/'concluido'/'completo') sem risco de contar errado,
    // já que qualquer uma delas só é positiva se realmente indicar ativação.
    const PORTAL_STATUS_ATIVO = ['ativado', 'ativo', 'concluido', 'completo'];
    const comPortal = ativosAgora.filter(
      (c) => PORTAL_STATUS_ATIVO.includes((c.portal_status ?? '').trim().toLowerCase()) || c.portal_ativado_em
    ).length;
    const cobertura = ativosAgora.length > 0 ? Math.round((comPortal / ativosAgora.length) * 100) : 0;

    const temposCasa = ativosAgora
      .filter((c) => c.admissaoMs !== null)
      .map((c) => (nowMs - c.admissaoMs) / (365.25 * MS_PER_DAY));
    const tempoCasaMedio = temposCasa.length > 0 ? temposCasa.reduce((a, b) => a + b, 0) / temposCasa.length : 0;

    const exp30d = colaboradores.filter(
      (c) =>
        (c.status ?? '').trim().toLowerCase() === 'ativo' &&
        c.vencimentoExperienciaMs !== null &&
        c.vencimentoExperienciaMs >= nowMs &&
        c.vencimentoExperienciaMs <= nowMs + 30 * MS_PER_DAY
    ).length;

    const demissoesRescisao = colaboradores
      .filter((c) => c.demissaoMs !== null && c.demissaoMs >= start && c.demissaoMs < end)
      .reduce((sum, c) => sum + (Number(c.valor_rescisao_liquida) || 0), 0);

    const movimentacaoPct =
      current.raw.hc > 0 ? ((current.raw.admissoes + current.raw.geral) / 2 / current.raw.hc) * 100 : 0;

    // Admissões x demissões e headcount: 12 meses (mesma lógica de trailing
    // window do endpoint de turnover).
    const admissoesDemissoesChart = [];
    const headcountEvolution = [];
    const headcountMonths = [];
    monthsForHistory('mes', year, month).forEach(([y, m]) => {
      const [s, e] = monthRangeUTC(y, m);
      const r = computeTurnoverForRange(colaboradores, regiaoById, s, e);
      admissoesDemissoesChart.push({ label: MONTH_NAMES_SHORT[m - 1], adm: r.raw.admissoes, dem: r.raw.geral });
      headcountEvolution.push(r.raw.hc);
      headcountMonths.push(MONTH_NAMES_SHORT[m - 1]);
    });

    const topSetores = topN(ativosAgora, (c) => c.setor, 5);
    // "Unidade" no painel web é o posto/empresa (empresas.nome_fantasia via
    // empresa_id), não a coluna posto_trabalho (texto livre, quase sempre
    // vazio na base real — dava "Não informado" pra quase todo mundo antes
    // dessa correção).
    const topUnidades = topN(ativosAgora, (c) => empresaNomeById.get(c.empresa_id), 5).map((item) => ({
      name: item.label,
      value: item.value,
    }));

    const generoMap = new Map();
    ativosAgora.forEach((c) => {
      const meta = generoMeta(c.sexo);
      if (!generoMap.has(meta.label)) generoMap.set(meta.label, { label: meta.label, color: meta.color, count: 0 });
      generoMap.get(meta.label).count += 1;
    });
    const totalGenero = ativosAgora.length;
    const genderDistribution = Array.from(generoMap.values())
      .sort((a, b) => b.count - a.count)
      .map((g) => ({ ...g, pct: totalGenero > 0 ? Math.round((g.count / totalGenero) * 100) : 0 }));

    res.json({
      ok: true,
      data: {
        turnoverPct: current.geralPct,
        movimentacaoPct: pctBR(movimentacaoPct),
        admissoes: current.raw.admissoes,
        admissoesChangePct: changePct(current.raw.admissoes, previous.raw.admissoes),
        demissoes: current.raw.geral,
        demissoesChangePct: changePct(current.raw.geral, previous.raw.geral),
        demissoesRescisao: formatBRL(demissoesRescisao),
        folhaAtivos: formatBRL(folhaAtivos),
        quadro: {
          ativos: ativosAgora.length,
          ferias: feriasAgora.length,
          afastados: afastadosAgora.length,
          novos90d,
        },
        engajamento: {
          aderencia: null, // não temos log de acesso/login exposto na API interna hoje
          cobertura: `${cobertura}%`,
          tempoCasa: tempoCasaMedio.toFixed(1).replace('.', ','),
          exp30d,
        },
        admissoesDemissoesChart,
        headcountEvolution,
        headcountMonths,
        topSetores,
        topUnidades,
        genderDistribution,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/resumo] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/dashboard/admissoes?granularity=mes&year=2026&month=7
router.get('/admissoes', async (req, res) => {
  try {
    const granularity = req.query.granularity === 'ano' ? 'ano' : 'mes';
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));

    const { colaboradores, empresaNomeById } = await loadColaboradoresEEmpresas();
    const nowMs = Date.now();
    const [start, end] = granularity === 'ano' ? yearRangeUTC(year) : monthRangeUTC(year, month);

    const contratados = colaboradores.filter((c) => c.admissaoMs !== null && c.admissaoMs >= start && c.admissaoMs < end);
    const total = contratados.length;
    const comSalario = contratados.filter((c) => Number(c.salario_base) > 0);
    const custoAdicionalNum = comSalario.reduce((sum, c) => sum + Number(c.salario_base), 0);
    const salarioMedioNum = comSalario.length > 0 ? custoAdicionalNum / comSalario.length : 0;

    const jaDesligados = contratados.filter((c) => c.demissaoMs !== null).length;
    const aindaAtivos = total - jaDesligados;

    const maioresSalarios = [...comSalario]
      .sort((a, b) => Number(b.salario_base) - Number(a.salario_base))
      .slice(0, 10)
      .map((c) => ({
        nome: c.nome_completo || '(sem nome)',
        cargo: c.cargo || 'Sem cargo',
        setor: c.setor || 'Sem setor',
        admissao: formatDiaMes(c.admissaoMs),
        salario: formatBRL(Number(c.salario_base)),
      }));

    const porCargo = groupByLabel(contratados, (c) => c.cargo || 'Sem cargo', (c) => Number(c.salario_base) || 0);
    const porSetor = groupByLabel(contratados, (c) => c.setor || 'Sem setor', (c) => Number(c.salario_base) || 0);
    const porEmpresa = groupByLabel(
      contratados,
      (c) => (c.empresa_id ? empresaNomeById.get(c.empresa_id) : null) || 'Sem empresa',
      (c) => Number(c.salario_base) || 0
    );

    const historicoLabels = [];
    const historicoAdmissoes = [];
    const historicoCusto = [];
    monthsForHistory(granularity, year, month).forEach(([y, m]) => {
      const [s, e] = monthRangeUTC(y, m);
      const admMes = colaboradores.filter((c) => c.admissaoMs !== null && c.admissaoMs >= s && c.admissaoMs < e);
      historicoLabels.push(MONTH_NAMES_SHORT[m - 1]);
      historicoAdmissoes.push(admMes.length);
      historicoCusto.push(Math.round(admMes.reduce((sum, c) => sum + (Number(c.salario_base) || 0), 0)));
    });

    res.json({
      ok: true,
      data: {
        total,
        comSalarioInformado: comSalario.length,
        custoAdicional: formatBRL(custoAdicionalNum),
        salarioMedio: formatBRL(salarioMedioNum),
        aindaAtivos,
        jaDesligados,
        aindaAtivosPct: total > 0 ? Math.round((aindaAtivos / total) * 100) : 0,
        jaDesligadosPct: total > 0 ? Math.round((jaDesligados / total) * 100) : 0,
        maioresSalarios,
        maioresSalariosVazio: 'Nenhuma admissão com salário lançado no período.',
        porCargo,
        porSetor,
        porEmpresa,
        historicoLabels,
        historicoAdmissoes,
        historicoCusto,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/admissoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/dashboard/demissoes?granularity=mes&year=2026&month=7
router.get('/demissoes', async (req, res) => {
  try {
    const granularity = req.query.granularity === 'ano' ? 'ano' : 'mes';
    const year = Number(req.query.year) || new Date().getUTCFullYear();
    const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getUTCMonth() + 1));

    const { colaboradores, empresaNomeById } = await loadColaboradoresEEmpresas();
    const [start, end] = granularity === 'ano' ? yearRangeUTC(year) : monthRangeUTC(year, month);

    const desligados = colaboradores.filter((c) => c.demissaoMs !== null && c.demissaoMs >= start && c.demissaoMs < end);
    const total = desligados.length;
    const comRescisao = desligados.filter((c) => Number(c.valor_rescisao_liquida) > 0);
    const totalRescisoesNum = comRescisao.reduce((sum, c) => sum + Number(c.valor_rescisao_liquida), 0);
    const ticketMedioNum = comRescisao.length > 0 ? totalRescisoesNum / comRescisao.length : 0;

    const temposCasaAnos = desligados
      .filter((c) => c.admissaoMs !== null)
      .map((c) => (c.demissaoMs - c.admissaoMs) / (365.25 * MS_PER_DAY));
    const tempoCasaMedio = temposCasaAnos.length > 0 ? temposCasaAnos.reduce((a, b) => a + b, 0) / temposCasaAnos.length : 0;

    const voluntario = desligados.filter((c) => isVoluntario(c.motivo_desligamento)).length;
    const involuntario = total - voluntario;

    const maioresValores = [...comRescisao]
      .sort((a, b) => Number(b.valor_rescisao_liquida) - Number(a.valor_rescisao_liquida))
      .slice(0, 10)
      .map((c) => ({
        nome: c.nome_completo || '(sem nome)',
        motivo: motivoMeta(c.motivo_desligamento).label,
        tempoCasa:
          c.admissaoMs !== null
            ? `${(((c.demissaoMs - c.admissaoMs) / (365.25 * MS_PER_DAY)) || 0).toFixed(1)}a`
            : '—',
        demissao: formatDiaMes(c.demissaoMs),
        valor: formatBRL(Number(c.valor_rescisao_liquida)),
      }));

    const motivosMap = new Map();
    desligados.forEach((c) => {
      const meta = motivoMeta(c.motivo_desligamento);
      if (!motivosMap.has(meta.label)) motivosMap.set(meta.label, { label: meta.label, color: meta.color, count: 0, valorNum: 0 });
      const entry = motivosMap.get(meta.label);
      entry.count += 1;
      entry.valorNum += Number(c.valor_rescisao_liquida) || 0;
    });
    const motivos = Array.from(motivosMap.values())
      .sort((a, b) => b.count - a.count)
      .map((m) => ({
        label: m.label,
        color: m.color,
        count: m.count,
        pct: total > 0 ? Math.round((m.count / total) * 1000) / 10 : 0,
        valor: formatBRL(m.valorNum),
      }));

    const porCargo = groupByLabel(desligados, (c) => c.cargo || 'Sem cargo', (c) => Number(c.valor_rescisao_liquida) || 0);
    const porSetor = groupByLabel(desligados, (c) => c.setor || 'Sem setor', (c) => Number(c.valor_rescisao_liquida) || 0);
    const porEmpresa = groupByLabel(
      desligados,
      (c) => (c.empresa_id ? empresaNomeById.get(c.empresa_id) : null) || 'Sem empresa',
      (c) => Number(c.valor_rescisao_liquida) || 0
    );

    const historicoLabels = [];
    const historicoDemissoes = [];
    const historicoRescisoes = [];
    monthsForHistory(granularity, year, month).forEach(([y, m]) => {
      const [s, e] = monthRangeUTC(y, m);
      const demMes = colaboradores.filter((c) => c.demissaoMs !== null && c.demissaoMs >= s && c.demissaoMs < e);
      historicoLabels.push(MONTH_NAMES_SHORT[m - 1]);
      historicoDemissoes.push(demMes.length);
      historicoRescisoes.push(Math.round(demMes.reduce((sum, c) => sum + (Number(c.valor_rescisao_liquida) || 0), 0)));
    });

    res.json({
      ok: true,
      data: {
        total,
        comRescisaoLancada: comRescisao.length,
        totalRescisoes: formatBRL(totalRescisoesNum),
        ticketMedio: formatBRL(ticketMedioNum),
        tempoCasa: tempoCasaMedio.toFixed(1).replace('.', ','),
        voluntario,
        voluntarioPct: total > 0 ? Math.round((voluntario / total) * 100) : 0,
        involuntario,
        involuntarioPct: total > 0 ? Math.round((involuntario / total) * 100) : 0,
        maioresValores,
        maioresValoresVazio: 'Nenhuma demissão com rescisão lançada no período.',
        motivos,
        motivosVazio: 'Sem desligamentos no período.',
        porCargo,
        porSetor,
        porEmpresa,
        historicoLabels,
        historicoDemissoes,
        historicoRescisoes,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/demissoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/dashboard/transferencias
// Lista todas as transferências reais (rh_transferencias), resolvendo nomes
// via rh_colaboradores/empresas. Sem filtro de período — é a listagem
// completa (a tela não tem filtro de mês/ano). Se a tabela estiver vazia,
// retorna items: [] honestamente (não fabrica linhas).
router.get('/transferencias', async (req, res) => {
  try {
    const { colaboradores, empresaNomeById } = await loadColaboradoresEEmpresas();
    const colaboradorNomeById = new Map(colaboradores.map((c) => [c.id, c.nome_completo]));

    const transferenciasJson = await fetchAllRows('rh_transferencias', {
      select:
        'id,colaborador_id,data_vigencia,empresa_origem_id,setor_origem,cargo_origem,salario_anterior,empresa_destino_id,setor_destino,cargo_destino,salario_novo,motivo,observacao,status,created_at',
    });

    const items = (transferenciasJson.data || [])
      .map((t) => {
        const vigenciaMs = parseDateOnly(t.data_vigencia);
        const meta = transferStatusMeta(t.status);
        return {
          id: t.id,
          colaboradorNome: (t.colaborador_id && colaboradorNomeById.get(t.colaborador_id)) || 'Não informado',
          empresaOrigemNome: (t.empresa_origem_id && empresaNomeById.get(t.empresa_origem_id)) || null,
          empresaDestinoNome: (t.empresa_destino_id && empresaNomeById.get(t.empresa_destino_id)) || null,
          setorOrigem: t.setor_origem || null,
          setorDestino: t.setor_destino || null,
          cargoOrigem: t.cargo_origem || null,
          cargoDestino: t.cargo_destino || null,
          salarioAnterior: t.salario_anterior != null ? formatBRL(Number(t.salario_anterior)) : null,
          salarioNovo: t.salario_novo != null ? formatBRL(Number(t.salario_novo)) : null,
          motivo: t.motivo || null,
          observacao: t.observacao || null,
          status: t.status || null,
          statusLabel: meta.label,
          statusColor: meta.color,
          statusTint: meta.tint,
          vigenciaMs,
          vigenciaLabel: vigenciaMs !== null ? formatDataBR(vigenciaMs) : '—',
          criadoMs: parseDateOnly(t.created_at) ?? (t.created_at ? Date.parse(t.created_at) : null),
        };
      })
      .sort((a, b) => (b.vigenciaMs ?? b.criadoMs ?? 0) - (a.vigenciaMs ?? a.criadoMs ?? 0))
      .map(({ vigenciaMs, criadoMs, ...item }) => item);

    const statusOrder = [];
    const statusCounts = new Map();
    items.forEach((item) => {
      const key = item.status || 'sem_status';
      if (!statusCounts.has(key)) {
        statusOrder.push(key);
        statusCounts.set(key, { status: item.status, label: item.statusLabel, color: item.statusColor, tint: item.statusTint, count: 0 });
      }
      statusCounts.get(key).count += 1;
    });
    const statusSummary = statusOrder.map((key) => statusCounts.get(key));

    res.json({
      ok: true,
      data: {
        items,
        total: items.length,
        statusSummary,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/transferencias] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/dashboard/folha
// Lista as competências de folha (rh_folha_competencias), mais recente
// primeiro, com totais já agregados na própria tabela (não somamos
// rh_folha linha a linha aqui).
router.get('/folha', async (req, res) => {
  try {
    const competenciasJson = await fetchAllRows('rh_folha_competencias', {
      select:
        'id,ano,mes,status,data_pagamento,data_prevista_pagamento,observacao,total_colaboradores,total_bruto,total_liquido,total_fgts',
    });

    const items = (competenciasJson.data || [])
      .map((c) => {
        const meta = folhaStatusMeta(c.status);
        const dataPagamentoMs = parseDateOnly(c.data_pagamento);
        const dataPrevistaMs = parseDateOnly(c.data_prevista_pagamento);
        const ano = Number(c.ano);
        const mes = Number(c.mes);
        return {
          id: c.id,
          ano,
          mes,
          label: `${MONTH_NAMES_LONG[mes - 1] || mes} / ${ano}`,
          status: c.status || null,
          statusLabel: meta.label,
          statusColor: meta.color,
          statusTint: meta.tint,
          totalColaboradores: c.total_colaboradores ?? null,
          totalBruto: c.total_bruto != null ? formatBRL(Number(c.total_bruto)) : null,
          totalLiquido: c.total_liquido != null ? formatBRL(Number(c.total_liquido)) : null,
          totalFgts: c.total_fgts != null ? formatBRL(Number(c.total_fgts)) : null,
          dataPagamentoLabel: dataPagamentoMs !== null ? formatDataBR(dataPagamentoMs) : null,
          dataPrevistaPagamentoLabel: dataPrevistaMs !== null ? formatDataBR(dataPrevistaMs) : null,
          observacao: c.observacao || null,
          ordemMs: Date.UTC(ano || 0, (mes || 1) - 1, 1),
        };
      })
      .sort((a, b) => b.ordemMs - a.ordemMs)
      .map(({ ordemMs, ...item }) => item);

    res.json({
      ok: true,
      data: {
        items,
        total: items.length,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/folha] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Meu Painel (colaborador) ----------
// tempoLabel relativo tipo "há 2 dias"/"há 3h" a partir de um timestamp
// completo (publicar_em vem com hora, diferente das colunas "date only"
// tratadas por parseDateOnly acima).
function tempoRelativoLabel(rawTimestamp, nowMs) {
  if (!rawTimestamp) return '';
  const ms = Date.parse(rawTimestamp);
  if (Number.isNaN(ms)) return '';
  const diffMs = Math.max(0, nowMs - ms);
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffD >= 1) return `há ${diffD} dia${diffD === 1 ? '' : 's'}`;
  if (diffH >= 1) return `há ${diffH}h`;
  if (diffMin >= 1) return `há ${diffMin} min`;
  return 'agora';
}

function capitalizeLabel(raw) {
  const key = (raw ?? '').trim();
  if (!key) return 'Não informado';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// GET /api/rh/dashboard/colaborador-home?colaboradorId=...
// Agrega os dados da tela "Meu Painel" do colaborador: comunicados
// (filtrados no código por público-alvo, já que não dá pra fazer OR
// complexo direto na query do Lovable), chamados abertos, treinamentos
// pendentes e o último contracheque.
router.get('/colaborador-home', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const colaboradorJson = await fetchTable('rh_colaboradores', {
      select: 'id,empresa_id',
      filters: { id: colaboradorId },
      limit: 1,
    });
    const colaborador = (colaboradorJson.data || [])[0] || null;
    const empresaId = colaborador?.empresa_id || null;

    const [comunicadosJson, leiturasJson, chamadosJson, treinamentosJson, contrachequeJson] = await Promise.all([
      fetchAllRows('rh_comunicados', {
        select: 'id,titulo,publico,empresa_id,colaborador_id,publicar_em,expira_em',
      }),
      fetchAllRows('rh_comunicado_leituras', {
        select: 'comunicado_id,colaborador_id,lido_em',
        filters: { colaborador_id: colaboradorId },
      }),
      fetchTable('rh_solicitacoes', {
        filters: { colaborador_id: colaboradorId, status__in: 'aberta,em_analise,respondida' },
        limit: 1,
        count: true,
      }),
      fetchAllRows('rh_treinamento_inscricoes', {
        select: 'id,colaborador_id,status,concluido_em',
        filters: { colaborador_id: colaboradorId },
      }),
      fetchTable('rh_contracheques', {
        filters: { colaborador_id: colaboradorId },
        order: 'competencia:desc',
        limit: 1,
      }),
    ]);

    const nowMs = Date.now();

    // Comunicados: fica só com o que vale pra esse colaborador (público
    // 'todos', 'empresa' com empresa_id batendo, ou 'colaborador' com
    // colaborador_id batendo). 'grupo' fica de fora — ainda não temos como
    // resolver o vínculo colaborador↔grupo_id nesta rota, e é mais seguro
    // não mostrar do que mostrar errado.
    const comunicadosRelevantes = (comunicadosJson.data || []).filter((c) => {
      const publicarMs = c.publicar_em ? Date.parse(c.publicar_em) : null;
      const expiraMs = c.expira_em ? Date.parse(c.expira_em) : null;
      if (publicarMs !== null && !Number.isNaN(publicarMs) && publicarMs > nowMs) return false;
      if (expiraMs !== null && !Number.isNaN(expiraMs) && expiraMs < nowMs) return false;

      const publico = (c.publico ?? '').trim().toLowerCase();
      if (publico === 'todos') return true;
      if (publico === 'empresa') return Boolean(empresaId) && c.empresa_id === empresaId;
      if (publico === 'colaborador') return c.colaborador_id === colaboradorId;
      return false;
    });

    const lidosSet = new Set(
      (leiturasJson.data || []).filter((l) => l.lido_em).map((l) => l.comunicado_id)
    );
    const naoLidos = comunicadosRelevantes.filter((c) => !lidosSet.has(c.id));

    const comunicadosRecentes = [...comunicadosRelevantes]
      .sort((a, b) => (Date.parse(b.publicar_em || 0) || 0) - (Date.parse(a.publicar_em || 0) || 0))
      .slice(0, 3)
      .map((c) => ({
        id: c.id,
        titulo: c.titulo,
        tempoLabel: tempoRelativoLabel(c.publicar_em, nowMs) || capitalizeLabel(c.publico),
      }));

    const chamadosAbertos = chamadosJson.count ?? (chamadosJson.data || []).length ?? 0;

    // Treinamentos pendentes: se algum dia o enum real de status divergir
    // de 'concluido', concluido_em (coluna confirmada em LOVABLE_API.md)
    // continua sendo o sinal confiável de "terminou ou não".
    const treinamentosPendentes = (treinamentosJson.data || []).filter((t) => !t.concluido_em).length;

    const contrachequeRaw = (contrachequeJson.data || [])[0] || null;
    let ultimoContracheque = null;
    if (contrachequeRaw) {
      const competenciaMs = parseDateOnly(contrachequeRaw.competencia);
      const competenciaLabel =
        competenciaMs !== null
          ? `${MONTH_NAMES_LONG[new Date(competenciaMs).getUTCMonth()]} · ${new Date(competenciaMs).getUTCFullYear()}`
          : '—';
      ultimoContracheque = {
        competenciaLabel,
        valorLiquido: formatBRLCentavos(Number(contrachequeRaw.valor_liquido) || 0),
      };
    }

    res.json({
      ok: true,
      data: {
        comunicadosNaoLidos: naoLidos.length,
        comunicadosRecentes,
        chamadosAbertos,
        treinamentosPendentes,
        // Não existe tabela de eventos/calendário no schema documentado hoje
        // (conferido em af360-api/src/LOVABLE_API.md inteiro) — se algum dia
        // for implementar essa seção, é preciso pedir ao time Lovable uma
        // tabela nova (ex.: algo como rh_eventos).
        eventosProximos: null,
        ultimoContracheque,
      },
    });
  } catch (err) {
    console.error('[rh/dashboard/colaborador-home] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Comunicados (lista completa) ----------
// Mesma lógica de "público relevante" usada em /colaborador-home, mas devolve
// TODOS os itens (não só os 3 recentes) e marca lido:boolean via
// rh_comunicado_leituras. Duplica a filtragem em vez de extrair um helper
// compartilhado pra não arriscar mexer no comportamento já em produção do
// /colaborador-home — ambos seguem exatamente a mesma regra.

// GET /api/rh/dashboard/comunicados?colaboradorId=...
router.get('/comunicados', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const colaboradorJson = await fetchTable('rh_colaboradores', {
      select: 'id,empresa_id',
      filters: { id: colaboradorId },
      limit: 1,
    });
    const colaborador = (colaboradorJson.data || [])[0] || null;
    const empresaId = colaborador?.empresa_id || null;

    const [comunicadosJson, leiturasJson] = await Promise.all([
      fetchAllRows('rh_comunicados', {
        select: 'id,titulo,conteudo,publico,empresa_id,colaborador_id,publicar_em,expira_em',
      }),
      fetchAllRows('rh_comunicado_leituras', {
        select: 'comunicado_id,colaborador_id,lido_em',
        filters: { colaborador_id: colaboradorId },
      }),
    ]);

    const nowMs = Date.now();

    // Mesmo filtro de público-alvo do /colaborador-home: 'todos' sempre entra,
    // 'empresa' só se bater empresa_id, 'colaborador' só se for o próprio.
    // 'grupo' fica de fora (sem como resolver colaborador↔grupo_id hoje).
    const comunicadosRelevantes = (comunicadosJson.data || []).filter((c) => {
      const publicarMs = c.publicar_em ? Date.parse(c.publicar_em) : null;
      const expiraMs = c.expira_em ? Date.parse(c.expira_em) : null;
      if (publicarMs !== null && !Number.isNaN(publicarMs) && publicarMs > nowMs) return false;
      if (expiraMs !== null && !Number.isNaN(expiraMs) && expiraMs < nowMs) return false;

      const publico = (c.publico ?? '').trim().toLowerCase();
      if (publico === 'todos') return true;
      if (publico === 'empresa') return Boolean(empresaId) && c.empresa_id === empresaId;
      if (publico === 'colaborador') return c.colaborador_id === colaboradorId;
      return false;
    });

    const lidosSet = new Set(
      (leiturasJson.data || []).filter((l) => l.lido_em).map((l) => l.comunicado_id)
    );

    const items = comunicadosRelevantes
      .sort((a, b) => (Date.parse(b.publicar_em || 0) || 0) - (Date.parse(a.publicar_em || 0) || 0))
      .map((c) => ({
        id: c.id,
        titulo: c.titulo,
        conteudo: c.conteudo || '',
        publico: c.publico || null,
        tempoLabel: tempoRelativoLabel(c.publicar_em, nowMs) || capitalizeLabel(c.publico),
        lido: lidosSet.has(c.id),
      }));

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/comunicados] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Minhas Solicitações ----------
const SOLICITACAO_STATUS_META = {
  aberta: { label: 'Aberta', color: '#3457D5', tint: '#E9EEFF' },
  em_analise: { label: 'Em análise', color: '#B5841A', tint: '#FCF3DA' },
  respondida: { label: 'Respondida', color: '#18955A', tint: '#E3F5EA' },
  encerrada: { label: 'Encerrada', color: '#5E667D', tint: '#EEF0F5' },
  cancelada: { label: 'Cancelada', color: '#E6213D', tint: '#FCE8EC' },
};

function solicitacaoStatusMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return SOLICITACAO_STATUS_META[key] || { label: raw || 'Não informado', color: '#9AA1B5', tint: '#EEF0F5' };
}

const SOLICITACAO_SETOR_LABELS = {
  rh: 'RH',
  dp: 'Departamento Pessoal',
  documentos: 'Documentos',
  outros: 'Outros',
};

function solicitacaoSetorLabel(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return SOLICITACAO_SETOR_LABELS[key] || capitalizeLabel(raw);
}

// GET /api/rh/dashboard/solicitacoes?colaboradorId=...
router.get('/solicitacoes', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const solicitacoesJson = await fetchAllRows('rh_solicitacoes', {
      select:
        'id,protocolo,colaborador_id,setor,assunto,titulo,mensagem,status,atribuido_a,respondido_em,encerrado_em,created_at',
      filters: { colaborador_id: colaboradorId },
    });

    const items = (solicitacoesJson.data || [])
      .map((s) => {
        const meta = solicitacaoStatusMeta(s.status);
        // created_at chega com hora — usamos parseDateOnly (que extrai só a
        // parte YYYY-MM-DD do timestamp) pra exibir e ordenar, mesmo padrão
        // já usado em /transferencias pro campo criado_em.
        const createdMs = parseDateOnly(s.created_at) ?? (s.created_at ? Date.parse(s.created_at) : null);
        return {
          id: s.id,
          protocolo: s.protocolo || null,
          titulo: s.titulo || s.assunto || 'Solicitação',
          openedDateLabel: createdMs !== null && !Number.isNaN(createdMs) ? formatDataBR(createdMs) : '—',
          department: solicitacaoSetorLabel(s.setor),
          status: { label: meta.label, color: meta.color, tint: meta.tint },
          _createdMs: createdMs ?? 0,
        };
      })
      .sort((a, b) => b._createdMs - a._createdMs)
      .map(({ _createdMs, ...item }) => item);

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/solicitacoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Metas ----------
const META_STATUS_META = {
  aberta: { label: 'Aberta', color: '#3457D5' },
  atingida: { label: 'Atingida', color: '#18955A' },
  nao_atingida: { label: 'Não atingida', color: '#E6213D' },
  cancelada: { label: 'Cancelada', color: '#5E667D' },
};

function metaStatusMeta(raw) {
  const key = (raw ?? '').trim().toLowerCase();
  return META_STATUS_META[key] || { label: raw || 'Não informado', color: '#9AA1B5' };
}

// GET /api/rh/dashboard/metas?colaboradorId=...
router.get('/metas', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const metasJson = await fetchAllRows('rh_metas', {
      select: 'id,colaborador_id,titulo,descricao,periodo_inicio,periodo_fim,meta_alvo,resultado,status,avaliacao',
      filters: { colaborador_id: colaboradorId },
    });

    const items = (metasJson.data || []).map((m) => {
      const alvo = Number(m.meta_alvo);
      const resultado = Number(m.resultado);
      // meta_alvo 0/null/não numérico não dá pra usar como denominador —
      // devolvemos progressoPct null (o app mostra "—") em vez de dividir por
      // zero ou inventar um número.
      const progressoPct =
        Number.isFinite(alvo) && alvo !== 0 && Number.isFinite(resultado)
          ? Math.max(0, Math.min(100, Math.round((resultado / alvo) * 100)))
          : null;

      const inicioMs = parseDateOnly(m.periodo_inicio);
      const fimMs = parseDateOnly(m.periodo_fim);
      const periodoLabel =
        inicioMs !== null && fimMs !== null ? `${formatDiaMes(inicioMs)} - ${formatDiaMes(fimMs)}` : null;

      const meta = metaStatusMeta(m.status);

      return {
        id: m.id,
        titulo: m.titulo,
        subtitulo: m.descricao || periodoLabel || '—',
        progressoPct,
        status: meta.label,
        color: meta.color,
      };
    });

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/metas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Treinamentos (lista/status) ----------
// Cobre só a lista/status dos treinamentos (cards do TrainingsScreen) — o
// conteúdo detalhado de aulas/prova não existe no schema documentado hoje
// (sem tabela de aulas/questões), então fica de fora por definição.

// GET /api/rh/dashboard/treinamentos?colaboradorId=...
router.get('/treinamentos', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const [inscricoesJson, treinamentosJson] = await Promise.all([
      fetchAllRows('rh_treinamento_inscricoes', {
        select:
          'id,treinamento_id,colaborador_id,status,iniciado_em,concluido_em,nota,certificado_url,tempo_gasto_min,tentativas',
        filters: { colaborador_id: colaboradorId },
      }),
      fetchAllRows('rh_treinamentos', {
        select: 'id,titulo,descricao,carga_horaria_min,obrigatorio,conteudo_url,tipo,video_url',
      }),
    ]);

    const treinamentoById = new Map((treinamentosJson.data || []).map((t) => [t.id, t]));

    const items = (inscricoesJson.data || []).map((insc) => {
      const treinamento = treinamentoById.get(insc.treinamento_id) || null;

      // concluido_em/iniciado_em são as colunas confirmadas em
      // LOVABLE_API.md — usamos elas como sinal de status em vez de confiar
      // cegamente no enum livre de `status`, mesmo raciocínio já aplicado em
      // /colaborador-home pros treinamentosPendentes.
      const status = insc.concluido_em ? 'concluido' : insc.iniciado_em ? 'em_andamento' : 'nao_iniciado';

      // Não existe coluna de "% concluído" dentro do curso — só sinais
      // binários (iniciou/concluiu). Preenchemos progressoPct só nos
      // extremos (0/100) e deixamos null pra "em andamento" em vez de
      // inventar um número intermediário.
      const progressoPct = status === 'concluido' ? 100 : status === 'nao_iniciado' ? 0 : null;

      const cargaMin = Number(treinamento?.carga_horaria_min);
      const duracaoLabel = Number.isFinite(cargaMin) && cargaMin > 0 ? `${cargaMin} min` : '—';

      return {
        id: insc.treinamento_id,
        titulo: treinamento?.titulo || 'Treinamento',
        categoria: treinamento?.tipo || null,
        duracaoLabel,
        obrigatorio: Boolean(treinamento?.obrigatorio),
        status,
        progressoPct,
      };
    });

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/treinamentos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Meus Benefícios ----------
// Uma linha só por colaborador em rh_beneficios_colaborador — cada benefício
// vira um item da lista somente se o respectivo *_ativo vier true.

// GET /api/rh/dashboard/beneficios?colaboradorId=...
router.get('/beneficios', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const beneficiosJson = await fetchTable('rh_beneficios_colaborador', {
      filters: { colaborador_id: colaboradorId },
      limit: 1,
    });
    const b = (beneficiosJson.data || [])[0] || null;

    const items = [];
    if (b) {
      if (b.vr_ativo) {
        items.push({
          id: 'vr',
          titulo: 'Vale Refeição',
          subtitulo: 'Crédito diário',
          valor: b.vr_valor_dia != null ? `${formatBRLCentavos(Number(b.vr_valor_dia))}/dia` : null,
        });
      }
      if (b.va_ativo) {
        items.push({
          id: 'va',
          titulo: 'Vale Alimentação',
          subtitulo: 'Crédito diário',
          valor: b.va_valor_dia != null ? `${formatBRLCentavos(Number(b.va_valor_dia))}/dia` : null,
        });
      }
      if (b.seguro_vida_ativo) {
        items.push({
          id: 'seguro_vida',
          titulo: 'Seguro de Vida',
          subtitulo: [b.seguro_vida_seguradora, b.seguro_vida_cobertura].filter(Boolean).join(' · ') || 'Ativo',
          valor:
            b.seguro_vida_desconto_mensal != null ? formatBRLCentavos(Number(b.seguro_vida_desconto_mensal)) : null,
        });
      }
      if (b.plano_saude_ativo) {
        items.push({
          id: 'plano_saude',
          titulo: 'Plano de Saúde',
          subtitulo: [b.plano_saude_operadora, b.plano_saude_plano].filter(Boolean).join(' · ') || 'Ativo',
          valor:
            b.plano_saude_desconto_titular != null ? formatBRLCentavos(Number(b.plano_saude_desconto_titular)) : null,
        });
      }
      if (b.plano_odonto_ativo) {
        items.push({
          id: 'plano_odonto',
          titulo: 'Plano Odontológico',
          subtitulo: [b.plano_odonto_operadora, b.plano_odonto_plano].filter(Boolean).join(' · ') || 'Ativo',
          valor:
            b.plano_odonto_desconto_titular != null ? formatBRLCentavos(Number(b.plano_odonto_desconto_titular)) : null,
        });
      }
    }

    res.json({ ok: true, data: { items, total: items.length, semCadastro: !b } });
  } catch (err) {
    console.error('[rh/dashboard/beneficios] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Notificações ----------

// GET /api/rh/dashboard/notificacoes?colaboradorId=...
router.get('/notificacoes', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const notifJson = await fetchAllRows('notif_inbox', {
      select: 'id,colaborador_id,modulo,notificacao_id,titulo,mensagem,lido_em',
      filters: { colaborador_id: colaboradorId },
    });

    // notif_inbox não tem coluna de data/hora documentada (só lido_em, que é
    // sobre leitura, não sobre criação) — não dá pra ordenar por "mais
    // recente" de verdade. Colocamos as não lidas primeiro (sinal real que
    // temos) em vez de inventar uma ordem cronológica.
    const items = (notifJson.data || [])
      .map((n) => ({
        id: n.id,
        titulo: n.titulo,
        mensagem: n.mensagem,
        modulo: n.modulo || null,
        unread: !n.lido_em,
      }))
      .sort((a, b) => Number(b.unread) - Number(a.unread));

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/notificacoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// ---------- Colaborador (self-service): Contra-cheques (histórico completo) ----------

// GET /api/rh/dashboard/contracheques?colaboradorId=...
router.get('/contracheques', async (req, res) => {
  try {
    const colaboradorId = req.query.colaboradorId;
    if (!colaboradorId) {
      return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
    }

    const contrachequesJson = await fetchAllRows('rh_contracheques', {
      select: 'id,colaborador_id,competencia,valor_bruto,valor_liquido,valor_descontos,arquivo_url,observacoes',
      filters: { colaborador_id: colaboradorId },
    });

    const items = (contrachequesJson.data || [])
      .map((c) => {
        const competenciaMs = parseDateOnly(c.competencia);
        const competenciaLabel =
          competenciaMs !== null
            ? `${MONTH_NAMES_LONG[new Date(competenciaMs).getUTCMonth()]} · ${new Date(competenciaMs).getUTCFullYear()}`
            : '—';
        return {
          id: c.id,
          competenciaLabel,
          valorLiquido: formatBRLCentavos(Number(c.valor_liquido) || 0),
          valorBruto: formatBRLCentavos(Number(c.valor_bruto) || 0),
          valorDescontos: formatBRLCentavos(Number(c.valor_descontos) || 0),
          arquivoUrl: c.arquivo_url || null,
          _competenciaMs: competenciaMs ?? 0,
        };
      })
      .sort((a, b) => b._competenciaMs - a._competenciaMs)
      .map(({ _competenciaMs, ...item }) => item);

    res.json({ ok: true, data: { items, total: items.length } });
  } catch (err) {
    console.error('[rh/dashboard/contracheques] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
