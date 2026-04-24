const db = require("../config/db");
const { createAuthToken } = require("../utils/authToken");

const hasColumn = async (tableName, columnName) => {
  const [rows] = await db.execute(
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

  await db.execute(
    `
      INSERT IGNORE INTO users (username, password_hash, role)
      VALUES
        ('owner', SHA2('admin123', 256), 'admin'),
        ('staff', SHA2('staff123', 256), 'staff'),
        ('staff_member', SHA2('staff123', 256), 'staff')
    `,
  );

  await db.execute(
    `
      UPDATE users
      SET password_hash = SHA2('staff123', 256), role = 'staff'
      WHERE username IN ('staff', 'staff_member')
        AND (password_hash = '' OR password_hash IS NULL)
    `,
  );
};

exports.login = async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "username and password are required." });
  }

  try {
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
    return res.status(500).json({ error: error.message });
  }
};