const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const bulkSaleController = require("../controllers/bulkSaleController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// Middleware array definitions for Admin-only data restrictions
const requireAdmin = [requireAuth, requireRole(["admin"])];

// ==========================================
// Standard Operational Inventory Routes
// ==========================================

// Fetch and search inventory batches
router.get("/inventory", inventoryController.getInventory);
router.get("/inventory/search", inventoryController.searchInventory);

// Dynamic stock items mutation actions
router.post("/inventory/stock-in", inventoryController.stockIn);
router.post("/inventory/sell", inventoryController.sellMedicine);
router.put("/inventory/:id", requireAuth, inventoryController.updateStockInline);

// Crucial target point for destructive purging actions
router.delete(
    "/inventory/delete/:id",
    ...requireAdmin,
    inventoryController.deleteItem,
);

// ==========================================
// Pharmaceutical Categorization Routes
// ==========================================
router.get("/categories", inventoryController.getCategories);
router.post("/categories", inventoryController.createCategory);

// ==========================================
// Analytical reporting & Audit Log Routes
// ==========================================
router.get("/reports", ...requireAdmin, inventoryController.getSalesReport);
router.get("/reports/sales-log", ...requireAdmin, inventoryController.getSalesLog);
router.get("/reports/inactive", ...requireAdmin, inventoryController.getInactiveSales);
router.delete("/reports/reset", ...requireAdmin, inventoryController.resetSalesHistory);

// ==========================================
// Multi-Item Order (Bulk Distribution)
// ==========================================
router.post("/inventory/bulk-sell", requireAuth, bulkSaleController.bulkSaleMedicine);

module.exports = router;