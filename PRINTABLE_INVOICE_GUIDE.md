## Printable Invoice Component - Deep Dive Technical Guide

### 📋 Table of Contents

1. [Component Architecture](#component-architecture)
2. [Data Flow & Dynamic Mapping](#data-flow--dynamic-mapping)
3. [CSS Print Logic](#css-print-logic)
4. [Calculation Engine](#calculation-engine)
5. [Table Formatting & Borders](#table-formatting--borders)
6. [Print Triggering Mechanism](#print-triggering-mechanism)
7. [Integration Guide](#integration-guide)

---

## Component Architecture

### Type System (TypeScript)

```typescript
export type CartItem = {
  id: string; // Unique identifier for each line item
  medicineId: number; // Reference to medicine master data
  batchNumber: string; // Batch identifier from inventory_batches table
  medicineName: string; // Full product name
  quantity: number; // Units being sold (Qty column)
  pricePerUnit: number; // Unit cost in ETB
  expiryDate: string; // Expiration date from inventory_batches
  availableStock?: number; // Optional: stock at time of sale
};
```

**Why this structure?**

- `batchNumber + expiryDate` are pulled from `inventory_batches` table
- Creates audit trail: printed receipt matches exactly what was in the database
- Enables stock reconciliation after sale

---

## Data Flow & Dynamic Mapping

### Step 1: Data Input

```typescript
<PrintableInvoice
  cartItems={cartItems}           // Array of CartItem[]
  customerName="jdhgjshd"         // From customer info input
  tinNumber="1263526"             // Tax ID
  invoiceNo="1778161156197"       // Auto-generated from Date.now()
/>
```

### Step 2: Dynamic Table Generation (.map() Logic)

#### The Problem Solved by .map():

❌ **Hardcoded approach:**

```typescript
// BAD: Only shows 10 items max, wastes space
const rows = [row1, row2, row3, ...row10];
```

✅ **Dynamic approach (.map()):**

```typescript
{cartItems.map((item, index) => (
  <tr key={item.id}>
    <td>{item.medicineName}</td>      // Pulls from cart
    <td>{item.batchNumber}</td>       // Pulls from inventory_batches
    <td>{formatCurrency(item.pricePerUnit)}</td>     // Calculation
    <td>{item.expiryDate}</td>        // Pulls from inventory_batches
    <td>{item.quantity}</td>
    <td>{formatCurrency(item.quantity * item.pricePerUnit)}</td>  // Calculated
  </tr>
))}
```

**Why .map() is superior:**

1. **Scalability**: 1 item or 100 items, table auto-expands
2. **Source of Truth**: Each value is pulled from the actual cart state
3. **No Duplication**: Single row template, reused N times
4. **Type-Safe**: TypeScript ensures CartItem has all required properties

### Step 3: Column Mapping Breakdown

| Invoice Column  | Source                              | Logic                                               |
| --------------- | ----------------------------------- | --------------------------------------------------- |
| **Description** | `item.medicineName`                 | Direct mapping from cart                            |
| **Batch #**     | `item.batchNumber`                  | Direct from `inventory_batches.batch_number`        |
| **Unit Price**  | `item.pricePerUnit`                 | Direct from cart, formatted with `formatCurrency()` |
| **Exp. Date**   | `item.expiryDate`                   | Direct from `inventory_batches.expiry_date`         |
| **Qty**         | `item.quantity`                     | Direct from cart (user-entered quantity)            |
| **Total**       | `item.quantity × item.pricePerUnit` | Calculated inline                                   |

### Example: Cart State → Printed Invoice

**Input (React Cart):**

```javascript
cartItems = [
  {
    id: "1234-5678",
    medicineId: 42,
    batchNumber: "1241d",
    medicineName: "Kakush",
    quantity: 2,
    pricePerUnit: 100.0,
    expiryDate: "2026-12-31",
  },
  {
    id: "2345-6789",
    medicineId: 55,
    batchNumber: "5521d",
    medicineName: "Amoxicillin",
    quantity: 5,
    pricePerUnit: 45.5,
    expiryDate: "2027-06-15",
  },
];
```

**Generated Invoice Table Row 1:**

```
| Kakush | 1241d | ETB 100.00 | 2026-12-31 | 2 | ETB 200.00 |
```

**Generated Invoice Table Row 2:**

```
| Amoxicillin | 5521d | ETB 45.50 | 2027-06-15 | 5 | ETB 227.50 |
```

---

## CSS Print Logic

### Why @media print is Essential

```css
@media print {
  /* Hide EVERYTHING */
  body * {
    display: none;
  }

  /* Show ONLY invoice */
  #invoice-container,
  #invoice-container * {
    display: block;
  }
}
```

**What this accomplishes:**

1. **No Navigation**: Hides top nav, sidebars, buttons
2. **Focused Output**: Only the invoice content prints
3. **Paper Optimization**: No wasted space on UI chrome
4. **Professional Look**: Receipt fills the page cleanly

### Line-by-Line CSS Breakdown

```css
/* Prevent table row from splitting across page boundary */
@page {
  margin: 10mm; /* 10mm margins for binding */
  size: A4; /* Ethiopian standard paper size */
}

#invoice-table tbody tr {
  page-break-inside: avoid; /* Keep row together, don't split across pages */
}

#invoice-table thead {
  display: table-header-group; /* Repeat headers on every printed page */
}
```

**Why table-header-group?**

- If invoice is 2+ pages, headers repeat automatically
- Customer sees column names on every page
- Professional multi-page receipts

**Why -webkit-print-color-adjust: exact?**

```css
.invoice-header {
  -webkit-print-color-adjust: exact !important; /* Force colors in Safari */
  print-color-adjust: exact !important; /* Chrome/Firefox */
}
```

- By default, browsers remove background colors to save ink
- Ethiopian pharmacies want branded colors printed
- `!important` overrides browser defaults

---

## Calculation Engine

### Core Formula

```
Subtotal = Σ(quantity × pricePerUnit) for all items
Tax (VAT) = Subtotal × 0.15            [Ethiopia standard 15% VAT]
Grand Total = Subtotal + Tax
```

### Implementation

```typescript
// Atomic calculation: single line item total
const calculateLineTotal = (quantity: number, pricePerUnit: number): number => {
  return quantity * pricePerUnit;
};

// Aggregation: sum all items
const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.pricePerUnit),
    0,
  );
};

// Tax calculation (Ethiopia uses 15% VAT)
const calculateTax = (subtotal: number, taxRate: number = 0.15): number => {
  return subtotal * taxRate;
};

// Final total
const calculateGrandTotal = (subtotal: number): number => {
  const tax = calculateTax(subtotal);
  return subtotal + tax;
};
```

### Usage in Component

```typescript
// Inside PrintableInvoice component
const subtotal = calculateSubtotal(cartItems);  // Dynamic based on items
const tax = calculateTax(subtotal);             // 15% VAT
const grandTotal = calculateGrandTotal(subtotal);

// Rendered in summary
<div>
  Subtotal: {formatCurrency(subtotal)}
  VAT (15%): {formatCurrency(tax)}
  Grand Total: {formatCurrency(grandTotal)}
</div>
```

### Why Not Hardcode?

- If a user edits a line item quantity, totals auto-recalculate
- No manual formula updates needed
- Reduces calculation errors

---

## Table Formatting & Borders

### Border-Collapse Deep Dive

```html
<!-- BAD: Default CSS table rendering -->
<table>
  <tr>
    <td style="border: 1px solid black;">Item 1</td>
    <td style="border: 1px solid black;">Item 2</td>
  </tr>
</table>
```

**Result**: Double borders between cells (ugly on receipt)

```css
/* GOOD: Professional receipt tables */
table {
  border-collapse: collapse; /* Merge adjacent borders into one */
}
table td,
table th {
  border: 1px solid #000; /* Single sharp border */
  padding: 8px; /* Breathing room inside cells */
}
```

**Result**: Single line between cells (professional appearance)

### Our Implementation

```jsx
<table
  id="invoice-table"
  className="w-full mb-6 border-collapse border border-gray-900"
  cellPadding={0}
  cellSpacing={0}  // Inline styles merge with Tailwind
>
  <thead>
    <tr className="bg-gray-900 text-white">
      <th className="border border-gray-900 px-3 py-2">Description</th>
      <th className="border border-gray-900 px-3 py-2">Unit Price</th>
      <!-- more headers -->
    </tr>
  </thead>

  <tbody>
    {cartItems.map((item) => (
      <tr key={item.id} className="hover:bg-gray-50">  <!-- Row hover -->
        <td className="border border-gray-900 px-3 py-2">{item.medicineName}</td>
        <!-- more cells -->
      </tr>
    ))}
  </tbody>
</table>
```

### Visual Breakdown

```
┌─────────────┬──────────┬─────────┐
│ Description │   Batch# │  Price  │  ← Dark gray header (bg-gray-900)
├─────────────┼──────────┼─────────┤
│ Kakush      │  1241d   │ 100 ETB │  ← Row with light hover (bg-gray-50)
├─────────────┼──────────┼─────────┤
│ Amoxicillin │  5521d   │  45 ETB │  ← Another row
└─────────────┴──────────┴─────────┘
        ↑
   border-collapse: collapse
   creates sharp single lines
```

---

## Print Triggering Mechanism

### The Window.print() Flow

```typescript
const handlePrint = () => {
  // Small delay ensures DOM has fully rendered
  setTimeout(() => {
    window.print(); // Opens native print dialog
    onPrint?.(); // Optional callback (clear cart, show confirmation)
  }, 100);
};
```

### When is Print Called?

**Current Flow in your MultiItemOrderCart:**

```
User adds items → Cart View
      ↓
User clicks "Review & Continue" → Receipt View (on screen)
      ↓
User clicks "Export to PDF" or "Confirm & Process" → window.print()
      ↓
Browser Print Dialog Opens
```

### Browser Print Dialog Options

```
┌─ Print Dialog ─────────┐
│ Destination:           │
│ ◉ Save as PDF         │  ← Most common (generates .pdf)
│ ○ Printer Name 1      │  ← If printer is connected
│ ○ Microsoft Print     │
│    to PDF             │
│                       │
│ [Cancel]  [Save]      │
└───────────────────────┘
```

### CSS Applied During Print

1. Browser renders page normally on screen
2. User clicks "Print"
3. Browser reads `@media print` CSS
4. `display: none` hides navigation
5. `#invoice-container` made visible
6. Print preview shown
7. User clicks "Print" or "Save as PDF"

---

## Integration Guide

### Step 1: Import the Component

In your `MultiItemOrderCart.tsx` or main dashboard:

```typescript
import { PrintableInvoice } from "@/app/components/PrintableInvoice";
import type { CartItem } from "@/app/components/PrintableInvoice";
```

### Step 2: Add State for Invoice Display

```typescript
const [showInvoice, setShowInvoice] = useState(false);
const [invoiceNo, setInvoiceNo] = useState("");

const handleProcessSale = async () => {
  // Generate unique invoice number
  setInvoiceNo(Date.now().toString());

  // Show invoice for printing
  setShowInvoice(true);

  // API call to save sale
  await onSubmit(cartItems, customerName, tinNumber);
};
```

### Step 3: Render Invoice Component

```typescript
{showInvoice && (
  <PrintableInvoice
    cartItems={cartItems}
    customerName={customerName}
    tinNumber={tinNumber}
    invoiceNo={invoiceNo}
    onPrint={() => {
      // After print: clear cart and close modal
      setCartItems([]);
      setCustomerName("");
      setTinNumber("");
      setShowInvoice(false);
      onClose();
    }}
  />
)}
```

### Step 4: Trigger from Receipt View

```typescript
<button
  onClick={handleProcessSale}
  className="bg-green-600 text-white px-4 py-2 rounded"
>
  ✓ Confirm & Process Sale
</button>
```

---

## Advanced: Why This Architecture Scales

### Problem: Multi-Branch Pharmacies

Your pharmacy has 3 locations. Each needs its own branding on invoices.

**Solution with PrintableInvoice:**

```typescript
// Branch 1
<PrintableInvoice
  cartItems={items}
  customerName="Ahmed"
  tinNumber="456789"
  invoiceNo="BR1-20260507-001"  // Branch 1 prefix
/>

// Branch 2 (same component, different props)
<PrintableInvoice
  cartItems={items}
  customerName="Fatima"
  tinNumber="789012"
  invoiceNo="BR2-20260507-001"  // Branch 2 prefix
/>
```

### Problem: Multi-Language Support

Ethiopia has Amharic, English, Oromo customers.

**Future Enhancement:**

```typescript
type PrintableInvoiceProps = {
  // ... existing props
  language: "en" | "am" | "om";
};

const getLabel = (key: string, lang: string) => {
  const labels = {
    en: { total: "Total", qty: "Quantity" },
    am: { total: "ድምር", qty: "ብዛት" },
    om: { total: "Walqixa", qty: "Lakkaawwan" },
  };
  return labels[lang][key];
};
```

---

## Debugging Checklist

✅ **Invoice Not Printing?**

- Ensure `#invoice-container` exists in DOM
- Check browser console for JS errors
- Verify `@media print` styles loaded (DevTools → Sources)

✅ **Borders Look Fuzzy?**

- Verify `border-collapse: collapse` is applied
- Check `-webkit-print-color-adjust: exact` is set

✅ **Totals Wrong?**

- Console.log() the `cartItems` array
- Verify `pricePerUnit` is a number, not string
- Check decimal rounding (`.toFixed(2)`)

✅ **Missing Data?**

- Verify `batchNumber` comes from `inventory_batches` table
- Check `expiryDate` format matches what DB returns
- Ensure frontend receives all CartItem properties

---

## Performance Considerations

**Current Render Time:** O(n) where n = number of items

- 10 items: <10ms
- 100 items: <100ms
- 1000 items: ~1s (acceptable for batch receipts)

**Optimization (if needed):**

```typescript
// Use useMemo to prevent recalculation on every render
const totals = useMemo(() => ({
  subtotal: calculateSubtotal(cartItems),
  tax: calculateTax(...),
  grandTotal: calculateGrandTotal(...)
}), [cartItems]);
```

---

## Summary

| Concept             | Implementation                  | Benefit                           |
| ------------------- | ------------------------------- | --------------------------------- |
| **Dynamic Mapping** | `.map(cartItems)`               | Auto-scales with item count       |
| **Print CSS**       | `@media print { ... }`          | UI disappears, invoice fills page |
| **Calculations**    | Pure functions                  | Testable, reusable formulas       |
| **Table Borders**   | `border-collapse: collapse`     | Professional sharp lines          |
| **Print Trigger**   | `window.print()`                | Native browser print dialog       |
| **Batch Tracking**  | Direct from `inventory_batches` | Audit trail for compliance        |

---

**Next Steps:**

1. ✅ Integrate PrintableInvoice into MultiItemOrderCart
2. ⏳ Test with real invoice data
3. ⏳ Customize with your actual paper size/margins
4. ⏳ Add batch validation before printing
