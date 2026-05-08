# 🔄 Frontend-Backend Logic Sync Guide

## The Bridge: Connecting Next.js Frontend to Multi-Item Backend

**Current State:**

- ✅ Backend: Ready with `/api/inventory/bulk-sell` (multi-item support)
- ❌ Frontend: Still using old single-item `/api/inventory/sell`
- 🎯 Goal: Update frontend to use new bulk endpoint with proper data structures

---

## 📌 Quick Comparison: Old vs New Endpoints

### ❌ **OLD SINGLE-ITEM ENDPOINT** (Current)

```
Endpoint:  POST /api/inventory/sell
Parameter: Path parameter (batch ID in URL or body ID field)
Request:   { batch_id: 123, quantity_sold: 10, ... }
Response:  { message: "Success" }
Issue:     One button click = one sale = one transaction
```

### ✅ **NEW MULTI-ITEM ENDPOINT** (Backend Ready)

```
Endpoint:  POST /api/inventory/bulk-sell
Parameter: Array in request body
Request:   {
  items: [
    { medicine_id: 1, batch_number: "B001", quantity: 50, ... },
    { medicine_id: 2, batch_number: "B002", quantity: 100, ... }
  ],
  seller_name: "Ahmed",
  receiver_name: "Hospital XYZ"
}
Response:  {
  success: true,
  data: {
    total_items_processed: 2,
    total_revenue: "575.00",
    items: [ ... ]
  }
}
Benefit:   Multiple items = one transaction = atomic (all or nothing)
```

---

## 🔑 DEEP DIVE #1: Path Parameters vs Request Body

### Understanding the Difference

#### ❌ **Path Parameter Approach** (Old Single-Item)

```
GET  /api/inventory/sell/:id         ← ID is in URL path
GET  /api/users/123                  ← Retrieves user 123
DELETE /api/batches/456              ← Deletes batch 456

Characteristics:
✓ Used for identifying a single resource
✓ Visible in browser history/logs
✗ Can only target one resource at a time
✗ Not suitable for sending complex data
```

**Frontend Code (Old Way):**

```javascript
fetch("http://localhost:5000/api/inventory/sell", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    batch_id: 123, // ← Single ID
    quantity_sold: 10,
    seller_name: "Ahmed",
  }),
});
```

---

#### ✅ **Request Body Approach** (New Multi-Item)

```
POST /api/inventory/bulk-sell        ← Fixed endpoint path
{                                     ← Data is in REQUEST BODY (JSON)
  items: [ ... ],
  seller_name: "Ahmed"
}

Characteristics:
✓ Used for submitting complex data structures
✓ Can handle arrays of objects
✓ Not visible in browser history
✓ Perfect for multi-item operations
```

**Frontend Code (New Way):**

```javascript
fetch("http://localhost:5000/api/inventory/bulk-sell", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    items: [                // ← Array of items
      { medicine_id: 1, quantity: 50, ... },
      { medicine_id: 2, quantity: 100, ... }
    ],
    seller_name: "Ahmed"
  })
});
```

---

### Why Request Body for Multi-Item Sales?

| Aspect             | Path Parameter            | Request Body          |
| ------------------ | ------------------------- | --------------------- |
| **Single item**    | ✅ Clean                  | ✅ Works              |
| **Multiple items** | ❌ Unwieldy (ID1,ID2,ID3) | ✅ Perfect (array)    |
| **Complex data**   | ❌ Limited                | ✅ No limit           |
| **Security**       | ⚠️ Visible in logs        | ✅ Encrypted in HTTPS |
| **Readability**    | ✓ Simple                  | ✓ Clear structure     |
| **Standard REST**  | GET single resource       | POST create/modify    |

**Example: Why you CAN'T use path parameters for multi-item:**

```javascript
// ❌ This doesn't work well:
fetch("/api/inventory/sell/123,456,789", { ... })

// ✅ This is much better:
fetch("/api/inventory/bulk-sell", {
  body: JSON.stringify({
    items: [
      { medicine_id: 123, quantity: 50 },
      { medicine_id: 456, quantity: 100 },
      { medicine_id: 789, quantity: 75 }
    ]
  })
})
```

---

## 🔑 DEEP DIVE #2: Line-by-Line React Code Breakdown

### Gathering Items into a Single Array

**Scenario**: User has a cart with 3 medicines they want to sell.

**Frontend State Structure:**

```typescript
// In your page.tsx, you'll have this cart state:
const [cartItems, setCartItems] = useState<CartItem[]>([
  {
    id: "cart-1",
    medicineId: 1,
    batchNumber: "B001",
    medicineName: "Aspirin",
    quantity: 50,
    pricePerUnit: 2.5,
    expiryDate: "2025-06-15",
  },
  {
    id: "cart-2",
    medicineId: 2,
    batchNumber: "B002",
    medicineName: "Paracetamol",
    quantity: 100,
    pricePerUnit: 1.5,
    expiryDate: "2025-12-31",
  },
  {
    id: "cart-3",
    medicineId: 3,
    batchNumber: "B003",
    medicineName: "Ibuprofen",
    quantity: 75,
    pricePerUnit: 3.0,
    expiryDate: "2025-09-20",
  },
]);
```

**Gathering Function: Line-by-Line**

```typescript
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  // ========== STEP 1: VALIDATE INPUTS ==========

  // Check 1: Cart is not empty
  if (!cartItems || cartItems.length === 0) {
    showToast(
      "Empty Cart",
      "Please add at least one item to the order.",
      "error",
    );
    return; // ← Exit early, don't proceed
  }

  // ========== STEP 2: VALIDATE SELLER/RECEIVER NAMES ==========

  // Get the names from your form inputs (assuming they exist in state)
  const sellerName = bulkSaleSellerName.trim();
  const receiverName = bulkSaleReceiverName.trim();

  // Check 2: Seller name provided
  if (!sellerName) {
    showToast("Seller Required", "Please enter the seller name.", "error");
    return;
  }

  // Check 3: Receiver name provided
  if (!receiverName) {
    showToast("Receiver Required", "Please enter the receiver name.", "error");
    return;
  }

  // ========== STEP 3: TRANSFORM CART INTO API FORMAT ==========

  // This is the KEY step: Convert CartItem[] into the format the backend expects
  //
  // BEFORE (frontend cart):
  // [
  //   { id: "cart-1", medicineId: 1, quantity: 50, ... }
  // ]
  //
  // AFTER (API format):
  // [
  //   { medicine_id: 1, quantity: 50, ... }
  // ]

  const items = cartItems.map((item) => ({
    // Map frontend field names to backend field names
    medicine_id: item.medicineId, // frontend: medicineId → backend: medicine_id
    batch_number: item.batchNumber, // keep as-is (backend expects this name)
    medicine_name: item.medicineName, // frontend: medicineName → backend: medicine_name
    quantity: item.quantity, // keep as-is
    price_per_unit: item.pricePerUnit, // frontend: pricePerUnit → backend: price_per_unit
    // Note: We DON'T send expiryDate because backend looks it up from database
  }));

  // At this point, `items` looks like:
  // [
  //   {
  //     medicine_id: 1,
  //     batch_number: "B001",
  //     medicine_name: "Aspirin",
  //     quantity: 50,
  //     price_per_unit: 2.50
  //   },
  //   {
  //     medicine_id: 2,
  //     batch_number: "B002",
  //     medicine_name: "Paracetamol",
  //     quantity: 100,
  //     price_per_unit: 1.50
  //   },
  //   ...
  // ]

  // ========== STEP 4: BUILD FINAL PAYLOAD ==========

  // Combine items array + seller/receiver names into one object
  const payload = {
    items: items, // ← THE ARRAY (all items at once!)
    seller_name: sellerName, // ← Underscores for backend
    receiver_name: receiverName,
  };

  // Payload now looks like:
  // {
  //   items: [ { medicine_id: 1, ... }, { medicine_id: 2, ... }, ... ],
  //   seller_name: "Ahmed",
  //   receiver_name: "Hospital XYZ"
  // }

  // ========== STEP 5: SEND TO BACKEND ==========

  setIsProcessingBulkSale(true); // Show loading state

  try {
    const response = await fetch(
      "http://localhost:5000/api/inventory/bulk-sell", // ← BULK endpoint!
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`, // ← Auth token
        },
        body: JSON.stringify(payload), // ← ENTIRE payload in body
      },
    );

    // ========== STEP 6: HANDLE RESPONSE ==========

    const result = await response.json();

    // Check if request was successful
    if (!response.ok) {
      // ❌ Error case
      showToast(
        "Order Failed",
        result.message || "Could not process bulk sale",
        "error",
      );
      return; // ← Stop here, don't proceed
    }

    // ✅ Success case
    const { data } = result;
    showToast(
      "✅ Order Processed!",
      `${data.total_items_processed} items sold | Revenue: ETB ${data.total_revenue}`,
      "success",
    );

    // ========== STEP 7: UPDATE UI ==========

    // Clear the cart modal
    setIsGeneralSaleOpen(false);

    // Clear input fields
    setBulkSaleSellerName("");
    setBulkSaleReceiverName("");

    // ⭐ REFRESH INVENTORY (critical!)
    // This fetches the updated inventory from the backend
    // All quantities will be recalculated
    await fetchData();
  } catch (error) {
    showToast("Network Error", "Failed to submit order", "error");
    console.error("Bulk sale error:", error);
  } finally {
    setIsProcessingBulkSale(false); // Hide loading state
  }
};
```

---

## 🔑 DEEP DIVE #3: Preventing Overselling (Validation Logic)

### Frontend-Side Validation (User Experience)

**Problem**: User adds 200 units of Aspirin but only 150 exist.
**Solution**: Validate BEFORE sending to backend.

#### Step 1: Check Individual Item Availability

```typescript
// When user adds an item to cart, validate quantity
const addItemToCart = (item: InventoryItem, requestedQty: number) => {
  // ========== CHECK 1: Quantity not negative ==========
  if (requestedQty <= 0) {
    showToast("Invalid Qty", "Quantity must be greater than 0", "error");
    return; // ← Don't add to cart
  }

  // ========== CHECK 2: Quantity doesn't exceed available stock ==========
  if (requestedQty > item.quantity) {
    showToast(
      "Insufficient Stock",
      `Only ${item.quantity} available, but you requested ${requestedQty}`,
      "error",
    );
    return; // ← Don't add to cart
  }

  // ========== ALL CHECKS PASSED ==========
  // Add to cart
  const newCartItem: CartItem = {
    id: `${Date.now()}-${Math.random()}`,
    medicineId: item.id,
    batchNumber: item.batch_number,
    medicineName: item.name,
    quantity: requestedQty,
    pricePerUnit: item.price_per_unit,
    expiryDate: item.expiry_date,
  };

  setCartItems([...cartItems, newCartItem]);
};
```

#### Step 2: Check Total Quantity Before Submit

```typescript
// Right before sending to backend, do a final sanity check
const validateBeforeSubmit = (cartItems: CartItem[]): boolean => {
  // ========== CHECK 1: Array not empty ==========
  if (cartItems.length === 0) {
    showToast("Empty Cart", "Add items to order", "error");
    return false;
  }

  // ========== CHECK 2: Each item has valid quantity ==========
  for (let i = 0; i < cartItems.length; i++) {
    const item = cartItems[i];

    // Should never happen (prevented at add time), but double-check
    if (item.quantity <= 0) {
      showToast(
        "Invalid Item",
        `Item ${i + 1}: Quantity must be positive`,
        "error",
      );
      return false;
    }
  }

  // ========== CHECK 3: Seller/Receiver names provided ==========
  if (!bulkSaleSellerName.trim() || !bulkSaleReceiverName.trim()) {
    showToast(
      "Missing Info",
      "Please enter seller and receiver names",
      "error",
    );
    return false;
  }

  // ========== ALL CHECKS PASSED ==========
  return true; // ← Safe to proceed
};
```

#### Step 3: Display Real-Time Cart Summary

```typescript
// Show user what they're about to sell
const CartSummary = ({ cartItems }: { cartItems: CartItem[] }) => {
  const totalQty = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + (item.quantity * item.pricePerUnit),
    0
  );

  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-sm font-semibold">Order Summary</p>
      <p>Items in cart: {cartItems.length}</p>
      <p>Total quantity: {totalQty} units</p>
      <p className="text-lg font-bold text-green-600">
        Total value: ETB {totalPrice.toFixed(2)}
      </p>

      {/* Individual items */}
      {cartItems.map((item, idx) => (
        <div key={item.id} className="text-xs mt-2 p-2 bg-white rounded">
          <p className="font-semibold">{idx + 1}. {item.medicineName}</p>
          <p>Batch: {item.batchNumber} | Qty: {item.quantity}</p>
          <p>Unit Price: ETB {item.pricePerUnit}</p>
        </div>
      ))}
    </div>
  );
};
```

### Backend-Side Validation (Data Integrity)

The backend ALSO validates, as a safety net:

```javascript
// In bulkSaleController.js (backend)

exports.bulkSaleMedicine = async (req, res) => {
  const { items, seller_name, receiver_name } = req.body;

  // ========== BACKEND CHECK 1: Items array provided ==========
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "At least one item must be included in the order.",
      success: false,
    });
  }

  // ========== BACKEND CHECK 2: Each item valid ==========
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        message: `Item ${i + 1}: Quantity must be a positive integer.`,
        success: false,
      });
    }
  }

  // ========== BACKEND CHECK 3: Database stock verification ==========
  // Inside the transaction loop, verify each batch exists and has stock

  for (const item of items) {
    const [batchRows] = await connection.execute(
      `SELECT quantity FROM batches WHERE medicine_id = ? LIMIT 1`,
      [item.medicine_id],
    );

    if (!batchRows.length) {
      await connection.rollback();
      return res.status(400).json({
        message: `Item: Medicine not found in database`,
        success: false,
        processedItems: [],
      });
    }

    // ⭐ KEY: Check if we have enough stock
    // (FEFO logic might need to pull from multiple batches)
    if (item.quantity > batchRows[0].quantity) {
      await connection.rollback();
      return res.status(400).json({
        message: `Item: Insufficient stock. Requested: ${item.quantity}, Available: ${batchRows[0].quantity}`,
        success: false,
        processedItems: [],
      });
    }
  }

  // ========== BACKEND CHECK 4: Process sale with ROLLBACK protection ==========
  // If ANY check fails after here, entire transaction rolls back
  // This ensures database consistency
};
```

---

## 🔄 State Refresh: Updating UI After Bulk Sale

### The Problem

```
Before Sale:
Item 1: 100 units
Item 2: 200 units

User sells: 50 of Item 1, 100 of Item 2

After Sale (Database Updated):
Item 1: 50 units
Item 2: 100 units

Issue: Frontend still shows old numbers unless we refresh!
```

### The Solution: fetchData() Call

```typescript
// After successful bulk sale:

const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  try {
    // ... send request to backend ...

    if (!response.ok) {
      showToast("Order Failed", result.message, "error");
      return;
    }

    showToast(
      "✅ Order Processed!",
      `${result.data.total_items_processed} items sold`,
      "success",
    );

    // ⭐ KEY STEP: Refresh inventory
    // This re-fetches ALL items from /api/inventory endpoint
    // All quantities + prices are recalculated from database
    await fetchData();

    // Clear UI
    setIsGeneralSaleOpen(false);
    setBulkSaleSellerName("");
    setBulkSaleReceiverName("");
  } catch (error) {
    showToast("Network Error", "Failed to submit order", "error");
  } finally {
    setIsProcessingBulkSale(false);
  }
};
```

### How fetchData() Works

```typescript
// In your dashboard component:

const fetchData = async () => {
  try {
    // ========== MAKE REQUEST TO BACKEND ==========
    // This hits the /api/inventory endpoint (GET request)
    const res = await fetch("http://localhost:5000/api/inventory");

    if (!res.ok) throw new Error("Failed to fetch");

    // ========== GET FRESH DATA FROM DATABASE ==========
    const data = await res.json();
    // data is NOW: [
    //   { id: 1, name: "Aspirin", quantity: 50, ... },  ← Updated!
    //   { id: 2, name: "Paracetamol", quantity: 100, ... },  ← Updated!
    //   ...
    // ]

    // ========== UPDATE REACT STATE ==========
    // This triggers re-render with new numbers
    setInventory(data);
  } catch (err) {
    console.error("Fetch error:", err);
    // Silently fail (user can see old data still)
  }
};
```

### Visual Flow

```
User clicks "Process Sale"
          ↓
Frontend validates cart
          ↓
POST to /api/inventory/bulk-sell { items: [...] }
          ↓
Backend:
  • BEGIN TRANSACTION
  • Verify stock for each item
  • Deduct quantities
  • INSERT sales records
  • COMMIT (all or nothing)
          ↓
Frontend receives: { success: true, data: { ... } }
          ↓
Frontend calls: await fetchData()
          ↓
GET from /api/inventory (fetch fresh data)
          ↓
Database returns: { items: [{ id: 1, quantity: 50, ... }, ...] }
          ↓
setInventory(data)  ← Triggers React re-render
          ↓
UI shows updated quantities ✅
```

---

## 📝 Updated Frontend Code: Complete Handler

Here's the complete function to replace your old `handleSellMedicine`:

```typescript
// ========== ADD THIS NEW STATE TO YOUR COMPONENT ==========

// For multi-item order feature
const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");

// ========== ADD THIS NEW HANDLER FUNCTION ==========

/**
 * Handle Bulk Sale Submission
 *
 * This replaces the old single-item handleSellMedicine
 * Sends MULTIPLE items in ONE request to backend
 *
 * Flow:
 * 1. Validate cart items
 * 2. Transform cartItems into API format
 * 3. POST to /api/inventory/bulk-sell
 * 4. If success: refresh inventory with fetchData()
 * 5. If error: show error toast + manual rollback (already done by backend)
 */
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  // ========== INPUT VALIDATION ==========

  // Check 1: Cart not empty
  if (!cartItems || cartItems.length === 0) {
    showToast(
      "Empty Cart",
      "Please add at least one item to the order.",
      "error",
    );
    return;
  }

  // Check 2: Seller name provided
  const sellerName = bulkSaleSellerName.trim();
  if (!sellerName) {
    showToast(
      "Seller Name Required",
      "Please enter the seller name for this order.",
      "error",
    );
    return;
  }

  // Check 3: Receiver name provided
  const receiverName = bulkSaleReceiverName.trim();
  if (!receiverName) {
    showToast(
      "Receiver Name Required",
      "Please enter the receiver name for this order.",
      "error",
    );
    return;
  }

  // ========== TRANSFORM CART INTO API FORMAT ==========

  // Convert cartItems (frontend format) into items (backend format)
  // Frontend: { medicineId, pricePerUnit, medicineName, ... }
  // Backend:  { medicine_id, price_per_unit, medicine_name, ... }
  const items = cartItems.map((item) => ({
    medicine_id: item.medicineId,
    batch_number: item.batchNumber,
    medicine_name: item.medicineName,
    quantity: item.quantity,
    price_per_unit: item.pricePerUnit,
    // Don't send expiryDate - backend looks it up
  }));

  // ========== BUILD PAYLOAD ==========

  const payload = {
    items: items, // Array of items
    seller_name: sellerName, // Underscores for backend
    receiver_name: receiverName,
  };

  // ========== SEND TO BACKEND ==========

  setIsProcessingBulkSale(true);

  try {
    const response = await fetch(
      "http://localhost:5000/api/inventory/bulk-sell", // ← BULK endpoint
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`, // Include auth token
        },
        body: JSON.stringify(payload), // ← ENTIRE payload in body
      },
    );

    const result = await response.json();

    // ========== ERROR HANDLING ==========

    if (!response.ok) {
      // Backend returned error
      showToast(
        "Order Processing Failed ❌",
        result.message ||
          "Could not process bulk sale. Please check your order and try again.",
        "error",
      );

      // Log details for debugging
      console.error("Bulk sale error response:", {
        status: response.status,
        message: result.message,
        error: result.error,
      });
      return; // Stop - don't update UI
    }

    // ========== SUCCESS HANDLING ==========

    const {
      data: { total_items_processed, total_revenue, items: processedItems },
    } = result;

    // Build success message showing first 3 items
    const itemsSummary = processedItems
      .slice(0, 3)
      .map(
        (item: any) =>
          `${item.medicine_name} (${item.quantity_deducted || item.quantity_sold} units)`,
      )
      .join(", ");

    const summary =
      processedItems.length > 3
        ? `${itemsSummary}, +${processedItems.length - 3} more`
        : itemsSummary;

    showToast(
      "✅ Order Processed Successfully!",
      `${total_items_processed} items | ${summary} | Total: ETB ${total_revenue}`,
      "success",
    );

    // ========== UPDATE UI (CRITICAL!) ==========

    // Close the cart modal
    setIsGeneralSaleOpen(false);

    // Clear input fields
    setBulkSaleSellerName("");
    setBulkSaleReceiverName("");

    // ⭐ REFRESH INVENTORY FROM DATABASE
    // This fetches the latest quantities and prices
    // All displayed numbers will update automatically
    await fetchData();
  } catch (error) {
    showToast(
      "🌐 Network Error",
      "Failed to submit order. Please check your connection and try again.",
      "error",
    );
    console.error("Bulk sale network error:", error);
  } finally {
    setIsProcessingBulkSale(false); // Hide loading indicator
  }
};

// ========== KEEP YOUR OLD HANDLER FOR BACKWARD COMPATIBILITY ==========

// If you want to keep single-item selling alongside multi-item:
// Leave your existing handleSellMedicine() as-is
// Users can use either the "Sell" button (single) or "General Sale" button (bulk)
```

---

## 🎯 Backend Express Route: Already Ready!

Your backend route is already set up. Here's what it does:

```javascript
// In inventoryRoutes.js

router.post(
  "/inventory/bulk-sell", // ← Fixed endpoint
  ...requireAdmin, // ← Requires admin auth
  bulkSaleController.bulkSaleMedicine, // ← Calls bulk handler
);

// When frontend POSTs to this endpoint:
// 1. Express receives request
// 2. requireAdmin middleware checks auth + role
// 3. bulkSaleController.bulkSaleMedicine() processes:
//    - Validates items array
//    - Begins transaction
//    - For each item:
//      • Find earliest-expiring batches (FEFO)
//      • Deduct quantities
//      • Insert sales records
//    - Commits transaction (atomic)
// 4. Returns response with total_revenue, items_processed, etc
```

---

## 🔍 Side-by-Side Comparison

### OLD: Single-Item Sale

```typescript
// Frontend
const handleSellMedicine = async (item: InventoryItem) => {
  // ❌ Gets called for EVERY item
  // ❌ One click per item
  // ❌ 50 clicks for 50 items

  const response = await fetch("/api/inventory/sell", {
    method: "POST",
    body: JSON.stringify({
      batch_id: item.id, // Single ID
      quantity_sold: qty,
      seller_name: "...",
      receiver_name: "...",
    }),
  });

  // Updates only this one item after response
  await fetchData(); // Fetches ALL items (wasteful)
};
```

### NEW: Multi-Item Sale

```typescript
// Frontend
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  // ✅ Called ONCE for all items
  // ✅ One click = entire order
  // ✅ 1 click for 50 items

  const response = await fetch("/api/inventory/bulk-sell", {
    method: "POST",
    body: JSON.stringify({
      items: [                        // Array of items
        { medicine_id: 1, quantity: 50, ... },
        { medicine_id: 2, quantity: 100, ... },
        { medicine_id: 3, quantity: 75, ... }
      ],
      seller_name: "...",
      receiver_name: "..."
    })
  });

  // Updates all items after ONE response
  await fetchData();  // Fetches ALL items (now they're all fresh)
};
```

---

## 📊 Request Payload Comparison

### OLD Format

```json
POST /api/inventory/sell
{
  "batch_id": 123,
  "quantity_sold": 10,
  "seller_name": "Ahmed",
  "receiver_name": "Hospital"
}
// ❌ Only 1 item per request
```

### NEW Format

```json
POST /api/inventory/bulk-sell
{
  "items": [
    {
      "medicine_id": 1,
      "batch_number": "B001",
      "medicine_name": "Aspirin",
      "quantity": 50,
      "price_per_unit": 2.50
    },
    {
      "medicine_id": 2,
      "batch_number": "B002",
      "medicine_name": "Paracetamol",
      "quantity": 100,
      "price_per_unit": 1.50
    },
    {
      "medicine_id": 3,
      "batch_number": "B003",
      "medicine_name": "Ibuprofen",
      "quantity": 75,
      "price_per_unit": 3.00
    }
  ],
  "seller_name": "Ahmed",
  "receiver_name": "Central Hospital Supply"
}
// ✅ Multiple items in single request
```

---

## 📋 Response Comparison

### OLD Response

```json
{
  "message": "Success"
}
// ❌ Minimal info, no calculation
```

### NEW Response

```json
{
  "message": "Order processed successfully",
  "success": true,
  "data": {
    "total_items_processed": 3,
    "total_revenue": "575.00",
    "items": [
      {
        "medicine_name": "Aspirin",
        "batch_number": "B001",
        "quantity_deducted": 50,
        "unit_price": 2.5,
        "subtotal": 125.0
      },
      {
        "medicine_name": "Paracetamol",
        "batch_number": "B002",
        "quantity_deducted": 100,
        "unit_price": 1.5,
        "subtotal": 150.0
      },
      {
        "medicine_name": "Ibuprofen",
        "batch_number": "B003",
        "quantity_deducted": 75,
        "unit_price": 3.0,
        "subtotal": 225.0
      }
    ]
  }
}
// ✅ Detailed info per item + calculations
```

---

## ✅ Integration Checklist

- [ ] Add new state variables (isGeneralSaleOpen, etc.)
- [ ] Copy handleBulkSaleSubmit function above
- [ ] Add "General Sale" button to dashboard
- [ ] Add MultiItemOrderCart modal to JSX
- [ ] Import MultiItemOrderCart component
- [ ] Test with cart containing 1 item
- [ ] Test with cart containing 5 items
- [ ] Verify inventory refreshes after sale
- [ ] Check error handling (insufficient stock)
- [ ] Verify FEFO distribution in database
- [ ] Check that old single-item selling still works (optional)

---

## 🎓 Key Takeaways

| Concept               | Old Way                 | New Way                      |
| --------------------- | ----------------------- | ---------------------------- |
| **Request Style**     | Path param (/sell/:id)  | Body array (POST /bulk-sell) |
| **Items Per Request** | 1                       | Many                         |
| **Transactions**      | Many independent        | 1 atomic                     |
| **State Refresh**     | After each sale         | After entire order           |
| **Data Format**       | Simple ID               | Complex array structure      |
| **Error Handling**    | Per-item                | All-or-nothing rollback      |
| **User Clicks**       | 50 per order (50 items) | 1 per order (any items)      |

---

**Ready to sync your frontend to the backend? Start with adding the handleBulkSaleSubmit function above!** 🚀
