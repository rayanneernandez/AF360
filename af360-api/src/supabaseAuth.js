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

module.exports = { signInWithPassword };
