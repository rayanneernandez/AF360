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
// Liberação do painel Gestão SÓ pra quem está testando via Expo/dev client
// (nunca crasha em dev — erro de JS mostra redbox, não derruba o processo),
// independente da flag GESTAO_ROLE_ENABLED (que é global e afetaria quem
// ainda está com o build antigo publicado nas lojas). Tirar essa lista assim
// que o build novo estiver aprovado nas duas lojas e a flag global for ligada.
const KNOWN_GESTAO_TEST_EMAILS = ['rayanne.ernandez@globaltera.com.br', 'administrador@americanfuel.com.br'];
// Mesmo padrão pro painel "Administrativo" (Operação: alvarás, manutenção,
// almoxarifado, frota) — lição aprendida do crash de produção do Gestão:
// SÓ libera pra quem testa via Expo/dev client, independente da flag global
// (que afetaria quem ainda está com o build antigo publicado nas lojas).
// Tirar essa lista assim que o build novo (com o painel Administrativo) for
// aprovado nas duas lojas e a flag global for ligada.
const KNOWN_ADMINISTRATIVO_TEST_EMAILS = ['rayanne.ernandez@globaltera.com.br', 'administrador@americanfuel.com.br'];

// normalizeModuleName/fetchEffectiveModules moram em ../permissions.js
// (extraídas daqui em 27/07/2026 pra serem reaproveitadas por routes/admin.js
// sem duplicar a lógica de resolução de módulos efetivos).

// Retorna TODOS os painéis que esse login pode abrir (não só um) — o app
// mobile decide sozinho se entra direto (1 painel) ou mostra uma tela de
// escolha (2+ painéis), igual a regra "Mestre -> /admin; 1 módulo -> direto;
// 2+ -> escolher" que já existe no painel web (confirmado com a Rayanne).
// Ordem de inserção = prioridade (usada só como sugestão de "principal" pro
// campo legado `role`, o array em si não depende de ordem pro app).
// IMPORTANTE (31/08/2026): o app mobile em produção nas lojas (build 3,
// iOS e Android) foi compilado ANTES do painel "Gestão" existir no código do
// app — a tela de seleção de painel dessa versão não sabe o que fazer com o
// role "gestao" (PANEL_OPTION_META não tem essa chave), e quebra com um
// TypeError não tratado assim que o backend devolve esse role no login
// (crash confirmado via .ips: exceção não tratada na
// com.facebook.react.ExceptionsManagerQueue, RCTFatal em produção).
// Por isso o role "gestao" fica atrás desse flag, DESLIGADO por padrão —
// só ligar (GESTAO_ROLE_ENABLED=true nas env vars da Vercel) depois que o
// build novo do app (com o painel Gestão) estiver aprovado e disponível nas
// duas lojas, senão volta a crashar pra quem tiver esse módulo/for master.
const GESTAO_ROLE_ENABLED = process.env.GESTAO_ROLE_ENABLED === 'true';
// Mesmo motivo/mesmo remédio pro role "administrativo" — DESLIGADO por
// padrão, só ligar (ADMINISTRATIVO_ROLE_ENABLED=true nas env vars da Vercel)
// depois que o build novo do app (com o painel Administrativo) estiver
// aprovado e disponível nas duas lojas.
const ADMINISTRATIVO_ROLE_ENABLED = process.env.ADMINISTRATIVO_ROLE_ENABLED === 'true';

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
    roles.add('financeiro');
    if (GESTAO_ROLE_ENABLED) roles.add('gestao');
    if (ADMINISTRATIVO_ROLE_ENABLED) roles.add('administrativo');
  }

  // b) Sinal real pro resto: módulos efetivos (Cargo ∪ user_modules).
  // Corrigido: módulo "administrador" abre o painel Administrador, não o
  // Diretoria (antes os dois caíam juntos e o painel Administrador nunca
  // aparecia pra ninguém, mesmo pro Cargo "Diretor" que tem os dois módulos).
  if (effectiveModules?.has('administrador')) roles.add('administrador');
  if (effectiveModules?.has('diretoria')) roles.add('diretoria');
  if (effectiveModules?.has('rh')) roles.add('rh');
  if (effectiveModules?.has('financeiro')) roles.add('financeiro');
  // "Gestão" (Vendas/Abastecimento/Margem/Encerrante) — ver GESTAO_ROLE_ENABLED
  // acima. normalizeModuleName já vira "Gestão" -> "gestao", mesmo módulo que
  // a Lovable já usa no painel web pra dar acesso a essa área.
  if (GESTAO_ROLE_ENABLED && effectiveModules?.has('gestao')) roles.add('gestao');
  // "Administrativo" (Alvarás/Manutenções/Almoxarifado/Frota) — ver
  // ADMINISTRATIVO_ROLE_ENABLED acima.
  if (ADMINISTRATIVO_ROLE_ENABLED && effectiveModules?.has('administrativo')) roles.add('administrativo');

  // c) Ponte temporária por e-mail conhecido — só pra cobrir usuários de
  // teste cujo acesso ainda não tem os módulos certos configurados.
  const normalizedEmail = String(profile?.email || email || '').trim().toLowerCase();
  if (KNOWN_DIRETORIA_EMAILS.includes(normalizedEmail)) roles.add('diretoria');
  if (KNOWN_RH_EMAILS.includes(normalizedEmail)) roles.add('rh');
  if (KNOWN_GESTAO_TEST_EMAILS.includes(normalizedEmail)) roles.add('gestao');
  if (KNOWN_ADMINISTRATIVO_TEST_EMAILS.includes(normalizedEmail)) roles.add('administrativo');

  // d) 'Colaborador' entra na lista quando existe ficha real em
  // rh_colaboradores vinculada (profile_id) OU quando o Cargo/user_modules
  // já libera o módulo "colaborador" (ex.: Cargo "Diretor" no Lovable tem
  // TODOS os módulos, incluindo Colaborador — confirmado no print da tela
  // Perfil de Acesso > Cargos). Isso é só PERMISSÃO pra abrir o painel; se
  // não houver ficha de RH vinculada, o app mostra estado vazio honesto
  // ("Seu acesso ainda não está vinculado a um colaborador no RH...") em vez
  // de fabricar dado — nunca finge um painel pessoal com números inventados.
  // Marketing sozinho (sem RH/Diretoria/Administrador/Colaborador/
  // Financeiro/Gestão/Administrativo) não entra em nenhum painel de
  // propósito — o app mobile tem 7 perfis (colaborador, rh, diretoria,
  // administrador, financeiro, gestao, administrativo). "Financeiro" foi
  // ligado em 21/08/2026, "Gestão" em 28/08/2026, "Administrativo" em
  // 31/08/2026 (ambos atrás de flag, ver ADMINISTRATIVO_ROLE_ENABLED acima).
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
