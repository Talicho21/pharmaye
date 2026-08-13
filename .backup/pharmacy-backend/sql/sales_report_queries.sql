-- Last 24 hours summary
SELECT
  COALESCE(SUM(total_price), 0) AS totalRevenue,
  COALESCE(SUM(quantity_sold), 0) AS totalItemsSold
FROM sales
WHERE sale_date > NOW() - INTERVAL 24 HOUR;

-- Monthly summary (last 1 month)
SELECT
  COALESCE(SUM(total_price), 0) AS totalRevenue,
  COALESCE(SUM(quantity_sold), 0) AS totalItemsSold
FROM sales
WHERE sale_date > NOW() - INTERVAL 1 MONTH;

-- 6 months summary
SELECT
  COALESCE(SUM(total_price), 0) AS totalRevenue,
  COALESCE(SUM(quantity_sold), 0) AS totalItemsSold
FROM sales
WHERE sale_date > NOW() - INTERVAL 6 MONTH;

-- Yearly summary
SELECT
  COALESCE(SUM(total_price), 0) AS totalRevenue,
  COALESCE(SUM(quantity_sold), 0) AS totalItemsSold
FROM sales
WHERE sale_date > NOW() - INTERVAL 1 YEAR;

-- Top-selling medicines for a selected interval (replace INTERVAL as needed)
SELECT
  medicine_name,
  COALESCE(SUM(quantity_sold), 0) AS quantitySold,
  COALESCE(SUM(total_price), 0) AS totalRevenue
FROM sales
WHERE sale_date > NOW() - INTERVAL 24 HOUR
GROUP BY medicine_name
ORDER BY quantitySold DESC, totalRevenue DESC
LIMIT 8;
