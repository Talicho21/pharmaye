-- 1) Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
);

-- Optional seed data
INSERT IGNORE INTO categories (category_name)
VALUES ('Antibiotics'), ('Analgesics'), ('Antiseptics'), ('Vitamins');

-- 2) Add category_id to medicines table and foreign key
ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS category_id INT NULL,
  ADD INDEX IF NOT EXISTS idx_medicines_category_id (category_id),
  ADD CONSTRAINT fk_medicines_category
    FOREIGN KEY (category_id)
    REFERENCES categories(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- 3) Update AddMedicineBatch to accept p_category_id and attach category
DROP PROCEDURE IF EXISTS AddMedicineBatch;
DELIMITER $$
CREATE PROCEDURE AddMedicineBatch(
  IN p_medicine_id INT,
  IN p_medicine_name VARCHAR(255),
  IN p_batch_number VARCHAR(255),
  IN p_quantity INT,
  IN p_expiry_date DATE,
  IN p_price_per_unit DECIMAL(10,2),
  IN p_category_id INT
)
BEGIN
  INSERT INTO medicines (id, name, category_id)
  VALUES (p_medicine_id, p_medicine_name, p_category_id)
  ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    category_id = VALUES(category_id);

  INSERT INTO batches (medicine_id, batch_number, quantity, expiry_date, price_per_unit)
  VALUES (p_medicine_id, p_batch_number, p_quantity, p_expiry_date, p_price_per_unit)
  ON DUPLICATE KEY UPDATE
    quantity = quantity + VALUES(quantity),
    expiry_date = VALUES(expiry_date),
    price_per_unit = VALUES(price_per_unit);
END$$
DELIMITER ;
