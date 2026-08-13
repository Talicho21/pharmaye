require("dotenv").config();
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const express = require("express");
const cors = require("cors");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authRoutes = require("./routes/authRoutes");
const { ensureSalesTable } = require("./utils/salesSchema");

const app = express();

// ==========================================
// PRODUCTION CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://express-pharmaceutical-wholesale.vercel.app",
];

const isLoopbackOrigin = (origin) => {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  const normalizedOrigin = origin.trim().toLowerCase();
  return /^(https?:\/\/)(localhost|127\.0\.0\.1|::1)(?::\d+)?$/i.test(
    normalizedOrigin,
  );
};

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost, loopback dev origins, and the deployed Vercel frontend
      if (allowedOrigins.includes(origin) || isLoopbackOrigin(origin)) {
        return callback(null, true);
      }

      console.error(`🛑 CORS Blocked Origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept-Encoding"],
  })
);

app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", inventoryRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Pharmacy Backend Running",
  });
});

const PORT = Number(process.env.PORT || 5000);
const PING_INTERVAL_MINUTES = 14;
const PING_ENDPOINT = process.env.HEALTH_PING_URL || `http://localhost:${PORT}/`;

async function startServer() {
  try {
    await ensureSalesTable();
    console.log("✅ PostgreSQL sales schema bootstrap completed.");
  } catch (err) {
    console.error("⚠️ PostgreSQL sales schema bootstrap failed during startup:", err?.message || err);
    console.warn("⚠️ Continuing to start the HTTP server without DB-ready schema initialization.");
  }

  app.listen(PORT, () => {
    console.log(`💊 Pharmacy Backend is Running on Port ${PORT}`);
  });

  setInterval(async () => {
    try {
      const response = await fetch(PING_ENDPOINT, { method: "GET" });
      console.log(`🔁 Self-ping ${PING_ENDPOINT} -> ${response.status}`);
    } catch (err) {
      console.warn("⚠️ Self-ping failed:", err?.message || err);
    }
  }, PING_INTERVAL_MINUTES * 60 * 1000);
}

(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error("❌ Failed to initialize server:", err);
    process.exit(1);
  }
})();