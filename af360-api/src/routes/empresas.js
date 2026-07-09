const express = require('express');
const { query } = require('../db');

const router = express.Router();

/**
 * "Empresas" nesse banco = os postos (cada posto é a unidade de negócio).
 * A tabela `empresas` não existe no acesso do usuário lovable_ro — o que
 * existe e é o equivalente real é `postos`, ligado a `cad_postos_quality`
 * (que traz o `filial_codigo`, ou seja, o `empresa_codigo` usado em todas
 * as tabelas `quality_*` de Vendas/Margem/Estoque).
 */
const LISTA_POSTOS_SQL = `
  select
    p.idq as posto_id,
    p.nome,
    p.cnpj,
    cpq.filial_codigo as empresa_codigo
  from postos p
  left join cad_postos_quality cpq on cpq.posto_id = p.idq
  order by p.nome
`;

router.get('/', async (req, res) => {
  try {
    const result = await query(LISTA_POSTOS_SQL);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[empresas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// Mantido por compatibilidade: /api/empresas/postos retorna a mesma lista.
router.get('/postos', async (req, res) => {
  try {
    const result = await query(LISTA_POSTOS_SQL);
    res.json({ ok: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    console.error('[empresas/postos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
