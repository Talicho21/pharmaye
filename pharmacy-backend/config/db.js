const mysql = require("mysql2");
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  // Changed from DB_PASS to DB_PASSWORD to match standard environment configurations
  password: process.env.DB_PASSWORD || process.env.DB_PASS, 
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 18354, // Ensures your backend hits Aiven's specific port
  waitForConnections: true,
  connectionLimit: 10,
  //  REQUIRED FOR AIVEN CLOUD DATABASES:
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool.promise();