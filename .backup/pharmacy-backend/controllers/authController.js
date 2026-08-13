// backend/controllers/authController.js
const db = require("../config/db"); // Direct connection hook to your Supabase PostgreSQL pool
const bcrypt = require("bcrypt");
const { createAuthToken } = require("../utils/authToken");

const JWT_SECRET = process.env.JWT_SECRET || "your_ultimate_fallback_pharmacy_secret_key";

// 1. Authenticate System Session (User Login)
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required parameters." });
  }

  try {
    // Lookup user using standard PostgreSQL numbered parameter identifiers ($1)
    const userQueryText = "SELECT id, username, password, role FROM users WHERE LOWER(username) = LOWER($1)";
    const result = await db.query(userQueryText, [username.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid username or password credentials." });
    }

    const user = result.rows[0];

    // Evaluate password compliance against cryptographically secure blowfish cipher salt hashes
    const storedCredential = user.password;
    if (!storedCredential) {
      return res.status(401).json({ message: "Invalid username or password credentials." });
    }

    const looksLikeBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedCredential);
    const isMatch = looksLikeBcryptHash
      ? await bcrypt.compare(password, storedCredential)
      : password === storedCredential;
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid username or password credentials." });
    }

    // Build the structural state authentication payload token signatures
    const token = createAuthToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    return res.status(200).json({
      message: "Authentication handshake successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Postgres authController Login Error:", err);
    return res.status(500).json({ message: "Internal server authentication fault occurred." });
  }
};

// 2. Register New Staff / Admin Profile Record Instance
exports.register = async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Missing required identity enrollment parameters." });
  }

  const assignedRole = role === "admin" ? "admin" : "staff";

  try {
    // Prevent collision duplicates on unique identifiers
    const checkUserText = "SELECT id FROM users WHERE LOWER(username) = LOWER($1)";
    const checkResult = await db.query(checkUserText, [username.trim()]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ message: "This username profile registry string is already occupied." });
    }

    // Securely obscure plain text passwords 
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Write parameters into PostgreSQL returning newly assigned auto-generated serial row keys
    const insertUserText = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, username, role
    `;
    const insertResult = await db.query(insertUserText, [username.trim(), hashedPassword, assignedRole]);

    return res.status(201).json({
      message: "User profile successfully registered inside systems registry data tier.",
      user: insertResult.rows[0]
    });

  } catch (err) {
    console.error("Postgres authController Register Error:", err);
    return res.status(500).json({ message: "Database failure creating user account profile." });
  }
};

// Returns the current authenticated user (populated by requireAuth middleware)
exports.me = async (req, res) => {
  try {
    const auth = req.auth;
    if (!auth || !auth.id) return res.status(401).json({ message: "Not authenticated." });

    // Read latest user record from database to ensure up-to-date info
    const q = "SELECT id, username, role FROM users WHERE id = $1";
    const r = await db.query(q, [auth.id]);
    const user = r.rows[0];
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({ user });
  } catch (err) {
    console.error("Postgres authController me error:", err);
    return res.status(500).json({ message: "Unable to fetch authenticated user." });
  }
};