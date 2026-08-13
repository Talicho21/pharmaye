require('dotenv').config();
const db = require('../config/db');

(async () => {
  try {
    const { rows } = await db.query(
      'SELECT id, username, role, created_at FROM users ORDER BY id',
    );
    console.log('Current users in DB:');
    for (const r of rows) {
      console.log(`${r.id}\t${r.username}\t${r.role}\t${r.created_at}`);
    }

    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err);
    try {
      await db.pool.end();
    } catch (_) {
      // Ignore close errors in failure path.
    }
    process.exit(1);
  }
})();