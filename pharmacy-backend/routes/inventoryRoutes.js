const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const bulkSaleController = require("../controllers/bulkSaleController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const requireAdmin = [requireAuth, requireRole(["admin"])];

// Standard Routes
router.get("/inventory", inventoryController.getInventory);
router.get("/inventory/search", inventoryController.searchInventory);
router.get("/categories", inventoryController.getCategories);
router.get("/reports", ...requireAdmin, inventoryController.getSalesReport);
router.delete("/reports/reset", ...requireAdmin, inventoryController.resetSalesHistory);
router.get(
	"/reports/sales-log",
	...requireAdmin,
	inventoryController.getSalesLog,
);
router.get(
	"/reports/inactive",
	...requireAdmin,
	inventoryController.getInactiveSales,
);
router.post("/categories", inventoryController.createCategory);
router.post("/inventory/stock-in", inventoryController.stockIn);
router.post("/inventory/sell", inventoryController.sellMedicine);

// NEW: Bulk Sale Route (Multi-Item Order)
router.post("/inventory/bulk-sell", ...requireAdmin, bulkSaleController.bulkSaleMedicine); 

// The Delete Route - This MUST match the frontend fetch URL
router.delete(
	"/inventory/delete/:id",
	...requireAdmin,
	inventoryController.deleteItem,
);

module.exports = router;