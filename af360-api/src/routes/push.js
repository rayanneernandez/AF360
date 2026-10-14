const express = require('express');
const { postPushRegistrar, postPushRemover } = require('../lovable');

const router = express.Router();

// Notificações push do app (Lovable, 14/10/2026): o painel envia o push sozinho
// depois de gravar o aviso; aqui só registramos/removemos o celular
// (token da Expo) de cada colaborador.
function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

// POST /api/push/registrar  { colaboradorId, token, plataforma, dispositivoId? }
router.post('/registrar', async (req, res) => {
  const { colaboradorId, token, plataforma, dispositivoId } = req.body ?? {};
  if (!colaboradorId || !token || !plataforma) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  try {
    const json = await postPushRegistrar({
      colaborador_id: colaboradorId,
      token,
      plataforma,
      dispositivo_id: dispositivoId || undefined,
    });
    res.json({ ok: true, data: json ?? {} });
  } catch (err) {
    console.error('[push/registrar] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/push/remover  { colaboradorId, token }
router.post('/remover', async (req, res) => {
  const { colaboradorId, token } = req.body ?? {};
  if (!colaboradorId || !token) return res.status(400).json({ ok: false, error: 'missing_fields' });
  try {
    const json = await postPushRemover({ colaborador_id: colaboradorId, token });
    res.json({ ok: true, data: json ?? {} });
  } catch (err) {
    console.error('[push/remover] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
