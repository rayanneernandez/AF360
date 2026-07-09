const { Pool } = require('pg');

let pool = null;

/**
 * Retorna um pool de conexões único por instância do processo.
 * Em ambiente serverless (Vercel), cada instância "fria" cria o seu
 * próprio pool — por isso mantemos PGPOOL_MAX baixo (padrão: 2).
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      max: Number(process.env.PGPOOL_MAX || 2),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });

    pool.on('error', (err) => {
      // Evita que um erro assíncrono do pool derrube o processo inteiro.
      console.error('[db] erro inesperado no pool do Postgres:', err.message);
    });
  }

  return pool;
}

async function query(text, params = []) {
  const client = getPool();
  const start = Date.now();
  const result = await client.query(text, params);
  const duration = Date.now() - start;
  if (duration > 2000) {
    console.warn(`[db] query lenta (${duration}ms): ${text.slice(0, 120)}`);
  }
  return result;
}

module.exports = { getPool, query };
