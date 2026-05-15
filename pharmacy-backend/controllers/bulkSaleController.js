const db = require("../config/db");
const { ensurePriceColumn, ensureSalesTable } = require("../utils/salesSchema");

/**
 * DEEP DIVE: Bulk Sale Processing with FEFO (First-Expired, First-Out)
 * 
 * Why FEFO + Transactions? 
 * - Pharmacy selling is "All or Nothing": If we start deducting item 1-4 and item 5 fails,
 *   the inventory is inconsistent. A transaction ensures atomicity.
 * - FEFO ensures we sell expiring items first, minimizing waste.
 * - Single POST request handles multiple items = one audit record for wholesale orders.
 */

exports.bulkSaleMedicine = async (req, res) => {
  const {
    items,
    seller_name,
    receiver_name,
    invoice_no,
    reference,
    customer_name,
    customer_tin,
    customer_sno,
    payment_method,
  } = req.body;

  // ========== INPUT VALIDATION ==========
  const safeSellerName = String(seller_name || "").trim();
  const safeReceiverName = String(receiver_name || "").trim();
  const safeInvoiceNo = String(invoice_no || "").trim();
  const safeReference = String(reference || "").trim();
  const safeCustomerName = String(customer_name || "").trim();
  const safeCustomerTin = String(customer_tin || "").trim();
  const safeCustomerSNo = String(customer_sno || "").trim();
  const safePaymentMethod =
    String(payment_method || "cash").toLowerCase() === "credit"
      ? "credit"
      : "cash";

  if (!safeReceiverName) {
    return res
      .status(400)
      .json({ 
        message: "Receiver name is required.",
        success: false 
      });
  }

  const finalSellerName = safeSellerName || "";

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ 
        message: "At least one item must be included in the order.",
        success: false 
      });
  }

  // Validate each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: `Item ${i + 1}: Quantity must be a positive integer.`,
        success: false,
      });
    }

    if (!item.medicine_id && !item.medicine_name) {
      return res.status(400).json({
        message: `Item ${i + 1}: Medicine ID or name is required.`,
        success: false,
      });
    }
  }

  // ========== MAIN TRANSACTION ==========
  let connection;
  try {
    await ensurePriceColumn();
    await ensureSalesTable();

    // Acquire a database connection
    connection = await db.getConnection();

    // START TRANSACTION
    // Why: Ensures that either ALL items are sold OR NONE are sold.
    // If one item fails, ROLLBACK reverts all changes.
    await connection.beginTransaction();

    // Array to track successfully processed items (for response)
    const processedItems = [];
    let totalRevenue = 0;

    // ========== FEFO LOOP: Process each item ==========
    // WHY FOR LOOP: We must process items sequentially because:
    // - Each item may require multiple batches (FEFO logic)
    // - We need to check and update stock for each item
    // - Transaction context must be maintained across all iterations
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const item = items[itemIndex];
      const requestedQuantity = Number(item.quantity);
      let remainingQty = requestedQuantity;

      // If user provided batch number, sell only from that batch
      if (item.batch_number) {
        const [batchRows] = await connection.execute(
          `
            SELECT b.id, b.quantity, b.price_per_unit, m.name AS medicine_name
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.id = (SELECT id FROM batches WHERE batch_number = ? LIMIT 1)
            FOR UPDATE
          `,
          [item.batch_number]
        );

        if (!batchRows.length) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Item ${itemIndex + 1}: Batch number "${item.batch_number}" not found.`,
            success: false,
            processedItems: [], // No items processed due to rollback
          });
        }

        const batch = batchRows[0];
        if (remainingQty > batch.quantity) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Item ${itemIndex + 1}: Insufficient stock in batch. Requested: ${requestedQuantity}, Available: ${batch.quantity}`,
            success: false,
            processedItems: [],
          });
        }

        // Deduct from specific batch
        await connection.execute(
          "UPDATE batches SET quantity = quantity - ? WHERE id = ?",
          [requestedQuantity, batch.id]
        );

        const unitPrice = Number(batch.price_per_unit) || 0;
        const totalPrice = requestedQuantity * unitPrice;

        // Record the sale
        await connection.execute(
          `
            INSERT INTO sales 
            (batch_id, medicine_name, quantity_sold, unit_price, total_price, seller_name, receiver_name, invoice_no, reference, customer_name, customer_tin, customer_sno, payment_method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            batch.id,
            batch.medicine_name,
            requestedQuantity,
            unitPrice,
            totalPrice,
            finalSellerName,
            safeReceiverName,
            safeInvoiceNo,
            safeReference,
            safeCustomerName,
            safeCustomerTin,
            safeCustomerSNo,
            safePaymentMethod,
          ]
        );

        processedItems.push({
          medicine_name: batch.medicine_name,
          batch_number: item.batch_number,
          quantity_sold: requestedQuantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          customer_sno: safeCustomerSNo,
          payment_method: safePaymentMethod,
        });

        totalRevenue += totalPrice;
      } else {
        // ========== FEFO LOGIC: Sell from earliest expiring batches ==========
        // WHY FEFO: For wholesale, we want to ensure we're always selling
        // the inventory that expires soonest first. This minimizes waste.
        // 
        // ALGORITHM:
        // 1. Find all batches for this medicine (by name or ID)
        // 2. Sort by expiry_date ASC (earliest first)
        // 3. For each batch (in order), subtract what we need
        // 4. Stop when we've fulfilled the entire requested quantity

        let medicineId;

        if (item.medicine_id) {
          medicineId = Number(item.medicine_id);
        } else {
          // Look up by name
          const [nameRows] = await connection.execute(
            `SELECT id FROM medicines WHERE name = ? LIMIT 1`,
            [item.medicine_name]
          );

          if (!nameRows.length) {
            await connection.rollback();
            connection.release();
            return res.status(400).json({
              message: `Item ${itemIndex + 1}: Medicine "${item.medicine_name}" not found.`,
              success: false,
              processedItems: [],
            });
          }

          medicineId = nameRows[0].id;
        }

        // Get all batches for this medicine, sorted by expiry date (FEFO)
        const [batches] = await connection.execute(
          `
            SELECT b.id, b.batch_number, b.quantity, b.price_per_unit, b.expiry_date, m.name AS medicine_name
            FROM batches b
            JOIN medicines m ON b.medicine_id = m.id
            WHERE b.medicine_id = ? 
              AND b.quantity > 0
              AND b.expiry_date >= CURDATE()
            ORDER BY b.expiry_date ASC, b.id ASC
            FOR UPDATE
          `,
          [medicineId]
        );

        if (!batches.length) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Item ${itemIndex + 1}: No available stock found for medicine.`,
            success: false,
            processedItems: [],
          });
        }

        // ========== FEFO DISTRIBUTION LOOP ==========
        // WHY NESTED LOOP: A single medicine request might span multiple batches.
        // Example: User wants 100 units but batch1 has 30, batch2 has 50, batch3 has 40.
        // We deduct 30 from batch1, 50 from batch2, and 20 from batch3.
        for (const batch of batches) {
          if (remainingQty === 0) break; // We've fulfilled the entire request

          const deductQty = Math.min(remainingQty, batch.quantity);

          // Deduct from this batch
          await connection.execute(
            "UPDATE batches SET quantity = quantity - ? WHERE id = ?",
            [deductQty, batch.id]
          );

          const unitPrice = Number(batch.price_per_unit) || 0;
          const totalPrice = deductQty * unitPrice;

          // Record the sale for each individual batch
          await connection.execute(
            `
              INSERT INTO sales 
              (batch_id, medicine_name, quantity_sold, unit_price, total_price, seller_name, receiver_name, invoice_no, reference, customer_name, customer_tin, customer_sno, payment_method)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              batch.id,
              batch.medicine_name,
              deductQty,
              unitPrice,
              totalPrice,
              finalSellerName,
              safeReceiverName,
              safeInvoiceNo,
              safeReference,
              safeCustomerName,
              safeCustomerTin,
              safeCustomerSNo,
              safePaymentMethod,
            ]
          );

          processedItems.push({
            medicine_name: batch.medicine_name,
            batch_number: batch.batch_number,
            quantity_deducted: deductQty,
            unit_price: unitPrice,
            subtotal: totalPrice,
              customer_sno: safeCustomerSNo,
              payment_method: safePaymentMethod,
          });

          remainingQty -= deductQty;
          totalRevenue += totalPrice;
        }

        // After loop: Check if we fulfilled the entire request
        if (remainingQty > 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({
            message: `Item ${itemIndex + 1}: Insufficient total stock. Requested: ${requestedQuantity}, Available: ${requestedQuantity - remainingQty}`,
            success: false,
            processedItems: [],
          });
        }
      }
    }

    // ========== COMMIT TRANSACTION ==========
    // All items processed successfully, commit all changes
    await connection.commit();
    connection.release();

    return res.status(200).json({
      message: "Order processed successfully",
      success: true,
      data: {
        total_items_processed: processedItems.length,
        total_revenue: totalRevenue.toFixed(2),
        items: processedItems,
      },
    });
  } catch (error) {
    // ========== ROLLBACK ON ERROR ==========
    // Any error automatically rolls back all changes
    // This prevents partial sales from corrupting the database
    if (connection) {
      try {
        await connection.rollback();
      } catch (rbError) {
        console.error("Rollback error:", rbError);
      }
      connection.release();
    }

    console.error("Bulk sale error:", error);
    return res.status(500).json({
      message: error.message || "An error occurred during bulk sale processing",
      success: false,
      error: error.code,
    });
  }
};

