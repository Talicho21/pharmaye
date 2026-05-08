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

const hasConstraint = async (tableName, constraintName) => {
    const [rows] = await db.execute(
        `
            SELECT 1
            FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND CONSTRAINT_NAME = ?
            LIMIT 1
        `,
        [tableName, constraintName],
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

const hasPriceColumn = async () => {
    const [rows] = await db.execute(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'batches' AND COLUMN_NAME = 'price_per_unit' LIMIT 1
    `);
    return rows.length > 0;
};

const ensurePriceColumn = async () => {
    const exists = await hasPriceColumn();
    if (!exists) {
        await db.execute(`ALTER TABLE batches ADD COLUMN price_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0`);
    }
};

const ensureCategoriesTable = async () => {
    await db.execute(`
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            category_name VARCHAR(100) NOT NULL UNIQUE
        )
    `);
};

const ensureMedicineCategoryColumn = async () => {
    if (!(await hasColumn("medicines", "category_id"))) {
        await db.execute(`ALTER TABLE medicines ADD COLUMN category_id INT NULL`);
    }

    if (!(await hasConstraint("medicines", "fk_medicines_category"))) {
        await db.execute(`
            ALTER TABLE medicines
            ADD CONSTRAINT fk_medicines_category
            FOREIGN KEY (category_id)
            REFERENCES categories(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
        `);
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
            seller_name VARCHAR(255) NOT NULL,
            receiver_name VARCHAR(255) NOT NULL,
            sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    if (!(await hasIndex("sales", "idx_sales_sale_date"))) {
        await db.execute(`CREATE INDEX idx_sales_sale_date ON sales(sale_date)`);
    }

    if (!(await hasColumn("sales", "medicine_name"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN medicine_name VARCHAR(255) NOT NULL DEFAULT ''`,
        );
    }

    if (!(await hasColumn("sales", "unit_price"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN unit_price DECIMAL(10,2) NOT NULL DEFAULT 0`,
        );
    }

    if (!(await hasColumn("sales", "total_price"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN total_price DECIMAL(12,2) NOT NULL DEFAULT 0`,
        );
    }

    if (!(await hasColumn("sales", "seller_name"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN seller_name VARCHAR(255) NOT NULL DEFAULT ''`,
        );
    }

    if (!(await hasColumn("sales", "receiver_name"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN receiver_name VARCHAR(255) NOT NULL DEFAULT ''`,
        );
    }

    if (!(await hasColumn("sales", "sale_date"))) {
        await db.execute(
            `ALTER TABLE sales ADD COLUMN sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        );
    } else {
        await db.execute(
            `ALTER TABLE sales MODIFY COLUMN sale_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
        );
    }

    if (await hasConstraint("sales", "sales_ibfk_1")) {
        await db.execute(`ALTER TABLE sales DROP FOREIGN KEY sales_ibfk_1`);
    }
};

const getIntervalByRange = (range) => {
    switch (range) {
        case "24h":
            return "24 HOUR";
        case "monthly":
            return "1 MONTH";
        case "6months":
            return "6 MONTH";
        case "yearly":
            return "1 YEAR";
        default:
            return "24 HOUR";
    }
};

exports.getInventory = async (_req, res) => {
    try {
        await ensureCategoriesTable();
        await ensureMedicineCategoryColumn();
        await ensurePriceColumn();

        const query = `
            SELECT
                b.id,
                m.name,
                m.category_id,
                c.category_name,
                b.batch_number,
                b.quantity,
                b.expiry_date,
                b.price_per_unit
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            LEFT JOIN categories c ON m.category_id = c.id
            WHERE b.quantity > 0
            ORDER BY b.quantity ASC
        `;

        const [rows] = await db.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.searchInventory = async (req, res) => {
    const query = String(req.query?.query || "").trim();

    if (!query) {
        return res.status(400).json({
            success: false,
            message: "query is required.",
        });
    }

    try {
        await ensureCategoriesTable();
        await ensureMedicineCategoryColumn();
        await ensurePriceColumn();

        const searchPattern = `%${query}%`;

        const [rows] = await db.execute(
            `
                SELECT
                    b.id AS batch_id,
                    m.id AS medicine_id,
                    m.name AS medicine_name,
                    b.batch_number,
                    b.quantity,
                    b.price_per_unit,
                    b.expiry_date,
                    c.category_name
                FROM batches b
                JOIN medicines m ON b.medicine_id = m.id
                LEFT JOIN categories c ON m.category_id = c.id
                WHERE b.quantity > 0
                  AND (
                    m.name LIKE ?
                    OR b.batch_number LIKE ?
                  )
                ORDER BY
                    CASE
                        WHEN m.name LIKE ? THEN 0
                        WHEN b.batch_number LIKE ? THEN 1
                        ELSE 2
                    END,
                    b.expiry_date ASC,
                    b.quantity DESC,
                    b.id DESC
                LIMIT 10
            `,
            [searchPattern, searchPattern, searchPattern, searchPattern],
        );

        return res.status(200).json({
            success: true,
            results: rows,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to search inventory.",
            error: error.message,
        });
    }
};

exports.getCategories = async (_req, res) => {
    try {
        await ensureCategoriesTable();
        const [rows] = await db.execute(
            `SELECT id, category_name FROM categories ORDER BY category_name ASC`,
        );
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createCategory = async (req, res) => {
    const categoryName = String(req.body?.category_name || "").trim();

    if (!categoryName) {
        return res.status(400).json({ message: "category_name is required." });
    }

    try {
        await ensureCategoriesTable();

        const [result] = await db.execute(
            `INSERT INTO categories (category_name) VALUES (?)`,
            [categoryName],
        );

        res.status(201).json({ id: result.insertId, category_name: categoryName });
    } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Category already exists." });
        }

        res.status(500).json({ error: error.message });
    }
};

exports.deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute("DELETE FROM batches WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.status(200).json({ message: "Deleted successfully via Procedure" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.sellMedicine = async (req, res) => {
    const { batch_id, quantity_sold, seller_name, receiver_name } = req.body;

    const safeSellerName = String(seller_name || "").trim();
    const safeReceiverName = String(receiver_name || "").trim();

    if (!safeSellerName || !safeReceiverName) {
        return res.status(400).json({ message: "Seller name and receiver name are required." });
    }

    const safeQuantitySold = Number(quantity_sold);

    if (!Number.isInteger(safeQuantitySold) || safeQuantitySold <= 0) {
        return res.status(400).json({ message: "Quantity sold must be a valid whole number greater than zero." });
    }

    try {
        await ensurePriceColumn();
        await ensureSalesTable();

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [batchRows] = await connection.execute(
                `
                    SELECT b.quantity, b.price_per_unit, m.name AS medicine_name
                    FROM batches b
                    JOIN medicines m ON b.medicine_id = m.id
                    WHERE b.id = ?
                    FOR UPDATE
                `,
                [batch_id],
            );

            if (!batchRows.length) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: "Batch not found." });
            }

            if (safeQuantitySold > batchRows[0].quantity) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ message: "Not enough stock available." });
            }

            const safeUnitPrice = Number(batchRows[0].price_per_unit) || 0;
            const safeTotalPrice = safeQuantitySold * safeUnitPrice;

            await connection.execute(
                "UPDATE batches SET quantity = quantity - ? WHERE id = ?",
                [safeQuantitySold, batch_id],
            );

            await connection.execute(
                `
                    INSERT INTO sales (batch_id, medicine_name, quantity_sold, unit_price, total_price, seller_name, receiver_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    batch_id,
                    batchRows[0].medicine_name,
                    safeQuantitySold,
                    safeUnitPrice,
                    safeTotalPrice,
                    safeSellerName,
                    safeReceiverName,
                ],
            );

            await connection.commit();
            connection.release();
            res.status(200).json({ message: "Success" });
        } catch (transactionError) {
            await connection.rollback();
            connection.release();
            throw transactionError;
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSalesReport = async (req, res) => {
    const range = String(req.query?.range || "24h").toLowerCase();
    const intervalExpression = getIntervalByRange(range);

    try {
        await ensureSalesTable();

        const [summaryRows] = await db.execute(
            `
                SELECT
                    COALESCE(SUM(total_price), 0) AS totalRevenue,
                    COALESCE(SUM(quantity_sold), 0) AS totalItemsSold
                FROM sales
                WHERE sale_date > NOW() - INTERVAL ${intervalExpression}
            `,
        );

        const [topRows] = await db.execute(
            `
                SELECT
                    medicine_name,
                    COALESCE(SUM(quantity_sold), 0) AS quantitySold,
                    COALESCE(SUM(total_price), 0) AS totalRevenue
                FROM sales
                WHERE sale_date > NOW() - INTERVAL ${intervalExpression}
                GROUP BY medicine_name
                ORDER BY quantitySold DESC, totalRevenue DESC
                LIMIT 8
            `,
        );

        res.status(200).json({
            range,
            totalRevenue: Number(summaryRows[0]?.totalRevenue || 0),
            totalItemsSold: Number(summaryRows[0]?.totalItemsSold || 0),
            topSellingMedicines: topRows.map((row) => ({
                medicineName: row.medicine_name,
                quantitySold: Number(row.quantitySold || 0),
                totalRevenue: Number(row.totalRevenue || 0),
            })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSalesLog = async (req, res) => {
    const today = new Date();
    const defaultEnd = today.toISOString().split("T")[0];
    const defaultStartDate = new Date(today);
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    const defaultStart = defaultStartDate.toISOString().split("T")[0];

    const startDate = String(req.query?.startDate || defaultStart);
    const endDate = String(req.query?.endDate || defaultEnd);

    if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
        return res.status(400).json({ message: "Invalid startDate or endDate format. Use YYYY-MM-DD." });
    }

    if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ message: "startDate cannot be later than endDate." });
    }

    try {
        await ensureSalesTable();
        await ensureCategoriesTable();
        await ensureMedicineCategoryColumn();

        const [rows] = await db.execute(
            `
                SELECT
                    s.id AS id,
                    s.batch_id AS batchId,
                    s.sale_date AS saleDate,
                    COALESCE(m.name, s.medicine_name, 'Unknown Medicine') AS medicineName,
                    COALESCE(c.category_name, 'Uncategorized') AS category,
                    s.quantity_sold AS quantitySold,
                    s.unit_price AS unitPrice,
                    s.total_price AS totalPrice,
                    s.seller_name AS sellerName,
                    s.receiver_name AS receiverName
                FROM sales s
                LEFT JOIN batches b ON s.batch_id = b.id
                LEFT JOIN medicines m ON b.medicine_id = m.id
                LEFT JOIN categories c ON m.category_id = c.id
                WHERE s.sale_date >= ?
                  AND s.sale_date < DATE_ADD(?, INTERVAL 1 DAY)
                ORDER BY s.sale_date DESC
                LIMIT 1000
            `,
            [startDate, endDate],
        );

        res.status(200).json({
            startDate,
            endDate,
            totalRecords: rows.length,
            records: rows.map((row) => ({
                id: Number(row.id || 0),
                batchId: Number(row.batchId || 0),
                saleDate: row.saleDate,
                medicineName: row.medicineName,
                category: row.category,
                quantitySold: Number(row.quantitySold || 0),
                unitPrice: Number(row.unitPrice || 0),
                totalPrice: Number(row.totalPrice || 0),
                sellerName: row.sellerName,
                receiverName: row.receiverName,
            })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getInactiveSales = async (req, res) => {
    const thresholdMonthsRaw = Number(req.query?.thresholdMonths || 3);
    const thresholdMonths =
        Number.isFinite(thresholdMonthsRaw) && thresholdMonthsRaw > 0
            ? Math.min(Math.floor(thresholdMonthsRaw), 12)
            : 3;

    try {
        await ensureSalesTable();
        await ensureCategoriesTable();
        await ensureMedicineCategoryColumn();

        const [medicineRows] = await db.execute(
            `
                SELECT
                    m.id AS medicineId,
                    m.name AS medicineName,
                    COALESCE(c.category_name, 'Uncategorized') AS categoryName,
                    MAX(s.sale_date) AS lastSaleDate,
                    CASE
                        WHEN MAX(s.sale_date) IS NULL THEN NULL
                        ELSE DATEDIFF(CURDATE(), DATE(MAX(s.sale_date)))
                    END AS daysSinceLastSale,
                    COALESCE(COUNT(s.id), 0) AS totalSales,
                    COALESCE(SUM(s.quantity_sold), 0) AS totalQuantitySold
                FROM medicines m
                LEFT JOIN categories c ON m.category_id = c.id
                LEFT JOIN batches b ON b.medicine_id = m.id
                LEFT JOIN sales s ON s.batch_id = b.id
                GROUP BY m.id, m.name, c.category_name
                HAVING lastSaleDate IS NULL OR lastSaleDate < NOW() - INTERVAL ? MONTH
                ORDER BY lastSaleDate IS NULL DESC, lastSaleDate ASC, medicineName ASC
            `,
            [thresholdMonths],
        );

        const [categoryRows] = await db.execute(
            `
                SELECT
                    c.id AS categoryId,
                    c.category_name AS categoryName,
                    COUNT(DISTINCT m.id) AS medicineCount,
                    MAX(s.sale_date) AS lastSaleDate,
                    CASE
                        WHEN MAX(s.sale_date) IS NULL THEN NULL
                        ELSE DATEDIFF(CURDATE(), DATE(MAX(s.sale_date)))
                    END AS daysSinceLastSale,
                    COALESCE(COUNT(s.id), 0) AS totalSales,
                    COALESCE(SUM(s.quantity_sold), 0) AS totalQuantitySold
                FROM categories c
                LEFT JOIN medicines m ON m.category_id = c.id
                LEFT JOIN batches b ON b.medicine_id = m.id
                LEFT JOIN sales s ON s.batch_id = b.id
                GROUP BY c.id, c.category_name
                HAVING lastSaleDate IS NULL OR lastSaleDate < NOW() - INTERVAL ? MONTH
                ORDER BY lastSaleDate IS NULL DESC, lastSaleDate ASC, categoryName ASC
            `,
            [thresholdMonths],
        );

        res.status(200).json({
            thresholdMonths,
            medicines: medicineRows.map((row) => ({
                medicineId: Number(row.medicineId || 0),
                medicineName: row.medicineName,
                categoryName: row.categoryName,
                lastSaleDate: row.lastSaleDate,
                daysSinceLastSale:
                    row.daysSinceLastSale === null
                        ? null
                        : Number(row.daysSinceLastSale),
                totalSales: Number(row.totalSales || 0),
                totalQuantitySold: Number(row.totalQuantitySold || 0),
            })),
            categories: categoryRows.map((row) => ({
                categoryId: Number(row.categoryId || 0),
                categoryName: row.categoryName,
                medicineCount: Number(row.medicineCount || 0),
                lastSaleDate: row.lastSaleDate,
                daysSinceLastSale:
                    row.daysSinceLastSale === null
                        ? null
                        : Number(row.daysSinceLastSale),
                totalSales: Number(row.totalSales || 0),
                totalQuantitySold: Number(row.totalQuantitySold || 0),
            })),
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.stockIn = async (req, res) => {
    const {
        medicine_id,
        medicine_name,
        batch_number,
        quantity,
        expiry_date,
        price_per_unit,
        category_id,
    } = req.body;

    const parsedCategoryId = Number(category_id);
    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
        return res.status(400).json({ message: "A valid category_id is required." });
    }

    const unitPrice = Number(price_per_unit);
    const safeUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0;

    try {
        await ensureCategoriesTable();
        await ensureMedicineCategoryColumn();
        await ensurePriceColumn();

        const [categoryRows] = await db.execute(
            `SELECT id FROM categories WHERE id = ? LIMIT 1`,
            [parsedCategoryId],
        );

        if (!categoryRows.length) {
            return res.status(400).json({ message: "Selected category does not exist." });
        }

        try {
            await db.execute(
                "CALL AddMedicineBatch(?, ?, ?, ?, ?, ?, ?)",
                [
                    medicine_id,
                    medicine_name,
                    batch_number,
                    quantity,
                    expiry_date,
                    safeUnitPrice,
                    parsedCategoryId,
                ],
            );
        } catch (procError) {
            if (procError?.code !== "ER_SP_WRONG_NO_OF_ARGS") {
                throw procError;
            }

            try {
                await db.execute(
                    "CALL AddMedicineBatch(?, ?, ?, ?, ?, ?)",
                    [
                        medicine_id,
                        medicine_name,
                        batch_number,
                        quantity,
                        expiry_date,
                        safeUnitPrice,
                    ],
                );
            } catch (legacyProcError) {
                if (legacyProcError?.code !== "ER_SP_WRONG_NO_OF_ARGS") {
                    throw legacyProcError;
                }

                await db.execute(
                    "CALL AddMedicineBatch(?, ?, ?, ?, ?)",
                    [medicine_id, medicine_name, batch_number, quantity, expiry_date],
                );
            }
        }

        await db.execute(
            `UPDATE medicines SET category_id = ? WHERE id = ?`,
            [parsedCategoryId, medicine_id],
        );

        const [latestBatchRows] = await db.execute(
            `
              SELECT id
              FROM batches
              WHERE medicine_id = ? AND batch_number = ?
              ORDER BY id DESC
              LIMIT 1
            `,
            [medicine_id, batch_number],
        );

        if (latestBatchRows.length) {
            await db.execute(
                `UPDATE batches SET price_per_unit = ? WHERE id = ?`,
                [safeUnitPrice, latestBatchRows[0].id],
            );
        }

        res.status(201).json({ message: "Inventory Updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
