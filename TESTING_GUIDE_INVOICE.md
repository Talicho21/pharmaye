# 🧪 Quick Testing Guide - Invoice Refactoring

## Test Case 1: Invoice Number Generation

**Objective:** Verify dynamic invoice numbering works correctly

**Steps:**

1. Open browser console in pharmacy-frontend
2. Run:

```javascript
import { generateInvoiceNumber } from "./app/utils/invoiceUtils";

// Test 1
generateInvoiceNumber("Ahmed Hassan", "0098248381");
// Expected: "INV-AHM-8381"

// Test 2
generateInvoiceNumber("Bob Smith", "9876543210");
// Expected: "INV-BOB-3210"

// Test 3 (Edge case - short name)
generateInvoiceNumber("Al", "1234567890");
// Expected: "INV-AL-7890"
```

**Pass Criteria:** ✅ All returns match expected format

---

## Test Case 2: UI Table Updates

**Objective:** Verify metadata table and medicine table have correct labels

**Steps:**

1. Add an item to cart in dashboard
2. Click "Review & Continue"
3. In receipt view, check the metadata table:

**Verify these rows exist:**

- ✅ "Invoice No" (shows auto-generated like INV-AHM-8381)
- ✅ "FS No" (shows customer S.No)
- ✅ "Reference" (shows blank - NOT "Terms (Days)")
- ✅ "Date" (shows transaction date)

**Verify medicine table columns (left to right):**

- ✅ S.No (showing 1)
- ✅ Description (NOT "Medicine Name")
- ✅ Batch #
- ✅ Unit Price (ETB)
- ✅ Exp. Date (MM/YYYY format)
- ✅ Qty
- ✅ Total (ETB)

**Pass Criteria:** ✅ All columns and labels match specifications

---

## Test Case 3: Footer Layout

**Objective:** Verify signature lines are on single horizontal row

**Steps:**

1. In receipt view, scroll to bottom
2. Look for three columns side by side:

**Verify:**

```
[Prepared By]     [Received By]     [Approved By]
[_________]       [_________]       [_________]
```

**Pass Criteria:**

- ✅ All three signature lines appear horizontally
- ✅ Equally spaced
- ✅ Centered text
- ✅ Underline signature spaces visible

---

## Test Case 4: Legal Text

**Objective:** Verify legal text is centered, bold, and uppercase

**Steps:**

1. In receipt view, scroll to bottom (below signature lines)
2. Look for text at bottom

**Verify:**

- ✅ Text reads: "INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED"
- ✅ Text is bold
- ✅ Text is all uppercase
- ✅ Text is centered
- ✅ Text appears at bottom of page

**Pass Criteria:** ✅ All styling requirements met

---

## Test Case 5: Print Functionality

**Objective:** Verify print output generates clean PDF

**Steps:**

1. Add items to cart
2. Enter customer details:
   - Name: "Ahmed Hassan"
   - TIN: "0098248381"
3. Click "Review & Continue"
4. Click "Print Invoice" (or "Export to PDF")
5. In print dialog, select "Save as PDF"
6. Review generated PDF

**Verify in PDF:**

- ✅ Invoice No shows: "INV-AHM-8381"
- ✅ Metadata table shows "Reference" (blank)
- ✅ Items table has S.No, Description, Batch #, etc.
- ✅ Signature lines are horizontal
- ✅ Legal text is at bottom, bold, centered
- ✅ No "about:blank" text in document
- ✅ Page margins are clean
- ✅ All colors and borders print correctly
- ✅ No page breaks within table rows

**Pass Criteria:** ✅ PDF is clean and professional

---

## Test Case 6: Database Sync

**Objective:** Verify data is saved to database with new fields

**Steps:**

1. Add items to cart and process sale (click "Confirm & Process")
2. Check browser network tab - POST request should go to `/api/inventory/bulk-sell`
3. Check backend response - should show "success: true"
4. Query database:

```sql
SELECT
  id,
  invoice_no,
  reference,
  customer_name,
  customer_tin,
  medicine_name,
  quantity_sold,
  total_price
FROM sales
ORDER BY id DESC
LIMIT 1;
```

**Verify:**

- ✅ invoice_no shows generated value like "INV-AHM-8381"
- ✅ reference shows blank string or your input
- ✅ customer_name shows "Ahmed Hassan"
- ✅ customer_tin shows "0098248381"
- ✅ All other fields populated correctly

**Pass Criteria:** ✅ All new fields saved to database

---

## Test Case 7: Backward Compatibility

**Objective:** Verify old records still work

**Steps:**

1. Query database for records created before this refactoring:

```sql
SELECT * FROM sales WHERE invoice_no IS NULL LIMIT 1;
```

**Verify:**

- ✅ Old records still exist
- ✅ invoice_no shows NULL (not required for old data)
- ✅ reference shows NULL (not required for old data)
- ✅ No errors when viewing reports

**Pass Criteria:** ✅ Backward compatible

---

## Test Case 8: Payment Method Tracking

**Objective:** Verify payment method is saved with invoice

**Steps:**

1. Create sale with payment method: "Credit"
2. Query database:

```sql
SELECT
  id,
  invoice_no,
  customer_name,
  receiver_name  -- Contains payment method info if stored
FROM sales
ORDER BY id DESC
LIMIT 1;
```

**Verify:**

- ✅ Payment method selection works in UI
- ✅ Data is sent to backend
- ✅ Backend accepts the field

**Pass Criteria:** ✅ Payment method integrated

---

## Automated Test Script

**File:** `test-invoice-refactoring.js`

```javascript
// Run: node test-invoice-refactoring.js

const {
  generateInvoiceNumber,
  isValidInvoiceNumber,
  parseInvoiceNumber,
} = require("./utils/invoiceUtils");

console.log("🧪 Running Invoice Refactoring Tests...\n");

// Test 1: Invoice Generation
console.log("Test 1: Invoice Generation");
const inv1 = generateInvoiceNumber("Ahmed Hassan", "0098248381");
console.log(`✅ Generated: ${inv1}`);
console.assert(inv1 === "INV-AHM-8381", "Invoice generation failed");

// Test 2: Invoice Validation
console.log("\nTest 2: Invoice Validation");
console.log(`✅ Valid format: ${isValidInvoiceNumber(inv1)}`);
console.assert(isValidInvoiceNumber(inv1), "Invoice validation failed");

// Test 3: Invoice Parsing
console.log("\nTest 3: Invoice Parsing");
const parsed = parseInvoiceNumber(inv1);
console.log(`✅ Parsed: ${JSON.stringify(parsed)}`);
console.assert(parsed?.namePrefix === "AHM", "Parsing failed");
console.assert(parsed?.tinSuffix === "8381", "Parsing failed");

console.log("\n✅ All tests passed!");
```

---

## Troubleshooting Quick Fixes

| Issue                                   | Quick Fix                                                                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Invoice number shows timestamp          | Check `generateInvoiceNumber()` is imported and called in MultiItemOrderCart                   |
| Reference row still says "Terms (Days)" | Refresh page to clear browser cache                                                            |
| Signature lines are vertical            | Check browser supports flexbox (use Chrome/Firefox)                                            |
| Print shows "about:blank"               | Clear browser cache, try different browser                                                     |
| New fields not in database              | Run migration: `psql -U <user> -d pharmacy_db -f pharmacy-backend/sql/sales_schema_update.sql` |
| Backend rejects invoice_no field        | Verify bulkSaleController.js has new fields in INSERT statement                                |

---

## Success Criteria - All Must Be ✅

- [ ] Invoice number generates correctly (INV-[3]-[4] format)
- [ ] Metadata table shows "Reference" (not "Terms (Days)")
- [ ] Reference field is blank by default
- [ ] Medicine table has S.No column with auto-increment
- [ ] "Description" header shows (not "Medicine Name")
- [ ] Signature lines are horizontal and equally spaced
- [ ] Legal text is centered, bold, and uppercase at bottom
- [ ] Print/PDF output is clean with no artifacts
- [ ] Database stores invoice_no, reference, customer_name, customer_tin
- [ ] Can query sales by invoice_no
- [ ] Old records still accessible (backward compatible)
- [ ] All UI changes visible in both screen and print views

---

**Test Date:** May 14, 2026  
**Tester Name:** \***\*\_\_\_\*\***  
**Status:** ⏳ Ready for Testing
