const express = require('express');
const { query } = require('../db');
const { fetchTable } = require('../lovable');

const router = express.Router();

// GET /api/health -> não toca no banco, só confirma que a API está de pé.
router.get('/', (req, res) => {
  res.json({ ok: true, service: 'af360-api', time: new Date().toISOString() });
});

// GET /api/health/db -> tenta uma query real no Postgres.
// Use esse endpoint para testar a conectividade Vercel -> VPS depois do deploy.
router.get('/db', async (req, res) => {
  try {
    const result = await query('select now() as agora, current_database() as banco');
    res.json({ ok: true, db: result.rows[0] });
  } catch (err) {
    console.error('[health/db] falha ao conectar no Postgres:', err.message);
    res.status(502).json({
      ok: false,
      error: 'db_unreachable',
      message: err.message,
    });
  }
});

// GET /api/health/tables -> lista as tabelas REAIS existentes no schema public.
// Diagnóstico temporário: usamos isso pra confirmar nomes de tabela contra
// o banco de verdade, já que a documentação pode estar desatualizada.
router.get('/tables', async (req, res) => {
  try {
    const { like } = req.query;
    let sql = `select table_name from information_schema.tables where table_schema = 'public'`;
    const params = [];
    if (like) {
      params.push(`%${like}%`);
      sql += ` and table_name ilike $${params.length}`;
    }
    sql += ' order by table_name';
    const result = await query(sql, params);
    res.json({ ok: true, count: result.rowCount, tables: result.rows.map((r) => r.table_name) });
  } catch (err) {
    console.error('[health/tables] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/health/columns?table=nome_da_tabela[,outra_tabela,...]
// Lista colunas reais de uma ou mais tabelas (separadas por vírgula).
router.get('/columns', async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({ ok: false, error: 'missing_table_param' });
    }
    const tables = String(table).split(',').map((t) => t.trim()).filter(Boolean);
    const result = await query(
      `select table_name, column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public' and table_name = any($1)
       order by table_name, ordinal_position`,
      [tables]
    );
    const byTable = {};
    result.rows.forEach((row) => {
      if (!byTable[row.table_name]) byTable[row.table_name] = [];
      byTable[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
      });
    });
    res.json({ ok: true, tables: byTable });
  } catch (err) {
    console.error('[health/columns] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/health/conversas-diag -> diagnóstico temporário para entender
// por que o app mostra muito mais conversas que o painel web.
router.get('/conversas-diag', async (req, res) => {
  try {
    const tipoMensagem = await query(
      `select tipo_mensagem, direcao, count(*)::int as total
       from fale_diretoria_mensagens
       group by tipo_mensagem, direcao
       order by total desc`
    );
    const contatos = await query(
      `select
         count(distinct telefone)::int as telefones_distintos,
         count(distinct telefone) filter (where nome_contato is null)::int as telefones_sem_nome,
         count(distinct telefone) filter (where nome_contato is not null)::int as telefones_com_nome
       from fale_diretoria_mensagens`
    );
    const desconhecido = await query(
      `select telefone, nome_contato, texto, tipo_mensagem, direcao, criado_em
       from fale_diretoria_mensagens
       where texto ilike '%desconhecido%' or tipo_mensagem ilike '%desconhecido%'
       order by criado_em desc
       limit 10`
    );
    res.json({
      ok: true,
      tipo_mensagem_stats: tipoMensagem.rows,
      contatos: contatos.rows[0],
      amostra_desconhecido: desconhecido.rows,
    });
  } catch (err) {
    console.error('[health/conversas-diag] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/health/lovable -> diagnóstico da conexão com os endpoints internos
// do Lovable (base URL, secret configurado, e uma chamada real de teste).
router.get('/lovable', async (req, res) => {
  const baseUrl = process.env.LOVABLE_BASE_URL || 'https://af-360-hub.lovable.app';
  const hasSecret = Boolean(process.env.INTERNAL_API_SECRET);
  try {
    const json = await fetchTable('dir_contatos', { limit: 1, count: true });
    res.json({
      ok: true,
      base_url: baseUrl,
      secret_configurado: hasSecret,
      resposta: json,
    });
  } catch (err) {
    console.error('[health/lovable] erro:', err.message, err.lovableUrl, err.lovableStatus);
    res.status(502).json({
      ok: false,
      error: 'lovable_unreachable',
      message: err.message,
      base_url: baseUrl,
      secret_configurado: hasSecret,
      url_chamada: err.lovableUrl || null,
      status_recebido: err.lovableStatus || null,
      corpo_resposta: err.lovableBody || null,
    });
  }
});

module.exports = router;
