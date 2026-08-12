const express = require('express');
const { getRhPdfImports } = require('../lovable');

const router = express.Router();

// rh_pdf_imports — tabela liberada no allowlist da Lovable (LOVABLE_API.md
// §6.6, 21/07/2026): arquivo_path, arquivo_nome, arquivo_mime,
// arquivo_tamanho, tipo (admissao|desligamento|experiencia|outro), status
// (pendente|processando|pronto|aplicado|erro), extracao_json, modelo_ia,
// confianca, cpf_extraido, nome_extraido, colaborador_id, erro,
// aplicado_em, aplicado_por, resultado_aplicacao.
//
// Isso aqui é só LEITURA (histórico + contadores da tela "Importar PDF").
// Upload do PDF + disparo da IA, aplicar admissão/desligamento, excluir e
// reprocessar exigem endpoints de escrita que a Lovable ainda não
// confirmou — ficam gated no frontend até isso vir.

// GET /api/rh/importacoes-pdf?status=&tipo=
router.get('/', async (req, res) => {
  try {
    const { status, tipo } = req.query;
    const json = await getRhPdfImports({ status, tipo });
    const row = json?.data ?? [];
    res.json({ ok: true, count: json?.count ?? row.length, data: row });
  } catch (err) {
    console.error('[rh/importacoes-pdf GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
