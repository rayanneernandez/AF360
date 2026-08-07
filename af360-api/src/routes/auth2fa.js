const express = require('express');
const { postAuth2faEnviar, postAuth2faVerificar } = require('../lovable');

const router = express.Router();

// Repassa o corpo de erro real da Lovable (motivo, tentativas_restantes,
// retry_apos_segundos etc.) em vez de só uma mensagem genérica — o app
// precisa desses campos pra mostrar o estado certo (aguardar reenvio,
// tentativas restantes, etc.).
function relayLovableError(err, res, fallbackError) {
  const status4xx = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500;
  let parsedBody = null;
  try {
    parsedBody = err.lovableBody ? JSON.parse(err.lovableBody) : null;
  } catch (e) {
    parsedBody = null;
  }
  console.error(`[auth/2fa] ${fallbackError}:`, err.message);
  res.status(status4xx ? err.lovableStatus : 500).json({
    ok: false,
    error: fallbackError,
    message: err.message,
    ...(parsedBody || {}),
  });
}

// POST /api/auth/2fa/enviar — body: { profileId } ou { email }.
// Endpoint confirmado pela Lovable em 07/08/2026: gera código de 6 dígitos,
// envia por e-mail via Resend, validade 10min, 1 reenvio a cada 30s.
router.post('/enviar', async (req, res) => {
  try {
    const { profileId, email } = req.body || {};
    if (!profileId && !email) {
      res.status(400).json({ ok: false, error: 'missing_fields', message: 'Informe profileId ou email' });
      return;
    }
    const body = profileId ? { profile_id: profileId } : { email };
    const json = await postAuth2faEnviar(body);
    res.json({ ok: true, data: json });
  } catch (err) {
    relayLovableError(err, res, 'enviar_failed');
  }
});

// POST /api/auth/2fa/verificar — body: { profileId, codigo }.
router.post('/verificar', async (req, res) => {
  try {
    const { profileId, codigo } = req.body || {};
    if (!profileId || !codigo) {
      res.status(400).json({ ok: false, error: 'missing_fields', message: 'Informe profileId e codigo' });
      return;
    }
    const json = await postAuth2faVerificar({ profile_id: profileId, codigo });
    res.json({ ok: true, data: json });
  } catch (err) {
    relayLovableError(err, res, 'verificar_failed');
  }
});

module.exports = router;
