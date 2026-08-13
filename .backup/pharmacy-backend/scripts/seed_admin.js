require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcrypt');

(async () => {
  try {
    console.log('Checking users table...');
    const { rows } = await db.query('SELECT COUNT(*)::int AS cnt FROM users');
    const count = rows[0]?.cnt ?? 0;
    if (count > 0) {
      console.log('Users table already has entries (count=', count, '). Seeder will not create an admin.');
      await db.pool.end();
      process.exit(0);
    }

    const username = process.env.SEED_ADMIN_USERNAME || 'hawanadmin';
    const password = process.env.SEED_ADMIN_PASSWORD || 'hawan15';
    const role = process.env.SEED_ADMIN_ROLE || 'admin';

    console.log('Creating admin user:', username);
    const hashed = await bcrypt.hash(password, 10);

    const insert = `INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role`;
    const r = await db.query(insert, [username, hashed, role]);
    console.log('Created admin:', r.rows[0]);

    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Seeder error:', err);
    try { await db.pool.end(); } catch(_){}
    process.exit(1);
  }
})();
