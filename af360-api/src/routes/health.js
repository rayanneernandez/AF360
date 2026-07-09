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

module.exports = router;
