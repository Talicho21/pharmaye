# Printable Invoice Implementation Checklist

## Quick Setup (5 minutes)

### ✅ Phase 1: Component Files Ready

- [x] `PrintableInvoice.tsx` created in `/app/components/`
- [x] `PRINTABLE_INVOICE_GUIDE.md` created (reference documentation)
- [x] `PRINTABLE_INVOICE_INTEGRATION.ts` created (integration examples)

**Files created:**

```
pharmacy-frontend/
├── app/
│   └── components/
│       ├── MultiItemOrderCart.tsx
│       ├── PrintableInvoice.tsx          ← NEW
│       └── ...
├── PRINTABLE_INVOICE_GUIDE.md            ← NEW (reference)
└── PRINTABLE_INVOICE_INTEGRATION.ts      ← NEW (examples)
```

---

## Phase 2: Import PrintableInvoice into MultiItemOrderCart

### Step 1: Add Import

**File:** `pharmacy-frontend/app/components/MultiItemOrderCart.tsx`

**Add at top of file (after existing imports):**

```typescript
import { PrintableInvoice } from "@/app/components/PrintableInvoice";
import type { CartItem } from "@/app/components/PrintableInvoice";
```

### Step 2: Add State for Invoice Display

**Inside the MultiItemOrderCart component function:**

```typescript
const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
const [lastInvoiceNo, setLastInvoiceNo] = useState("");
```

### Step 3: Modify handleSubmit() Function

**Current (existing):**

```typescript
const handleSubmit = async () => {
  if (cartItems.length === 0) {
    alert("Please add at least one item to the order");
    return;
  }
  // ... validation ...

  if (viewMode === "cart") {
    if (!validateStock()) {
      return;
    }
    setViewMode("receipt");
    return;
  }

  try {
    await onSubmit(cartItems, customerName.trim(), tinNumber.trim());
    setCartItems([]);
    setCustomerName("");
    setTinNumber("");
    setViewMode("cart");
    onClose();
  } catch (error) {
    console.error("Error processing order:", error);
  }
};
```

**Modified (add invoice + print):**

```typescript
const handleSubmit = async () => {
  if (cartItems.length === 0) {
    alert("Please add at least one item to the order");
    return;
  }

  if (!customerName.trim()) {
    alert("Please enter customer name");
    return;
  }

  if (!tinNumber.trim()) {
    alert("Please enter TIN number");
    return;
  }

  // NEW: Generate invoice number
  const invoiceNo = Date.now().toString();
  setLastInvoiceNo(invoiceNo);

  if (viewMode === "cart") {
    if (!validateStock()) {
      return;
    }
    setViewMode("receipt");
    return;
  }

  // NEW: Show printable invoice
  setShowPrintableInvoice(true);

  try {
    await onSubmit(cartItems, customerName.trim(), tinNumber.trim());
    // Keep cart items for printing - don't clear yet
  } catch (error) {
    console.error("Error processing order:", error);
    alert("Error processing sale");
    setShowPrintableInvoice(false);
  }
};
```

### Step 4: Add Conditional Render at Return

**Find this in the component:**

```typescript
if (!isOpen) return null;

return (
  <div className="fixed inset-0 z-50 flex items-end bg-black bg-opacity-50 sm:items-center sm:justify-center">
    <div className="w-full max-h-[90vh] bg-white rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col max-w-2xl">
      {/* ... rest of modal ... */}
    </div>
  </div>
);
```

**Add conditional rendering BEFORE the above:**

```typescript
// NEW: If showing invoice, render PrintableInvoice instead
if (showPrintableInvoice) {
  return (
    <PrintableInvoice
      cartItems={cartItems}
      customerName={customerName}
      tinNumber={tinNumber}
      invoiceNo={lastInvoiceNo}
      onPrint={() => {
        // After user prints
        setCartItems([]);
        setCustomerName("");
        setTinNumber("");
        setShowPrintableInvoice(false);
        setViewMode("cart");
        onClose();
      }}
    />
  );
}

if (!isOpen) return null;

return (
  // ... existing modal code ...
);
```

---

## Phase 3: Test Integration

### Test Case 1: Basic Single Item

1. Open the cart modal
2. Search for and add 1 medicine
3. Enter customer name: `Ahmed`
4. Enter TIN: `123456789`
5. Click "Review & Continue"
6. Click "Confirm & Process Sale"
7. **Expected**: PrintableInvoice appears with:
   - Logo in top left
   - Email: israelmohamed3@gmail.com
   - 1 item in table
   - Signature lines at bottom
8. Click "Print Invoice"
9. **Expected**: Print dialog opens
10. Select "Save as PDF"
11. **Expected**: PDF generated with clean layout

### Test Case 2: Multiple Items

1. Add 3+ medicines to cart
2. Verify table expands with `.map()` (no hardcoded limits)
3. Process and print
4. Verify all items appear in PDF

### Test Case 3: Calculations

1. Add item: Qty=2, Price=100 → Subtotal=200
2. Process and print
3. Verify in PDF:
   - Subtotal: ETB 200.00
   - VAT (15%): ETB 30.00
   - Grand Total: ETB 230.00

### Test Case 4: Post-Print Reset

1. Complete print workflow
2. Verify cart clears after printing
3. Verify customer name clears
4. Verify ready for next sale

---

## Phase 4: Troubleshooting

### ❌ "PrintableInvoice not found" Error

**Solution:** Check import path matches your file structure

```typescript
// Correct (assuming PrintableInvoice.tsx in same folder)
import { PrintableInvoice } from "@/app/components/PrintableInvoice";

// Or adjust relative path:
import { PrintableInvoice } from "./PrintableInvoice";
```

### ❌ Logo not appearing in invoice

**Verify:** Logo exists and is accessible

```bash
# Check file exists
ls pharmacy-frontend/public/Logo.jpg

# Verify public folder is served
# (Next.js auto-serves from public/)
```

### ❌ Print dialog doesn't open

**Solution:** Check browser console for errors

```typescript
// Add debug logging
const handlePrint = () => {
  console.log("Print triggered");
  console.log("Invoice items:", cartItems);
  setTimeout(() => {
    window.print();
  }, 100);
};
```

### ❌ Table looks wrong when printing

**Check CSS:**

```bash
# DevTools → Inspect invoice table
# Verify:
# - border-collapse: collapse present
# - -webkit-print-color-adjust: exact on headers
# - No double borders between cells

# Try adding to table:
<table style={{ borderCollapse: 'collapse' }}>
```

### ❌ Missing customer info in print

**Verify:** State updated before showing invoice

```typescript
console.log("Customer:", customerName, "TIN:", tinNumber);
console.log("Cart items:", cartItems.length);
```

---

## Phase 5: Advanced Customizations

### Custom Logo

Replace `/public/Logo.jpg` with your file:

```tsx
<img
  src="/your-logo.png" // Change this
  alt="Express Pharmaceutical"
  className="w-16 h-16"
/>
```

### Custom Company Name

In `PrintableInvoice.tsx`, find:

```tsx
<h1 className="text-2xl font-bold text-gray-900">EXPRESS PHARMA ONE ME.PLS</h1>
```

Change to your name.

### Custom Email Address

Currently: `israelmohamed3@gmail.com`
Find & replace with your email in PrintableInvoice.tsx:

```tsx
<p>Email: your-email@example.com</p>
```

### Custom Tax Rate

Find in PrintableInvoice.tsx:

```typescript
const calculateTax = (subtotal: number, taxRate: number = 0.15): number => {
  return subtotal * taxRate; // 15% VAT
};
```

Change `0.15` to your rate (e.g., `0.10` for 10% VAT).

### Custom Invoice Number Format

Currently: `Date.now()` (e.g., `1778161156197`)

Customize in MultiItemOrderCart.tsx:

```typescript
const invoiceNo = `INV-${new Date().toISOString().split("T")[0]}-${Date.now()}`;
// Result: INV-2026-05-07-1778161156197
```

---

## Phase 6: Deployment Checklist

Before going live:

- [ ] Test on production branch
- [ ] Verify printer connection works
- [ ] Test PDF export on multiple browsers (Chrome, Firefox, Safari)
- [ ] Verify API call to save sale completes before print
- [ ] Check no sensitive data in console logs
- [ ] Test with 100+ item orders (ensure scaling)
- [ ] Verify customer info is captured correctly
- [ ] Test on mobile (print from mobile phone)
- [ ] Document for team (link to PRINTABLE_INVOICE_GUIDE.md)

---

## Phase 7: User Documentation

### For Pharmacy Staff

**How to Print an Invoice:**

1. **Add Items to Cart**
   - Search for medicine
   - Select from dropdown
   - Enter quantity
   - Click "Add Item"

2. **Enter Customer Details**
   - Customer Name: John Doe
   - TIN: 123456789

3. **Review Order**
   - Click "Review & Continue"
   - Check all items and quantities
   - Verify total amount

4. **Confirm & Print**
   - Click "Confirm & Process Sale"
   - Invoice appears on screen
   - Click "Print Invoice" button
   - Select "Save as PDF" or printer
   - Click "Print"

5. **Next Sale**
   - Cart automatically clears
   - Ready for next customer

---

## Code Summary

**Total additions to existing code:**

| Item                     | Lines    | File                                 |
| ------------------------ | -------- | ------------------------------------ |
| Imports                  | 2        | MultiItemOrderCart.tsx               |
| State variables          | 2        | MultiItemOrderCart.tsx               |
| Modified handleSubmit    | +10      | MultiItemOrderCart.tsx               |
| Conditional render       | +15      | MultiItemOrderCart.tsx               |
| **New component**        | **180**  | **PrintableInvoice.tsx**             |
| **Documentation**        | **300+** | **PRINTABLE_INVOICE_GUIDE.md**       |
| **Integration examples** | **200+** | **PRINTABLE_INVOICE_INTEGRATION.ts** |

**Estimated implementation time:** 10-15 minutes

---

## Next Steps

1. ✅ **Review** the `PrintableInvoice.tsx` component code
2. ✅ **Read** PRINTABLE_INVOICE_GUIDE.md for deep dives
3. ✅ **Follow** Phase 2 steps to integrate into MultiItemOrderCart
4. ✅ **Run** Phase 3 tests to verify
5. ✅ **Customize** Phase 5 items to match your branding
6. ✅ **Deploy** with Phase 6 checklist

---

## Support

If you encounter issues:

1. Check this README
2. Review PRINTABLE_INVOICE_GUIDE.md (deep technical explanation)
3. Check browser console (DevTools → F12 → Console)
4. Verify imports and file paths
5. Test with TEST_SCENARIOS from PRINTABLE_INVOICE_INTEGRATION.ts

---

**Created:** May 7, 2026
**Component Version:** 1.0
**Status:** Ready for Integration
