CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(120) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('admin','staff') NOT NULL DEFAULT 'staff';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash CHAR(64) NOT NULL;

INSERT IGNORE INTO users (username, password_hash, role)
VALUES
  ('eseruadmin', SHA2('eseru16', 256), 'admin'),
  ('expresstaff1', SHA2('express16', 256), 'staff'),
  ('testers12', SHA2('testersdev1', 256), 'admin');