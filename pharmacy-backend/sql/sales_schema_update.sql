-- ============================================================
-- SALES TABLE SCHEMA UPDATE
-- Adds new columns for invoice management and metadata
-- ============================================================

-- Add invoice_no column
ALTER TABLE sales ADD COLUMN invoice_no VARCHAR(50) AFTER sale_date;

-- Add reference column (for reference notes)
ALTER TABLE sales ADD COLUMN reference VARCHAR(255) AFTER invoice_no;

-- Add customer-related columns for better tracking
ALTER TABLE sales ADD COLUMN customer_name VARCHAR(255) AFTER reference;
ALTER TABLE sales ADD COLUMN customer_tin VARCHAR(50) AFTER customer_name;

-- Create index on invoice_no for quick lookups
CREATE INDEX idx_sales_invoice_no ON sales(invoice_no);

-- Create index on customer_tin for reports
CREATE INDEX idx_sales_customer_tin ON sales(customer_tin);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify the schema update:
-- SELECT * FROM sales LIMIT 1;
-- SHOW COLUMNS FROM sales;
