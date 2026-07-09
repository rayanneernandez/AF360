const express = require('express');
const { query } = require('../db');

const router = express.Router();

function dateRange(req, res) {
  const { inicio, fim } = req.query;
  if (!inicio || !fim) {
    res.status(400).json({ ok: false, error: 'missing_date_range', message: 'Informe ?inicio=YYYY-MM-DD&fim=YYYY-MM-DD' });
    return null;
  }
  return { inicio, fim };
}

// GET /api/diretoria/vendas/diario?empresa_codigo=&inicio=&fim=
// Totais de vendas por dia/posto (para a tela Vendas).
router.get('/vendas/diario', async (req, res) => {
  const range = dateRange(req, res);
  if (!range) return;
  try {
    const { empresa_codigo } = req.query;
    const params = [range.inicio, range.fim];
    let sql = `
      select empresa_codigo, data_movimento, faturamento_total, cupons, cupons_2d, fat_2d, cancelados
      from quality_resumo_posto_dia
      where data_movimento between $1 and $2
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and empresa_codigo = $${params.length}`;
    }
    sql += ' order by data_movimento, empresa_codigo';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/vendas/diario] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/vendas/produtos?empresa_codigo=&inicio=&fim=
// Vendas detalhadas por produto/dia (para gráficos e rankings).
router.get('/vendas/produtos', async (req, res) => {
  const range = dateRange(req, res);
  if (!range) return;
  try {
    const { empresa_codigo } = req.query;
    const params = [range.inicio, range.fim];
    let sql = `
      select empresa_codigo, data_movimento, produto_codigo, produto_nome, categoria,
             tipo_combustivel, combustivel, unidade_venda, qtd_total, fat_total
      from quality_resumo_dia
      where data_movimento between $1 and $2
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and empresa_codigo = $${params.length}`;
    }
    sql += ' order by data_movimento, fat_total desc';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/vendas/produtos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/margem?empresa_codigo=&inicio=&fim=
// Margem por produto/dia: cruza faturamento (quality_resumo_dia) com
// custo de compra (quality_resumo_compra_dia). É uma aproximação — o
// custo do dia nem sempre é do mesmo lote vendido, mas dá a visão de
// margem bruta diária por produto que a tela Margem precisa.
router.get('/margem', async (req, res) => {
  const range = dateRange(req, res);
  if (!range) return;
  try {
    const { empresa_codigo } = req.query;
    const params = [range.inicio, range.fim];
    let sql = `
      select
        v.empresa_codigo,
        v.data_movimento,
        v.produto_codigo,
        v.produto_nome,
        v.categoria,
        v.qtd_total,
        v.fat_total,
        c.qtd_comprada,
        c.custo_total,
        c.preco_custo_medio,
        (v.fat_total - coalesce(c.custo_total, 0)) as margem_valor,
        case when v.fat_total > 0
          then (v.fat_total - coalesce(c.custo_total, 0)) / v.fat_total
          else null
        end as margem_percentual
      from quality_resumo_dia v
      left join quality_resumo_compra_dia c
        on c.empresa_codigo = v.empresa_codigo
       and c.produto_codigo = v.produto_codigo
       and c.data_movimento = v.data_movimento
      where v.data_movimento between $1 and $2
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and v.empresa_codigo = $${params.length}`;
    }
    sql += ' order by v.data_movimento, v.fat_total desc';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/margem] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/estoque/diario?empresa_codigo=&data=YYYY-MM-DD
router.get('/estoque/diario', async (req, res) => {
  try {
    const { empresa_codigo, data } = req.query;
    if (!data) {
      return res.status(400).json({ ok: false, error: 'missing_data', message: 'Informe ?data=YYYY-MM-DD' });
    }
    const params = [data];
    let sql = `
      select empresa_codigo, data_movimento, tipo, produto_codigo, saldo_quantidade,
             saldo_valor, custo_medio, produto_ativo
      from quality_estoque_dia
      where data_movimento = $1
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and empresa_codigo = $${params.length}`;
    }
    sql += ' order by produto_codigo';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/estoque/diario] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/estoque/mensal?empresa_codigo=&ano=&mes=
router.get('/estoque/mensal', async (req, res) => {
  try {
    const { empresa_codigo, ano, mes } = req.query;
    if (!ano || !mes) {
      return res.status(400).json({ ok: false, error: 'missing_ano_mes', message: 'Informe ?ano=YYYY&mes=M' });
    }
    const params = [Number(ano), Number(mes)];
    let sql = `
      select empresa_codigo, ano, mes, produto_codigo, quantidade_estoque
      from quality_estoque_mes
      where ano = $1 and mes = $2
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and empresa_codigo = $${params.length}`;
    }
    sql += ' order by produto_codigo';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/estoque/mensal] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/tanques?empresa_codigo=&data=YYYY-MM-DD
// Nível dos tanques por dia — alimenta a tela de Métricas GNV / estoque físico.
router.get('/tanques', async (req, res) => {
  try {
    const { empresa_codigo, data } = req.query;
    if (!data) {
      return res.status(400).json({ ok: false, error: 'missing_data', message: 'Informe ?data=YYYY-MM-DD' });
    }
    const params = [data];
    let sql = `
      select empresa_codigo, data_movimento, tanque_codigo, nome, produto_codigo,
             capacidade, lastro, estoque_escritural, nivel_percentual, data_hora_medidor
      from quality_tanque_dia
      where data_movimento = $1
    `;
    if (empresa_codigo) {
      params.push(empresa_codigo);
      sql += ` and empresa_codigo = $${params.length}`;
    }
    sql += ' order by tanque_codigo';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/tanques] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/diretoria/bombas-paradas?posto_id=
// Alertas de bomba parada/sem venda — útil para Notificações/Mapa de Processos.
router.get('/bombas-paradas', async (req, res) => {
  try {
    const { posto_id } = req.query;
    const params = [];
    let sql = `
      select posto_id, bomba, produto_codigo, produto_nome, primeiro_alerta_em,
             ultimo_alerta_em, nivel_ultimo, snooze_ate
      from bomba_parada_estado
    `;
    if (posto_id) {
      params.push(posto_id);
      sql += ` where posto_id = $${params.length}`;
    }
    sql += ' order by ultimo_alerta_em desc';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[diretoria/bombas-paradas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
