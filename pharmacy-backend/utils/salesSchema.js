const db = require("../config/db");

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

const hasIndex = async (tableName, indexName) => {
  const [rows] = await db.execute(
    `
      SELECT 1
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND INDEX_NAME = ?
      LIMIT 1
    `,
    [tableName, indexName],
  );

  return rows.length > 0;
};

const ensurePriceColumn = async () => {
  if (!(await hasColumn("batches", "price_per_unit"))) {
    await db.execute(
      `ALTER TABLE batches ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0`,
    );
  }
};

const ensureSalesTable = async () => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id INT NOT NULL,
      medicine_name VARCHAR(255) NOT NULL DEFAULT '',
      quantity_sold INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
      seller_name VARCHAR(255) NOT NULL DEFAULT '',
      receiver_name VARCHAR(255) NOT NULL DEFAULT '',
      sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      invoice_no VARCHAR(50) NOT NULL DEFAULT '',
      reference VARCHAR(255) NOT NULL DEFAULT '',
      customer_name VARCHAR(255) NOT NULL DEFAULT '',
      customer_tin VARCHAR(50) NOT NULL DEFAULT '',
      customer_sno VARCHAR(50) NOT NULL DEFAULT '',
      payment_method ENUM('cash', 'credit') NOT NULL DEFAULT 'cash'
    )
  `);

  const requiredColumns = [
    ["medicine_name", `ALTER TABLE sales ADD COLUMN medicine_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["quantity_sold", `ALTER TABLE sales ADD COLUMN quantity_sold INT NOT NULL DEFAULT 0`],
    ["unit_price", `ALTER TABLE sales ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0`],
    ["total_price", `ALTER TABLE sales ADD COLUMN total_price DECIMAL(12,2) NOT NULL DEFAULT 0`],
    ["seller_name", `ALTER TABLE sales ADD COLUMN seller_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["receiver_name", `ALTER TABLE sales ADD COLUMN receiver_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["sale_date", `ALTER TABLE sales ADD COLUMN sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ["invoice_no", `ALTER TABLE sales ADD COLUMN invoice_no VARCHAR(50) NOT NULL DEFAULT ''`],
    ["reference", `ALTER TABLE sales ADD COLUMN reference VARCHAR(255) NOT NULL DEFAULT ''`],
    ["customer_name", `ALTER TABLE sales ADD COLUMN customer_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["customer_tin", `ALTER TABLE sales ADD COLUMN customer_tin VARCHAR(50) NOT NULL DEFAULT ''`],
    ["customer_sno", `ALTER TABLE sales ADD COLUMN customer_sno VARCHAR(50) NOT NULL DEFAULT ''`],
    ["payment_method", `ALTER TABLE sales ADD COLUMN payment_method ENUM('cash', 'credit') NOT NULL DEFAULT 'cash'`],
  ];

  for (const [columnName, alterStatement] of requiredColumns) {
    if (!(await hasColumn("sales", columnName))) {
      await db.execute(alterStatement);
    }
  }

  if (!(await hasIndex("sales", "idx_sales_sale_date"))) {
    await db.execute(`CREATE INDEX idx_sales_sale_date ON sales(sale_date)`);
  }

  if (!(await hasIndex("sales", "idx_sales_invoice_no"))) {
    await db.execute(`CREATE INDEX idx_sales_invoice_no ON sales(invoice_no)`);
  }

  if (!(await hasIndex("sales", "idx_sales_customer_tin"))) {
    await db.execute(`CREATE INDEX idx_sales_customer_tin ON sales(customer_tin)`);
  }

  if (!(await hasIndex("sales", "idx_sales_customer_sno"))) {
    await db.execute(`CREATE INDEX idx_sales_customer_sno ON sales(customer_sno)`);
  }
};

module.exports = {
  ensurePriceColumn,
  ensureSalesTable,
};