// Wrapper fino pro Auth padrão do Supabase (GoTrue) — SEPARADO do proxy
// interno em lovable.js (que usa x-internal-secret pra ler tabelas). Login
// de verdade precisa da "anon key" pública do projeto Supabase, não do
// segredo interno.
//
// Env vars necessárias (ver af360-api/.env.example):
//   SUPABASE_URL       — opcional, já tem default abaixo.
//   SUPABASE_ANON_KEY   — OBRIGATÓRIA pra login funcionar. Pegue em
//                          Supabase → Project Settings → API → "anon public".
//                          Sem ela, signInWithPassword lança erro com
//                          code === 'missing_anon_key' (ver routes/auth.js).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pzaxbuafqoisgcglypsz.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function signInWithPassword(email, password) {
  if (!SUPABASE_ANON_KEY) {
    const err = new Error('SUPABASE_ANON_KEY não configurada no ambiente (.env / Vercel)');
    err.code = 'missing_anon_key';
    throw err;
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: json?.error_description || json?.msg || json?.error || 'Credenciais inválidas',
    };
  }

  return { ok: true, accessToken: json.access_token, user: json.user };
}

// Troca a própria senha do usuário logado (usa o access_token da sessão,
// obtido re-autenticando com a senha atual — ver routes/auth.js
// POST /change-password). Não precisa de service_role key: PUT /auth/v1/user
// com o Bearer token do próprio usuário já é o jeito padrão do GoTrue pra
// isso. Aproveita a mesma chamada pra já apagar a flag "senha temporária"
// (user_metadata.must_change_password), guardada no próprio Supabase Auth —
// sem depender de nenhuma coluna nova na tabela profiles (essa é gerenciada
// pela Lovable, fora do nosso controle).
async function updateOwnPassword(accessToken, newPassword) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password: newPassword,
      data: { must_change_password: false },
    }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: json?.error_description || json?.msg || json?.error || 'Não foi possível trocar a senha.',
    };
  }

  return { ok: true, user: json };
}

module.exports = { signInWithPassword, updateOwnPassword };
