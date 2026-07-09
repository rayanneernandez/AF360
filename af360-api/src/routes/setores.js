const express = require('express');
const { query } = require('../db');

const router = express.Router();

// GET /api/rh/setores -> lista de setores cadastrados (para filtros/selects do app).
router.get('/', async (req, res) => {
  try {
    const { limit = 500, offset = 0 } = req.query;
    const result = await query(
      'select * from rh_setores order by 1 limit $1 offset $2',
      [Number(limit), Number(offset)]
    );
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[rh/setores] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
