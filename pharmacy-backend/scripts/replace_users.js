const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || process.env.USER || 'root',
      password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'pharmacy',
      port: Number(process.env.DB_PORT || 3306),
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTable = `users_backup_${timestamp}`;

    console.log('Creating backup table:', backupTable);
    await connection.query(`CREATE TABLE IF NOT EXISTS \`${backupTable}\` AS SELECT * FROM users`);

    // Remove any users not in the keep list
    const keep = ['eseruadmin','expresstaff1','testers12'];
    console.log('Deleting users not in:', keep.join(','));
    await connection.query(
      `DELETE FROM users WHERE username NOT IN (${keep.map(() => '?').join(',')})`,
      keep,
    );

    // Insert or update the three requested users with SHA2 hashes
    console.log('Upserting requested users...');
    // Include `password` column because the existing schema may require it.
    await connection.query(
      `INSERT INTO users (username, password, password_hash, role)
       VALUES
         ('eseruadmin', '', SHA2(?,256), 'admin'),
         ('expresstaff1', '', SHA2(?,256), 'staff'),
         ('testers12', '', SHA2(?,256), 'admin')
       ON DUPLICATE KEY UPDATE password = VALUES(password), password_hash = VALUES(password_hash), role = VALUES(role)`,
      ['eseru16','express16','testersdev1'],
    );

    console.log('Done. Created backup table and applied changes.');
    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error applying user changes:', err);
    process.exit(1);
  }
})();
