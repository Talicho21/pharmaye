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

  // Use fallback values if names aren't provided by the dashboard client
  const activeSeller = seller_name && seller_name.trim() ? seller_name.trim() : "System Dispenser";
  const activeReceiver = receiver_name && receiver_name.trim() ? receiver_name.trim() : "General Customer";

  if (!Array.isArray(salesSource) || salesSource.length === 0) {
    return res.status(400).json({ message: "Empty transaction lines array received" });
  }

  try {
    let totalRevenue = 0;
    const processedItems = [];

    // 1. Establish an isolated transaction block
    await db.query("BEGIN");

    for (const currentSale of salesSource) {
      const batchId = Number(currentSale.batch_id ?? currentSale.medicine_id ?? currentSale.id);
      const quantitySold = currentSale.quantity_sold ?? currentSale.quantity;
      const medicine_name = currentSale.medicine_name || currentSale.name || "";
      const parsedQty = parseInt(quantitySold, 10);

      if (!Number.isInteger(batchId) || batchId <= 0) {
        throw new Error("Invalid batch reference provided in bulk sale payload.");
      }

      if (isNaN(parsedQty) || parsedQty <= 0) {
        throw new Error(`Invalid line item quantity provided for Batch Reference ID: ${batchId}`);
      }

      // 2. Fetch inventory status using PostgreSQL numbered parameterized inputs ($1)
      const itemLookupText = `
        SELECT quantity, price_per_unit, name 
        FROM inventory 
        WHERE id = $1
        FOR UPDATE
      `;
      const itemResult = await db.query(itemLookupText, [batchId]);

      if (itemResult.rows.length === 0) {
        throw new Error(`Pharmaceutical batch reference ID ${batchId} does not exist in registry.`);
      }

      const medicine = itemResult.rows[0];
      const availableQty = medicine.quantity;
      const pricePerUnit = parseFloat(medicine.price_per_unit);

      // Ensure sales.medicine_id always targets a valid medicines(id) row.
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
      const medicineUpsertResult = await db.query(medicineUpsertText, [
        medicine.name || medicine_name,
        pricePerUnit,
      ]);
      const resolvedMedicineId = Number(medicineUpsertResult.rows[0]?.id || 0);

      if (!Number.isInteger(resolvedMedicineId) || resolvedMedicineId <= 0) {
        throw new Error("Unable to resolve medicine reference for sales log entry.");
      }

      // 3. Confirm target batch contains sufficient physical stock
      if (availableQty < parsedQty) {
        throw new Error(`Insufficient inventory stock for ${medicine.name}. Requested: ${parsedQty}, Available: ${availableQty}`);
      }

      const lineTotalRevenue = parsedQty * pricePerUnit;

      // 4. Deduct quantity levels from storage array
      const updateStockText = `
        UPDATE inventory 
        SET quantity = quantity - $1 
        WHERE id = $2
      `;
      await db.query(updateStockText, [parsedQty, batchId]);

      // 5. Append transaction tracking data directly to the relational log
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
      await db.query(logTransactionText, [
        Number(req.auth.id),
        resolvedMedicineId,
        batchId,
        medicine.name || medicine_name,
        parsedQty,
        pricePerUnit,
        lineTotalRevenue,
        activeSeller,
        activeReceiver,
        invoice_no,
        reference,
        customer_name,
        customer_tin,
        customer_sno,
        payment_method,
      ]);

      totalRevenue += lineTotalRevenue;
      processedItems.push({
        batch_id: batchId,
        medicine_name: medicine.name || medicine_name,
        quantity_sold: parsedQty,
        quantity_deducted: parsedQty,
      });
    }

    // 6. Commit the entire transaction payload simultaneously if all items clear validation steps
    await db.query("COMMIT");
    return res.status(200).json({
      message: "Bulk distribution pipeline processed successfully.",
      data: {
        total_items_processed: processedItems.length,
        total_revenue: totalRevenue,
        items: processedItems,
      },
    });

  } catch (err) {
    // 7. If any individual item fails or triggers stock exceptions, roll back all updates instantly
    await db.query("ROLLBACK");
    console.error("Bulk transaction pipeline execution fault:", err.message);
    return res.status(400).json({ 
      message: err.message || "Failed processing bulk transaction array safely." 
    });
  }
};