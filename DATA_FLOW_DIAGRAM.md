# 🔄 Complete Data Flow: Multi-Item Order System

## 1️⃣ User Interaction Flow

```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  1. User clicks "🛒 General Sale" button                    │
│     └─ Component: SetIsGeneralSaleOpen(true)               │
│                                                               │
│  2. MultiItemOrderCart modal opens                           │
│     └─ Modal shows: "Add Item" form + Current Cart list     │
│                                                               │
│  3. User fills form:                                         │
│     ├─ Selects medicine (dropdown)                          │
│     ├─ Selects batch # (dropdown)                           │
│     ├─ Enters quantity (input field)                        │
│     ├─ Price auto-fills from database query                │
│     └─ Clicks "Add Item to Cart"                            │
│                                                               │
│  4. Item added to cartItems[] array                          │
│     └─ Component state updates, cart displays               │
│                                                               │
│  5. User repeats Step 3-4 for more items                    │
│                                                               │
│  6. User fills order metadata:                              │
│     ├─ Seller Name field (required)                         │
│     ├─ Receiver Name field (required)                       │
│     └─ Cart shows totals: quantity, subtotal, items count   │
│                                                               │
│  7. User clicks "✓ Process Sale" button                     │
│     └─ Calls: handleBulkSaleSubmit(cartItems)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Frontend Data Preparation

```
handleBulkSaleSubmit() Function:

INPUT: cartItems[] = [
  {
    id: "cart-001",
    medicineId: 5,
    batchNumber: "BATCH-2024-001",
    medicineName: "Amoxicillin",
    quantity: 50,
    pricePerUnit: 2.50,
    expiryDate: "2025-06-15"
  },
  {
    id: "cart-002",
    medicineId: 8,
    batchNumber: "BATCH-2024-005",
    medicineName: "Paracetamol",
    quantity: 100,
    pricePerUnit: 1.20,
    expiryDate: "2025-08-20"
  }
]

TRANSFORMATION STEP 1: Extract Seller/Receiver
├─ bulkSaleSellerName = "Ahmed Mohamed" (from input field)
└─ bulkSaleReceiverName = "Al-Ahly Hospital" (from input field)

TRANSFORMATION STEP 2: Map to Backend Format
cartItems.map(item => ({
  medicine_id: item.medicineId,        // 5, 8
  batch_number: item.batchNumber,      // "BATCH-2024-001", etc
  medicine_name: item.medicineName,    // "Amoxicillin", etc
  quantity: item.quantity,             // 50, 100
  price_per_unit: item.pricePerUnit    // 2.50, 1.20
}))

OUTPUT PAYLOAD:
{
  "items": [
    {
      "medicine_id": 5,
      "batch_number": "BATCH-2024-001",
      "medicine_name": "Amoxicillin",
      "quantity": 50,
      "price_per_unit": 2.50
    },
    {
      "medicine_id": 8,
      "batch_number": "BATCH-2024-005",
      "medicine_name": "Paracetamol",
      "quantity": 100,
      "price_per_unit": 1.20
    }
  ],
  "seller_name": "Ahmed Mohamed",
  "receiver_name": "Al-Ahly Hospital"
}
```

---

## 3️⃣ HTTPS Request

```
POST http://localhost:5000/api/inventory/bulk-sell

Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Body: {
  "items": [
    { "medicine_id": 5, "batch_number": "...", "quantity": 50, ... },
    { "medicine_id": 8, "batch_number": "...", "quantity": 100, ... }
  ],
  "seller_name": "Ahmed Mohamed",
  "receiver_name": "Al-Ahly Hospital"
}
```

---

## 4️⃣ Backend Processing (bulkSaleController.js)

```
RECEIVES REQUEST:
├─ Validates authentication (JWT token)
├─ Checks authorization (requireAdmin role)
├─ Validates request structure
│  ├─ items array non-empty? ✓
│  ├─ seller_name non-empty? ✓
│  ├─ receiver_name non-empty? ✓
│  └─ Each item has required fields? ✓
│
├─ Creates database connection
│
└─ Begins transaction: BEGIN;
   (All changes or nothing - atomicity guaranteed)

FOR EACH ITEM IN ITEMS ARRAY:
┌────────────────────────────────────────┐
│ Item 1: medicine_id=5, quantity=50     │
│                                        │
│ STEP 1: Lock the batches for update    │
│ SELECT batches                         │
│ WHERE medicine_id = 5                  │
│   AND quantity > 0                     │
│ ORDER BY expiry_date ASC               │ ← FEFO: earliest first
│ FOR UPDATE;                            │ ← Row locking
│                                        │
│ Result: [                              │
│   {batch_id: 101, qty: 30, exp: ...}, │ ← Expires soonest
│   {batch_id: 102, qty: 25, exp: ...}, │
│   {batch_id: 103, qty: 40, exp: ...}  │
│ ]                                      │
│                                        │
│ STEP 2: Distribute quantity using FEFO│
│ ├─ Need 50 units of Amoxicillin       │
│ ├─ Batch 101: has 30, take 30         │
│ │  └─ UPDATE batches SET qty = 0      │
│ │  └─ INSERT sales (quantity_sold: 30)│
│ ├─ Batch 102: has 25, take 20         │
│ │  └─ UPDATE batches SET qty = 5      │
│ │  └─ INSERT sales (quantity_sold: 20)│
│ └─ Total distributed: 50 ✓            │
│                                        │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Item 2: medicine_id=8, quantity=100    │
│ (Same process: lock → FEFO → distribute)
│ ├─ Batch 201: distribute 55 units     │
│ ├─ Batch 202: distribute 45 units     │
│ └─ Total distributed: 100 ✓           │
└────────────────────────────────────────┘

AFTER ALL ITEMS:
├─ All batches updated
├─ All sales records created
├─ Commit transaction: COMMIT;
│  (All changes now permanent)
└─ Calculate totals for response:
   ├─ total_items_processed: 2
   ├─ total_revenue: (50*2.50) + (100*1.20) = 245.00 ETB
   └─ items array with results

ERROR SCENARIO (e.g., oversell, invalid batch):
├─ Error caught in try/catch
├─ Rollback transaction: ROLLBACK;
│  (All changes UNDONE - like it never happened)
└─ Return error response
```

---

## 5️⃣ Backend Response

```
STATUS 200 OK

RESPONSE BODY:
{
  "success": true,
  "data": {
    "total_items_processed": 2,
    "total_revenue": 245.00,
    "items": [
      {
        "medicine_name": "Amoxicillin",
        "quantity_sold": 50,
        "unit_price": 2.50,
        "total_price": 125.00,
        "batches_used": ["BATCH-2024-001", "BATCH-2024-002"]
      },
      {
        "medicine_name": "Paracetamol",
        "quantity_sold": 100,
        "unit_price": 1.20,
        "total_price": 120.00,
        "batches_used": ["BATCH-2024-005", "BATCH-2024-006"]
      }
    ]
  }
}
```

---

## 6️⃣ Frontend State Update

```
SUCCESS FLOW:
├─ Save response to result variable
├─ Extract data:
│  ├─ const { total_items_processed, total_revenue } = result.data;
│  └─ Extract first 3 items for toast summary
├─ Show success toast:
│  └─ "✅ Order Processed! 2 items | Amoxicillin (50 units)..., +5 more | Total: ETB 245.00"
├─ Clear form state:
│  ├─ setIsGeneralSaleOpen(false);      ← Close modal
│  ├─ setBulkSaleSellerName("");        ← Clear fields
│  └─ setBulkSaleReceiverName("");
├─ Refresh inventory:
│  └─ await fetchData();                ← Re-fetch from /api/inventory
└─ State updates trigger re-render with new quantities

ERROR FLOW:
├─ Check response.ok === false
├─ Show error toast with message from backend
├─ Keep modal open (don't clear)
├─ User can fix and retry
└─ Inventory NOT refreshed (data unchanged)
```

---

## 7️⃣ Database State After Sale

### BEFORE SALE:

```sql
-- medicines table
| id | name         |
|----+--------------|
| 5  | Amoxicillin  |
| 8  | Paracetamol  |

-- batches table
| id  | medicine_id | batch_number    | quantity | expiry_date |
|-----+-------------+-----------------+----------+-------------|
| 101 | 5           | BATCH-2024-001  | 30       | 2025-03-15  |
| 102 | 5           | BATCH-2024-002  | 25       | 2025-04-20  |
| 103 | 5           | BATCH-2024-003  | 40       | 2025-06-10  |
| 201 | 8           | BATCH-2024-005  | 55       | 2025-05-01  |
| 202 | 8           | BATCH-2024-006  | 60       | 2025-07-15  |

-- sales table (empty)
```

### AFTER SALE (with FEFO applied):

```sql
-- batches table (quantities reduced)
| id  | medicine_id | batch_number    | quantity | expiry_date |
|-----+-------------+-----------------+----------+-------------|
| 101 | 5           | BATCH-2024-001  | 0        | 2025-03-15  | ← Used entire batch (expiry soonest)
| 102 | 5           | BATCH-2024-002  | 5        | 2025-04-20  | ← Used 20 of 25
| 103 | 5           | BATCH-2024-003  | 40       | 2025-06-10  | ← Not used
| 201 | 8           | BATCH-2024-005  | 0        | 2025-05-01  | ← Used entire batch (expiry soonest)
| 202 | 8           | BATCH-2024-006  | 15       | 2025-07-15  | ← Used 45 of 60

-- sales table (new records)
| id  | batch_id | medicine_id | medicine_name | quantity_sold | unit_price | total_price | seller_name     | receiver_name       | sale_date  |
|-----+----------+-------------+---------------+---------------+------------+-------------+-----------------+---------------------+------------|
| 201 | 101      | 5           | Amoxicillin   | 30            | 2.50       | 75.00       | Ahmed Mohamed   | Al-Ahly Hospital    | 2025-01-15 |
| 202 | 102      | 5           | Amoxicillin   | 20            | 2.50       | 50.00       | Ahmed Mohamed   | Al-Ahly Hospital    | 2025-01-15 |
| 203 | 201      | 8           | Paracetamol   | 55            | 1.20       | 66.00       | Ahmed Mohamed   | Al-Ahly Hospital    | 2025-01-15 |
| 204 | 202      | 8           | Paracetamol   | 45            | 1.20       | 54.00       | Ahmed Mohamed   | Al-Ahly Hospital    | 2025-01-15 |

KEY INSIGHT:
- Amoxicillin batch 101 used FIRST (expiry: 2025-03-15) ← Soonest
- Amoxicillin batch 102 used SECOND (expiry: 2025-04-20)
- Amoxicillin batch 103 NOT used (expiry: 2025-06-10) ← Latest
- Same FEFO pattern for Paracetamol
- Total quantity reduced: 50 + 100 = 150 units
- Total revenue: 75 + 50 + 66 + 54 = 245 ETB
```

---

## 8️⃣ Frontend Inventory Display Updates

### BEFORE:

```
Dashboard Inventory Table:
| Medicine    | Batch        | Quantity | Expiry Date |
|-------------|--------------|----------|-------------|
| Amoxicillin | BATCH-001    | 30       | 2025-03-15  |
| Amoxicillin | BATCH-002    | 25       | 2025-04-20  |
| Amoxicillin | BATCH-003    | 40       | 2025-06-10  |
| Paracetamol | BATCH-005    | 55       | 2025-05-01  |
| Paracetamol | BATCH-006    | 60       | 2025-07-15  |
```

### AFTER (fetchData() called):

```
Dashboard Inventory Table:
| Medicine    | Batch        | Quantity | Expiry Date |
|-------------|--------------|----------|-------------|
| Amoxicillin | BATCH-001    | 0        | 2025-03-15  | ← Zeroed out
| Amoxicillin | BATCH-002    | 5        | 2025-04-20  | ← Reduced
| Amoxicillin | BATCH-003    | 40       | 2025-06-10  |
| Paracetamol | BATCH-005    | 0        | 2025-05-01  | ← Zeroed out
| Paracetamol | BATCH-006    | 15       | 2025-07-15  | ← Reduced
```

---

## 🧪 Key Data Mutations Summary

| What          | Changed by  | Before → After                              |
| ------------- | ----------- | ------------------------------------------- |
| Batch 101 qty | FEFO        | 30 → 0 (auto distributed to earliest batch) |
| Batch 102 qty | FEFO        | 25 → 5 (auto distributed to 2nd earliest)   |
| Batch 201 qty | FEFO        | 55 → 0 (auto distributed to earliest batch) |
| Batch 202 qty | FEFO        | 60 → 15 (auto distributed to 2nd earliest)  |
| Sales records | +4          | None → 4 new rows (one per batch used)      |
| Frontend UI   | fetchData() | Shows new quantities                        |
| Cart modal    | Clear       | All items removed, modal closes             |
| Toast         | Success     | "✅ Order Processed! 2 items..."            |

---

## ⚠️ Atomicity Guarantee Example

### SCENARIO: Out of Stock Mid-Sale

```
TRANSACTION ATTEMPT:
├─ Item 1: Sell 50 Amoxicillin ✓ (successful)
├─ Item 2: Sell 100 Paracetamol
│  ├─ Lock batches for Paracetamol
│  ├─ Find only 50 units available
│  ├─ User requested 100 ❌ ERROR
│  └─ Insufficient stock
│
└─ ENTIRE TRANSACTION ROLLS BACK
   ├─ All Amoxicillin sale UNDONE ← (even though #1 succeeded)
   ├─ All Paracetamol sale UNDONE
   ├─ Database looks exactly like it did before
   └─ Toast: "Failed ❌ Insufficient stock for Paracetamol"

RESULT (In Database):
├─ Batch 101 (Amoxicillin): 30 ✓ (unchanged)
├─ Batch 102 (Amoxicillin): 25 ✓ (unchanged)
├─ Batch 201 (Paracetamol): 55 ✓ (unchanged)
└─ Batch 202 (Paracetamol): 60 ✓ (unchanged)

WHY THIS MATTERS:
├─ If rollback didn't work: Amoxicillin would be gone but Paracetamol still there (CORRUPTED)
└─ With rollback: Either BOTH succeed or BOTH fail (CONSISTENT)
```

---

## 📊 State Management Timeline

```
T=0s   User clicks "General Sale" button
       └─ State: isGeneralSaleOpen = false → true

T=5s   User adds first item
       └─ State: cartItems = [] → [{id: 1, medicine_id: 5, qty: 50, ...}]
       └─ useMemo recalculates: totals show qty=50, price=125

T=10s  User adds second item
       └─ State: cartItems = [{...}, {id: 2, medicine_id: 8, qty: 100, ...}]
       └─ useMemo recalculates: totals show qty=150, price=245

T=15s  User enters seller/receiver names
       └─ State: bulkSaleSellerName = "Ahmed Mohamed"
       └─ State: bulkSaleReceiverName = "Al-Ahly Hospital"

T=20s  User clicks "Process Sale"
       └─ State: isProcessingBulkSale = true (button disabled)
       └─ Frontend sends fetch request

T=20-30s  Network transit + Backend processing
       └─ Backend locks rows, distributes with FEFO, creates sales records

T=30s  Response received (success)
       └─ State: isGeneralSaleOpen = true → false (modal closes)
       └─ State: cartItems = [] (cleared)
       └─ State: bulkSaleSellerName = "" (cleared)
       └─ State: bulkSaleReceiverName = "" (cleared)
       └─ State: isProcessingBulkSale = false (button enabled)
       └─ Calls: fetchData() to refresh inventory

T=35s  Inventory refreshed from API
       └─ State: inventory.items updated with new quantities
       └─ Dashboard table re-renders with updated batches
       └─ Toast displays: "✅ Order Processed!"
```

---

## 🎯 Complete Request-Response Example

```
═══════════════════════════════════════════════════════════════════════

REQUEST FROM FRONTEND:
═══════════════════════════════════════════════════════════════════════

POST /api/inventory/bulk-sell HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "items": [
    {
      "medicine_id": 5,
      "batch_number": "BATCH-2024-001",
      "medicine_name": "Amoxicillin",
      "quantity": 50,
      "price_per_unit": 2.50
    },
    {
      "medicine_id": 8,
      "batch_number": "BATCH-2024-005",
      "medicine_name": "Paracetamol",
      "quantity": 100,
      "price_per_unit": 1.20
    }
  ],
  "seller_name": "Ahmed Mohamed",
  "receiver_name": "Al-Ahly Hospital"
}

═══════════════════════════════════════════════════════════════════════

RESPONSE FROM BACKEND:
═══════════════════════════════════════════════════════════════════════

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "total_items_processed": 2,
    "total_revenue": 245.00,
    "items": [
      {
        "medicine_name": "Amoxicillin",
        "quantity_sold": 50,
        "unit_price": 2.50,
        "total_price": 125.00,
        "batches_used": ["BATCH-2024-001", "BATCH-2024-002"]
      },
      {
        "medicine_name": "Paracetamol",
        "quantity_sold": 100,
        "unit_price": 1.20,
        "total_price": 120.00,
        "batches_used": ["BATCH-2024-005", "BATCH-2024-006"]
      }
    ]
  }
}

═══════════════════════════════════════════════════════════════════════

FRONTEND PROCESSES RESPONSE:
const result = await response.json();
// result.success = true
// result.data.total_items_processed = 2
// result.data.total_revenue = 245.00
// Show success toast, refresh inventory

═══════════════════════════════════════════════════════════════════════
```

---

## 🔑 Key Takeaways

| Concept            | What It Does                                            | Why It Matters                           |
| ------------------ | ------------------------------------------------------- | ---------------------------------------- |
| **FEFO**           | Sells earliest-expiring batches first                   | Prevents medicine expiration loss        |
| **Transactions**   | All-or-nothing: commit all or rollback all              | Prevents data corruption                 |
| **Row Locking**    | Prevents other users from modifying batches during sale | Prevents double-selling                  |
| **State Refresh**  | Calls fetchData() once after entire bulk sale           | Shows updated quantities, efficient      |
| **Array Payload**  | Sends all items in request body, not path params        | Allows multi-item in one request         |
| **Mapping**        | Transforms frontend format to backend format            | Ensures backend receives expected fields |
| **Error Handling** | Try/catch with rollback on frontend or backend error    | Data stays consistent                    |
