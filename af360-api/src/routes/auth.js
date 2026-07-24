const express = require('express');
const { signInWithPassword } = require('../supabaseAuth');
const { fetchTable } = require('../lovable');

const router = express.Router();

// A rede real tem 910+ usuários (todo colaborador tem login pelo painel
// Usuários do Lovable, com e-mail @rede.americanfuel.com.br gerado
// automaticamente) — então a lista de e-mail fixa nunca foi solução de
// verdade, era só ponte pros 2-3 usuários de teste.
//
// Confirmado com o time Lovable (23/07): a MAIORIA dos logins não-colaborador
// (RH, Marketing, Financeiro, Gestão, R&S, Administrativo, Administrador) não
// usa Cargo/role_id nenhum — o acesso é dado 100% por módulo avulso em
// `user_modules` (aba "Acesso por Usuário" do painel), resolvido pelo hook
// `usePermissions` do próprio app web. Só "Diretor" (Cargo de verdade) usa
// `roles.default_modules`. Por isso consultamos as duas fontes e juntamos
// (união), igual ao app web faz.
const KNOWN_DIRETORIA_EMAILS = ['bruno.lyra@americanfuel.com.br', 'diretoria@americanfuel.com.br'];
const KNOWN_RH_EMAILS = ['marina.costa@americanfuel.com.br', 'rh@americanfuel.com.br'];

function normalizeModuleName(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acento (Gestão -> Gestao)
    .trim()
    .toLowerCase();
}

// Resolve os módulos efetivos de um usuário: roles.default_modules (via
// Cargo) UNIÃO user_modules (módulos avulsos por pessoa). `user_modules`
// aponta pra `modules.id` — ainda não confirmamos com o Lovable se o nome/
// slug fica em `modules.slug` ou `modules.name`, então tentamos os dois
// (fetchTable já devolve '*' por padrão) em vez de travar nisso.
async function fetchEffectiveModules({ fetchTable, role, userId }) {
  const modules = new Set((Array.isArray(role?.default_modules) ? role.default_modules : []).map(normalizeModuleName));

  try {
    const userModulesJson = await fetchTable('user_modules', { filters: { user_id: userId } });
    const moduleIds = (userModulesJson?.data || []).map((row) => row.module_id).filter(Boolean);

    if (moduleIds.length > 0) {
      const modulesJson = await fetchTable('modules', { filters: { id__in: moduleIds.join(',') } });
      (modulesJson?.data || []).forEach((mod) => {
        const label = mod.slug ?? mod.name ?? mod.nome ?? null;
        if (label) modules.add(normalizeModuleName(label));
      });
    }
  } catch (err) {
    // Não deixa o login inteiro cair por causa de user_modules/modules --
    // pior caso, o usuário fica só com o que o Cargo já dava (ou
    // 'colaborador' default), em vez de erro 500.
    console.error('[auth/login] falha ao ler user_modules/modules (seguindo sem eles):', err.message);
  }

  return modules;
}

function resolveRole({ profile, effectiveModules, rhColaborador, email }) {
  // a) Sinal real e confiável: profiles.is_master = acesso total (é o badge
  // "Master" da tela Usuários, sempre acima de qualquer módulo).
  if (profile?.is_master) return 'diretoria';

  // b) Sinal real pro resto: módulos efetivos (Cargo ∪ user_modules).
  if (effectiveModules?.has('diretoria')) return 'diretoria';
  if (effectiveModules?.has('administrador')) return 'diretoria';
  if (effectiveModules?.has('rh')) return 'rh';

  // c) Ponte temporária por e-mail conhecido — só pra cobrir usuários de
  // teste cujo acesso ainda não tem os módulos certos configurados.
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) return 'diretoria';
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) return 'rh';

  // d) Sinal real pros demais: existe linha em rh_colaboradores vinculada
  // (profile_id) — é colaborador comum.
  if (rhColaborador) return 'colaborador';

  // e) Default seguro: nunca eleva privilégio sem sinal claro. Marketing,
  // Financeiro, Gestão, R&S e Administrativo sozinhos (sem RH/Diretoria/
  // Administrador) caem aqui de propósito — o app mobile só tem 3 perfis
  // por enquanto (confirmado com a Rayanne em 23/07).
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

    const effectiveModules = await fetchEffectiveModules({ fetchTable, role: roleRow, userId });

    const role = resolveRole({ profile, effectiveModules, rhColaborador, email });

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
