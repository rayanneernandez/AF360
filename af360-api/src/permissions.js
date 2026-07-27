// Helpers de permissão/módulo compartilhados entre rotas que precisam
// resolver "quais módulos um usuário enxerga" (login, painel Administrador).
// Extraído de routes/auth.js em 27/07/2026 pra evitar duplicar a lógica
// quando o endpoint de admin (admin.js) também precisasse dela.

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
    console.error('[permissions] falha ao ler user_modules/modules (seguindo sem eles):', err.message);
  }

  return modules;
}

module.exports = { normalizeModuleName, fetchEffectiveModules };
