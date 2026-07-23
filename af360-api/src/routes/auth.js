const express = require('express');
const { signInWithPassword } = require('../supabaseAuth');
const { fetchTable } = require('../lovable');

const router = express.Router();

// Ponte TEMPORÁRIA pra decidir o papel de RH/Diretoria enquanto não
// confirmamos em produção o schema real de `roles`/`profiles.role_id`
// (LOVABLE_API.md documenta `roles.slug`/`roles.group_type`, mas ainda não
// tivemos acesso de rede pra inspecionar os valores reais gravados hoje).
// Se algum dia for generalizar isso pra mais usuários de RH/Diretoria, o
// certo é consultar `roles` de verdade via `profile.role_id` — é aqui que
// entra essa consulta.
const KNOWN_DIRETORIA_EMAILS = ['bruno.lyra@americanfuel.com.br', 'diretoria@americanfuel.com.br'];
const KNOWN_RH_EMAILS = ['marina.costa@americanfuel.com.br', 'rh@americanfuel.com.br'];

function resolveRole({ profile, rhColaborador, email }) {
  // a) Ponte temporária por e-mail conhecido (ver comentário acima) — checa
  // ANTES do vínculo em rh_colaboradores, porque um usuário de RH pode
  // também ter uma linha de colaborador própria ("RH + Colaborador"), e
  // nesse caso o papel de navegação tem que continuar sendo 'rh' (pra cair
  // no painel de RH), não 'colaborador'. `colaboradorId` continua sendo
  // preenchido normalmente (ver rota abaixo), só o papel de navegação muda.
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) return 'diretoria';
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) return 'rh';

  // b) Sinal mais confiável pros demais: existe linha em rh_colaboradores
  // vinculada (profile_id) — é colaborador comum.
  if (rhColaborador) return 'colaborador';

  // c) Default seguro: nunca eleva privilégio sem sinal claro.
  return 'colaborador';
}

// POST /api/auth/login  { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'missing_credentials' });
    }

    let authResult;
    try {
      authResult = await signInWithPassword(email, password);
    } catch (err) {
      if (err.code === 'missing_anon_key') {
        return res.status(500).json({ ok: false, error: 'auth_not_configured', message: err.message });
      }
      throw err;
    }

    if (!authResult.ok) {
      return res.status(401).json({ ok: false, error: 'invalid_credentials', message: authResult.message });
    }

    const userId = authResult.user?.id;

    const [profileJson, rhColaboradorJson] = await Promise.all([
      fetchTable('profiles', { filters: { id: userId }, limit: 1 }),
      fetchTable('rh_colaboradores', { filters: { profile_id: userId }, limit: 1 }),
    ]);

    const profile = (profileJson?.data || [])[0] || null;
    const rhColaborador = (rhColaboradorJson?.data || [])[0] || null;

    const role = resolveRole({ profile, rhColaborador, email });

    const fullName = rhColaborador?.nome_completo || profile?.full_name || null;

    res.json({
      ok: true,
      data: {
        profileId: userId,
        email: profile?.email || email,
        fullName,
        role,
        colaboradorId: rhColaborador?.id || null,
        empresaId: rhColaborador?.empresa_id || profile?.empresa_id || null,
      },
    });
  } catch (err) {
    console.error('[auth/login] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
