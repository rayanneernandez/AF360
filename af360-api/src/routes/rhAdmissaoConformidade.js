const express = require('express');
const { getAdmissaoConformidade, getAdmissaoPrazos, patchAdmissaoPrazo } = require('../lovable');

const router = express.Router();

// Conformidade de Admissões (rs_admissoes) — endpoint confirmado pela
// Lovable em 12/08/2026. Filtros aceitos: inicio, fim (YYYY-MM-DD, sobre
// created_at), empresaId (-> empresa_id), responsavelId (-> responsavel_id),
// etapa, status, busca, incluirEncerradas (0|1, default 1 do lado deles).

// GET /api/rh/admissao-conformidade?inicio=&fim=&empresaId=&responsavelId=&etapa=&status=&busca=&incluirEncerradas=
router.get('/', async (req, res) => {
  try {
    const { inicio, fim, empresaId, responsavelId, etapa, status, busca, incluirEncerradas, actorId } = req.query;
    const json = await getAdmissaoConformidade(
      {
        inicio,
        fim,
        empresa_id: empresaId,
        responsavel_id: responsavelId,
        etapa,
        status,
        busca,
        incluir_encerradas: incluirEncerradas,
      },
      actorId
    );
    res.json({ ok: true, data: json });
  } catch (err) {
    console.error('[rh/admissao-conformidade GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/rh/admissao-conformidade/prazos
router.get('/prazos', async (req, res) => {
  try {
    const json = await getAdmissaoPrazos(req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/admissao-conformidade/prazos GET] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// PATCH /api/rh/admissao-conformidade/prazos/:id  body: { dias }
router.patch('/prazos/:id', async (req, res) => {
  try {
    const dias = Number(req.body?.dias);
    if (!Number.isFinite(dias) || dias < 1) {
      return res.status(400).json({ ok: false, error: 'dias_invalido', message: 'Informe um número de dias >= 1.' });
    }
    const json = await patchAdmissaoPrazo(req.params.id, dias, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[rh/admissao-conformidade/prazos PATCH] erro:', err.message);
    const status = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
