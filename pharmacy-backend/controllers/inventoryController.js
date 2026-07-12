// backend/controllers/inventoryController.js
const db = require("../config/db");

const isDatabaseUnavailableError = (error) => {
  const message = String(error?.message || error || "").toLowerCase();
  return [
    "getaddrinfo enotfound",
    "connection terminated unexpectedly",
    "connection terminated due to connection timeout",
    "connection timeout",
    "connection refused",
    "connection error",
    "relation \"inventory\" does not exist",
    "relation \"categories\" does not exist",
  ].some((needle) => message.includes(needle));
};

// 1. Get complete inventory with joined category names
exports.getInventory = async (req, res) => {
  const rawSearch = String(req.query.search ?? req.query.q ?? "").trim();
  const rawCategory = String(req.query.category ?? "all").trim().toLowerCase();
  const page = Math.max(Number.parseInt(String(req.query.page || "1"), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(req.query.pageSize || "200"), 10) || 200, 1), 5000);
  const offset = (page - 1) * pageSize;

  const whereClauses = [];
  const params = [];

  if (rawSearch) {
    params.push(`%${rawSearch.toLowerCase()}%`);
    whereClauses.push(
      `(LOWER(i.name) LIKE $${params.length} OR LOWER(i.batch_number) LIKE $${params.length})`,
    );
  }

  if (rawCategory && rawCategory !== "all") {
    params.push(rawCategory);
    whereClauses.push(
      `LOWER(COALESCE(c.category_name, 'Uncategorized')) = $${params.length}`,
    );
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const queryText = `
    SELECT i.id, i.name, i.batch_number, i.quantity, i.expiry_date, i.price_per_unit, i.unit, i.initial_batch_quantity,
           c.id AS category_id, c.category_name
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.id
    ${whereSql}
    ORDER BY i.name ASC, i.expiry_date ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  try {
    const result = await db.query(queryText, params);

    const countQuery = `
      SELECT COUNT(*) AS total_count
      FROM inventory i
      LEFT JOIN categories c ON i.category_id = c.id
      ${whereSql}
    `;
    const countResult = await db.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0]?.total_count ?? "0", 10);

    return res.status(200).json({
      page,
      pageSize,
      totalRecords,
      items: result.rows,
    });
  } catch (err) {
    console.error("Postgres getInventory Error:", err);

    if (isDatabaseUnavailableError(err)) {
      return res.status(200).json({
        page,
        pageSize,
        totalRecords: 0,
        items: [],
      });
    }

    return res.status(500).json({ message: "Failed to retrieve inventory records." });
  }
};

// 2. Search inventory items dynamically
exports.searchInventory = async (req, res) => {
  const searchSource = String(req.query.q ?? req.query.query ?? "").trim();
  if (!searchSource) {
    return res.status(200).json({ success: true, results: [] });
  }

  const searchTerm = `%${searchSource.toLowerCase()}%`;
  const queryText = `
    SELECT i.id,
           i.name,
           i.batch_number,
           i.quantity,
           i.expiry_date,
           i.price_per_unit,
           i.unit AS unit,
           i.category_id,
           c.category_name
    FROM inventory i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE LOWER(i.name) LIKE $1 OR LOWER(i.batch_number) LIKE $1
    ORDER BY i.name ASC
    LIMIT 25
  `;
  try {
    const result = await db.query(queryText, [searchTerm]);
    return res.status(200).json({ success: true, results: result.rows });
  } catch (err) {
    console.error("Postgres searchInventory Error:", err);

    if (isDatabaseUnavailableError(err)) {
      return res.status(200).json({ success: true, results: [] });
    }

    return res.status(500).json({ message: "Error searching inventory records." });
  }
};

// 3. Get all available product categories
exports.getCategories = async (req, res) => {
  try {
    const result = await db.query("SELECT id, category_name FROM categories ORDER BY category_name ASC");
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Postgres getCategories Error:", err);

    if (isDatabaseUnavailableError(err)) {
      return res.status(200).json([]);
    }

    return res.status(500).json({ message: "Failed to retrieve category items." });
  }
};

// 4. Create a brand new medical category
exports.createCategory = async (req, res) => {
  const { category_name } = req.body;
  if (!category_name || !category_name.trim()) {
    return res.status(400).json({ message: "Category name is strictly required." });
  }

  try {
    const checkExist = await db.query("SELECT id FROM categories WHERE LOWER(category_name) = LOWER($1)", [category_name.trim()]);
    if (checkExist.rows.length > 0) {
      return res.status(400).json({ message: "This product category already exists." });
    }

    const insertResult = await db.query(
      "INSERT INTO categories (category_name) VALUES ($1) RETURNING id, category_name",
      [category_name.trim()]
    );
    return res.status(201).json(insertResult.rows[0]);
  } catch (err) {
    console.error("Postgres createCategory Error:", err);
    return res.status(500).json({ message: "Could not create new pharmaceutical category." });
  }
};

// 5. Stock-in incoming medicine batches
exports.stockIn = async (req, res) => {
  const {
    name,
    medicine_name,
    product_name,
    category_id,
    category_name,
    new_category_name,
    batch_number,
    batch,
    quantity,
    qty,
    expiry_date,
    expiry,
    price_per_unit,
    price,
    unit,
  } = req.body;

  const resolvedName = [name, medicine_name, product_name].find(
    (value) => typeof value === "string" && value.trim(),
  )?.trim();
  const resolvedBatchNumber = [batch_number, batch].find(
    (value) => typeof value === "string" && value.trim(),
  )?.trim();
  const resolvedExpiryDate = [expiry_date, expiry].find(
    (value) => typeof value === "string" && value.trim(),
  )?.trim();
  const resolvedQuantity = Number.parseInt(String(quantity ?? qty ?? ""), 10);
  const resolvedPrice = Number.parseFloat(String(price_per_unit ?? price ?? ""));
  const resolvedUnit = [unit].find((value) => typeof value === "string" && value.trim())?.trim() || "";
  const resolvedCategoryName = [category_name, new_category_name].find(
    (value) => typeof value === "string" && value.trim(),
  )?.trim();

  if (!resolvedName || !resolvedBatchNumber || !resolvedExpiryDate) {
    return res.status(400).json({
      message:
        "Medicine name, batch number, and expiry date are required to add stock.",
    });
  }

  if (!Number.isFinite(resolvedQuantity) || resolvedQuantity <= 0) {
    return res.status(400).json({ message: "Quantity must be a positive whole number." });
  }

  if (!Number.isFinite(resolvedPrice) || resolvedPrice < 0) {
    return res.status(400).json({ message: "Price per unit must be a valid number." });
  }

  try {
    const numericCategoryId = Number.parseInt(String(category_id ?? ""), 10);
    let resolvedCategoryId = Number.isFinite(numericCategoryId) ? numericCategoryId : null;

    if (!resolvedCategoryId && resolvedCategoryName) {
      const existingCategory = await db.query(
        "SELECT id FROM categories WHERE LOWER(category_name) = LOWER($1)",
        [resolvedCategoryName],
      );

      if (existingCategory.rows.length > 0) {
        resolvedCategoryId = existingCategory.rows[0].id;
      } else {
        const createdCategory = await db.query(
          "INSERT INTO categories (category_name) VALUES ($1) RETURNING id",
          [resolvedCategoryName],
        );
        resolvedCategoryId = createdCategory.rows[0].id;
      }
    }

    const checkBatch = await db.query(
      "SELECT id FROM inventory WHERE batch_number = $1",
      [resolvedBatchNumber],
    );

    if (checkBatch.rows.length > 0) {
      return res.status(400).json({ message: "A batch with this registration number already exists." });
    }

    const insertText = `
      INSERT INTO inventory (name, category_id, batch_number, quantity, initial_batch_quantity, expiry_date, price_per_unit, unit)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7)
      RETURNING id
    `;
    await db.query(insertText, [
      resolvedName,
      resolvedCategoryId,
      resolvedBatchNumber,
      resolvedQuantity,
      resolvedExpiryDate,
      resolvedPrice,
      resolvedUnit,
    ]);
    return res.status(201).json({ message: "Inventory stock batch added successfully." });
  } catch (err) {
    console.error("Postgres stockIn Error:", err);
    return res.status(500).json({ message: "Failed to register incoming pharmaceutical batch." });
  }
};

// 6. Dispense a single transaction item
exports.sellMedicine = async (req, res) => {
  if (!req.auth?.id) {
    return res.status(401).json({ message: "Authentication required to record a sale." });
  }

  const {
    batch_id,
    quantity_sold,
    seller_name,
    receiver_name,
    invoice_no = "",
    reference = "",
    customer_name = "",
    customer_tin = "",
    customer_sno = "",
    payment_method = "cash",
  } = req.body;
  const parsedQty = parseInt(quantity_sold, 10);

  try {
    await db.query("BEGIN");

    const itemLookup = await db.query("SELECT quantity, price_per_unit, name, unit FROM inventory WHERE id = $1 FOR UPDATE", [batch_id]);
    if (itemLookup.rows.length === 0) throw new Error("Batch instance not found.");

    const item = itemLookup.rows[0];
    if (item.quantity < parsedQty) throw new Error("Requested transaction count exceeds physical shelf availability.");

    const totalPrice = parsedQty * parseFloat(item.price_per_unit);

    // Ensure sales.medicine_id references a valid row in medicines.
    const medicineUpsert = await db.query(
      `
        INSERT INTO medicines (name, category_id, price, stock)
        VALUES ($1, NULL, $2, 0)
        ON CONFLICT (name)
        DO UPDATE SET
          price = CASE
            WHEN medicines.price IS NULL OR medicines.price = 0 THEN EXCLUDED.price
            ELSE medicines.price
          END
        RETURNING id
      `,
      [item.name || "", item.price_per_unit],
    );
    const resolvedMedicineId = Number(medicineUpsert.rows[0]?.id || 0);

    if (!Number.isInteger(resolvedMedicineId) || resolvedMedicineId <= 0) {
      throw new Error("Unable to resolve medicine reference for sale log entry.");
    }

    await db.query("UPDATE inventory SET quantity = quantity - $1 WHERE id = $2", [parsedQty, batch_id]);

    const logInsert = `
      INSERT INTO sales (
        user_id,
        medicine_id,
        batch_id,
        medicine_name,
        quantity_sold,
        unit_price,
        total_price,
        seller_name,
        receiver_name,
        invoice_no,
        reference,
        customer_name,
        customer_tin,
        customer_sno,
        payment_method
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    await db.query(logInsert, [
      Number(req.auth.id),
      resolvedMedicineId,
      batch_id,
      item.name || "",
      parsedQty,
      item.price_per_unit,
      totalPrice,
      seller_name || "System",
      receiver_name || "General",
      invoice_no,
      reference,
      customer_name,
      customer_tin,
      customer_sno,
      payment_method,
    ]);

    await db.query("COMMIT");
    return res.status(200).json({ message: "Transaction completed successfully." });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("Postgres sellMedicine Error:", err.message);
    return res.status(400).json({ message: err.message || "Failed to finalize single sale log transaction." });
  }
};

// 7. Delete an item batch entirely
exports.deleteItem = async (req, res) => {
  const { id } = req.params;
  try {
    const deleteResult = await db.query("DELETE FROM inventory WHERE id = $1", [id]);
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: "Target database registry row item does not exist." });
    }
    return res.status(200).json({ message: "Item purged from inventory array successfully." });
  } catch (err) {
    console.error("Postgres deleteItem Error:", err);
    return res.status(500).json({ message: "Error purging stock entity record." });
  }
};

// 8. Generate range analytical report for Recharts
exports.getSalesReport = async (req, res) => {
  const { range } = req.query; // '24h', 'monthly', '6months', 'yearly'
  
  let intervalExpression = "1 day";
  if (range === "monthly") intervalExpression = "30 days";
  else if (range === "6months") intervalExpression = "6 months";
  else if (range === "yearly") intervalExpression = "1 year";

  try {
    const overviewQuery = `
      SELECT COALESCE(SUM(total_price), 0) AS total_revenue, COALESCE(SUM(quantity_sold), 0) AS total_items_sold
      FROM sales
      WHERE sale_date >= NOW() - INTERVAL '${intervalExpression}'
    `;
    const overviewRes = await db.query(overviewQuery);

    const topSellingQuery = `
      SELECT COALESCE(s.medicine_name, i.name, 'Purged Item') AS medicine_name,
             SUM(s.quantity_sold) AS quantity_sold,
             SUM(s.total_price) AS total_revenue
      FROM sales s
      LEFT JOIN inventory i ON s.batch_id = i.id
      WHERE s.sale_date >= NOW() - INTERVAL '${intervalExpression}'
      GROUP BY COALESCE(s.medicine_name, i.name, 'Purged Item')
      ORDER BY quantity_sold DESC
      LIMIT 5
    `;
    const topSellingRes = await db.query(topSellingQuery);

    return res.status(200).json({
      range,
      totalRevenue: parseFloat(overviewRes.rows[0].total_revenue),
      totalItemsSold: parseInt(overviewRes.rows[0].total_items_sold, 10),
      topSellingMedicines: topSellingRes.rows.map(row => ({
        medicineName: row.medicine_name,
        quantitySold: parseInt(row.quantity_sold, 10),
        totalRevenue: parseFloat(row.total_revenue)
      }))
    });
  } catch (err) {
    console.error("Postgres getSalesReport Error:", err);
    return res.status(500).json({ message: "Failed parsing statistical tracking timeline arrays." });
  }
};

// 9. Fetch comprehensive log ledger between specific calendar filters
exports.getSalesLog = async (req, res) => {
  const { startDate, endDate, search, page: rawPage, pageSize: rawPageSize } = req.query;

  const safeEndDate = String(endDate || new Date().toISOString().slice(0, 10));
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 29);
  const safeStartDate = String(startDate || defaultStart.toISOString().slice(0, 10));
  const page = Math.max(Number.parseInt(String(rawPage || "1"), 10) || 1, 1);
  const pageSize = Math.min(Math.max(Number.parseInt(String(rawPageSize || "10"), 10) || 10, 1), 100);
  const offset = (page - 1) * pageSize;
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const params = [safeStartDate, safeEndDate];
  let searchClause = "";

  if (normalizedSearch) {
    params.push(`%${normalizedSearch}%`);
    searchClause = `
      AND (
        CAST(s.id AS TEXT) ILIKE $${params.length}
        OR LOWER(s.medicine_name) LIKE $${params.length}
        OR LOWER(i.name) LIKE $${params.length}
        OR LOWER(c.category_name) LIKE $${params.length}
        OR LOWER(s.seller_name) LIKE $${params.length}
        OR LOWER(s.receiver_name) LIKE $${params.length}
      )
    `;
  }

  try {
    const queryText = `
      SELECT s.id,
             s.batch_id,
             s.sale_date,
             s.quantity_sold,
             s.unit_price,
             s.total_price,
             s.seller_name,
             s.receiver_name,
             COALESCE(s.medicine_name, i.name, 'Purged Item') AS medicine_name,
             COALESCE(i.unit, '') AS unit,
             COALESCE(c.category_name, 'General') AS category,
             COUNT(*) OVER() AS total_count
      FROM sales s
      LEFT JOIN inventory i ON s.batch_id = i.id
      LEFT JOIN categories c ON i.category_id = c.id
      WHERE s.sale_date::date >= $1::date
        AND s.sale_date::date <= $2::date
        ${searchClause}
      ORDER BY s.sale_date DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `;

    const result = await db.query(queryText, params);
    const totalRecords = result.rows[0]?.total_count
      ? parseInt(result.rows[0].total_count, 10)
      : 0;

    return res.status(200).json({
      startDate: safeStartDate,
      endDate: safeEndDate,
      page,
      pageSize,
      totalRecords,
      records: result.rows.map((row) => ({
        id: row.id,
        batchId: row.batch_id,
        saleDate: row.sale_date,
        medicineName: row.medicine_name || "Purged Item",
        unit: row.unit || "",
        category: row.category || "General",
        quantitySold: parseInt(row.quantity_sold, 10),
        unitPrice: parseFloat(row.unit_price),
        totalPrice: parseFloat(row.total_price),
        sellerName: row.seller_name,
        receiverName: row.receiver_name,
      })),
    });
  } catch (err) {
    console.error("Postgres getSalesLog Error:", err);
    return res.status(500).json({ message: "Failed to fetch sales log ledger records." });
  }
};

// 10. Pull inactive stock products metric indicators
exports.getInactiveSales = async (req, res) => {
  const thresholdMonths = parseInt(req.query.thresholdMonths || "3", 10);
  
  try {
    const medicineInactivityQuery = `
      SELECT i.id AS medicine_id, i.name AS medicine_name, c.category_name,
             MAX(s.sale_date) AS last_sale_date,
             EXTRACT(DAY FROM NOW() - MAX(s.sale_date)) AS days_since_last_sale,
             COUNT(s.id) AS total_sales,
             COALESCE(SUM(s.quantity_sold), 0) AS total_quantity_sold
      FROM inventory i
      LEFT JOIN categories c ON i.category_id = c.id
      LEFT JOIN sales s ON s.batch_id = i.id
      GROUP BY i.id, i.name, c.category_name
      HAVING MAX(s.sale_date) IS NULL OR MAX(s.sale_date) < NOW() - INTERVAL '${thresholdMonths} months'
      ORDER BY days_since_last_sale DESC NULLS FIRST
    `;
    
    const medResult = await db.query(medicineInactivityQuery);

    return res.status(200).json({
      thresholdMonths,
      medicines: medResult.rows.map(row => ({
        medicineId: row.medicine_id,
        medicineName: row.medicine_name,
        categoryName: row.category_name || "General",
        lastSaleDate: row.last_sale_date,
        daysSinceLastSale: row.days_since_last_sale !== null ? parseInt(row.days_since_last_sale, 10) : null,
        totalSales: parseInt(row.total_sales, 10),
        totalQuantitySold: parseInt(row.total_quantity_sold, 10)
      })),
      categories: [] // Base compatibility node wrapper
    });
  } catch (err) {
    console.error("Postgres getInactiveSales Error:", err);
    return res.status(500).json({ message: "Failed computing inactive stock metrics parameters." });
  }
};

// 11. Complete structural reset purge action sequence
exports.resetSalesHistory = async (req, res) => {
  try {
    const clearResult = await db.query("TRUNCATE TABLE sales RESTART IDENTITY CASCADE");
    return res.status(200).json({ 
      message: "Sales transactional history tracking metrics successfully wiped.",
      deletedRows: clearResult.rowCount || 0
    });
  } catch (err) {
    console.error("Postgres resetSalesHistory Error:", err);
    return res.status(500).json({ message: "Failed to purge operational audit tracking metrics datasets." });
  }
};

// 12. Inline edit for inventory items
exports.updateStockInline = async (req, res) => {
  const { id } = req.params;
  const { name, batchNumber, expiryDate, quantity, unit, price } = req.body;

  // Validate required fields
  if (!id || !Number.isFinite(Number.parseInt(id, 10))) {
    return res.status(400).json({ message: "Valid inventory item ID is required." });
  }

  // Parse and validate input fields
  const resolvedName = name && String(name).trim() ? String(name).trim() : null;
  const resolvedBatchNumber = batchNumber && String(batchNumber).trim() ? String(batchNumber).trim() : null;
  const resolvedExpiryDate = expiryDate && String(expiryDate).trim() ? String(expiryDate).trim() : null;
  const resolvedQuantity = Number.isFinite(Number.parseInt(quantity, 10)) ? Number.parseInt(quantity, 10) : null;
  const resolvedPrice = Number.isFinite(Number.parseFloat(price)) ? Number.parseFloat(price) : null;
  const resolvedUnit = unit && String(unit).trim() ? String(unit).trim() : null;

  // Ensure at least one field is provided for update
  if (!resolvedName && !resolvedBatchNumber && !resolvedExpiryDate && resolvedQuantity === null && resolvedPrice === null && !resolvedUnit) {
    return res.status(400).json({ message: "At least one field must be provided for update." });
  }

  try {
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (resolvedName) {
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(resolvedName);
      paramCount++;
    }
    if (resolvedBatchNumber) {
      updateFields.push(`batch_number = $${paramCount}`);
      updateValues.push(resolvedBatchNumber);
      paramCount++;
    }
    if (resolvedExpiryDate) {
      updateFields.push(`expiry_date = $${paramCount}`);
      updateValues.push(resolvedExpiryDate);
      paramCount++;
    }
    if (resolvedQuantity !== null) {
      updateFields.push(`quantity = $${paramCount}`);
      updateValues.push(resolvedQuantity);
      paramCount++;
    }
    if (resolvedPrice !== null) {
      updateFields.push(`price_per_unit = $${paramCount}`);
      updateValues.push(resolvedPrice);
      paramCount++;
    }
    if (resolvedUnit) {
      updateFields.push(`unit = $${paramCount}`);
      updateValues.push(resolvedUnit);
      paramCount++;
    }

    // Add the ID as the final parameter
    updateValues.push(id);

    const updateQuery = `
      UPDATE inventory
      SET ${updateFields.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, batch_number, expiry_date, quantity, unit, price_per_unit
    `;

    const result = await db.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Inventory item not found." });
    }

    const updatedMedicine = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      batchNumber: result.rows[0].batch_number,
      expiryDate: result.rows[0].expiry_date,
      quantity: result.rows[0].quantity,
      unit: result.rows[0].unit,
      price: parseFloat(result.rows[0].price_per_unit)
    };

    return res.status(200).json({
      success: true,
      message: "Inventory item updated successfully.",
      data: updatedMedicine
    });
  } catch (err) {
    console.error("Postgres updateStockInline Error:", err);
    return res.status(500).json({ message: "Failed to update inventory item." });
  }
};
