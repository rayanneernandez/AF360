const express = require('express');
const { signInWithPassword } = require('../supabaseAuth');
const { fetchTable } = require('../lovable');
const { normalizeModuleName, fetchEffectiveModules } = require('../permissions');

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

// normalizeModuleName/fetchEffectiveModules moram em ../permissions.js
// (extraídas daqui em 27/07/2026 pra serem reaproveitadas por routes/admin.js
// sem duplicar a lógica de resolução de módulos efetivos).

// Retorna TODOS os painéis que esse login pode abrir (não só um) — o app
// mobile decide sozinho se entra direto (1 painel) ou mostra uma tela de
// escolha (2+ painéis), igual a regra "Mestre -> /admin; 1 módulo -> direto;
// 2+ -> escolher" que já existe no painel web (confirmado com a Rayanne).
// Ordem de inserção = prioridade (usada só como sugestão de "principal" pro
// campo legado `role`, o array em si não depende de ordem pro app).
function resolveAvailableRoles({ profile, effectiveModules, rhColaborador, email }) {
  const roles = new Set();

  // a) Sinal real e confiável: profiles.is_master = acesso total (é o badge
  // "Master" da tela Usuários, sempre acima de qualquer módulo) -> abre
  // todos os painéis de gestão (não inclui 'colaborador', que depende de
  // ficha de RH vinculada de verdade).
  if (profile?.is_master) {
    roles.add('administrador');
    roles.add('diretoria');
    roles.add('rh');
  }

  // b) Sinal real pro resto: módulos efetivos (Cargo ∪ user_modules).
  // Corrigido: módulo "administrador" abre o painel Administrador, não o
  // Diretoria (antes os dois caíam juntos e o painel Administrador nunca
  // aparecia pra ninguém, mesmo pro Cargo "Diretor" que tem os dois módulos).
  if (effectiveModules?.has('administrador')) roles.add('administrador');
  if (effectiveModules?.has('diretoria')) roles.add('diretoria');
  if (effectiveModules?.has('rh')) roles.add('rh');

  // c) Ponte temporária por e-mail conhecido — só pra cobrir usuários de
  // teste cujo acesso ainda não tem os módulos certos configurados.
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) roles.add('diretoria');
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) roles.add('rh');

  // d) 'Colaborador' entra na lista quando existe ficha real em
  // rh_colaboradores vinculada (profile_id) OU quando o Cargo/user_modules
  // já libera o módulo "colaborador" (ex.: Cargo "Diretor" no Lovable tem
  // TODOS os módulos, incluindo Colaborador — confirmado no print da tela
  // Perfil de Acesso > Cargos). Isso é só PERMISSÃO pra abrir o painel; se
  // não houver ficha de RH vinculada, o app mostra estado vazio honesto
  // ("Seu acesso ainda não está vinculado a um colaborador no RH...") em vez
  // de fabricar dado — nunca finge um painel pessoal com números inventados.
  // Marketing, Financeiro, Gestão, R&S e Administrativo sozinhos (sem RH/
  // Diretoria/Administrador/Colaborador) não entram em nenhum painel de
  // propósito — o app mobile só tem 4 perfis por enquanto (colaborador,
  // rh, diretoria, administrador).
  if (rhColaborador || effectiveModules?.has('colaborador')) roles.add('colaborador');

  return Array.from(roles);
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

    const availableRoles = resolveAvailableRoles({ profile, effectiveModules, rhColaborador, email });
    // 'role' fica como o principal/sugerido, só por compatibilidade com quem
    // ainda ler esse campo isolado — o app decide tudo pelo array agora.
    const role = availableRoles[0] ?? 'colaborador';

    const fullName = rhColaborador?.nome_completo || profile?.full_name || null;

    res.json({
      ok: true,
      data: {
        profileId: userId,
        email: profile?.email || email,
        fullName,
        role,
        availableRoles,
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
