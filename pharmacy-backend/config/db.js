// backend/config/db.js
const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const databasePoolerUrl = process.env.DATABASE_POOLER_URL?.trim();
const effectiveDatabaseUrl = databasePoolerUrl || databaseUrl;
const usingPoolerUrl = Boolean(databasePoolerUrl);
const hasSupabaseUrl = Boolean(
  effectiveDatabaseUrl && /supabase\.(com|co)/i.test(effectiveDatabaseUrl)
);
const requireSsl = hasSupabaseUrl || process.env.PGSSLMODE === 'require';
let databaseUrlUsername = '';

if (effectiveDatabaseUrl) {
  try {
    databaseUrlUsername = new URL(effectiveDatabaseUrl).username;
  } catch (_) {
    databaseUrlUsername = '';
  }
}

// Prefer DATABASE_URL for hosted PostgreSQL (Supabase), with PG* fallback for local/dev.
const pool = new Pool(
  effectiveDatabaseUrl
    ? {
        connectionString: effectiveDatabaseUrl,
        ssl: requireSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host: process.env.PGHOST || 'localhost',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: parseInt(process.env.PGPORT || '5432', 10),
        ssl: requireSsl ? { rejectUnauthorized: false } : false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
);

  pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
  });

// Immediately verify connection health on server spin-up
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL Database successfully.');
  } catch (err) {
    const details = {
      hasDatabaseUrl: Boolean(databaseUrl),
      hasDatabasePoolerUrl: Boolean(databasePoolerUrl),
      usingPoolerUrl,
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
  }
})();

// Export clean query wrappers
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool // Export raw pool instance if you need transaction utilities
};