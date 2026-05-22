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

    const [rows] = await connection.query(`SELECT id, username, role, created_at FROM users ORDER BY id`);
    console.log('Current users in DB:');
    for (const r of rows) {
      console.log(`${r.id}\t${r.username}\t${r.role}\t${r.created_at}`);
    }

    await connection.end();
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err);
    process.exit(1);
  }
})();