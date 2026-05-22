const mysql = require("mysql2");
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  // Support both DB_PASSWORD and DB_PASS for local and hosted setups.
  password: process.env.DB_PASSWORD || process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

// Use pool.promise() explicitly to handle asynchronous serverless cycles smoothly
const promisePool = pool.promise();
module.exports = promisePool;