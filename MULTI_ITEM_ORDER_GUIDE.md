# Multi-Item Order System - Complete Guide & Deep Dive

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Integration](#frontend-integration)
3. [Backend Integration](#backend-integration)
4. [Transaction Logic Deep Dive](#transaction-logic-deep-dive)
5. [FEFO Algorithm Breakdown](#fefo-algorithm-breakdown)
6. [Error Handling & Edge Cases](#error-handling--edge-cases)
7. [Testing Scenarios](#testing-scenarios)

---

## Architecture Overview

### Single-Item Selling vs. Multi-Item Order System

#### ❌ Traditional Single-Item Approach

```
User clicks "Sell" button on one row
  ↓
POST /api/inventory/sell { batch_id: 123, quantity: 10 }
  ↓
One database transaction: deduct & log
  ↓
Result: 1 row affected in inventory, 1 record in sales log
```

**Problem**: For a wholesale customer buying 50 different medicines in quantities, you'd need 50 button clicks and 50 separate transactions. Each transaction is independent, creating multiple audit records and potential inconsistencies if the system crashes mid-sale.

#### ✅ Multi-Item Order System (Professional Approach)

```
User selects multiple medicines, adjusts quantities, reviews cart
  ↓
Clicks "Process Sale" to send entire order
  ↓
POST /api/inventory/bulk-sell {
  items: [
    { medicine_id: 1, quantity: 50, batch_number: "B001" },
    { medicine_id: 2, quantity: 30 },
    { medicine_id: 3, quantity: 100 }
  ],
  seller_name: "Ahmed",
  receiver_name: "Wholesale Distributor XYZ"
}
  ↓
**ONE DATABASE TRANSACTION** processes all 3 items atomically
  ↓
Result: Either ALL 3 items sold successfully, OR ENTIRE ORDER ROLLED BACK
         + Single consolidated audit record for the wholesale order
         + Inventory consistency guaranteed
```

**Benefits**:

- **Atomicity**: All-or-nothing guarantee
- **Audit Trail**: One sale record for the entire order (better for invoicing)
- **Wholesale Operations**: Typical for pharmacy wholesalers who buy in bulk across categories
- **Scalability**: Can handle 50+ items in one transaction without UI strain

---

## Frontend Integration

### Step 1: Add the Multi-Item Order Cart Component

The `MultiItemOrderCart.tsx` component provides:

- **Array State Management**: Holds multiple `CartItem` objects
- **Add/Remove Items**: Users can dynamically modify the order before submitting
- **Real-time Calculations**: Shows total quantity, total price as items change
- **Duplicate Handling**: Same medicine can be added twice (useful for different batches)

### Step 2: Import and Use in Dashboard

Add this to your `page.tsx`:

```tsx
import {
  MultiItemOrderCart,
  CartItem,
} from "@/app/components/MultiItemOrderCart";

export default function PharmacyDashboard() {
  // ... existing state ...
  const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
  const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);

  // ========== BULK SALE HANDLER ==========
  const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
    setIsProcessingBulkSale(true);
    try {
      const response = await fetch(
        "http://localhost:5000/api/inventory/bulk-sell",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            items: cartItems.map((item) => ({
              medicine_id: item.medicineId,
              batch_number: item.batchNumber,
              medicine_name: item.medicineName,
              quantity: item.quantity,
              price_per_unit: item.pricePerUnit,
            })),
            seller_name: sellerNameInput,
            receiver_name: receiverNameInput,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        showToast(
          "Order Failed",
          result.message || "Could not process bulk sale",
          "error",
        );
        return;
      }

      showToast(
        "Order Processed ✓",
        `Successfully processed ${result.data.total_items_processed} items. Revenue: ETB ${result.data.total_revenue}`,
        "success",
      );

      setIsGeneralSaleOpen(false);
      fetchData(); // Refresh inventory
    } catch (error) {
      showToast(
        "Network Error",
        "Failed to submit order. Please try again.",
        "error",
      );
      console.error("Bulk sale error:", error);
    } finally {
      setIsProcessingBulkSale(false);
    }
  };

  return (
    <>
      {/* Existing dashboard content */}

      {/* Add Button for General Sale */}
      <button
        onClick={() => setIsGeneralSaleOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
      >
        🛒 General Sale (Multi-Item Order)
      </button>

      {/* Multi-Item Order Cart Modal */}
      <MultiItemOrderCart
        isOpen={isGeneralSaleOpen}
        onClose={() => setIsGeneralSaleOpen(false)}
        onSubmit={handleBulkSaleSubmit}
        isProcessing={isProcessingBulkSale}
      />
    </>
  );
}
```

### State Management Concept: Using useState Array

```typescript
// ========== CART STATE MANAGEMENT ==========

// Individual item in the cart
type CartItem = {
  id: string; // Client-side unique ID (to track position in array)
  medicineId: number; // Links to medicines table
  batchNumber: string; // For FEFO lookups
  medicineName: string; // Display name
  quantity: number; // How many units to sell
  pricePerUnit: number; // ETB per unit
  expiryDate: string; // YYYY-MM-DD for compliance
};

// Cart array holds all items user selected
const [cartItems, setCartItems] = useState<CartItem[]>([]);

// ========== OPERATIONS ==========

// Add item: Append to array
const addItemToCart = (newItem: CartItem) => {
  setCartItems([...cartItems, newItem]);
};

// Remove item by id: Filter out
const removeItemFromCart = (id: string) => {
  setCartItems(cartItems.filter((item) => item.id !== id));
};

// Update quantity: Map and replace
const updateCartItem = (id: string, newQuantity: number) => {
  setCartItems(
    cartItems.map((item) =>
      item.id === id ? { ...item, quantity: newQuantity } : item,
    ),
  );
};

// ========== CALCULATED PROPERTIES (useMemo for performance) ==========

const cartTotals = useMemo(
  () => ({
    itemCount: cartItems.length,
    totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: cartItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0,
    ),
  }),
  [cartItems],
);

// Why useMemo? It only recalculates when cartItems changes, avoiding expensive recalculations
```

---

## Backend Integration

### Step 1: Create bulkSaleController.js

✅ Already created at `/controllers/bulkSaleController.js`

### Step 2: Update inventoryRoutes.js

✅ Already updated to include:

```javascript
router.post(
  "/inventory/bulk-sell",
  ...requireAdmin,
  bulkSaleController.bulkSaleMedicine,
);
```

### Request Payload Format

```json
{
  "items": [
    {
      "medicine_id": 1,
      "batch_number": "B20250101",
      "medicine_name": "Aspirin",
      "quantity": 50,
      "price_per_unit": 2.5
    },
    {
      "medicine_id": 2,
      "batch_number": "B20250102",
      "medicine_name": "Paracetamol",
      "quantity": 100,
      "price_per_unit": 1.5
    }
  ],
  "seller_name": "Ahmed Hassan",
  "receiver_name": "Al-Hijra Pharmacy Distribution"
}
```

### Response (Success)

```json
{
  "message": "Order processed successfully",
  "success": true,
  "data": {
    "total_items_processed": 2,
    "total_revenue": "275.00",
    "items": [
      {
        "medicine_name": "Aspirin",
        "batch_number": "B20250101",
        "quantity_deducted": 50,
        "unit_price": 2.5,
        "subtotal": 125.0
      },
      {
        "medicine_name": "Paracetamol",
        "batch_number": "B20250102",
        "quantity_deducted": 100,
        "unit_price": 1.5,
        "subtotal": 150.0
      }
    ]
  }
}
```

### Response (Error - Transaction Rolled Back)

```json
{
  "message": "Item 2: Insufficient stock. Requested: 100, Available: 45",
  "success": false,
  "processedItems": [],
  "error": null
}
```

Note: Even though Item 1 was processed successfully in memory, it was ROLLED BACK because Item 2 failed. The database is untouched.

---

## Transaction Logic Deep Dive

### Why Database Transactions Matter

#### Scenario: Without Transactions ❌

```javascript
// Hypothetical non-transactional code
async function bulkSaleWithoutTransaction(items) {
  for (const item of items) {
    // Item 1
    UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id;
    INSERT INTO sales ...;

    // Item 2
    UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id;
    INSERT INTO sales ...;

    // Item 3 - OH NO! Quantity is negative, constraint fails
    // But items 1 and 2 are already committed!
    UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id; // ERROR
  }
}
```

**Result**: Inventory shows Item 1 and Item 2 sold, but Item 3 never sold.
**Business Impact**: Retailer's records say Item 1 and 2 are gone, but physically they're on shelves. Discrepancy = audit failure.

---

#### Scenario: With Transactions ✅

```javascript
async function bulkSaleWithTransaction(items) {
  const connection = await db.getConnection();

  // START TRANSACTION: All subsequent queries are grouped
  await connection.beginTransaction();

  try {
    for (const item of items) {
      // Item 1 - query runs, but NOT YET COMMITTED
      UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id;
      INSERT INTO sales ...;

      // Item 2 - query runs, but NOT YET COMMITTED
      UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id;
      INSERT INTO sales ...;

      // Item 3 - FAILS due to constraint
      UPDATE batches SET quantity = quantity - item.quantity WHERE id = item.batch_id; // ERROR
    }

    // If we reach here, COMMIT all changes
    await connection.commit();
  } catch (error) {
    // ANY error here: ROLLBACK everything
    await connection.rollback();
  }
}
```

**Result**: Because of the ROLLBACK, items 1 and 2 are ALSO undone. Database is clean.
**Business Impact**: Entire order fails cleanly. Retailer's record matches physical inventory.

---

### Transaction Isolation & Lock Handling

The bulk sale uses `FOR UPDATE` locks:

```sql
SELECT b.quantity, b.price_per_unit, m.name
FROM batches b
JOIN medicines m ON b.medicine_id = m.id
WHERE b.medicine_id = ?
FOR UPDATE;  -- <-- ROW LOCK: Prevents other transactions from reading/writing these rows
```

**Why**: Prevents concurrent sales from over-selling the same batch.

Example:

- Transaction A starts, selects 100 units of Item X
- Before Transaction A commits, Transaction B selects 90 units of Item X
- If both commit, total sold = 190, but only 100 existed

`FOR UPDATE` prevents this by locking rows during the transaction.

---

## FEFO Algorithm Breakdown

### Line-by-Line Explanation

```javascript
// ========== STEP 1: Input Validation ==========
// Validate that items array is not empty and well-formed
// This prevents garbage data from entering the transaction

// ========== STEP 2: Establish Connection & Begin Transaction ==========
const connection = await db.getConnection();
await connection.beginTransaction();

// Connection: A dedicated session to the database
// beginTransaction(): Sets this connection to transactional mode
// All subsequent queries on this connection are part of one atomic unit

// ========== STEP 3: Loop Through Each Item ==========
for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
  const item = items[itemIndex];
  let remainingQty = item.quantity; // How much we still need to fulfill

  // ========== STEP 4: Query Batches Sorted by Expiry (FEFO) ==========
  const [batches] = await connection.execute(
    `
      SELECT b.id, b.batch_number, b.quantity, b.price_per_unit, b.expiry_date
      FROM batches b
      WHERE b.medicine_id = ?
        AND b.quantity > 0
        AND b.expiry_date >= CURDATE()          -- Only non-expired
      ORDER BY b.expiry_date ASC, b.id ASC      -- Expires soonest first
      FOR UPDATE
    `,
    [medicineId],
  );

  // ORDER BY b.expiry_date ASC: Earliest expirations come first
  // This is the core of FEFO: batches expiring 2025-06-01 before those expiring 2025-12-31

  // ========== STEP 5: Distribute Requested Qty Across Batches ==========
  for (const batch of batches) {
    if (remainingQty === 0) break; // Fulfilled completely

    const deductQty = Math.min(remainingQty, batch.quantity);
    // Take either:
    // - What the batch has (if batch has less remaining qty)
    // - What we need (if batch has enough)

    // Example:
    // - Remaining needed: 100 units
    // - Batch has: 30 units
    // - Deduct: 30 (the minimum of 100 and 30)

    // - Remaining needed: 20 units
    // - Batch has: 100 units
    // - Deduct: 20 (the minimum of 20 and 100)

    await connection.execute(
      "UPDATE batches SET quantity = quantity - ? WHERE id = ?",
      [deductQty, batch.id],
    );
    // SQL: If batch.id = 5 had 30 units, now it has 0
    // The FOR UPDATE lock ensures no other transaction touches this row

    remainingQty -= deductQty; // Update the counter
    // Example: Was 100 needed, deducted 30, now 70 remain
  }

  // After loop: Check if we got everything
  if (remainingQty > 0) {
    // User wanted 200 units total
    // All batches had only 150
    // 50 units short!

    await connection.rollback(); // Undo everything
    return error("Not enough stock");
  }
}

// ========== STEP 6: Commit or Rollback ==========
await connection.commit(); // All items processed & deducted successfully
// All UPDATE and INSERT queries are now permanent
```

---

### FEFO Example in Action

**Inventory State Before Sale:**

```
Medicine: Aspirin
Batch 1: 50 units, expires 2025-06-15, unit_price: 2.00
Batch 2: 30 units, expires 2025-11-20, unit_price: 2.00
Batch 3: 60 units, expires 2025-03-01, unit_price: 2.00
---
Total: 140 units
```

**User wants to sell: 70 units of Aspirin**

**FEFO Processing:**

```
STEP 1: Sort by expiry date (DESC = earliest first)
  1. Batch 3: expires 2025-03-01 (earliest)
  2. Batch 1: expires 2025-06-15
  3. Batch 2: expires 2025-11-20

STEP 2: Distribute 70 units across batches in order
  - From Batch 3 (60 units available): Take min(70, 60) = 60 units
    → Batch 3 now has 0 units
    → Remaining needed: 70 - 60 = 10 units

  - From Batch 1 (50 units available): Take min(10, 50) = 10 units
    → Batch 1 now has 40 units
    → Remaining needed: 10 - 10 = 0 units ✓

**Inventory State After Sale:**
```

Batch 1: 40 units (unchanged initially, 10 deducted in step 2)
Batch 2: 30 units (unchanged)
Batch 3: 0 units (all 60 deducted)

---

Total: 70 units

````

**Key Insight: We automatically sold the batch expiring soonest first (Batch 3), minimizing waste.**

---

## Error Handling & Edge Cases

### Edge Case 1: Duplicate Items in Order

**User adds Aspirin twice:**
```json
{
  "items": [
    { "medicine_id": 1, "quantity": 50 },  // Item 1: Aspirin 50
    { "medicine_id": 1, "quantity": 30 }   // Item 2: Aspirin 30 (same medicine!)
  ]
}
````

**How the system handles it:**

- Loop iteration 1: Deducts 50 units of Aspirin using FEFO
- Loop iteration 2: Looks up Aspirin again using FEFO (gets remaining batches)
- Total deducted: 80 units

**Why this works**: The `medicine_id` is looked up fresh each iteration, so remaining batches are queried correctly.

---

### Edge Case 2: User Specifies Batch Number vs. Medicine ID

**Scenario A: Batch number provided**

```json
{
  "items": [{ "medicine_id": 1, "batch_number": "B001", "quantity": 50 }]
}
```

→ System sells ONLY from batch "B001", no FEFO distribution

**Scenario B: Only medicine_id**

```json
{
  "items": [{ "medicine_id": 1, "quantity": 50 }]
}
```

→ System applies FEFO, distributing across multiple batches if needed

**Code:**

```javascript
if (item.batch_number) {
  // Use specific batch
} else {
  // Apply FEFO distribution
}
```

---

### Edge Case 3: Out of Stock During Transaction

```json
{
  "items": [
    { "medicine_id": 1, "quantity": 100 },
    { "medicine_id": 2, "quantity": 200 } // Only 150 available!
  ]
}
```

**Execution:**

1. Medicine 1: Successfully deduced 100 units (not yet committed)
2. Medicine 2: Attempts to deduct 200, only 150 available
3. Error thrown: ROLLBACK triggered
4. Result: Medicine 1's deduction is undone, Medicine 2 is untouched

**Business Outcome**: Entire order fails, inventory unchanged. No partial sales.

---

## Testing Scenarios

### Test Case 1: Simple Bulk Sale (All items have stock)

```bash
curl -X POST http://localhost:5000/api/inventory/bulk-sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      { "medicine_id": 1, "quantity": 10 },
      { "medicine_id": 2, "quantity": 20 }
    ],
    "seller_name": "Ahmed",
    "receiver_name": "Hospital XYZ"
  }'
```

**Expected**: 200 OK with processed items

---

### Test Case 2: FEFO Distribution (One medicine, multiple batches)

```bash
# Create 2 batches of Aspirin first, then sell across both
curl -X POST http://localhost:5000/api/inventory/bulk-sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      { "medicine_id": 1, "quantity": 150 }
    ],
    "seller_name": "Ahmed",
    "receiver_name": "Hospital XYZ"
  }'
```

**Expected**: FEFO algorithm deducts from earliest expiring batch first

---

### Test Case 3: Out of Stock (Should trigger ROLLBACK)

```bash
curl -X POST http://localhost:5000/api/inventory/bulk-sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "items": [
      { "medicine_id": 1, "quantity": 10000 }
    ],
    "seller_name": "Ahmed",
    "receiver_name": "Hospital XYZ"
  }'
```

**Expected**: 400 error, entire transaction rolled back

---

## Summary: Why This Design is Professional

| Aspect                 | Single-Item                 | Multi-Item Order            |
| ---------------------- | --------------------------- | --------------------------- |
| **UX**                 | 50 clicks for 50 items      | 1 cart, 1 submit            |
| **Transaction Safety** | 50 independent transactions | 1 atomic transaction        |
| **Audit Trail**        | 50 sales records            | 1 sales record              |
| **Error Handling**     | Partial sales possible      | All-or-nothing              |
| **FEFO Support**       | Per-item FEFO               | Consistent FEFO per item    |
| **Scalability**        | UI drowns in buttons        | Handles 100+ items smoothly |
| **Pharmacy Standard**  | Basic                       | Professional wholesale      |

This system is production-ready for wholesale operations where consistency and scalability matter.
