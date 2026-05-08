# 🚨 Troubleshooting: Common Errors & Fixes

---

## Error 1: "Cannot find module '@/app/components/MultiItemOrderCart'"

### ❌ Problem

Import fails, component not found

### ✅ Solution

1. Verify file exists: `pharmacy-frontend/app/components/MultiItemOrderCart.tsx`
2. Check exact path in import:
   ```tsx
   import {
     MultiItemOrderCart,
     CartItem,
   } from "@/app/components/MultiItemOrderCart";
   ```
3. If still not found:
   - Restart dev server: `npm run dev`
   - Clear cache: Delete `.next` folder, run `npm run dev` again

### 🔍 Debug

```bash
# Check if file exists
ls pharmacy-frontend/app/components/

# Should show: MultiItemOrderCart.tsx
```

---

## Error 2: "MultiItemOrderCart is not exported"

### ❌ Problem

Import line added but component not recognized

### ✅ Solution

Check the export statement in `MultiItemOrderCart.tsx`:

**Should have (at the end):**

```tsx
export { MultiItemOrderCart, type CartItem };
```

**If missing, add it:**

```tsx
export default MultiItemOrderCart;
export type { CartItem };
```

---

## Error 3: "useState is not defined" or "React is not imported"

### ❌ Problem

Added code but React not available

### ✅ Solution

Page.tsx should already have at top:

```tsx
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
```

If not, add this as first line.

---

## Error 4: "showToast is not defined"

### ❌ Problem

Toast notification function missing

### ✅ Solution

Find where showToast is defined in page.tsx (should be line ~1200-1300):

```tsx
const showToast = (
  title: string,
  message: string,
  type: "success" | "error",
) => {
  // Toast implementation
};
```

If missing, verify you're using the entire handleBulkSaleSubmit function provided.

---

## Error 5: "authToken is not defined"

### ❌ Problem

Authentication token not available

### ✅ Solution

Find where authToken is initialized in page.tsx (usually near state declarations):

```tsx
const [authToken, setAuthToken] = useState<string | null>(null);
```

Verify it's being set after login. Check useEffect hook that reads it from localStorage.

---

## Error 6: Button doesn't appear on dashboard

### ❌ Problem

"🛒 General Sale" button added but not showing

### ✅ Causes & Solutions

**Cause 1: isAdmin is false**

- Ensure you're logged in as admin user
- Check browser console: `console.log(isAdmin)` should be `true`

**Cause 2: UI placement wrong**

- Button added outside the render section or wrong place
- Move it to the header/button area (line ~2250)

**Cause 3: CSS classes not loaded**

- Ensure Tailwind CSS working (other buttons styled?)
- Check class names: `bg-green-600`, `rounded`, `px-4 py-2` should all work

**Debug:**

```tsx
// Temporarily add debug button to test rendering
<button onClick={() => alert("UI working")}>Test</button>
```

If test button shows, your UI section works. Then check the general sale button code.

---

## Error 7: "localStorage.getItem is not defined"

### ❌ Problem

Code runs on server-side where localStorage unavailable

### ✅ Solution

Wrap in useEffect:

```tsx
useEffect(() => {
  const token = localStorage.getItem("authToken");
  setAuthToken(token);
}, []);
```

This already exists in page.tsx. If you get this error, don't manually reference localStorage outside useEffect.

---

## Error 8: Modal opens but form is broken/unresponsive

### ❌ Problem

Modal shows but can't add items or submit

### ✅ Causes & Solutions

**Cause 1: MultiItemOrderCart not receiving props correctly**

```tsx
// Check props being passed
<MultiItemOrderCart
  isOpen={isGeneralSaleOpen}
  onClose={() => setIsGeneralSaleOpen(false)}
  onSubmit={handleBulkSaleSubmit}
  isProcessing={isProcessingBulkSale}
/>
```

All 4 props required. If missing any, modal won't work.

**Cause 2: Component props types mismatch**

- isOpen: boolean
- onClose: () => void function
- onSubmit: (items: CartItem[]) => Promise<void> function
- isProcessing: boolean

**Debug:**
Add console.log in modal:

```tsx
// Inside MultiItemOrderCart component
useEffect(() => {
  console.log({ isOpen, onClose, onSubmit, isProcessing });
}, [isOpen, onClose, onSubmit, isProcessing]);
```

---

## Error 9: Submit button always disabled

### ❌ Problem

"✓ Process Sale" button grayed out, can't click

### ✅ Causes & Solutions

**Cause 1: isProcessingBulkSale stuck as true**

- Component not updating state after response
- Check console for errors preventing state update

**Cause 2: Cart empty**

- Button disables if cartItems.length === 0
- Add items first before submitting

**Cause 3: Seller/receiver name empty**

- Button disables if either field empty
- Fill both fields before submitting

**Debug:**

```tsx
// In handleBulkSaleSubmit, add logs
console.log("Cart items:", cartItems);
console.log("Seller:", bulkSaleSellerName);
console.log("Receiver:", bulkSaleReceiverName);
```

---

## Error 10: Submit button works but shows "Network Error"

### ❌ Problem

Toast shows: "🌐 Network Error - Failed to submit order"

### ✅ Causes & Solutions

**Cause 1: Backend not running**

- Check if Node.js server running
- Terminal should show: `Server running on port 5000`
- Start it: `node server.js` from pharmacy-backend/

**Cause 2: CORS error**

- Backend doesn't allow requests from frontend
- Check backend `cors` configuration in server.js

**Cause 3: Wrong endpoint URL**

- Verify URL in fetch call:
  ```tsx
  "http://localhost:5000/api/inventory/bulk-sell";
  ```
- Watch browser Network tab (F12 → Network) - which URL is it calling?

**Cause 4: Auth header missing**

- Verify Authorization header sent:
  ```tsx
  Authorization: `Bearer ${authToken}`;
  ```
- authToken must not be null

**Debug:**

```bash
# Terminal 1: Check backend is running
ps aux | grep node

# Terminal 2: Test endpoint manually with curl
curl -X POST http://localhost:5000/api/inventory/bulk-sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'
```

---

## Error 11: "Unauthorized" error (403)

### ❌ Problem

Response status 403, message: "Not authorized"

### ✅ Causes & Solutions

**Cause 1: Not logged in as admin**

- Verify user role is "admin"
- Check: Login with admin account

**Cause 2: Token expired**

- Clear localStorage and re-login
- In browser console: `localStorage.clear()`

**Cause 3: Token not in header**

- Verify authToken exists:
  ```tsx
  console.log("Token:", authToken);
  ```
- Should be a long JWT string, not null/undefined

**Cause 4: Wrong token format**

- Should be: `Authorization: Bearer <token>`
- Not: `Authorization: <token>` or `Bearer: <token>`

---

## Error 12: "Insufficient stock" error after submit

### ❌ Problem

Submit works but backend returns: "Insufficient stock for..."

### ✅ Solution

Database doesn't have enough quantity to fulfill order.

**Options:**

1. Reduce quantity in cart
2. Add more batches to inventory
3. Check inventory table - verify quantities listed

This is actually correct behavior! Backend prevents overselling. Good sign system is working.

---

## Error 13: Inventory not refreshing after sale

### ❌ Problem

Sale completes successfully but quantities don't update on dashboard

### ✅ Causes & Solutions

**Cause 1: fetchData() not called**

- Verify this line exists in handleBulkSaleSubmit:
  ```tsx
  await fetchData();
  ```

**Cause 2: fetchData() fails silently**

- Add console logs:
  ```tsx
  console.log("Before fetchData");
  await fetchData();
  console.log("After fetchData");
  ```

**Cause 3: setInventory not updating display**

- Check that fetchData() calls setInventory()
- Verify inventory table uses inventory state:
  ```tsx
  {inventory.items.map((item) => (
    // Display with updated quantities
  ))}
  ```

**Debug:**

```tsx
// After await fetchData()
console.log("Inventory after refresh:", inventory);
```

---

## Error 14: Toast shows success but database not updated

### ❌ Problem

Frontend shows "✅ Order Processed!" but quantities unchanged in database

### ✅ Causes & Solutions

**This usually doesn't happen because:**

- Backend returns success only AFTER committing transaction
- Database updated before response sent

**But if it occurs:**

1. Check console for errors:
   - Frontend error preventing true submission?
   - Backend error that rolled back?
2. Query database directly:

   ```sql
   SELECT id, medicine_id, medicine_name, quantity
   FROM batches
   ORDER BY modified_date DESC;
   ```

3. Check sales table:
   ```sql
   SELECT * FROM sales ORDER BY sale_date DESC LIMIT 5;
   ```

---

## Error 15: "ECONNREFUSED" error

### ❌ Problem

Can't connect to backend at all

### ✅ Solution

**Backend connection failing:**

1. Start backend server:

   ```bash
   cd pharmacy-backend
   node server.js
   ```

   Should show: `Server running on port 5000`

2. Verify MySQL is running:

   ```bash
   # Mac/Linux
   mysql -u root -p

   # Windows
   mysql.exe -u root -p
   ```

3. Check database exists and has tables:
   ```sql
   USE pharmacy_db;
   SHOW TABLES;
   ```

---

## Error 16: "CORS Error: request blocked"

### ❌ Problem

Browser shows: "Access to XMLHttpRequest blocked by CORS policy"

### ✅ Solution

**Backend needs CORS enabled:**
Find `server.js` and verify:

```javascript
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    credentials: true,
  }),
);
```

If missing or incorrect:

1. Add cors package: `npm install cors`
2. Add above lines to server.js
3. Restart backend

---

## Error 17: "Batch number not found"

### ❌ Problem

Backend returns: "Batch BATCH-2024-001 not found"

### ✅ Solution

**Batch selected doesn't exist in database:**

1. Verify batch exists:

   ```sql
   SELECT * FROM batches WHERE batch_number = "BATCH-2024-001";
   ```

2. If not found:
   - Add batch to inventory first
   - Try selecting different batch in modal

3. Check frontend is reading batches correctly:
   - Load inventory first before opening modal
   - Modal should populate batch dropdown from database

---

## 🛠️ General Debugging Workflow

When something breaks:

1. **Check UI Console (F12 → Console)**

   ```
   Look for: Red error messages, stack traces
   ```

2. **Check Browser Network (F12 → Network)**

   ```
   Click your request → Check:
   - Request URL correct?
   - Request body has right data?
   - Response status 200/400/500?
   - Response body has error message?
   ```

3. **Check Backend Console**

   ```
   Terminal where you ran `node server.js`
   Look for: Red error messages, query logs
   ```

4. **Check Database**

   ```sql
   -- Verify data exists
   SELECT * FROM medicines LIMIT 5;
   SELECT * FROM batches LIMIT 5;
   SELECT * FROM sales ORDER BY sale_date DESC LIMIT 5;
   ```

5. **Add Console Logs**
   ```tsx
   // At each step:
   console.log("Step 1: User clicked");
   console.log("Step 2: Modal opened", { isGeneralSaleOpen });
   console.log("Step 3: Item added", cartItems);
   console.log("Step 4: Submitting", { payload });
   ```

---

## 📋 Pre-Submit Checklist

Before clicking "Process Sale":

- [ ] Frontend running: `npm run dev` in pharmacy-frontend
- [ ] Backend running: `node server.js` in pharmacy-backend
- [ ] MySQL running and pharmacy_db exists
- [ ] Logged in as admin user
- [ ] At least 1 item added to cart
- [ ] Seller name field filled
- [ ] Receiver name field filled
- [ ] Quantities not 0 or negative

If all checked ✓, submit should work!

---

## 🔗 File Locations for Quick Reference

| What               | Location                                                  |
| ------------------ | --------------------------------------------------------- |
| Frontend page      | `pharmacy-frontend/app/page.tsx`                          |
| Cart component     | `pharmacy-frontend/app/components/MultiItemOrderCart.tsx` |
| Backend controller | `pharmacy-backend/controllers/bulkSaleController.js`      |
| Backend routes     | `pharmacy-backend/routes/inventoryRoutes.js`              |
| Database config    | `pharmacy-backend/config/db.js`                           |

---

## 🆘 Still Stuck?

If error not listed above:

1. **Copy exact error message** (include stack trace)
2. **Note what you were doing** (which button, what data)
3. **Check these files:**
   - Browser console output
   - Backend terminal output
   - Database connection status
4. **Share:**
   - Error message
   - Steps to reproduce
   - Recent code changes
