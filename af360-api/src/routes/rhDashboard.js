const express = require('express');
const { fetchAllRows } = require('../lovable');

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
  const activeAtEnd = colaboradores.filter((c) => isActiveAt(c, endMs));
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

  // Turnover até 90 dias: coorte = admitidos dentro do próprio período.
  const contratados = colaboradores.filter((c) => c.admissaoMs !== null && c.admissaoMs >= startMs && c.admissaoMs < endMs);
  const saidasPrecoces = contratados.filter(
    (c) => c.demissaoMs !== null && (c.demissaoMs - c.admissaoMs) / MS_PER_DAY <= 90
  ).length;
  const ate90diasPct = contratados.length > 0 ? (saidasPrecoces / contratados.length) * 100 : 0;

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
    ate90diasMeta: `${saidasPrecoces} de ${contratados.length} contratados saíram em ≤ 90 dias`,
    motivos,
    motivosVazio: 'Sem desligamentos no período.',
    // Números crus, reaproveitados pelo /resumo (e pela série histórica
    // abaixo) sem precisar re-parsear as strings formatadas.
    raw: { hc, geral, voluntario, involuntario, admissoes: contratados.length },
  };
}

async function loadColaboradoresEEmpresas() {
  const [colaboradoresJson, empresasJson] = await Promise.all([
    fetchAllRows('rh_colaboradores', {
      select:
        'id,empresa_id,status,setor,posto_trabalho,sexo,salario_base,data_admissao,data_demissao,motivo_desligamento,valor_rescisao_liquida,vencimento_experiencia,portal_status,portal_ativado_em',
    }),
    fetchAllRows('empresas', { select: 'id,regiao' }),
  ]);

  const regiaoById = new Map();
  (empresasJson.data || []).forEach((e) => {
    regiaoById.set(e.id, e.regiao || null);
  });

  const colaboradores = (colaboradoresJson.data || []).map((c) => ({
    ...c,
    admissaoMs: parseDateOnly(c.data_admissao),
    demissaoMs: parseDateOnly(c.data_demissao),
    vencimentoExperienciaMs: parseDateOnly(c.vencimento_experiencia),
  }));

  return { colaboradores, regiaoById };
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

    if (granularity === 'ano') {
      for (let m = 1; m <= 12; m++) {
        const [s, e] = monthRangeUTC(year, m);
        const r = computeTurnoverForRange(colaboradores, regiaoById, s, e);
        historicoLabels.push(MONTH_NAMES_SHORT[m - 1]);
        historicoGeral.push(Math.round((r.raw.hc > 0 ? (r.raw.geral / r.raw.hc) * 100 : 0) * 10) / 10);
        historicoVoluntario.push(Math.round((r.raw.hc > 0 ? (r.raw.voluntario / r.raw.hc) * 100 : 0) * 10) / 10);
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        // Mês absoluto (0-based, ex: 2026-07 -> 2026*12+6) menos i meses pra
        // trás — evita a armadilha de módulo negativo ao cruzar o ano.
        const totalMonthIndex = year * 12 + (month - 1) - i;
        const y = Math.floor(totalMonthIndex / 12);
        const m = (totalMonthIndex % 12) + 1;
        const [s, e] = monthRangeUTC(y, m);
        const r = computeTurnoverForRange(colaboradores, regiaoById, s, e);
        historicoLabels.push(MONTH_NAMES_SHORT[m - 1]);
        historicoGeral.push(Math.round((r.raw.hc > 0 ? (r.raw.geral / r.raw.hc) * 100 : 0) * 10) / 10);
        historicoVoluntario.push(Math.round((r.raw.hc > 0 ? (r.raw.voluntario / r.raw.hc) * 100 : 0) * 10) / 10);
      }
    }

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

    const { colaboradores, regiaoById } = await loadColaboradoresEEmpresas();
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
    const novos90d = colaboradores.filter(
      (c) => c.admissaoMs !== null && nowMs - c.admissaoMs <= 90 * MS_PER_DAY && c.admissaoMs <= nowMs
    ).length;

    const folhaAtivos = ativosAgora.reduce((sum, c) => sum + (Number(c.salario_base) || 0), 0);

    const comPortal = ativosAgora.filter(
      (c) => (c.portal_status ?? '').trim().toLowerCase() === 'ativado' || c.portal_ativado_em
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
    for (let i = 11; i >= 0; i--) {
      const totalMonthIndex = year * 12 + (month - 1) - i;
      const y = Math.floor(totalMonthIndex / 12);
      const m = (totalMonthIndex % 12) + 1;
      const [s, e] = monthRangeUTC(y, m);
      const r = computeTurnoverForRange(colaboradores, regiaoById, s, e);
      admissoesDemissoesChart.push({ label: MONTH_NAMES_SHORT[m - 1], adm: r.raw.admissoes, dem: r.raw.geral });
      headcountEvolution.push(r.raw.hc);
      headcountMonths.push(MONTH_NAMES_SHORT[m - 1]);
    }

    const topSetores = topN(ativosAgora, (c) => c.setor, 5);
    const topUnidades = topN(ativosAgora, (c) => c.posto_trabalho, 5).map((item) => ({ name: item.label, value: item.value }));

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

module.exports = router;
