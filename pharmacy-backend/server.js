require("dotenv").config();
const express = require("express");
const cors = require("cors");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authRoutes = require("./routes/authRoutes");
const { ensureSalesTable } = require("./utils/salesSchema");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows reading req.body


// Routes
app.use("/api/auth", authRoutes);
app.use("/api", inventoryRoutes);

const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    await ensureSalesTable();
    app.listen(PORT, () => {
      console.log(`💊 Pharmacy Backend is Running on Port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to initialize PostgreSQL sales schema:", err);
    process.exit(1);
  }
})();