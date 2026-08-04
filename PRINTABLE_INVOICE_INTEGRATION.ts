/**
 * INTEGRATION EXAMPLE: PrintableInvoice + MultiItemOrderCart
 * 
 * This file shows line-by-line how to integrate the PrintableInvoice
 * component into your existing MultiItemOrderCart workflow.
 * 
 * Copy these patterns into your actual MultiItemOrderCart.tsx
 */

import { useState } from "react";
import { MultiItemOrderCart, type CartItem } from "./MultiItemOrderCart";
import { PrintableInvoice } from "./PrintableInvoice";

// ============================================================
// STEP 1: ADD THESE STATES TO MultiItemOrderCart
// ============================================================

export function IntegratedCartWithInvoice() {
  // Existing states...
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [tinNumber, setTinNumber] = useState("");

  // NEW: States for invoice printing
  const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState("");

  // ============================================================
  // STEP 2: MODIFY handleSubmit() TO SHOW INVOICE BEFORE PRINT
  // ============================================================

  const handleSubmit = async () => {
    // Validate inputs (existing logic)
    if (cartItems.length === 0) {
      alert("Please add at least one item");
      return;
    }

    if (!customerName.trim() || !tinNumber.trim()) {
      alert("Please enter customer details");
      return;
    }

    // Generate invoice number from transaction ID
    const invoiceNo = Date.now().toString();
    setLastInvoiceNo(invoiceNo);

    // Show the printable invoice component
    setShowPrintableInvoice(true);

    // API call to save the sale
    try {
      await onSubmit(cartItems, customerName.trim(), tinNumber.trim());
      console.log("Sale saved successfully");
    } catch (error) {
      console.error("Failed to save sale:", error);
      alert("Error processing sale");
    }
  };

  // ============================================================
  // STEP 3: HANDLE POST-PRINT CLEANUP
  // ============================================================

  const handlePrintComplete = () => {
    // Clear cart and reset for next sale
    setCartItems([]);
    setCustomerName("");
    setTinNumber("");
    setShowPrintableInvoice(false);

    // Show confirmation
    alert("✓ Sale processed and receipt printed!");
  };

  // ============================================================
  // STEP 4: RENDER PrintableInvoice CONDITIONALLY
  // ============================================================

  if (showPrintableInvoice) {
    return (
      <PrintableInvoice
        cartItems={cartItems}
        customerName={customerName}
        tinNumber={tinNumber}
        invoiceNo={lastInvoiceNo}
        onPrint={handlePrintComplete}  // Called after user prints
      />
    );
  }

  // Otherwise, show the regular cart (existing UI)
  return (
    <MultiItemOrderCart
      isOpen={true}
      onClose={() => {
        resetCart();
      }}
      onSubmit={handleSubmit}
      isProcessing={false}
    />
  );
}

// ============================================================
// INTEGRATION CHECKLIST
// ============================================================

/*
  ✅ TODO #1: Import PrintableInvoice in MultiItemOrderCart.tsx
     import { PrintableInvoice } from "@/app/components/PrintableInvoice";

  ✅ TODO #2: Add these states to your component:
     const [showPrintableInvoice, setShowPrintableInvoice] = useState(false);
     const [lastInvoiceNo, setLastInvoiceNo] = useState("");

  ✅ TODO #3: Modify handleSubmit() to set showPrintableInvoice = true
     after validating cart and customer info

  ✅ TODO #4: Add conditional render at the end:
     {showPrintableInvoice ? (
       <PrintableInvoice {...props} />
     ) : (
       <CartUI ... />
     )}

  ✅ TODO #5: Test with these steps:
     - Add 2-3 items to cart
     - Enter customer name and TIN
     - Click "Process Sale"
     - Verify invoice displays with correct:
       • Logo at top
       • Email address (getchdr@gmail.com)
       • All cart items in table
       • Correct totals (Subtotal, VAT, Grand Total)
       • Signature lines at bottom

  ✅ TODO #6: Test print:
     - Click "Print Invoice" button
     - Choose "Save as PDF"
     - Verify PDF shows:
       • Clean layout
       • No navigation elements
       • All items visible
       • Professional borders
       • Signature lines

  ✅ TODO #7: Test clearing:
     - After printing, verify cart resets
     - Customer info clears
     - Ready for next sale
*/

// ============================================================
// ADVANCED: INVOICE NUMBER GENERATION
// ============================================================

export function generateInvoiceNo(branchCode: string = "HQ"): string {
  /**
   * Generates unique invoice numbers in format: HQ-20260507-001234567890
   *
   * Benefits:
   * - branchCode: Multi-branch support (HQ, BR1, BR2, etc.)
   * - Date: Helps with sorting and audit
   * - Timestamp: Ensures uniqueness even if 2 sales happen in 1 second
   *
   * Example output: BR1-20260507-001778161156197
   */
  const date = new Date();
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
  const timestamp = Date.now();

  return `${branchCode}-${dateStr}-${timestamp}`;
}

// Usage:
// const invoiceNo = generateInvoiceNo("BR2");  // → "BR2-20260507-001778161156197"

// ============================================================
// ADVANCED: BATCH DATA VALIDATION
// ============================================================

export function validateBatchData(cartItems: CartItem[]): {
  isValid: boolean;
  errors: string[];
} {
  /**
   * Before printing, validate that batch data wasn't corrupted
   * This ensures printed receipt matches what was scanned
   */

  const errors: string[] = [];

  cartItems.forEach((item, index) => {
    // Check batch number is not empty
    if (!item.batchNumber || item.batchNumber.trim() === "") {
      errors.push(`Item ${index + 1}: Missing batch number`);
    }

    // Check expiry date exists
    if (!item.expiryDate) {
      errors.push(`Item ${index + 1}: Missing expiry date`);
    }

    // Check expiry is not in past
    const expiryDate = new Date(item.expiryDate);
    if (expiryDate < new Date()) {
      errors.push(
        `Item ${index + 1}: Batch expired on ${item.expiryDate}`
      );
    }

    // Check price is reasonable (> 0)
    if (item.pricePerUnit <= 0) {
      errors.push(`Item ${index + 1}: Invalid price`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Usage in handleSubmit:
/*
const validation = validateBatchData(cartItems);
if (!validation.isValid) {
  alert("Cannot print invoice:\n" + validation.errors.join("\n"));
  return;
}
*/

// ============================================================
// ADVANCED: FOOTER SIGNATURE HANDLING
// ============================================================

export interface SignatureBlock {
  preparedBy?: {
    name: string;
    title: string;
    date: string;
  };
  receivedBy?: {
    name: string;
    title: string;
    date: string;
  };
  approvedBy?: {
    name: string;
    title: string;
    date: string;
  };
}

export function printSignatureBlock(signatures: SignatureBlock): void {
  /**
   * In a future enhancement, you could:
   * 1. Pre-fill known signatories (e.g., pharmacist on duty)
   * 2. Connect to signature pad for digital signatures
   * 3. Add QR code for receipt verification
   *
   * For now, signature lines are left blank for manual entry
   */

  const signatureHTML = `
    <div style="margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
      <div style="text-align: center;">
        <div style="border-bottom: 2px solid black; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; font-size: 12px;">Prepared By</p>
        <p style="font-size: 10px; color: #666;">
          ${signatures.preparedBy?.name || "_____"} / ${signatures.preparedBy?.date || "_____"}
        </p>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 2px solid black; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; font-size: 12px;">Received By</p>
        <p style="font-size: 10px; color: #666;">
          ${signatures.receivedBy?.name || "_____"} / ${signatures.receivedBy?.date || "_____"}
        </p>
      </div>
      <div style="text-align: center;">
        <div style="border-bottom: 2px solid black; height: 60px; margin-bottom: 10px;"></div>
        <p style="font-weight: bold; font-size: 12px;">Approved By</p>
        <p style="font-size: 10px; color: #666;">
          ${signatures.approvedBy?.name || "_____"} / ${signatures.approvedBy?.date || "_____"}
        </p>
      </div>
    </div>
  `;

  console.log("Signature block HTML:", signatureHTML);
  // Could be injected into invoice if needed
}

// ============================================================
// TESTING SCENARIOS
// ============================================================

export const TEST_SCENARIOS = {
  scenario1_SingleItem: [
    {
      id: "item-1",
      medicineId: 1,
      batchNumber: "BATCH001",
      medicineName: "Aspirin 500mg",
      quantity: 10,
      pricePerUnit: 5.0,
      expiryDate: "2027-12-31",
    },
  ],

  scenario2_MultipleItems: [
    {
      id: "item-1",
      medicineId: 1,
      batchNumber: "1241d",
      medicineName: "Kakush",
      quantity: 2,
      pricePerUnit: 100.0,
      expiryDate: "2026-12-31",
    },
    {
      id: "item-2",
      medicineId: 2,
      batchNumber: "5521d",
      medicineName: "Amoxicillin 500mg",
      quantity: 5,
      pricePerUnit: 45.5,
      expiryDate: "2027-06-15",
    },
    {
      id: "item-3",
      medicineId: 3,
      batchNumber: "7712d",
      medicineName: "Paracetamol 1000mg",
      quantity: 3,
      pricePerUnit: 25.0,
      expiryDate: "2028-03-20",
    },
  ],

  scenario3_LargeOrder: Array.from({ length: 15 }, (_, i) => ({
    id: `item-${i}`,
    medicineId: i + 1,
    batchNumber: `BATCH${String(i + 1).padStart(4, "0")}`,
    medicineName: `Medicine ${String.fromCharCode(65 + (i % 26))}`,
    quantity: Math.floor(Math.random() * 100) + 1,
    pricePerUnit: Math.random() * 500 + 10,
    expiryDate: new Date(
      Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split("T")[0],
  })),
};

// Usage for testing:
/*
import { TEST_SCENARIOS } from "./integration-example";

// In your component
const handleTestScenario = (scenario) => {
  setCartItems(scenario);
  setCustomerName("Test Customer");
  setTinNumber("9999999999");
};

// In UI
<button onClick={() => handleTestScenario(TEST_SCENARIOS.scenario2_MultipleItems)}>
  Test Scenario 2
</button>
*/
