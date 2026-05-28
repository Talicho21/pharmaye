const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

// Public routes
router.post("/login", authController.login);
router.post("/register", authController.register);

// Protected route to fetch current authenticated user
router.get("/me", requireAuth, authController.me);

module.exports = router;