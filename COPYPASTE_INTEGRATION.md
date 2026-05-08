# 🔧 Copy-Paste Integration: page.tsx Updates

## Location Map

Your `page.tsx` has about 2,574 lines. Here's WHERE to add/modify code:

```
page.tsx Structure:
├─ Imports (Lines 1-20)
├─ Type Definitions (Lines 21-100)
├─ Component Function Start: PharmacyDashboard() (Line ~285)
│  ├─ State Declarations (Lines ~300-400)
│  │  └─ ADD: New state for bulk sale here
│  ├─ functions (fetchData, handleSellMedicine, etc.)
│  │  └─ ADD: handleBulkSaleSubmit function here
│  └─ return JSX (Line ~2200)
│     └─ ADD: UI Button + Modal here
└─ End of component
```

---

## 📍 LOCATION 1: Add State Variables

**Find this in page.tsx (around line 350-400):**

```tsx
const [sellQtyInput, setSellQtyInput] = useState("1");
const [sellDateInput, setSellDateInput] = useState(
  new Date().toISOString().split("T")[0],
);
const [sellerNameInput, setSellerNameInput] = useState("");
const [receiverNameInput, setReceiverNameInput] = useState("");
```

**Add AFTER these lines:**

```tsx
// ========== NEW: Multi-Item Order (Bulk Sale) State ==========
const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");
// ========== END: Multi-Item Order State ==========
```

---

## 📍 LOCATION 2: Add Handler Function

**Find this in page.tsx (around line 1030, the handleSellMedicine function ends):**

```tsx
const handleAddStock = async (e: React.FormEvent) => {
  e.preventDefault();
  // ... handleAddStock code ...
};
```

**Add BEFORE handleAddStock (insert this entire function):**

```tsx
// ========== NEW: Bulk Sale Handler ==========
/**
 * Handle Multi-Item Order (Wholesale)
 * Called when user clicks "Process Sale" in the cart modal
 * Sends MULTIPLE items to backend in ONE transaction
 */
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  // ========== INPUT VALIDATION ==========
  if (!cartItems || cartItems.length === 0) {
    showToast(
      "Empty Cart",
      "Please add at least one item to the order.",
      "error",
    );
    return;
  }

  const sellerName = bulkSaleSellerName.trim();
  if (!sellerName) {
    showToast(
      "Seller Name Required",
      "Please enter the seller name for this order.",
      "error",
    );
    return;
  }

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
  const items = cartItems.map((item) => ({
    medicine_id: item.medicineId,
    batch_number: item.batchNumber,
    medicine_name: item.medicineName,
    quantity: item.quantity,
    price_per_unit: item.pricePerUnit,
  }));

  // ========== BUILD PAYLOAD ==========
  const payload = {
    items: items,
    seller_name: sellerName,
    receiver_name: receiverName,
  };

  // ========== SEND TO BACKEND ==========
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
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();

    // ========== ERROR HANDLING ==========
    if (!response.ok) {
      showToast(
        "Order Processing Failed ❌",
        result.message ||
          "Could not process bulk sale. Please check your order and try again.",
        "error",
      );
      console.error("Bulk sale error response:", {
        status: response.status,
        message: result.message,
        error: result.error,
      });
      return;
    }

    // ========== SUCCESS HANDLING ==========
    const {
      data: { total_items_processed, total_revenue, items: processedItems },
    } = result;

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

    // ========== UPDATE UI ==========
    setIsGeneralSaleOpen(false);
    setBulkSaleSellerName("");
    setBulkSaleReceiverName("");

    // ✅ REFRESH INVENTORY
    await fetchData();
  } catch (error) {
    showToast(
      "🌐 Network Error",
      "Failed to submit order. Please check your connection and try again.",
      "error",
    );
    console.error("Bulk sale network error:", error);
  } finally {
    setIsProcessingBulkSale(false);
  }
};
// ========== END: Bulk Sale Handler ==========
```

---

## 📍 LOCATION 3: Import the Component

**Find this at the TOP of page.tsx (around line 1-10):**

```tsx
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
```

**Add AFTER the recharts import:**

```tsx
import {
  MultiItemOrderCart,
  CartItem,
} from "@/app/components/MultiItemOrderCart";
```

**Full result should look like:**

```tsx
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  MultiItemOrderCart,
  CartItem,
} from "@/app/components/MultiItemOrderCart";
```

---

## 📍 LOCATION 4: Add UI Button

**Find this in the return JSX (around line ~2200-2300 where you have action buttons):**

Look for your header/button section. It probably looks like:

```tsx
<header className="flex justify-between items-center mb-6">
  {/* Some existing buttons like Add Stock, Reports, etc */}
  <button onClick={() => showSomething()}>Some Action</button>
</header>
```

**Add this button BEFORE or AFTER your existing buttons:**

```tsx
{
  isAdmin && (
    <button
      onClick={() => setIsGeneralSaleOpen(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg transition duration-200"
    >
      🛒 General Sale (Multi-Item Order)
    </button>
  );
}
```

---

## 📍 LOCATION 5: Add Modal Component

**Find the end of your return statement (before the final closing `</div>`):**

Your return JSX probably ends somewhere around line 2550 with:

```tsx
    </div>
  );
}

export default PharmacyDashboard;
```

**Add BEFORE the final `</div>`:**

```tsx
{
  /* ========== MULTI-ITEM ORDER MODAL ========== */
}
<MultiItemOrderCart
  isOpen={isGeneralSaleOpen}
  onClose={() => setIsGeneralSaleOpen(false)}
  onSubmit={handleBulkSaleSubmit}
  isProcessing={isProcessingBulkSale}
/>;
{
  /* ========== END MODAL ========== */
}
```

---

## 🎯 Complete Integration Blueprint

Here's a visual overview of what to add:

```
page.tsx:

1. LINE ~10: Add import
   import { MultiItemOrderCart, CartItem } from "@/app/components/MultiItemOrderCart";

2. LINE ~380: Add state
   const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
   const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
   const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
   const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");

3. LINE ~1030: Add handler function
   const handleBulkSaleSubmit = async (cartItems: CartItem[]) => { ... };

4. LINE ~2250: Add button in JSX
   <button onClick={() => setIsGeneralSaleOpen(true)}>
     🛒 General Sale (Multi-Item Order)
   </button>

5. LINE ~2560: Add modal component
   <MultiItemOrderCart
     isOpen={isGeneralSaleOpen}
     onClose={() => setIsGeneralSaleOpen(false)}
     onSubmit={handleBulkSaleSubmit}
     isProcessing={isProcessingBulkSale}
   />
```

---

## ✅ Quick Verification Checklist

After adding the code:

- [ ] Import line added (line ~10)
- [ ] State variables added (line ~380)
- [ ] Handler function added (line ~1030)
- [ ] Button added to JSX (line ~2250)
- [ ] Modal component added (line ~2560)
- [ ] No TypeScript errors in IDE
- [ ] Component renders on page

---

## 🧪 Test the Integration

### Test 1: Button Appears

1. Run frontend: `npm run dev`
2. Look for "🛒 General Sale (Multi-Item Order)" button on dashboard
3. Button should be green

### Test 2: Modal Opens

1. Click the button
2. A side panel should open with form to add items
3. Should see a close button (✕)

### Test 3: Add Item to Cart

1. Fill in medicine details in the modal
2. Click "Add Item to Cart"
3. Item should appear in the list below

### Test 4: Submit Order

1. Verify seller and receiver names entered
2. Click "✓ Process Sale"
3. Watch for toast notification at top
4. Check browser Network tab for POST to `/api/inventory/bulk-sell`

### Test 5: Inventory Updates

1. After success, check if quantities decreased
2. Should match what you sold
3. All prices should still display correctly

---

## 🐛 Common Issues & Fixes

### Issue 1: "MultiItemOrderCart is not defined"

**Cause**: Import missing
**Fix**: Add import line at top of page.tsx

### Issue 2: "Cannot find module '@/app/components/MultiItemOrderCart'"

**Cause**: Component file not in correct location
**Fix**: Verify file at `pharmacy-frontend/app/components/MultiItemOrderCart.tsx`

### Issue 3: Component renders but button doesn't show

**Cause**: isAdmin check failing
**Fix**: Ensure you're logged in as admin

### Issue 4: Modal opens but cart mode appears broken

**Cause**: CartItem type not imported
**Fix**: Check import includes `CartItem` type

### Issue 5: Submit fails with "Unauthorized"

**Cause**: Auth token missing
**Fix**: Ensure `authToken` state exists and is set

---

## 📝 Side-by-Side: Before & After

### BEFORE (Current)

```tsx
// User clicks "Sell" on one row
const handleSellMedicine = async (item: InventoryItem) => {
  const response = await fetch("/api/inventory/sell", {
    method: "POST",
    body: JSON.stringify({
      batch_id: item.id,
      quantity_sold: qty,
      // ...single item only
    }),
  });
  await fetchData(); // Refreshes all items
};

// Result: One item sold, entire inventory refreshed
// Problem: Need to repeat 50 times for 50 items
```

### AFTER (Updated)

```tsx
// User clicks "General Sale" button
// Fills cart with multiple items
// Clicks "Process Sale"
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  const response = await fetch("/api/inventory/bulk-sell", {
    method: "POST",
    body: JSON.stringify({
      items: [
        { medicine_id: 1, quantity: 50, ... },
        { medicine_id: 2, quantity: 100, ... },
        { medicine_id: 3, quantity: 75, ... }
      ],
      seller_name: "Ahmed",
      receiver_name: "Hospital"
    })
  });
  await fetchData(); // Refreshes all items
};

// Result: 3 items sold in ONE click, entire inventory refreshed once
// Benefit: Much faster for bulk orders!
```

---

## 🚀 Ready to Integrate?

1. Copy the import statement → paste at top of page.tsx
2. Copy the state variables → paste in state section
3. Copy the handler function → paste in functions section
4. Copy the button code → paste in JSX header
5. Copy the modal code → paste at end of JSX (before final `</div>`)
6. Save file
7. Test in browser

**Done! Your frontend is now synced with the multi-item backend.** ✅

---

For detailed explanation of each part, see [FRONTEND_BACKEND_SYNC.md](./FRONTEND_BACKEND_SYNC.md)
