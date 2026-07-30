const express = require('express');
const {
  fetchAllRows,
  fetchTable,
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
  getAdminGrupos,
  postAdminGrupo,
  patchAdminGrupo,
  deleteAdminGrupo,
  getAdminUnidades,
  postAdminUnidade,
  patchAdminUnidade,
  deleteAdminUnidade,
  postAdminVenderUnidade,
  getAdminContabilidades,
  postAdminContabilidade,
  patchAdminContabilidade,
  deleteAdminContabilidade,
  patchAdminModulo,
  getAdminDominios,
  postAdminDominio,
  patchAdminDominio,
  deleteAdminDominio,
  getAdminCargoDominio,
  postAdminCargoDominio,
  patchAdminCargoDominio,
  deleteAdminCargoDominio,
  getAdminTemas,
  patchAdminTema,
  getAdminVersoes,
  getAdminNotifRotinas,
  postAdminNotifRotina,
  patchAdminNotifRotina,
  deleteAdminNotifRotina,
  postAdminNotifRotinaExecutar,
  getAdminNotifTemplates,
  postAdminNotifTemplate,
  patchAdminNotifTemplate,
  deleteAdminNotifTemplate,
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

// PATCH /api/admin/modulos/:id?actorId=... -> toggle de is_active (e demais
// campos) do módulo, via endpoint admin-modulos confirmado pelo Lovable em
// 30/07/2026.
router.patch('/modulos/:id', async (req, res) => {
  try {
    const json = await patchAdminModulo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/modulos/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
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

// Achata a linha crua de public.grupos (nome/descricao/cor/is_active,
// cargos_count anexado pelo endpoint deles) pro mesmo formato camelCase que o
// resto do painel Admin usa (cargos, usuários) — mantém app.tsx/Administrador
// simples, sem lidar com nomes de coluna em português direto na tela.
function mapGrupoRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.nome,
    slug: row.slug,
    description: row.descricao ?? null,
    color: row.cor || '#1E3A5F',
    isActive: row.is_active !== false,
    cargosCount: row.cargos_count ?? 0,
  };
}

// GET /api/admin/grupos?q= — tabela própria public.grupos, confirmada pelo
// Lovable em 29/07/2026 (id, nome, slug, descricao, cor, is_active).
// roles.group_type = grupos.slug. A contagem de cargos vinculados
// (cargos_count) já vem pronta no retorno deles. Sem paginação server-side —
// só 5 grupos hoje, a tela pagina client-side igual Cargos/Acesso por Usuário.
router.get('/grupos', async (req, res) => {
  try {
    const json = await getAdminGrupos({ q: req.query.q, order: 'nome:asc', limit: 500 });
    const grupos = (json?.data ?? []).map(mapGrupoRow);
    res.json({ ok: true, data: { count: json?.count ?? grupos.length, grupos } });
  } catch (err) {
    console.error('[admin/grupos] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/grupos?actorId=... — cria grupo. Body: { nome, slug?,
// descricao?, cor?, is_active? } (slug gerado do nome no Lovable se omitido).
router.post('/grupos', async (req, res) => {
  try {
    const json = await postAdminGrupo(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapGrupoRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/grupos POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/grupos/:id?actorId=...
router.patch('/grupos/:id', async (req, res) => {
  try {
    const json = await patchAdminGrupo(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapGrupoRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/grupos/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/grupos/:id?actorId=... — o Lovable devolve 409 se houver
// cargos vinculados (mesma trava do painel web); repassamos o status pro
// front mostrar um alerta claro em vez de um erro genérico.
router.delete('/grupos/:id', async (req, res) => {
  try {
    const json = await deleteAdminGrupo(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/grupos/:id DELETE] erro:', err.message);
    const status = err.lovableStatus === 409 ? 409 : writeErrorStatus(err);
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
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

// ---------------------------------------------------------------------------
// Unidades (tabela própria public.empresas — schema completo confirmado
// pelo Lovable em 29/07/2026: cnpj, bandeira, tipo, cidade/estado, is_active,
// idq, nome_fantasia/apelido/razao_social, endereço, vendida/data_venda/
// comprador/venda_observacao, etc). "colaboradores_ativos" já vem pronto no
// retorno da listagem deles.
// ---------------------------------------------------------------------------

function mapUnidadeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nomeFantasia: row.nome_fantasia ?? null,
    apelido: row.apelido ?? null,
    razaoSocial: row.razao_social ?? null,
    cnpj: row.cnpj ?? null,
    bandeira: row.bandeira ?? null,
    tipo: row.tipo ?? null,
    cidade: row.cidade ?? null,
    estado: row.estado ?? null,
    idq: row.idq ?? null,
    isActive: row.is_active !== false,
    cdRede: row.cd_rede ?? null,
    regiao: row.regiao ?? null,
    rua: row.rua ?? null,
    numero: row.numero ?? null,
    bairro: row.bairro ?? null,
    cep: row.cep ?? null,
    enderecoTexto: row.endereco_texto ?? null,
    proprietario: row.proprietario ?? null,
    ipirangaHabilitado: Boolean(row.ipiranga_habilitado),
    email: row.email ?? null,
    telefone: row.telefone ?? null,
    dataCadastro: row.data_cadastro ?? null,
    dataPrimeiraVenda: row.data_primeira_venda ?? null,
    contabilidadeId: row.contabilidade_id ?? null,
    servicos: row.servicos ?? {},
    vendida: Boolean(row.vendida),
    dataVenda: row.data_venda ?? null,
    comprador: row.comprador ?? null,
    vendaObservacao: row.venda_observacao ?? null,
    colaboradoresAtivos: row.colaboradores_ativos ?? 0,
  };
}

// GET /api/admin/unidades?q=&is_active=&vendida=
router.get('/unidades', async (req, res) => {
  try {
    const json = await getAdminUnidades({
      q: req.query.q,
      is_active: req.query.is_active,
      vendida: req.query.vendida,
      order: 'razao_social:asc',
      limit: 1000,
    });
    const unidades = (json?.data ?? []).map(mapUnidadeRow);
    res.json({ ok: true, data: { count: json?.count ?? unidades.length, unidades } });
  } catch (err) {
    console.error('[admin/unidades] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/unidades?actorId=... — body com colunas reais de empresas
// (razao_social e cnpj obrigatórios).
router.post('/unidades', async (req, res) => {
  try {
    const json = await postAdminUnidade(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapUnidadeRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/unidades POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/unidades/:id?actorId=...
router.patch('/unidades/:id', async (req, res) => {
  try {
    const json = await patchAdminUnidade(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapUnidadeRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/unidades/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/unidades/:id?actorId=... — 409 se tiver colaborador vinculado.
router.delete('/unidades/:id', async (req, res) => {
  try {
    const json = await deleteAdminUnidade(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/unidades/:id DELETE] erro:', err.message);
    const status = err.lovableStatus === 409 ? 409 : writeErrorStatus(err);
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/admin/unidades/:id/vender?actorId=... — ação única confirmada
// pelo Lovable: marca a unidade como vendida/inativa e, em lote, transfere
// (rh_transferencias + rh_colaboradores.empresa_id) ou desliga (status,
// data_demissao, motivo, bloqueio de acesso/e-mail) cada colaborador ativo
// dela. Body: { data_venda, comprador?, observacao?, transferencias:
// [{ colaborador_id, empresa_destino_id }] } — quem não estiver na lista de
// transferências é desligado por venda.
router.post('/unidades/:id/vender', async (req, res) => {
  try {
    const body = { unidade_id: req.params.id, ...(req.body ?? {}) };
    const json = await postAdminVenderUnidade(body, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/unidades/:id/vender POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Contabilidades (tabela própria public.contabilidades — schema confirmado
// pelo Lovable em 29/07/2026: razao_social, nome_fantasia, apelido, cnpj,
// email, telefone, responsavel, endereço, is_active. Ligada a empresas via
// empresas.contabilidade_id). "unidades_vinculadas" já vem pronto no retorno
// da listagem deles.
// ---------------------------------------------------------------------------

function mapContabilidadeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    razaoSocial: row.razao_social ?? null,
    nomeFantasia: row.nome_fantasia ?? null,
    apelido: row.apelido ?? null,
    cnpj: row.cnpj ?? null,
    email: row.email ?? null,
    telefone: row.telefone ?? null,
    responsavel: row.responsavel ?? null,
    rua: row.rua ?? null,
    numero: row.numero ?? null,
    bairro: row.bairro ?? null,
    cep: row.cep ?? null,
    cidade: row.cidade ?? null,
    estado: row.estado ?? null,
    observacoes: row.observacoes ?? null,
    isActive: row.is_active !== false,
    unidadesVinculadas: row.unidades_vinculadas ?? 0,
  };
}

// GET /api/admin/contabilidades?q=&is_active=
router.get('/contabilidades', async (req, res) => {
  try {
    const json = await getAdminContabilidades({
      q: req.query.q,
      is_active: req.query.is_active,
      order: 'razao_social:asc',
      limit: 500,
    });
    const contabilidades = (json?.data ?? []).map(mapContabilidadeRow);
    res.json({ ok: true, data: { count: json?.count ?? contabilidades.length, contabilidades } });
  } catch (err) {
    console.error('[admin/contabilidades] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/contabilidades?actorId=... — razao_social obrigatório.
router.post('/contabilidades', async (req, res) => {
  try {
    const json = await postAdminContabilidade(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapContabilidadeRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/contabilidades POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/contabilidades/:id?actorId=...
router.patch('/contabilidades/:id', async (req, res) => {
  try {
    const json = await patchAdminContabilidade(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapContabilidadeRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/contabilidades/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/contabilidades/:id?actorId=... — 409 se tiver unidade vinculada.
router.delete('/contabilidades/:id', async (req, res) => {
  try {
    const json = await deleteAdminContabilidade(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/contabilidades/:id DELETE] erro:', err.message);
    const status = err.lovableStatus === 409 ? 409 : writeErrorStatus(err);
    res.status(status).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// Configurações: Domínios permitidos, Domínio de e-mail por cargo, Temas
// visuais — confirmados pela Lovable em 30/07/2026.
// ---------------------------------------------------------------------------

function mapDominioRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    dominio: row.dominio ?? null,
    descricao: row.descricao ?? null,
    isActive: Boolean(row.ativo),
    createdAt: row.created_at ?? null,
  };
}

// GET /api/admin/dominios?q=&ativo=
router.get('/dominios', async (req, res) => {
  try {
    const json = await getAdminDominios({ q: req.query.q, ativo: req.query.ativo, limit: 500 });
    const dominios = (json?.data ?? []).map(mapDominioRow);
    res.json({ ok: true, data: { count: json?.count ?? dominios.length, dominios } });
  } catch (err) {
    console.error('[admin/dominios] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/dominios?actorId=... — { dominio, descricao?, ativo? }
router.post('/dominios', async (req, res) => {
  try {
    const json = await postAdminDominio(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapDominioRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/dominios POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/dominios/:id?actorId=...
router.patch('/dominios/:id', async (req, res) => {
  try {
    const json = await patchAdminDominio(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapDominioRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/dominios/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/dominios/:id?actorId=...
router.delete('/dominios/:id', async (req, res) => {
  try {
    const json = await deleteAdminDominio(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/dominios/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

function mapCargoDominioRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    cargo: row.cargo ?? null,
    dominio: row.dominio ?? null,
    provider: row.provider ?? null,
    isActive: Boolean(row.ativo),
  };
}

// GET /api/admin/cargo-dominio?q=&provider=&ativo=
router.get('/cargo-dominio', async (req, res) => {
  try {
    const json = await getAdminCargoDominio({
      q: req.query.q,
      provider: req.query.provider,
      ativo: req.query.ativo,
      limit: 1000,
    });
    const itens = (json?.data ?? []).map(mapCargoDominioRow);
    res.json({ ok: true, data: { count: json?.count ?? itens.length, itens } });
  } catch (err) {
    console.error('[admin/cargo-dominio] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/cargo-dominio?actorId=... — { cargo, dominio, provider, ativo? }
router.post('/cargo-dominio', async (req, res) => {
  try {
    const json = await postAdminCargoDominio(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapCargoDominioRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/cargo-dominio POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/cargo-dominio/:id?actorId=...
router.patch('/cargo-dominio/:id', async (req, res) => {
  try {
    const json = await patchAdminCargoDominio(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapCargoDominioRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/cargo-dominio/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/cargo-dominio/:id?actorId=...
router.delete('/cargo-dominio/:id', async (req, res) => {
  try {
    const json = await deleteAdminCargoDominio(req.params.id, req.query.actorId);
    res.json({ ok: true, data: json?.data ?? json });
  } catch (err) {
    console.error('[admin/cargo-dominio/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

function mapTemaRow(row) {
  if (!row) return null;
  const cores = row.cores ?? {};
  return {
    slug: row.slug ?? null,
    nome: row.nome ?? null,
    descricao: row.descricao ?? null,
    cores: {
      primary: cores.primary ?? null,
      accent: cores.accent ?? null,
      bg: cores.bg ?? null,
      secondary: cores.secondary ?? null,
    },
    isActive: Boolean(row.ativo),
    isProtected: Boolean(row.is_protected),
  };
}

// GET /api/admin/temas
router.get('/temas', async (req, res) => {
  try {
    const json = await getAdminTemas();
    const temas = (json?.data ?? []).map(mapTemaRow);
    res.json({ ok: true, data: temas });
  } catch (err) {
    console.error('[admin/temas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// PATCH /api/admin/temas/:slug?actorId=... — { ativo: true|false }
router.patch('/temas/:slug', async (req, res) => {
  try {
    const json = await patchAdminTema(req.params.slug, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapTemaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/temas/:slug PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Versões (changelog de produto — conteúdo único servido pelo Lovable,
// sem tabela por trás; ver combinado em 30/07/2026). Só leitura. ---

function mapVersaoItem(item) {
  if (!item) return null;
  return {
    titulo: item.titulo ?? null,
    tipo: item.tipo ?? null,
    descricao: item.descricao ?? null,
    detalhes: Array.isArray(item.detalhes) ? item.detalhes : [],
  };
}

function mapVersaoRow(row) {
  if (!row) return null;
  return {
    versao: row.versao ?? null,
    data: row.data ?? null,
    rotulo: row.rotulo ?? null,
    destaque: Boolean(row.destaque),
    itens: Array.isArray(row.itens) ? row.itens.map(mapVersaoItem) : [],
  };
}

// GET /api/admin/versoes
router.get('/versoes', async (req, res) => {
  try {
    const json = await getAdminVersoes();
    const versoes = (json?.data ?? []).map(mapVersaoRow);
    const tipos = (json?.tipos ?? []).map((tipo) => ({
      key: tipo.key ?? null,
      label: tipo.label ?? null,
      cor: tipo.cor ?? null,
    }));
    res.json({
      ok: true,
      data: {
        versoes,
        tipos,
        totais: json?.totais ?? {},
        count: json?.count ?? versoes.length,
      },
    });
  } catch (err) {
    console.error('[admin/versoes] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// --- Notificações: Rotinas (<modulo>_notificacoes) e Templates
// (notif_templates, compartilhada via coluna modulo) — confirmado pelo
// Lovable em 30/07/2026. Escrita usa os nomes de coluna do banco direto no
// body (mesmo padrão de dominios/cargo-dominio), só a leitura é mapeada
// pra camelCase. ---

function mapNotifRotinaRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    templateId: row.template_id ?? null,
    isActive: Boolean(row.ativa),
    tipoGatilho: row.tipo_gatilho ?? 'manual',
    cronExpressao: row.cron_expressao ?? null,
    eventoCodigo: row.evento_codigo ?? null,
    canais: Array.isArray(row.canais) ? row.canais : [],
    publicoTipo: row.publico_tipo ?? 'todos',
    publicoIds: Array.isArray(row.publico_ids) ? row.publico_ids : [],
    ultimaExecucao: row.ultima_execucao ?? null,
    proximaExecucao: row.proxima_execucao ?? null,
    totalDestinos: row.total_destinos ?? 0,
    totalEnviados: row.total_enviados ?? 0,
    status: row.status ?? null,
    agendadaPara: row.agendada_para ?? null,
  };
}

// GET /api/admin/notif-rotinas?modulo=admin&q=&ativa=&limit=&offset=
router.get('/notif-rotinas', async (req, res) => {
  try {
    const json = await getAdminNotifRotinas(req.query.modulo, {
      q: req.query.q,
      ativa: req.query.ativa,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    const rotinas = (json?.data ?? []).map(mapNotifRotinaRow);
    res.json({ ok: true, data: { rotinas, count: json?.count ?? rotinas.length } });
  } catch (err) {
    console.error('[admin/notif-rotinas] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/notif-rotinas?modulo=admin&actorId=...
router.post('/notif-rotinas', async (req, res) => {
  try {
    const json = await postAdminNotifRotina(req.query.modulo, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/notif-rotinas POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/notif-rotinas/:id?modulo=admin&actorId=...
router.patch('/notif-rotinas/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifRotina(req.query.modulo, req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/notif-rotinas/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/notif-rotinas/:id?modulo=admin&actorId=...
router.delete('/notif-rotinas/:id', async (req, res) => {
  try {
    await deleteAdminNotifRotina(req.query.modulo, req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[admin/notif-rotinas/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// POST /api/admin/notif-rotinas/:id/executar?modulo=admin&actorId=... — dispara
// envio real (inbox/Resend/n8n) e atualiza ultima_execucao/totais.
router.post('/notif-rotinas/:id/executar', async (req, res) => {
  try {
    const json = await postAdminNotifRotinaExecutar(req.query.modulo, req.params.id, req.query.actorId);
    res.json({ ok: true, data: mapNotifRotinaRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/notif-rotinas/:id/executar POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

function mapNotifTemplateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    modulo: row.modulo ?? null,
    codigo: row.codigo ?? null,
    nome: row.nome ?? null,
    titulo: row.titulo ?? null,
    mensagem: row.mensagem ?? null,
    variaveis: Array.isArray(row.variaveis) ? row.variaveis : [],
    isPadrao: Boolean(row.padrao),
    isActive: Boolean(row.ativo),
  };
}

// GET /api/admin/notif-templates?modulo=admin&q=&ativo=
router.get('/notif-templates', async (req, res) => {
  try {
    const json = await getAdminNotifTemplates({ modulo: req.query.modulo, q: req.query.q, ativo: req.query.ativo });
    const templates = (json?.data ?? []).map(mapNotifTemplateRow);
    res.json({ ok: true, data: { templates, count: json?.count ?? templates.length } });
  } catch (err) {
    console.error('[admin/notif-templates] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

// POST /api/admin/notif-templates?actorId=... — body inclui modulo; sempre
// entra com padrao=false (não dá pra criar template "padrão do sistema" pelo app).
router.post('/notif-templates', async (req, res) => {
  try {
    const json = await postAdminNotifTemplate(req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/notif-templates POST] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// PATCH /api/admin/notif-templates/:id?actorId=...
router.patch('/notif-templates/:id', async (req, res) => {
  try {
    const json = await patchAdminNotifTemplate(req.params.id, req.body ?? {}, req.query.actorId);
    res.json({ ok: true, data: mapNotifTemplateRow(json?.data ?? json) });
  } catch (err) {
    console.error('[admin/notif-templates/:id PATCH] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// DELETE /api/admin/notif-templates/:id?actorId=... — Lovable responde 409 se
// o template for padrão do sistema (padrao=true); a mensagem de erro sobe
// direto pro app mostrar pro usuário.
router.delete('/notif-templates/:id', async (req, res) => {
  try {
    await deleteAdminNotifTemplate(req.params.id, req.query.actorId);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error('[admin/notif-templates/:id DELETE] erro:', err.message);
    res.status(writeErrorStatus(err)).json({ ok: false, error: 'write_failed', message: err.message });
  }
});

// --- Logs de auditoria (tabela public.audit_log, liberada na allowlist
// genérica pelo Lovable em 30/07/2026 — imutável, só leitura). ---

function mapAuditLogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at ?? null,
    action: row.action ?? null,
    moduleSlug: row.module_slug ?? null,
    tableName: row.table_name ?? null,
    userId: row.user_id ?? null,
    ipAddress: row.ip_address ?? null,
    recordId: row.record_id ?? null,
    oldData: row.old_data ?? null,
    newData: row.new_data ?? null,
  };
}

// GET /api/admin/logs?action=&moduleSlug=&tableName=&limit=&offset=
router.get('/logs', async (req, res) => {
  try {
    const filters = {};
    if (req.query.action) filters.action = req.query.action;
    if (req.query.moduleSlug) filters.module_slug = req.query.moduleSlug;
    if (req.query.tableName) filters.table_name__ilike = `%${req.query.tableName}%`;

    const json = await fetchTable('audit_log', {
      order: 'created_at:desc',
      limit: req.query.limit ? Number(req.query.limit) : 200,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      count: true,
      filters,
    });
    const logs = (json?.data ?? []).map(mapAuditLogRow);
    res.json({ ok: true, data: { logs, count: json?.count ?? logs.length } });
  } catch (err) {
    console.error('[admin/logs] erro:', err.message);
    res.status(500).json({ ok: false, error: 'query_failed', message: err.message });
  }
});

module.exports = router;
