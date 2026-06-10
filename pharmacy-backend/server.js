require("dotenv").config();
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
  "https://express-pharmaceutical-wholesale.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost and the deployed Vercel frontend
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`🛑 CORS Blocked Origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

(async () => {
  try {
    await ensureSalesTable();

    app.listen(PORT, () => {
      console.log(`💊 Pharmacy Backend is Running on Port ${PORT}`);
    });
  } catch (err) {
    console.error(
      "❌ Failed to initialize PostgreSQL sales schema:",
      err
    );
    process.exit(1);
  }
})();