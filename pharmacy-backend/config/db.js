const mysql = require("mysql2");
require("dotenv").config();

const createPool = (config) => mysql.createPool(config).promise();

const basePoolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
};

const fallbackPoolConfig = {
  host: process.env.DB_FALLBACK_HOST || "127.0.0.1",
  user: process.env.DB_FALLBACK_USER || "root",
  password: process.env.DB_FALLBACK_PASSWORD || process.env.DB_PASS || "",
  database: process.env.DB_FALLBACK_NAME || "pharmacy_db",
  port: Number(process.env.DB_FALLBACK_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
};

const localFallbackConfigs = [
  fallbackPoolConfig,
  {
    host: "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pharmacy_db",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  },
  {
    host: "127.0.0.1",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: "pharmacy_db",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  },
  {
    host: "127.0.0.1",
    user: "root",
    password: process.env.DB_PASSWORD || process.env.DB_PASS || "",
    database: "pharmacy_db",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  },
  {
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "pharmacy_db",
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
  },
];

let activePool = createPool(basePoolConfig);
let activePoolLabel = "primary";

const testConnection = async (candidatePool, label) => {
  const connection = await candidatePool.getConnection();
  connection.release();
  console.log(`MySQL Connected Successfully (${label})`);
};

const activateFallbackPool = () => {
  activePoolLabel = "fallback";
};

const tryLocalFallbacks = async () => {
  for (const [index, config] of localFallbackConfigs.entries()) {
    const candidatePool = createPool(config);

    try {
      await testConnection(candidatePool, `fallback-${index + 1}`);
      activePool = candidatePool;
      return true;
    } catch (fallbackErr) {
      console.log(`Fallback database connection failed (${index + 1})`);
      console.log(fallbackErr);
    }
  }

  return false;
};

const promisePool = {
  query: (...args) => activePool.query(...args),
  execute: (...args) => activePool.execute(...args),
  getConnection: (...args) => activePool.getConnection(...args),
  end: (...args) => activePool.end(...args),
};

(async () => {
  try {
    await testConnection(activePool, activePoolLabel);
  } catch (err) {
    console.log("Primary database connection failed");
    console.log(err);

    try {
      activateFallbackPool();

      const fallbackConnected = await tryLocalFallbacks();
      if (fallbackConnected) {
        activePoolLabel = "fallback";
        console.log("Using fallback local MySQL configuration");
      }
    } catch (fallbackErr) {
      console.log("Fallback database connection failed");
      console.log(fallbackErr);
    }
  }
})();

module.exports = promisePool;