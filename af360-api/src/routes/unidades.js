const express = require('express');
const { fetchAllRows } = require('../lovable');

const router = express.Router();

// GET /api/rh/unidades -> lista de unidades reais (tabela empresas, no
// Supabase do Lovable/RH). NÃO confundir com /api/empresas (esse lê a
// tabela "postos" de um Postgres self-hosted totalmente diferente, usado
// por Vendas/Margem/Estoque).
router.get('/', async (req, res) => {
  try {
    const json = await fetchAllRows('empresas', {
      select: 'id,nome_fantasia,razao_social',
      order: 'nome_fantasia:asc',
    });
    const data = (json.data || []).map((row) => ({
      id: row.id,
      nome: row.nome_fantasia || row.razao_social,
    }));
    res.json({ ok: true, count: json.count ?? data.length, data });
  } catch (err) {
    console.error('[rh/unidades] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
