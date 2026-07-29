const express = require('express');
const {
  fetchAllRows,
  postAdminUsuario,
  postAdminUsuarioResetSenha,
  postAdminUsuarioToggleAtivo,
  patchAdminUsuario,
  deleteAdminUsuario,
  postAdminRole,
  patchAdminRole,
  deleteAdminRole,
  putAdminRolePermissions,
  putAdminUserPermissions,
  postAdminUserModule,
  postAdminUserModulesReset,
  deleteAdminUserModule,
} = require('../lovable');
const { normalizeModuleName } = require('../permissions');

// Todas as rotas de escrita aceitam ?actorId=<uuid do profile de quem está
// logado> (o app manda o profileId salvo no login) — repassado como
// x-actor-id pro Lovable validar is_master. Sem actorId, o Lovable ainda
// processa, só não valida master (fica por conta da regra deles).
function writeErrorStatus(err) {
  return err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
}

const router = express.Router();

// Painel "Administrador" (mobile) — telas Usuários, Perfil de Acesso (Cargos
// e Acesso por Usuário) e Grupos, conectadas ao Supabase real do Lovable
// (profiles, roles, rh_colaboradores, empresas, user_modules, modules).
// As outras 10 telas do painel Administrador (Dashboard, Perfil, Unidades,
// Módulos, Integrações, Convenções, Configurações, Versões, Notificações,
// Logs) continuam mock por enquanto — não têm rota aqui ainda.

// Mesma tabela fixa slug -> label já usada (estática) em AdminModulosScreen
// no Administrador.tsx — mantém os dois lados com o mesmo texto exibido.
const MODULE_LABELS = {
  administrador: 'Administrador',
  rh: 'RH',
  recrutamento: 'R&S',
  'r&s': 'R&S',
  rs: 'R&S',
  colaborador: 'Colaborador',
  financeiro: 'Financeiro',
  gestao: 'Gestão',
  administrativo: 'Administrativo',
  diretoria: 'Diretoria',
  marketing: 'Marketing & Fidelidade',
};

function capitalizeLabel(raw) {
  const key = String(raw ?? '').trim();
  if (!key) return null;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function moduleLabelFor(rawModule) {
  const normalized = normalizeModuleName(rawModule);
  if (MODULE_LABELS[normalized]) return MODULE_LABELS[normalized];
  // Módulo real que não bate com nenhum label conhecido: mostra o valor cru
  // capitalizado em vez de esconder ou inventar um nome diferente do banco.
  return capitalizeLabel(rawModule) ?? rawModule;
}

// Carrega roles inteira uma vez só e devolve tanto a lista crua quanto os
// cargos já processados (label de módulos + grupo) — reaproveitado pelas
// rotas /cargos e /grupos, que derivam da mesma leitura.
async function loadRolesProcessadas() {
  const rolesJson = await fetchAllRows('roles', {
    select: 'id,name,slug,group_type,default_modules,is_active',
  });

  const cargos = (rolesJson.data || []).map((role) => {
    const modulosRaw = Array.isArray(role.default_modules) ? role.default_modules : [];
    const moduleLabels = Array.from(new Set(modulosRaw.map((m) => moduleLabelFor(m))));

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      // Não sabemos com certeza se o Lovable já grava group_type pronto pra
      // exibição (ex: "Corporativo") ou em snake_case/minúsculo (ex:
      // "corporativo") — aplicamos só uma capitalização simples da primeira
      // letra em vez de tentar adivinhar um mapeamento fechado. Ajustar
      // quando confirmarmos o valor real com o time Lovable.
      group: capitalizeLabel(role.group_type),
      moduleLabels,
      isActive: Boolean(role.is_active),
    };
  });

  return { rolesRaw: rolesJson.data || [], cargos };
}

// GET /api/admin/cargos
router.get('/cargos', async (req, res) => {
  try {
    const { cargos } = await loadRolesProcessadas();
    res.json({ ok: true, data: { count: cargos.length, cargos } });
  } catch (err) {
    console.error('[admin/cargos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/cargos?actorId=... — cria role. Body: { name, slug?,
// group_type?, default_modules?, is_active? }.
router.post('/cargos', async (req, res) => {
  try {
    const json = await postAdminRole(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/cargos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/cargos/:id?actorId=...
router.patch('/cargos/:id', async (req, res) => {
  try {
    const json = await patchAdminRole(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/cargos/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/cargos/:id?actorId=...
router.delete('/cargos/:id', async (req, res) => {
  try {
    const json = await deleteAdminRole(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/cargos/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PUT /api/admin/cargos/:id/permissoes?actorId=... — substitui a grade
// inteira de role_permissions desse cargo. Body: { permissions: [{feature_id,
// can_read, can_write, can_edit, can_delete}] }.
router.put('/cargos/:id/permissoes', async (req, res) => {
  try {
    const json = await putAdminRolePermissions(req.params.id, req.body?.permissions ?? [], req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/cargos/:id/permissoes PUT] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/admin/modulos -> tabela "modules" (agora na allowlist do Lovable).
// Usado pra resolver slug/id dos 9 módulos canônicos nos toggles de
// Cargos/Acesso por Usuário.
router.get('/modulos', async (req, res) => {
  try {
    const json = await fetchAllRows('modules');
    res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
  } catch (err) {
    console.error('[admin/modulos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/admin/module-features?moduleId=opcional -> tabela
// "module_features" (também na allowlist agora). São as "funcionalidades"
// (telas) de cada módulo, usadas como feature_id na grade de permissões
// (role_permissions/user_permissions).
router.get('/module-features', async (req, res) => {
  try {
    const filters = {};
    if (req.query.moduleId) filters.module_id = req.query.moduleId;
    const json = await fetchAllRows('module_features', { filters });
    res.json({ ok: true, count: json.count ?? json.data.length, data: json.data });
  } catch (err) {
    console.error('[admin/module-features] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// GET /api/admin/grupos
// Não existe tabela separada de "grupos" confirmada no schema — isso é uma
// agregação derivada de roles.group_type (quantos cargos/roles caem em cada
// grupo). É uma suposição razoável baseada no mockup do painel Administrador,
// mas pode precisar de ajuste quando confirmarmos com o Lovable se "grupo" é
// de fato só um agrupamento de roles ou uma entidade própria no banco deles.
router.get('/grupos', async (req, res) => {
  try {
    const { cargos } = await loadRolesProcessadas();

    const countByGroup = new Map();
    cargos.forEach((cargo) => {
      const key = cargo.group || 'Não informado';
      countByGroup.set(key, (countByGroup.get(key) || 0) + 1);
    });

    const grupos = Array.from(countByGroup.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json({ ok: true, data: { count: grupos.length, grupos } });
  } catch (err) {
    console.error('[admin/grupos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// Carrega empresas (só id -> nome) pra resolver "unidade" via
// rh_colaboradores.empresa_id, mesmo padrão do empresaNomeById em
// routes/rhDashboard.js (loadColaboradoresEEmpresas).
async function loadEmpresaNomeById() {
  const empresasJson = await fetchAllRows('empresas', { select: 'id,nome_fantasia,razao_social' });
  const empresaNomeById = new Map();
  (empresasJson.data || []).forEach((e) => {
    empresaNomeById.set(e.id, e.nome_fantasia || e.razao_social || null);
  });
  return empresaNomeById;
}

function compareFullName(a, b) {
  // null/vazio vai pro fim, independente de qual dos dois é null.
  const nameA = (a || '').trim();
  const nameB = (b || '').trim();
  if (!nameA && !nameB) return 0;
  if (!nameA) return 1;
  if (!nameB) return -1;
  return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
}

// GET /api/admin/usuarios?q=opcional
// `q` é aceito mas ignorado no backend por enquanto — a tela filtra
// localmente (client-side) sobre a lista inteira, já que são ~515 linhas.
router.get('/usuarios', async (req, res) => {
  try {
    // rh_colaboradores tem 1900+ linhas (2+ páginas de 1000) — precisa de
    // "order" estável pra paginação por offset não repetir/pular linhas
    // (mesmo bug corrigido em routes/rhDashboard.js/loadColaboradoresEEmpresas).
    const [profilesJson, rolesJson, rhColaboradoresJson, empresaNomeById] = await Promise.all([
      fetchAllRows('profiles', {
        select: 'id,full_name,email,is_active,role_id,empresa_id,is_master,created_at,chat_atendente',
        order: 'id:asc',
      }),
      fetchAllRows('roles', { select: 'id,name' }),
      fetchAllRows('rh_colaboradores', { select: 'id,profile_id,empresa_id,cargo', order: 'id:asc' }),
      loadEmpresaNomeById(),
    ]);

    const roleNameById = new Map();
    (rolesJson.data || []).forEach((r) => roleNameById.set(r.id, r.name || null));

    // rh_colaboradores.profile_id -> profiles.id (link confirmado em
    // routes/auth.js). Um profile pode, em teoria, não ter ficha de RH
    // vinculada (unidade fica null/"—" nesse caso, honesto em vez de inventar).
    const rhByProfileId = new Map();
    (rhColaboradoresJson.data || []).forEach((c) => {
      if (c.profile_id) rhByProfileId.set(c.profile_id, c);
    });

    const usuarios = (profilesJson.data || [])
      .map((p) => {
        const rh = rhByProfileId.get(p.id) || null;
        const empresaId = rh?.empresa_id ?? p.empresa_id ?? null;
        return {
          id: p.id,
          fullName: p.full_name || null,
          email: p.email,
          cargo: (p.role_id && roleNameById.get(p.role_id)) || null,
          unidade: (empresaId && empresaNomeById.get(empresaId)) || null,
          isActive: Boolean(p.is_active),
          isMaster: Boolean(p.is_master),
          createdAt: p.created_at || null,
          chatAtendente: Boolean(p.chat_atendente),
        };
      })
      .sort((a, b) => compareFullName(a.fullName, b.fullName));

    res.json({ ok: true, data: { count: usuarios.length, usuarios } });
  } catch (err) {
    console.error('[admin/usuarios] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/usuarios?actorId=... — cria usuário (Auth + profile no
// Lovable). Body: { email, full_name, password, is_master?, is_active?,
// empresa_id?, role_id?, chat_atendente? }. Valida domínio de e-mail e
// popula user_modules a partir do role — tudo do lado do Lovable.
router.post('/usuarios', async (req, res) => {
  try {
    const json = await postAdminUsuario(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/admin/usuarios/:id/redefinir-senha?actorId=... — body: { password }.
router.post('/usuarios/:id/redefinir-senha', async (req, res) => {
  try {
    const json = await postAdminUsuarioResetSenha(req.params.id, req.body?.password, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/redefinir-senha] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/admin/usuarios/:id/toggle-ativo?actorId=... — body: { isActive }.
router.post('/usuarios/:id/toggle-ativo', async (req, res) => {
  try {
    const json = await postAdminUsuarioToggleAtivo(req.params.id, Boolean(req.body?.isActive), req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/toggle-ativo] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/usuarios/:id?actorId=... — edita profile (nome, cargo,
// unidade, chat_atendente, is_master, e-mail).
router.patch('/usuarios/:id', async (req, res) => {
  try {
    const json = await patchAdminUsuario(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/usuarios/:id?actorId=...
router.delete('/usuarios/:id', async (req, res) => {
  try {
    const json = await deleteAdminUsuario(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// GET /api/admin/acesso-por-usuario
// Mesma base profiles + roles da rota /usuarios, mas calcula a contagem de
// módulos efetivos (role.default_modules ∪ user_modules) por usuário. Em vez
// de chamar fetchEffectiveModules() (routes/auth.js/permissions.js) 515 vezes
// (uma requisição HTTP pro Lovable por usuário), buscamos user_modules e
// modules inteiras de uma vez e montamos os mapas em memória — bem mais
// rápido e evita sobrecarregar o Lovable com centenas de chamadas.
router.get('/acesso-por-usuario', async (req, res) => {
  try {
    const [profilesJson, rolesJson] = await Promise.all([
      fetchAllRows('profiles', { select: 'id,full_name,email,role_id' }),
      fetchAllRows('roles', { select: 'id,name,default_modules' }),
    ]);

    const roleById = new Map();
    (rolesJson.data || []).forEach((r) => roleById.set(r.id, r));

    // user_modules/modules (módulos avulsos por usuário, além do que o cargo
    // já dá) — a tabela "modules" já voltou "table not allowed" da allowlist
    // interna do Lovable pelo menos uma vez. Isolado num try/catch próprio pra
    // não derrubar a tela inteira: se falhar, cada usuário mostra só os
    // módulos do cargo (sem os avulsos), em vez de a aba inteira quebrar.
    const extraModulesByUserId = new Map();
    try {
      const [userModulesJson, modulesJson] = await Promise.all([
        fetchAllRows('user_modules', { select: 'user_id,module_id' }),
        fetchAllRows('modules'),
      ]);

      // modules.slug ou modules.name ainda não 100% confirmado — tenta os
      // dois, mesmo padrão defensivo de fetchEffectiveModules em permissions.js.
      const moduleNameById = new Map();
      (modulesJson.data || []).forEach((mod) => {
        const label = mod.slug ?? mod.name ?? mod.nome ?? null;
        if (label) moduleNameById.set(mod.id, normalizeModuleName(label));
      });

      (userModulesJson.data || []).forEach((row) => {
        if (!row.user_id || !row.module_id) return;
        const moduleName = moduleNameById.get(row.module_id);
        if (!moduleName) return;
        if (!extraModulesByUserId.has(row.user_id)) extraModulesByUserId.set(row.user_id, new Set());
        extraModulesByUserId.get(row.user_id).add(moduleName);
      });
    } catch (err) {
      console.error(
        '[admin/acesso-por-usuario] user_modules/modules indisponível, seguindo só com módulos do cargo:',
        err.message
      );
    }

    const usuarios = (profilesJson.data || [])
      .map((p) => {
        const role = p.role_id ? roleById.get(p.role_id) : null;
        const roleModules = Array.isArray(role?.default_modules) ? role.default_modules : [];
        const modulesSet = new Set(roleModules.map((m) => normalizeModuleName(m)));

        const extra = extraModulesByUserId.get(p.id);
        if (extra) extra.forEach((m) => modulesSet.add(m));

        // moduleLabels: mesmo dedup/label já usado em loadRolesProcessadas
        // (cargo.moduleLabels) — permite o app mostrar exatamente quais
        // módulos estão ligados pra esse usuário (tela "Acesso de X"), não só
        // a contagem.
        const moduleLabels = Array.from(new Set(Array.from(modulesSet).map((m) => moduleLabelFor(m))));

        return {
          id: p.id,
          fullName: p.full_name || null,
          email: p.email,
          cargo: role?.name || null,
          moduleCount: modulesSet.size,
          moduleLabels,
        };
      })
      .sort((a, b) => compareFullName(a.fullName, b.fullName));

    res.json({ ok: true, data: { count: usuarios.length, usuarios } });
  } catch (err) {
    console.error('[admin/acesso-por-usuario] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/usuarios/:id/modulos?actorId=... — liga um módulo avulso
// pro usuário (upsert em user_modules). Body: { moduleSlug } ou { moduleId }.
router.post('/usuarios/:id/modulos', async (req, res) => {
  try {
    const json = await postAdminUserModule(
      req.params.id,
      { moduleId: req.body?.moduleId, moduleSlug: req.body?.moduleSlug },
      req.query.actorId
    );
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/modulos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/admin/usuarios/:id/modulos/reset?actorId=... — limpa os módulos
// avulsos e as permissões granulares do usuário, voltando ao padrão do cargo.
router.post('/usuarios/:id/modulos/reset', async (req, res) => {
  try {
    const json = await postAdminUserModulesReset(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/modulos/reset] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/usuarios/:id/modulos/:moduleId?actorId=...
router.delete('/usuarios/:id/modulos/:moduleId', async (req, res) => {
  try {
    const json = await deleteAdminUserModule(req.params.id, req.params.moduleId, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/modulos/:moduleId DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PUT /api/admin/usuarios/:id/permissoes?actorId=... — substitui a grade
// inteira de user_permissions (override granular por usuário). Body:
// { permissions: [{feature_id, can_read, can_write, can_edit, can_delete}] }.
router.put('/usuarios/:id/permissoes', async (req, res) => {
  try {
    const json = await putAdminUserPermissions(req.params.id, req.body?.permissions ?? [], req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/usuarios/:id/permissoes PUT] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

module.exports = router;
