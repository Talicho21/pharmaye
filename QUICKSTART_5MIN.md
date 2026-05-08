# ⚡ 5-Minute QuickStart: Get Running NOW

**Time: 5 minutes → Frontend-Backend sync complete**

---

## Step 1️⃣: Add Import (30 seconds)

**Open**: `pharmacy-frontend/app/page.tsx`  
**Line 1-10**: Find the recharts import block, add this line after it:

```tsx
import {
  MultiItemOrderCart,
  CartItem,
} from "@/app/components/MultiItemOrderCart";
```

---

## Step 2️⃣: Add State (1 minute)

**Line ~350-400**: Find where you have `setSellerNameInput`, add after:

```tsx
const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");
```

---

## Step 3️⃣: Add Handler (2 minutes)

**Line ~1030**: Before `handleAddStock`, paste this:

```tsx
const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
  if (!cartItems || cartItems.length === 0) {
    showToast("Empty Cart", "Please add at least one item.", "error");
    return;
  }

  const sellerName = bulkSaleSellerName.trim();
  if (!sellerName) {
    showToast("Missing Field", "Enter seller name.", "error");
    return;
  }

  const receiverName = bulkSaleReceiverName.trim();
  if (!receiverName) {
    showToast("Missing Field", "Enter receiver name.", "error");
    return;
  }

  const items = cartItems.map((item) => ({
    medicine_id: item.medicineId,
    batch_number: item.batchNumber,
    medicine_name: item.medicineName,
    quantity: item.quantity,
    price_per_unit: item.pricePerUnit,
  }));

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
          items: items,
          seller_name: sellerName,
          receiver_name: receiverName,
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      showToast("Failed ❌", result.message || "Order failed.", "error");
      return;
    }

    showToast(
      "✅ Success!",
      `${result.data.total_items_processed} items | ETB ${result.data.total_revenue}`,
      "success",
    );

    setIsGeneralSaleOpen(false);
    setBulkSaleSellerName("");
    setBulkSaleReceiverName("");
    await fetchData();
  } catch (error) {
    showToast("🌐 Error", "Connection failed. Try again.", "error");
    console.error(error);
  } finally {
    setIsProcessingBulkSale(false);
  }
};
```

---

## Step 4️⃣: Add Button (1 minute)

**Line ~2250** (in your header/button section):

```tsx
{
  isAdmin && (
    <button
      onClick={() => setIsGeneralSaleOpen(true)}
      className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700"
    >
      🛒 General Sale (Multi-Item)
    </button>
  );
}
```

---

## Step 5️⃣: Add Modal (30 seconds)

**Line ~2560** (before final `</div>`):

```tsx
<MultiItemOrderCart
  isOpen={isGeneralSaleOpen}
  onClose={() => setIsGeneralSaleOpen(false)}
  onSubmit={handleBulkSaleSubmit}
  isProcessing={isProcessingBulkSale}
/>
```

---

## ✅ Done! Test It:

```bash
npm run dev
# Button should appear → Click it → Add items to cart → Submit → Success!
```

**See weird errors?** Check [COPYPASTE_INTEGRATION.md](./COPYPASTE_INTEGRATION.md) for troubleshooting.

**Want detailed explanation?** See [FRONTEND_BACKEND_SYNC.md](./FRONTEND_BACKEND_SYNC.md)
