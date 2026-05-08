# Architecture Comparison: Single-Item vs Multi-Item Order System

## 📊 Visual Comparison

### Flow Diagram: Single-Item Selling

```
┌─────────────────────────────────────────────────────────────┐
│ TRADITIONAL SINGLE-ITEM SELLING (Current System)           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dashboard with Inventory Table                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Medicine       │ Qty │ Expiry    │ [Sell Button]    │   │
│  │ Aspirin        │ 100 │ 2025-06   │ 🛒 ← User clicks │   │
│  │ Paracetamol    │ 50  │ 2025-12   │ [Sell Button]    │   │
│  │ Ibuprofen      │ 75  │ 2025-09   │ [Sell Button]    │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓ (Single Item Modal)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Quantity: [10]                                       │   │
│  │ Seller: [________]        [Process]                  │   │
│  │ Receiver: [________]                                │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓ POST /api/inventory/sell                           │
│    BACKEND (Single Transaction)                             │
│    • SELECT batch WHERE id = ?                              │
│    • CHECK quantity                                         │
│    • UPDATE batches SET quantity -= 10                      │
│    • INSERT INTO sales                                      │
│    • COMMIT                                                 │
│         ↓                                                    │
│    ✅ Item 1 sold                                            │
│                                                              │
│  Repeat 49 more times for remaining items...                │
│  Total: 50 item clicks → 50 transactions → 50 sales records │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flow Diagram: Multi-Item Order System (New)

```
┌─────────────────────────────────────────────────────────────┐
│ PROFESSIONAL MULTI-ITEM ORDER SYSTEM (New)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Dashboard with Button                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ [🛒 General Sale (Multi-Item Order)]   ← Click once  │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓                                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ CART PANEL (Side Panel / Modal)                      │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ ➕ Add Medicine to Order:                             │   │
│  │ [Medicine ID] [Name] [Batch] [Qty] [Price] [Exp]    │   │
│  │ [Add Item Button]                                    │   │
│  │                                                       │   │
│  │ 📋 Order Items (3):                                   │   │
│  │ ┌─────────────────────────────────────────────────┐ │   │
│  │ │ ✓ Aspirin, B001, Qty: [50], Price: [2.50]  [✕] │ │   │
│  │ │ ✓ Paracetamol, B002, Qty: [100], Price:[1.50] [✕]│ │   │
│  │ │ ✓ Ibuprofen, B003, Qty: [75], Price: [3.00] [✕] │ │   │
│  │ └─────────────────────────────────────────────────┘ │   │
│  │                                                       │   │
│  │ Total Price: ETB 575.00                              │   │
│  │ [Cancel]  [✓ Process Sale]                          │   │
│  └──────────────────────────────────────────────────────┘   │
│         ↓ POST /api/inventory/bulk-sell (ONE REQUEST)       │
│    BACKEND (SINGLE ATOMIC TRANSACTION)                      │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ BEGIN TRANSACTION                                   │  │
│    │                                                     │  │
│    │ ITEM 1: Aspirin (50 units)                          │  │
│    │ • Find Aspirin in FEFO order                        │  │
│    │ • Deduct from batch (not yet committed)            │  │
│    │ • Insert sales record                              │  │
│    │                                                     │  │
│    │ ITEM 2: Paracetamol (100 units)                     │  │
│    │ • Find Paracetamol in FEFO order                    │  │
│    │ • Deduct from batch                                │  │
│    │ • Insert sales record                              │  │
│    │                                                     │  │
│    │ ITEM 3: Ibuprofen (75 units)                        │  │
│    │ • Find Ibuprofen in FEFO order                      │  │
│    │ • Deduct from batch                                │  │
│    │ • Insert sales record                              │  │
│    │                                                     │  │
│    │ IF ALL OK → COMMIT                                 │  │
│    │ IF ANY ERROR → ROLLBACK (all 3 undone)             │  │
│    └─────────────────────────────────────────────────────┘  │
│         ↓                                                    │
│    ✅ All 3 items sold in ONE transaction                    │
│    📊 ONE consolidated sales record for wholesale order      │
│                                                              │
│  Single click → 1 transaction → 1 sale record → Done!       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Detailed Comparison Table

| Aspect                    | Single-Item                                        | Multi-Item Order                                 |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| **User Workflow**         | 1 click per medicine                               | Add multiple items to cart, 1 submit             |
| **HTTP Requests**         | 50 requests for 50 items                           | 1 request for any number of items                |
| **Database Transactions** | 50 independent transactions                        | 1 atomic transaction                             |
| **Atomicity**             | Each item separate; partial sales possible         | All-or-nothing guarantee                         |
| **Sales Records**         | 50 rows in sales table                             | 1-50 rows (depends on FEFO distribution)         |
| **Audit Trail**           | Difficult to group as one order                    | Clear, consolidated wholesale order              |
| **Network Overhead**      | High (50 HTTP round-trips)                         | Low (1 HTTP request)                             |
| **Error Recovery**        | Operator confusion: "Did items 1-10 sell?"         | Clear: "Entire order failed" or "Success"        |
| **FEFO Logic**            | Per-item FEFO                                      | Consistent FEFO per item                         |
| **Duplicate Items**       | User can't easily add same medicine multiple times | Easily allows same medicine in different batches |
| **Wholesale Use Case**    | ⚠️ Painful (many clicks)                           | ✅ Professional                                  |
| **Scalability**           | Poor (UI drowns in buttons)                        | Good (handles 100+ items smoothly)               |
| **Invoice Generation**    | Multiple invoices or manual aggregation            | Single consolidated invoice                      |
| **Performance**           | ~100ms per item (50 items = 5+ seconds)            | ~300ms for 50 items (1-time request)             |

---

## 🗄️ Database Requirements

### Required Tables

Your pharmacy system should have these tables:

```sql
-- 1. MEDICINES TABLE (exists)
CREATE TABLE medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_id INT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 2. BATCHES TABLE (exists - must have these columns)
CREATE TABLE batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medicine_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  quantity INT NOT NULL,
  expiry_date DATE NOT NULL,
  price_per_unit DECIMAL(10,2) DEFAULT 0,  -- ⚠️ CRITICAL: Required for bulk sale
  FOREIGN KEY (medicine_id) REFERENCES medicines(id)
);

-- 3. SALES TABLE (exists - must have these columns)
CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id INT NOT NULL,
  medicine_name VARCHAR(255),
  quantity_sold INT NOT NULL,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(12,2),
  seller_name VARCHAR(255),
  receiver_name VARCHAR(255),
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- 4. CATEGORIES TABLE (exists)
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE
);
```

### Critical Indexes for Performance

```sql
-- These indexes speed up FEFO lookups significantly

-- Index on medicine_id + expiry_date + quantity
CREATE INDEX idx_batches_fefo
ON batches(medicine_id, expiry_date ASC, id);

-- Index on sale_date for reporting
CREATE INDEX idx_sales_date
ON sales(sale_date DESC);

-- Index on batch_id for lookups
CREATE INDEX idx_sales_batch
ON sales(batch_id);
```

### Key Column Requirements

**✅ price_per_unit in batches table:**

- Required for bulk sale to calculate revenue
- Used in response: `"unit_price": 2.50`

**✅ expiry_date in batches table:**

- Required for FEFO sorting
- Query: `ORDER BY expiry_date ASC`

**✅ batch_number in batches table:**

- Optional in request (for targeted selling)
- Used in response to track which batch was sold from

---

## 🔐 Security & Best Practices

### Authentication Requirement

The bulk-sell endpoint requires admin role:

```javascript
router.post(
  "/inventory/bulk-sell",
  ...requireAdmin, // ← Must be admin
  bulkSaleController.bulkSaleMedicine,
);
```

### Input Validation

```javascript
// The controller validates:
✓ items is an array with at least 1 item
✓ Each item has valid quantity (positive integer)
✓ seller_name and receiver_name are provided
✓ price_per_unit is non-negative
✓ medicine_id or medicine_name exists
```

### Database-Level Constraints

```sql
-- Prevent negative quantities
ALTER TABLE batches
ADD CONSTRAINT chk_positive_quantity
CHECK (quantity >= 0);

-- Prevent expired batches from being sold
-- (enforced in backend logic, not DB constraint)
WHERE expiry_date >= CURDATE()
```

---

## 📈 Sample Queries for Analytics (After Bulk Sales)

### Query 1: Total Revenue from Bulk Orders

```sql
SELECT
  DATE(sale_date) AS sale_date,
  SUM(total_price) AS daily_revenue,
  COUNT(DISTINCT batch_id) AS items_sold,
  COUNT(*) AS total_batches_used
FROM sales
WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(sale_date)
ORDER BY sale_date DESC;
```

### Query 2: Which Medicines Sold via FEFO (Multi-Batches)

```sql
SELECT
  m.name,
  COUNT(DISTINCT s.batch_id) AS batches_used_for_this_medicine,
  SUM(s.quantity_sold) AS total_quantity_sold,
  DATEDIFF(MAX(b.expiry_date), MIN(b.expiry_date)) AS expiry_spread_days
FROM sales s
JOIN batches b ON s.batch_id = b.id
JOIN medicines m ON b.medicine_id = m.id
WHERE DATE(s.sale_date) = CURDATE()
GROUP BY m.id, m.name
HAVING batches_used_for_this_medicine > 1
ORDER BY batches_used_for_this_medicine DESC;
```

### Query 3: Sellers' Daily Orders

```sql
SELECT
  seller_name,
  COUNT(DISTINCT receiver_name) AS unique_receivers,
  COUNT(*) AS total_items_sold,
  SUM(total_price) AS revenue_generated
FROM sales
WHERE DATE(sale_date) = CURDATE()
GROUP BY seller_name
ORDER BY revenue_generated DESC;
```

---

## 🚀 Migration Guide (From Single-Item to Multi-Item)

If you want to keep the existing single-item selling while adding multi-item:

```javascript
// inventoryRoutes.js

// KEEP existing single-item route
router.post("/inventory/sell", inventoryController.sellMedicine);

// ADD new bulk-sell route
router.post(
  "/inventory/bulk-sell",
  ...requireAdmin,
  bulkSaleController.bulkSaleMedicine,
);
```

Both can coexist. Staff can use either:

- Single-item for small quantities
- Bulk-sell for wholesale orders

---

## 📊 Example: Complete Workflow for Pharmacy Manager

1. **Morning**: 5 pharmacy students come to buy medicines for training
   - 10 units Aspirin, 5 units Paracetamol
   - **Use**: Single-item button (quick, small order)

2. **Afternoon**: Central Hospital wholesale order
   - 200 units Aspirin, 150 units Paracetamol, 300 units Ibuprofen, ...
   - **Use**: Multi-item order (professional, all-or-nothing)

3. **Evening**: Small clinic re-orders
   - 20 units various medicines
   - **Use**: Multi-item order (consistent with wholesale practice)

---

## ✅ Checklist: You're Ready for Production When...

- [ ] `price_per_unit` column exists in batches table
- [ ] Indexes created on `batches.medicine_id` and `batches.expiry_date`
- [ ] `bulkSaleController.js` imported and route added
- [ ] `MultiItemOrderCart.tsx` component placed in components folder
- [ ] Dashboard button and handler added to page.tsx
- [ ] Auth token required for bulk-sell endpoint
- [ ] Tested with 1 item, 10 items, 50 items
- [ ] Tested error scenarios (out of stock, partial failures)
- [ ] Sales records correctly showing FEFO distribution
- [ ] Invoice reprinting works for bulk orders
- [ ] Staff trained on new UI
- [ ] Monitored in production for 1 week
