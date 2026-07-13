// backend/controllers/bulkSaleController.js
const db = require("../config/db"); // Direct connection hook to your Supabase PostgreSQL pool

/**
 * Handles the distribution array for Multi-Item Orders (Bulk Sales)
 * Performs atomicity checks via standard relational transactions
 */
exports.bulkSaleMedicine = async (req, res) => {
  if (!req.auth?.id) {
    return res.status(401).json({ message: "Authentication required to record a sale." });
  }

  const salesSource = Array.isArray(req.body.sales)
    ? req.body.sales
    : Array.isArray(req.body.items)
      ? req.body.items
      : [];

  const {
    seller_name,
    receiver_name,
    invoice_no = "",
    reference = "",
    customer_name = "",
    customer_tin = req.body.tin_number || "",
    customer_sno = "",
    payment_method = "cash",
  } = req.body;

  const activeSeller = seller_name && seller_name.trim() ? seller_name.trim() : "System Dispenser";
  const activeReceiver = receiver_name && receiver_name.trim() ? receiver_name.trim() : "General Customer";
  const normalizedCustomerSno = String(customer_sno ?? "").trim();

  if (!Array.isArray(salesSource) || salesSource.length === 0) {
    return res.status(400).json({ message: "Empty transaction lines array received" });
  }

  const client = await db.pool.connect();

  try {
    let totalRevenue = 0;
    const processedItems = [];

    await client.query("BEGIN");

    for (const currentSale of salesSource) {
      const batchId = Number(currentSale.batch_id ?? currentSale.medicine_id ?? currentSale.id);
      const quantitySold = currentSale.quantity_sold ?? currentSale.quantity;
      const medicine_name = currentSale.medicine_name || currentSale.name || "";
      const parsedQty = parseInt(quantitySold, 10);

      if (!Number.isInteger(batchId) || batchId <= 0) {
        throw new Error("Invalid batch reference provided in bulk sale payload.");
      }

      if (Number.isNaN(parsedQty) || parsedQty <= 0) {
        throw new Error(`Invalid line item quantity provided for Batch Reference ID: ${batchId}`);
      }

      const itemLookupText = `
        SELECT quantity, price_per_unit, name, batch_number, expiry_date, unit
        FROM inventory
        WHERE id = $1
        FOR UPDATE
      `;
      const itemResult = await client.query(itemLookupText, [batchId]);

      if (itemResult.rows.length === 0) {
        throw new Error(`Pharmaceutical batch reference ID ${batchId} does not exist in registry.`);
      }

      const medicine = itemResult.rows[0];
      const lineOverrides = currentSale && typeof currentSale === "object" ? currentSale : {};
      const editedItem = Array.isArray(req.body.items)
        ? req.body.items.find((entry) => Number(entry.medicine_id ?? entry.batch_id ?? entry.id) === batchId)
        : null;
      const mergedEditedItem = {
        medicine_id: Number(lineOverrides.medicine_id ?? lineOverrides.batch_id ?? lineOverrides.id ?? editedItem?.medicine_id ?? editedItem?.batch_id ?? editedItem?.id ?? batchId),
        medicine_name: String(lineOverrides.medicine_name ?? lineOverrides.name ?? editedItem?.medicine_name ?? editedItem?.name ?? medicine.name ?? medicine_name ?? "").trim(),
        batch_number: String(lineOverrides.batch_number ?? editedItem?.batch_number ?? medicine.batch_number ?? "").trim(),
        price_per_unit: Number.parseFloat(String(lineOverrides.price_per_unit ?? editedItem?.price_per_unit ?? medicine.price_per_unit ?? 0)),
        expiry_date: lineOverrides.expiry_date ?? editedItem?.expiry_date ?? medicine.expiry_date ?? null,
        unit: String(lineOverrides.unit ?? editedItem?.unit ?? medicine.unit ?? "").trim(),
      };
      const availableQty = medicine.quantity;
      const pricePerUnit = parseFloat(medicine.price_per_unit || 0);
      const editedPricePerUnit = Number.isFinite(mergedEditedItem.price_per_unit) && mergedEditedItem.price_per_unit >= 0
        ? mergedEditedItem.price_per_unit
        : pricePerUnit;
      const salePricePerUnit = Number.isFinite(editedPricePerUnit) && editedPricePerUnit >= 0
        ? editedPricePerUnit
        : pricePerUnit;
      const editedBatchNumber = mergedEditedItem.batch_number;
      const editedExpiryDate = mergedEditedItem.expiry_date;
      const editedMedicineName = mergedEditedItem.medicine_name;

      const medicineUpsertText = `
        INSERT INTO medicines (name, category_id, price, stock)
        VALUES ($1, NULL, $2, 0)
        ON CONFLICT (name)
        DO UPDATE SET
          price = CASE
            WHEN medicines.price IS NULL OR medicines.price = 0 THEN EXCLUDED.price
            ELSE medicines.price
          END
        RETURNING id
      `;
      const medicineUpsertResult = await client.query(medicineUpsertText, [
        editedMedicineName || medicine.name || medicine_name,
        salePricePerUnit,
      ]);
      const resolvedMedicineId = Number(medicineUpsertResult.rows[0]?.id || 0);

      if (!Number.isInteger(resolvedMedicineId) || resolvedMedicineId <= 0) {
        throw new Error("Unable to resolve medicine reference for sales log entry.");
      }

      if (availableQty < parsedQty) {
        throw new Error(`Insufficient inventory stock for ${medicine.name}. Requested: ${parsedQty}, Available: ${availableQty}`);
      }

      const lineTotalRevenue = parsedQty * salePricePerUnit;

      const updateStockText = `
        UPDATE inventory
        SET
          name = COALESCE($1, name),
          batch_number = COALESCE($2, batch_number),
          expiry_date = $3,
          price_per_unit = $4,
          unit = $5,
          quantity = quantity - $6
        WHERE id = $7
      `;
      await client.query(updateStockText, [
        editedMedicineName || null,
        editedBatchNumber || null,
        editedExpiryDate ? String(editedExpiryDate).slice(0, 10) : null,
        salePricePerUnit,
        mergedEditedItem.unit || null,
        parsedQty,
        batchId,
      ]);

      const logTransactionText = `
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
      await client.query(logTransactionText, [
        Number(req.auth.id),
        resolvedMedicineId,
        batchId,
        editedMedicineName || medicine.name || medicine_name,
        parsedQty,
        salePricePerUnit,
        lineTotalRevenue,
        activeSeller,
        activeReceiver,
        invoice_no,
        reference,
        customer_name,
        customer_tin,
        normalizedCustomerSno,
        payment_method,
      ]);

      totalRevenue += lineTotalRevenue;
      processedItems.push({
        batch_id: batchId,
        medicine_name: editedMedicineName || medicine.name || medicine_name,
        quantity_sold: parsedQty,
        quantity_deducted: parsedQty,
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Bulk distribution pipeline processed successfully.",
      data: {
        total_items_processed: processedItems.length,
        total_revenue: totalRevenue,
        items: processedItems,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // No active transaction to roll back.
    }

    console.error("Bulk transaction pipeline execution fault:", err?.message || err);
    return res.status(400).json({
      message: err?.message || "Failed processing bulk transaction array safely.",
    });
  } finally {
    client.release();
  }
};