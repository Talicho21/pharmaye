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
  ('owner', SHA2('admin123', 256), 'admin'),
  ('staff', SHA2('staff123', 256), 'staff'),
  ('staff_member', SHA2('staff123', 256), 'staff');

UPDATE users
SET password_hash = SHA2('staff123', 256), role = 'staff'
WHERE username IN ('staff', 'staff_member')
  AND (password_hash = '' OR password_hash IS NULL);