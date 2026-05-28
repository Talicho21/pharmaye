# Multi-Item Order System - Quick Start & Examples

## 🚀 Quick Integration Checklist

- [ ] Copy `MultiItemOrderCart.tsx` to `pharmacy-frontend/app/components/`
- [ ] Copy `bulkSaleController.js` to `pharmacy-backend/controllers/`
- [ ] Update `pharmacy-backend/routes/inventoryRoutes.js` with bulk-sell route
- [ ] Import and use `MultiItemOrderCart` in your dashboard (`page.tsx`)
- [ ] Test with curl or Postman
- [ ] Update sales/invoice printing to handle bulk orders

---

## 🧪 Testing Examples

### Example 1: Curl - Simple Bulk Sale

```bash
curl -X POST http://localhost:5000/api/inventory/bulk-sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "medicine_id": 1,
        "batch_number": "B20250115",
        "medicine_name": "Aspirin 500mg",
        "quantity": 50,
        "price_per_unit": 2.50
      },
      {
        "medicine_id": 2,
        "batch_number": "B20250120",
        "medicine_name": "Paracetamol 500mg",
        "quantity": 100,
        "price_per_unit": 1.50
      }
    ],
    "seller_name": "Ahmed Hassan",
    "receiver_name": "Central Pharmacy Distribution"
  }'
```

### Example 2: JavaScript Fetch (Frontend)

```typescript
// This is already implemented in MultiItemOrderCart, but here's the full flow:

async function submitBulkOrder(cartItems: CartItem[], authToken: string) {
  const payload = {
    items: cartItems.map((item) => ({
      medicine_id: item.medicineId,
      batch_number: item.batchNumber,
      medicine_name: item.medicineName,
      quantity: item.quantity,
      price_per_unit: item.pricePerUnit,
    })),
    seller_name: "Ahmed Hassan", // Get from input
    receiver_name: "Wholesale Co.", // Get from input
  };

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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message);
    }

    const successData = await response.json();
    console.log("✅ Order processed:", successData.data);
    return successData;
  } catch (error) {
    console.error("❌ Order failed:", error);
    throw error;
  }
}
```

### Example 3: Python Script (For Testing/Integration)

```python
import requests
import json

# Configuration
BASE_URL = "http://localhost:5000"
AUTH_TOKEN = "your_jwt_token_here"

# Define the bulk order
bulk_order = {
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
    "seller_name": "Ahmed Hassan",
    "receiver_name": "Al-Noor Pharmacy Group"
}

# Make the request
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {AUTH_TOKEN}"
}

response = requests.post(
    f"{BASE_URL}/api/inventory/bulk-sell",
    headers=headers,
    json=bulk_order
)

# Handle response
if response.status_code == 200:
    data = response.json()
    print("✅ Order Success!")
    print(f"Total Items Processed: {data['data']['total_items_processed']}")
    print(f"Total Revenue: ETB {data['data']['total_revenue']}")
    print("\nProcessed Items:")
    for item in data['data']['items']:
        print(f"  - {item['medicine_name']}: {item['quantity_deducted']} units @ {item['unit_price']} ETB/unit")
else:
    error_data = response.json()
    print(f"❌ Order Failed: {error_data['message']}")
```

---

## 📊 Real-World Scenario

### Scenario: Wholesale Order from Major Hospital

**Hospital**: Central Hospital Supply Chain  
**Order Date**: 2025-06-15  
**Seller**: Pharmacy Manager (Ahmed)  
**Receiver**: Hospital Purchasing Coordinator

**Items Ordered:**

```
1. Antibiotics (Amoxicillin):
   - Medicine ID: 5
   - Requested: 200 units
   - Inventory Status:
     * Batch A (expires 2025-08-01): 80 units
     * Batch B (expires 2025-10-15): 120 units

2. Antipyretics (Paracetamol):
   - Medicine ID: 3
   - Requested: 300 units
   - Inventory Status:
     * Single batch (expires 2025-12-31): 300 units

3. Anti-inflammatory (Ibuprofen):
   - Medicine ID: 7
   - Requested: 150 units
   - Inventory Status:
     * Batch X (expires 2025-07-10): 100 units
     * Batch Y (expires 2025-09-20): 60 units
```

### What Happens at Backend:

```javascript
// Transaction starts
BEGIN TRANSACTION

// Item 1: Amoxicillin (200 units)
-- FEFO applied:
-- Batch A (earliest expiry): Take 80 units → 80 remaining
-- Batch B (later expiry): Take 120 more units → 120 remaining

// Item 2: Paracetamol (300 units)
-- No FEFO needed, single batch:
-- Take all 300 units

// Item 3: Ibuprofen (150 units)
-- FEFO applied:
-- Batch X (expires 2025-07-10, earlier): Take 100 units
-- Batch Y (expires 2025-09-20, later): Take 50 more units

// All items processed, no errors
COMMIT TRANSACTION
```

### Response:

```json
{
  "message": "Order processed successfully",
  "success": true,
  "data": {
    "total_items_processed": 3,
    "total_revenue": "950.00",
    "items": [
      {
        "medicine_name": "Amoxicillin",
        "batch_number": "A001",
        "quantity_deducted": 80,
        "unit_price": 2.0,
        "subtotal": 160.0
      },
      {
        "medicine_name": "Amoxicillin",
        "batch_number": "A002",
        "quantity_deducted": 120,
        "unit_price": 2.0,
        "subtotal": 240.0
      },
      {
        "medicine_name": "Paracetamol",
        "batch_number": "P001",
        "quantity_deducted": 300,
        "unit_price": 1.0,
        "subtotal": 300.0
      },
      {
        "medicine_name": "Ibuprofen",
        "batch_number": "I001",
        "quantity_deducted": 100,
        "unit_price": 1.5,
        "subtotal": 150.0
      },
      {
        "medicine_name": "Ibuprofen",
        "batch_number": "I002",
        "quantity_deducted": 50,
        "unit_price": 1.5,
        "subtotal": 75.0
      }
    ]
  }
}
```

**Database Changes:**

- Amoxicillin Batch A: 80 → 0 units
- Amoxicillin Batch B: 120 → 0 units
- Paracetamol: 300 → 0 units
- Ibuprofen Batch X: 100 → 0 units
- Ibuprofen Batch Y: 60 → 10 units
- **Sales Table**: 5 new records (one per deduction)

---

## 🔍 Debugging Tips

### Problem: "ECONNREFUSED" error

**Cause**: Backend server not running

**Solution**:

```bash
cd pharmacy-backend
node server.js
```

### Problem: "401 Unauthorized"

**Cause**: Invalid or missing auth token

**Solution**:

1. Ensure you're logged in (auth token stored in session)
2. Pass correct token in Authorization header: `Authorization: Bearer <token>`

### Problem: "Insufficient stock" even though items exist

**Possible Causes**:

1. All batches are expired (check expiry dates)
2. All batches have 0 quantity (already sold)
3. FEFO distribution couldn't fulfill across available batches

**Debug**: Query the database directly:

```sql
SELECT b.id, b.batch_number, b.quantity, b.expiry_date
FROM batches b
WHERE b.medicine_id = 1
ORDER BY b.expiry_date ASC;
```

### Problem: Transaction takes too long

**Causes**:

1. Large number of items (100+)
2. Database is slow
3. Connection pool is exhausted

**Solution**:

- Ensure database indexes on `batches.medicine_id` and `batches.expiry_date`
- Increase connection pool in `db.js`: `connectionLimit: 20`
- Check PostgreSQL slow query settings (enable `pg_stat_statements` or check `log_min_duration_statement`)

---

## 📈 Performance Notes

| Metric               | Single-Item          | Bulk-Sale (10 items) | Bulk-Sale (50 items) |
| -------------------- | -------------------- | -------------------- | -------------------- |
| HTTP Requests        | 10                   | 1                    | 1                    |
| Database Connections | 10                   | 1                    | 1                    |
| Transactions         | 10                   | 1                    | 1                    |
| Processing Time      | ~100ms per item      | ~150ms total         | ~300ms total         |
| Risk of Errors       | High (partial sales) | Low (atomic)         | Low (atomic)         |

---

## 🛠️ Future Enhancements

1. **Invoice Generation**
   - Accept `invoice_number` in request
   - Generate PDF with all items
   - Email to receiver

2. **Return/Refund Processing**
   - Create reverse transaction
   - Re-add to inventory with FEFO reversal

3. **Batch Operations**
   - Process multiple wholesale orders in sequence
   - Track each order separately

4. **Analytics**
   - Dashboard showing bulk order trends
   - Wholesale customer metrics
   - FEFO efficiency metrics

5. **Inventory Reservations**
   - Allow "holding" items before final sale
   - 24-hour reservation timeout

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Enable HTTPS (change http:// to https://)
- [ ] Use environment variables for database credentials
- [ ] Add request rate limiting to bulk-sell endpoint
- [ ] Implement audit logging (who authorized the order?)
- [ ] Add data validation sanitization
- [ ] Test with large orders (100+ items)
- [ ] Load test with concurrent orders
- [ ] Backup database before going live
- [ ] Document for support team
- [ ] Train staff on new UI
- [ ] Monitor transaction performance in production
- [ ] Set up alerts for failed transactions
