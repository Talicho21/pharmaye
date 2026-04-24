const express = require("express");
const cors = require("cors");
const inventoryRoutes = require("./routes/inventoryRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Allows reading req.body

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", inventoryRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`💊 Pharmacy Backend is Running on Port ${PORT}`);
});