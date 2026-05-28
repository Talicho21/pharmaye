const db = require("../config/db");

const hasColumn = async (tableName, columnName) => {
  const result = await db.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = CURRENT_SCHEMA()
        AND table_name = $1
        AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return result.rows.length > 0;
};

const hasIndex = async (tableName, indexName) => {
  const result = await db.query(
    `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = CURRENT_SCHEMA()
        AND tablename = $1
        AND indexname = $2
      LIMIT 1
    `,
    [tableName, indexName],
  );

  return result.rows.length > 0;
};

const ensurePriceColumn = async () => {
  if (!(await hasColumn("batches", "price_per_unit"))) {
    await db.query(
      `ALTER TABLE batches ADD COLUMN price_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0`,
    );
  }
};

const ensureSalesTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL DEFAULT 0,
      medicine_id INTEGER NOT NULL DEFAULT 0,
      batch_id INTEGER NOT NULL,
      medicine_name VARCHAR(255) NOT NULL DEFAULT '',
      quantity_sold INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      seller_name VARCHAR(255) NOT NULL DEFAULT '',
      receiver_name VARCHAR(255) NOT NULL DEFAULT '',
      sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      invoice_no VARCHAR(50) NOT NULL DEFAULT '',
      reference VARCHAR(255) NOT NULL DEFAULT '',
      customer_name VARCHAR(255) NOT NULL DEFAULT '',
      customer_tin VARCHAR(50) NOT NULL DEFAULT '',
      customer_sno VARCHAR(50) NOT NULL DEFAULT '',
      payment_method VARCHAR(16) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit'))
    )
  `);

  const requiredColumns = [
    ["user_id", `ALTER TABLE sales ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0`],
    ["medicine_id", `ALTER TABLE sales ADD COLUMN medicine_id INTEGER NOT NULL DEFAULT 0`],
    ["batch_id", `ALTER TABLE sales ADD COLUMN batch_id INTEGER NOT NULL DEFAULT 0`],
    ["medicine_name", `ALTER TABLE sales ADD COLUMN medicine_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["quantity_sold", `ALTER TABLE sales ADD COLUMN quantity_sold INTEGER NOT NULL DEFAULT 0`],
    ["unit_price", `ALTER TABLE sales ADD COLUMN unit_price NUMERIC(10,2) NOT NULL DEFAULT 0`],
    ["total_price", `ALTER TABLE sales ADD COLUMN total_price NUMERIC(12,2) NOT NULL DEFAULT 0`],
    ["seller_name", `ALTER TABLE sales ADD COLUMN seller_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["receiver_name", `ALTER TABLE sales ADD COLUMN receiver_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["sale_date", `ALTER TABLE sales ADD COLUMN sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`],
    ["invoice_no", `ALTER TABLE sales ADD COLUMN invoice_no VARCHAR(50) NOT NULL DEFAULT ''`],
    ["reference", `ALTER TABLE sales ADD COLUMN reference VARCHAR(255) NOT NULL DEFAULT ''`],
    ["customer_name", `ALTER TABLE sales ADD COLUMN customer_name VARCHAR(255) NOT NULL DEFAULT ''`],
    ["customer_tin", `ALTER TABLE sales ADD COLUMN customer_tin VARCHAR(50) NOT NULL DEFAULT ''`],
    ["customer_sno", `ALTER TABLE sales ADD COLUMN customer_sno VARCHAR(50) NOT NULL DEFAULT ''`],
    ["payment_method", `ALTER TABLE sales ADD COLUMN payment_method VARCHAR(16) NOT NULL DEFAULT 'cash'`],
  ];

  for (const [columnName, alterStatement] of requiredColumns) {
    if (!(await hasColumn("sales", columnName))) {
      await db.query(alterStatement);
    }
  }

  if (!(await hasIndex("sales", "idx_sales_sale_date"))) {
    await db.query(`CREATE INDEX idx_sales_sale_date ON sales(sale_date)`);
  }

  if (!(await hasIndex("sales", "idx_sales_invoice_no"))) {
    await db.query(`CREATE INDEX idx_sales_invoice_no ON sales(invoice_no)`);
  }

  if (!(await hasIndex("sales", "idx_sales_customer_tin"))) {
    await db.query(`CREATE INDEX idx_sales_customer_tin ON sales(customer_tin)`);
  }

  if (!(await hasIndex("sales", "idx_sales_customer_sno"))) {
    await db.query(`CREATE INDEX idx_sales_customer_sno ON sales(customer_sno)`);
  }
};

module.exports = {
  ensurePriceColumn,
  ensureSalesTable,
};