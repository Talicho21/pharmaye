require('dotenv').config();
const db = require('../config/db');
const bcrypt = require('bcrypt');

(async () => {
  let client;
  try {
    client = await db.pool.connect();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTable = `users_backup_${timestamp.replace(/-/g, '_')}`;

    await client.query('BEGIN');

    console.log('Creating backup table:', backupTable);
    await client.query(`CREATE TABLE IF NOT EXISTS "${backupTable}" AS TABLE users`);

    // Remove any users not in the keep list
    const keep = ['eseruadmin','expresstaff1','testers12'];
    console.log('Deleting users not in:', keep.join(','));
    await client.query(
      `DELETE FROM users WHERE username <> ALL($1::text[])`,
      [keep],
    );

    // Insert or update the three requested users with bcrypt hashes.
    console.log('Upserting requested users...');
    const adminHash = await bcrypt.hash('eseru16', 10);
    const staffHash = await bcrypt.hash('express16', 10);
    const testerHash = await bcrypt.hash('testersdev1', 10);

    await client.query(
      `INSERT INTO users (username, password, password_hash, role)
       VALUES
         ('eseruadmin', '', $1, 'admin'),
         ('expresstaff1', '', $2, 'staff'),
         ('testers12', '', $3, 'admin')
       ON CONFLICT (username)
       DO UPDATE SET
         password = EXCLUDED.password,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role`,
      [adminHash, staffHash, testerHash],
    );

    await client.query('COMMIT');
    client.release();

    console.log('Done. Created backup table and applied changes.');
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error applying user changes:', err);
    try {
      if (client) {
        await client.query('ROLLBACK');
        client.release();
      }
    } catch (_) {
      // Ignore rollback errors in failure path.
    }
    try {
      await db.pool.end();
    } catch (_) {
      // Ignore close errors in failure path.
    }
    process.exit(1);
  }
})();
