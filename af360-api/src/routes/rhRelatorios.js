const express = require('express');
const { getRhRelatorioReincidencia } = require('../lovable');

const router = express.Router();

// Relatórios: Reincidência/Recontratação — proxy fino pro endpoint
// confirmado pela Lovable em 20/08/2026 (/api/public/internal/rh-relatorios).
// Cálculo (quem é Recontratado x Reincidente, custo de rescisões, filtro de
// período) é feito inteiramente do lado deles.

// GET /api/rh/relatorios/reincidencia?periodo=mes|ano|tudo|custom&ano=&mes=&dataIni=&dataFim=&tipo=todos|recontratado|reincidente&actorId=
router.get('/reincidencia', async (req, res) => {
  try {
    const { periodo, ano, mes, dataIni, dataFim, tipo, actorId } = req.query;
    const json = await getRhRelatorioReincidencia({ periodo, ano, mes, dataIni, dataFim, tipo }, actorId);
    res.json({
      ok: true,
      data: json?.data ?? [],
      resumo: json?.resumo ?? null,
      periodo: json?.periodo ?? null,
      tipo: json?.tipo ?? tipo ?? 'todos',
    });
  } catch (err) {
    console.error('[rh/relatorios reincidencia] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
