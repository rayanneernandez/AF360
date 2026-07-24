const express = require('express');
const { signInWithPassword } = require('../supabaseAuth');
const { fetchTable } = require('../lovable');

const router = express.Router();

// A rede real tem 910+ usuários (todo colaborador tem login pelo painel
// Usuários do Lovable, com e-mail @rede.americanfuel.com.br gerado
// automaticamente) — então a lista de e-mail fixa nunca foi solução de
// verdade, era só ponte pros 2-3 usuários de teste. A tela real
// "Perfil de Acesso → Cargos" do painel mostra o modelo de verdade: cada
// Cargo (Frentista, Gerente, Diretor, etc.) tem um conjunto de "Módulos
// padrão" (ex: Frentista → só "Colaborador"; Diretor → "Administrador, RH,
// R&S, Colaborador, Financeiro, Gestão, Administrativo, Diretoria"), e isso
// é resolvido por `profiles.role_id → roles.default_modules` (roles.name
// = nome do Cargo). "Acesso por Usuário" ainda permite módulos extras por
// pessoa (user_modules), mas isso é raro (só 2 dos 910 tinham mais que o
// padrão do cargo na tela que vi) — não consultamos user_modules aqui ainda
// por simplicidade; se um usuário específico reclamar de acesso faltando,
// é o primeiro lugar a olhar.
const KNOWN_DIRETORIA_EMAILS = ['bruno.lyra@americanfuel.com.br', 'diretoria@americanfuel.com.br'];
const KNOWN_RH_EMAILS = ['marina.costa@americanfuel.com.br', 'rh@americanfuel.com.br'];

function normalizeModuleName(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acento (Gestão -> Gestao)
    .trim()
    .toLowerCase();
}

function resolveRole({ profile, role, rhColaborador, email }) {
  // a) Sinal real e confiável: profiles.is_master = acesso total (é o badge
  // "Master" da tela Usuários, sempre acima de qualquer módulo de cargo).
  if (profile?.is_master) return 'diretoria';

  // b) Sinal real pro resto: módulos padrão do Cargo (roles.default_modules).
  const modules = (Array.isArray(role?.default_modules) ? role.default_modules : []).map(normalizeModuleName);
  if (modules.includes('diretoria')) return 'diretoria';
  if (modules.includes('rh')) return 'rh';

  // c) Ponte temporária por e-mail conhecido — só pra cobrir usuários de
  // teste cujo Cargo/role ainda não tem os módulos certos configurados.
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) return 'diretoria';
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) return 'rh';

  // d) Sinal real pros demais: existe linha em rh_colaboradores vinculada
  // (profile_id) — é colaborador comum.
  if (rhColaborador) return 'colaborador';

  // e) Default seguro: nunca eleva privilégio sem sinal claro.
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

    let roleRow = null;
    if (profile?.role_id) {
      const roleJson = await fetchTable('roles', { filters: { id: profile.role_id }, limit: 1 });
      roleRow = (roleJson?.data || [])[0] || null;
    }

    const role = resolveRole({ profile, role: roleRow, rhColaborador, email });

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
