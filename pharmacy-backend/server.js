require("dotenv").config();
const express = require("express");
const cors = require("cors");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authRoutes = require("./routes/authRoutes");
const { ensureSalesTable } = require("./utils/salesSchema");

const app = express();

// ==========================================
// 🛠️ PRODUCTION CORS CONFIGURATION
// ==========================================
const allowedOrigins = [
  "http://localhost:3000", // Local frontend development
  "https://express-pharmaceutical-wholesale-nl.vercel.app/" // ⚠️ REPLACE THIS with your actual live Vercel URL
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests, or server-to-server)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.error(`🛑 CORS Blocked Origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // Allows cookies and authorization headers if needed
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Body Parsing Middleware
app.use(express.json()); // Allows reading req.body

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", inventoryRoutes);

// Dynamic Port Binding for Cloud Providers (like Render)
const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    // Check and create schema tables in PostgreSQL
    await ensureSalesTable();
    
    app.listen(PORT, () => {
      console.log(`💊 Pharmacy Backend is Running on Port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize PostgreSQL sales schema:", err);
    process.exit(1);
  }
})();