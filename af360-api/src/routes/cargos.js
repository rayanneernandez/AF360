const express = require('express');
const { fetchTable } = require('../lovable');

const router = express.Router();

// GET /api/rh/cargos -> lista de cargos (rh_cargos, no Supabase do Lovable).
router.get('/', async (req, res) => {
  try {
    const { limit = 500, offset = 0 } = req.query;
    const json = await fetchTable('rh_cargos', { limit, offset, order: 'nome:asc' });
    res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
  } catch (err) {
    console.error('[rh/cargos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
