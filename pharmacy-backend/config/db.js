// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv6first');
const databaseUrl = process.env.DATABASE_URL?.trim();
const databasePoolerUrl = process.env.DATABASE_POOLER_URL?.trim();
const directDatabaseUrl = databaseUrl;
const poolerDatabaseUrl = databasePoolerUrl;
const hasSupabaseUrl = Boolean(
  (directDatabaseUrl || poolerDatabaseUrl) &&
    /supabase\.(com|co)/i.test(directDatabaseUrl || poolerDatabaseUrl)
);
const requireSsl = hasSupabaseUrl || process.env.PGSSLMODE === 'require';
let databaseUrlUsername = '';

const connectionCandidates = [
  ...(poolerDatabaseUrl ? [{ name: 'DATABASE_POOLER_URL', value: poolerDatabaseUrl }] : []),
  ...(directDatabaseUrl ? [{ name: 'DATABASE_URL', value: directDatabaseUrl }] : []),
];

const buildPoolConfig = (connectionString) => ({
  connectionString,
  ssl: requireSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

const buildLocalPoolConfig = () => ({
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT || '5432', 10),
  ssl: requireSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

let pool = null;
let activeConnectionLabel = 'uninitialized';
let initializationPromise = null;

if (directDatabaseUrl || poolerDatabaseUrl) {
  try {
    databaseUrlUsername = new URL(directDatabaseUrl || poolerDatabaseUrl).username;
  } catch (_) {
    databaseUrlUsername = '';
  }
}

const registerPoolErrorListener = (poolInstance, label) => {
  if (!poolInstance) {
    return;
  }

  poolInstance.on('error', (err) => {
    console.error(`❌ PostgreSQL pool error (${label}):`, err);
  });
};

const initializeDatabaseConnection = async () => {
  if (connectionCandidates.length === 0) {
    const localPool = new Pool(buildLocalPoolConfig());
    registerPoolErrorListener(localPool, 'local PG fallback');
    await localPool.query('SELECT 1');
    pool = localPool;
    activeConnectionLabel = 'local PG fallback';
    console.log('✅ Connected to PostgreSQL Database successfully via local fallback.');
    return;
  }

  let lastError;

  for (const candidate of connectionCandidates) {
    const candidatePool = new Pool(buildPoolConfig(candidate.value));
    registerPoolErrorListener(candidatePool, candidate.name);

    try {
      await candidatePool.query('SELECT 1');
      await pool?.end().catch(() => {});
      pool = candidatePool;
      activeConnectionLabel = candidate.name;
      console.log(`✅ Connected to PostgreSQL Database successfully via ${candidate.name}.`);
      return;
    } catch (err) {
      lastError = err;
      await candidatePool.end().catch(() => {});
      console.warn(`⚠️ ${candidate.name} connection failed. Trying the next configured URL if available...`);
    }
  }

  try {
    const localPool = new Pool(buildLocalPoolConfig());
    registerPoolErrorListener(localPool, 'local PG fallback');
    await localPool.query('SELECT 1');
    pool = localPool;
    activeConnectionLabel = 'local PG fallback';
    console.log('✅ Connected to PostgreSQL Database successfully via local fallback.');
    return;
  } catch (localErr) {
    console.warn('⚠️ Local PostgreSQL fallback also failed. The backend will continue to boot without a reachable database.');
    throw lastError || localErr;
  }
};

initializationPromise = (async () => {
  try {
    await initializeDatabaseConnection();
  } catch (err) {
    const details = {
      hasDatabaseUrl: Boolean(databaseUrl),
      hasDatabasePoolerUrl: Boolean(databasePoolerUrl),
      usingPoolerUrl: !databaseUrl && Boolean(databasePoolerUrl),
      usingSupabaseUrl: hasSupabaseUrl,
      sslEnabled: requireSsl,
      pgHostFallback: process.env.PGHOST || 'localhost',
      pgPortFallback: process.env.PGPORT || '5432',
    };

    console.error('❌ Error connecting to PostgreSQL Engine instance:', err);
    console.error('ℹ️ PostgreSQL connection config summary:', details);

    if (
      hasSupabaseUrl &&
      (err?.message || '').toLowerCase().includes('tenant or user not found')
    ) {
      console.error(
        '⚠️ Supabase pooler hint: for port 6543, username is usually "postgres.<project-ref>" (not plain "postgres"). Update DATABASE_POOLER_URL from Supabase Dashboard > Connect.'
      );
      console.error('⚠️ Current URL username (decoded):', databaseUrlUsername || '(empty)');
    }

    throw err;
  }
})();

const query = async (text, params) => {
  await initializationPromise;
  return pool.query(text, params);
};

// Export clean query wrappers
module.exports = {
  query,
  pool: new Proxy(
    {},
    {
      get(_target, prop) {
        if (!pool) {
          throw new Error('Database connection is still initializing. Await db.query or initializeDatabaseConnection before using the pool directly.');
        }

        return pool[prop];
      },
    }
  ),
  initializeDatabaseConnection,
  getActiveConnectionLabel: () => activeConnectionLabel,
};