const express = require('express');
const { signInWithPassword } = require('../supabaseAuth');
const { fetchTable } = require('../lovable');

const router = express.Router();

// A rede real tem 910 usuários (todo colaborador tem login pelo painel
// Usuários do Lovable, com e-mail @rede.americanfuel.com.br gerado
// automaticamente) — então uma lista de e-mail por pessoa NUNCA foi uma
// solução de verdade, era só uma ponte pros 2-3 usuários de teste enquanto
// não dava pra confirmar o schema real de permissões. Agora usamos
// `profiles.is_master` (coluna real, já documentada em LOVABLE_API.md e
// visível como o badge "Master" no painel Usuários) como sinal confiável
// de acesso total — mapeado aqui pra 'diretoria' (usado no app como
// "acesso total").
//
// O que AINDA falta pra resolver 'rh' vs 'colaborador' comum de forma real
// pros outros ~908 usuários: o painel tem "Perfil de Acesso"/"Grupos"/
// "Módulos" (roles.default_modules / user_modules, já documentado na seção
// 6.7 do LOVABLE_API.md), mas não sabemos ainda qual é o slug de módulo que
// representa "RH" nessa lista real — por isso a lista de e-mail abaixo
// continua como fallback só pra esses 2 usuários de teste até isso ser
// confirmado. Perguntar pro Lovable: "qual o slug do módulo/perfil de
// acesso que dá acesso ao RH?" pra substituir isso por uma consulta real
// em roles/user_modules.
const KNOWN_DIRETORIA_EMAILS = ['bruno.lyra@americanfuel.com.br', 'diretoria@americanfuel.com.br'];
const KNOWN_RH_EMAILS = ['marina.costa@americanfuel.com.br', 'rh@americanfuel.com.br'];

function resolveRole({ profile, rhColaborador, email }) {
  // a) Sinal real e confiável: profiles.is_master = acesso total.
  if (profile?.is_master) return 'diretoria';

  // b) Ponte temporária por e-mail conhecido, só pros usuários de teste que
  // ainda não têm módulo "RH" configurado de verdade (ver comentário acima).
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) return 'diretoria';
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) return 'rh';

  // c) Sinal real pros demais: existe linha em rh_colaboradores vinculada
  // (profile_id) — é colaborador comum.
  if (rhColaborador) return 'colaborador';

  // d) Default seguro: nunca eleva privilégio sem sinal claro.
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
