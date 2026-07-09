const express = require('express');
const { query } = require('../db');

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

// GET /api/health/columns?table=nome_da_tabela -> lista colunas reais de uma tabela.
router.get('/columns', async (req, res) => {
  try {
    const { table } = req.query;
    if (!table) {
      return res.status(400).json({ ok: false, error: 'missing_table_param' });
    }
    const result = await query(
      `select column_name, data_type, is_nullable
       from information_schema.columns
       where table_schema = 'public' and table_name = $1
       order by ordinal_position`,
      [table]
    );
    res.json({ ok: true, count: result.rowCount, columns: result.rows });
  } catch (err) {
    console.error('[health/columns] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
