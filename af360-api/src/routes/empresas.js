const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/empresas -> lista de empresas/postos cadastrados.
// Usado para popular filtros de "Unidade" no app.
router.get('/', async (req, res) => {
  try {
    const { limit = 200, offset = 0 } = req.query;
    const result = await query(
      'select * from empresas order by 1 limit $1 offset $2',
      [Number(limit), Number(offset)]
    );
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[empresas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/empresas/postos -> lista de postos (unidades físicas).
router.get('/postos', async (req, res) => {
  try {
    const { limit = 500, offset = 0 } = req.query;
    const result = await query(
      'select * from postos order by 1 limit $1 offset $2',
      [Number(limit), Number(offset)]
    );
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[empresas/postos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
