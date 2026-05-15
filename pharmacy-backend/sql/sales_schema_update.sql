-- ============================================================
-- SALES TABLE SCHEMA UPDATE
-- Adds new columns for invoice management and metadata
-- ============================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50) NOT NULL DEFAULT '' AFTER sale_date;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference VARCHAR(255) NOT NULL DEFAULT '' AFTER invoice_no;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) NOT NULL DEFAULT '' AFTER reference;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_tin VARCHAR(50) NOT NULL DEFAULT '' AFTER customer_name;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_sno VARCHAR(50) NOT NULL DEFAULT '' AFTER customer_tin;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method ENUM('cash', 'credit') NOT NULL DEFAULT 'cash' AFTER customer_sno;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_no ON sales(invoice_no);

CREATE INDEX IF NOT EXISTS idx_sales_customer_tin ON sales(customer_tin);
CREATE INDEX IF NOT EXISTS idx_sales_customer_sno ON sales(customer_sno);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the schema update:
-- SELECT * FROM sales LIMIT 1;
-- SHOW COLUMNS FROM sales;
