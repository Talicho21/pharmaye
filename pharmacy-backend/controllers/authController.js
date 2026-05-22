const db = require("../config/db");
const { createAuthToken } = require("../utils/authToken");

// Helper function to check table schema structure
const hasColumn = async (tableName, columnName) => {
  // CRITICAL FIX: Changed from db.execute to db.query to allow information_schema reads on Aiven
  const [rows] = await db.query(
    `
      SELECT 1
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return rows.length > 0;
};

// Ensures the database table and structural constraints are initialized
const ensureUsersTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(120) NOT NULL UNIQUE,
      password_hash CHAR(64) NOT NULL,
      role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (!(await hasColumn("users", "password_hash"))) {
    await db.execute(`ALTER TABLE users ADD COLUMN password_hash CHAR(64) NOT NULL`);
  }

  if (!(await hasColumn("users", "role"))) {
    await db.execute(
      `ALTER TABLE users ADD COLUMN role ENUM('admin','staff') NOT NULL DEFAULT 'staff'`,
    );
  }

  // Uses SHA2 encryption matching your local schema standard hashing architecture
  await db.execute(
    `
      INSERT IGNORE INTO users (username, password_hash, role)
      VALUES
        ('eseruadmin', SHA2('eseru16', 256), 'admin'),
        ('expresstaff1', SHA2('express16', 256), 'staff'),
        ('testers12', SHA2('testersdev1', 256), 'admin')
    `,
  );
  // No legacy password updates required; seeding only the three requested users above.
};

// Main Authentication Controller Function
exports.login = async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "username and password are required." });
  }

  try {
    // Run structural integrity check against Aiven MySQL instance
    await ensureUsersTable();

    const passwordChecks = [];
    const params = [username];

    if (await hasColumn("users", "password_hash")) {
      passwordChecks.push("password_hash = SHA2(?, 256)");
      params.push(password);
    }

    if (await hasColumn("users", "password")) {
      passwordChecks.push("password = ?");
      params.push(password);
    }

    if (passwordChecks.length === 0) {
      return res.status(500).json({ message: "No supported password column found." });
    }

    // Dynamic query matching existing users rows securely
    const [rows] = await db.execute(
      `
        SELECT id, username, role
        FROM users
        WHERE username = ?
          AND (${passwordChecks.join(" OR ")})
        LIMIT 1
      `,
      params,
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const user = rows[0];
    const role = user.role === "admin" ? "admin" : "staff";

    // Build signed JWT authentication token
    const token = createAuthToken({
      userId: Number(user.id),
      username: user.username,
      role,
    });

    return res.status(200).json({
      token,
      user: {
        id: Number(user.id),
        username: user.username,
        role,
      },
    });
  } catch (error) {
    // Gracefully handles serverless function routing catches
    return res.status(500).json({ error: error.message });
  }
};