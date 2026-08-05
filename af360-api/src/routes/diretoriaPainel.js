const express = require('express');
const { getDiretoriaVendas } = require('../lovable');

const router = express.Router();

// GET /api/diretoria-painel?recurso=resumo|rede|margem|estoques|gnv|postos|periodo&de=&ate=&posto=&actorId=
// Proxy fino para o endpoint unificado da Diretoria confirmado pela Lovable
// em 04/08/2026 (/api/public/internal/diretoria-vendas). Devolve o payload
// deles como veio (recurso, de, ate, postos, dados) — sem remodelar aqui,
// pra não arriscar perder campo por engano; o app lê "dados" direto.
router.get('/', async (req, res) => {
  try {
    const { recurso, de, ate, posto, actorId } = req.query;
    if (!recurso) {
      res.status(400).json({ ok: false, error: 'missing_recurso', message: 'Informe ?recurso=resumo|rede|margem|estoques|gnv|postos|periodo' });
      return;
    }
    const json = await getDiretoriaVendas({ recurso, de, ate, posto }, actorId);
    res.json({ ok: true, recurso: json?.recurso ?? recurso, de: json?.de, ate: json?.ate, postos: json?.postos, dados: json?.dados ?? json });
  } catch (err) {
    console.error('[diretoria-painel] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
