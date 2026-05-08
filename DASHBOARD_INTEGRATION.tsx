// ========== INTEGRATION GUIDE for pharmacy-frontend/app/page.tsx ==========
//
// This file shows how to add the Multi-Item Order functionality to your existing dashboard.
// Copy the relevant sections into your page.tsx file.
//

"use client";
// ========== ADD THESE IMPORTS ==========
import {
  MultiItemOrderCart,
  CartItem,
} from "@/app/components/MultiItemOrderCart";

// ... your existing imports ...

export default function PharmacyDashboard() {
  // ... your existing state declarations ...

  // ========== ADD THESE NEW STATE VARIABLES ==========
  const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
  const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
  const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
  const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");

  // ... rest of your existing state ...

  // ========== ADD THIS NEW FUNCTION ==========
  /**
   * BULK SALE HANDLER
   * Called when user clicks "Process Sale" in the Multi-Item Order cart
   *
   * Flow:
   * 1. Disable button to prevent double-submission
   * 2. Prepare payload with cart items + seller/receiver names
   * 3. Send to backend /api/inventory/bulk-sell with transaction
   * 4. Backend returns: total_items_processed, total_revenue, detailed items
   * 5. Show success/error toast notification
   * 6. Close modal and refresh inventory
   */
  const handleBulkSaleSubmit = async (cartItems: CartItem[]) => {
    // Validation: Ensure seller and receiver names are provided
    if (!bulkSaleSellerName.trim()) {
      showToast(
        "Seller Name Required",
        "Please enter the seller name for this order.",
        "error",
      );
      return;
    }

    if (!bulkSaleReceiverName.trim()) {
      showToast(
        "Receiver Name Required",
        "Please enter the receiver name for this order.",
        "error",
      );
      return;
    }

    setIsProcessingBulkSale(true);

    try {
      // ========== PREPARE PAYLOAD ==========
      const payload = {
        items: cartItems.map((item) => ({
          medicine_id: item.medicineId,
          batch_number: item.batchNumber || undefined,
          medicine_name: item.medicineName,
          quantity: item.quantity,
          price_per_unit: item.pricePerUnit,
        })),
        seller_name: bulkSaleSellerName.trim(),
        receiver_name: bulkSaleReceiverName.trim(),
      };

      // ========== SEND REQUEST ==========
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

        // Log error for debugging
        console.error("Bulk sale error details:", {
          status: response.status,
          message: result.message,
          error: result.error,
        });
        return;
      }

      // ========== SUCCESS HANDLING ==========
      const {
        data: { total_items_processed, total_revenue, items },
      } = result;

      // Build detailed success message
      const itemsSummary = items
        .slice(0, 3) // Show first 3 items
        .map(
          (item: any) =>
            `${item.medicine_name} (${item.quantity_deducted} units)`,
        )
        .join(", ");

      const summary =
        items.length > 3
          ? `${itemsSummary}, +${items.length - 3} more`
          : itemsSummary;

      showToast(
        "✅ Order Processed Successfully!",
        `${total_items_processed} items | ${summary} | Total: ETB ${total_revenue}`,
        "success",
      );

      // ========== CLEANUP ==========
      // Close modal and reset form
      setIsGeneralSaleOpen(false);
      setBulkSaleSellerName("");
      setBulkSaleReceiverName("");

      // Refresh inventory to show updated quantities
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

  // ========== ADD THIS BUTTON TO YOUR DASHBOARD HEADER ==========
  // Place this in your existing dashboard buttons section (where you have other action buttons)
  const GeneralSaleButton = () => (
    <button
      onClick={() => setIsGeneralSaleOpen(true)}
      disabled={isProcessingBulkSale}
      className="
        inline-flex items-center gap-2 
        px-4 py-2 
        bg-gradient-to-r from-green-600 to-emerald-600
        hover:from-green-700 hover:to-emerald-700
        disabled:from-green-300 disabled:to-emerald-300
        text-white font-bold 
        rounded-lg shadow-lg
        transition duration-200
        disabled:cursor-not-allowed
      "
    >
      🛒 General Sale (Multi-Item Order)
    </button>
  );

  // ========== MODAL COMPONENT ==========
  // Place this wherever you place your other modals (render JSX)
  const GeneralSaleModal = () => (
    <>
      {/* Semi-transparent overlay */}
      {isGeneralSaleOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 transition-opacity" />
      )}

      {/* Modal: Seller/Receiver Input Dialog */}
      {isGeneralSaleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">
              Sale Information
            </h2>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seller Name
                </label>
                <input
                  type="text"
                  value={bulkSaleSellerName}
                  onChange={(e) => setBulkSaleSellerName(e.target.value)}
                  placeholder="e.g., Ahmed Hassan"
                  disabled={isProcessingBulkSale}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receiver/Customer Name
                </label>
                <input
                  type="text"
                  value={bulkSaleReceiverName}
                  onChange={(e) => setBulkSaleReceiverName(e.target.value)}
                  placeholder="e.g., Central Hospital Supply"
                  disabled={isProcessingBulkSale}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsGeneralSaleOpen(false)}
                disabled={isProcessingBulkSale}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsGeneralSaleOpen(true)} // Opens the actual order cart
                disabled={
                  isProcessingBulkSale ||
                  !bulkSaleSellerName.trim() ||
                  !bulkSaleReceiverName.trim()
                }
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal (from MultiItemOrderCart component) */}
      <MultiItemOrderCart
        isOpen={
          isGeneralSaleOpen &&
          bulkSaleSellerName.trim() &&
          bulkSaleReceiverName.trim()
        }
        onClose={() => setIsGeneralSaleOpen(false)}
        onSubmit={handleBulkSaleSubmit}
        isProcessing={isProcessingBulkSale}
      />
    </>
  );

  // ========== IN YOUR RETURN/JSX ==========
  return (
    <div>
      {/* Your existing dashboard header */}
      <header className="flex justify-between items-center mb-6">
        {/* Other buttons */}
        {isAdmin && <GeneralSaleButton />}
      </header>

      {/* Your existing dashboard content */}
      {/* ... */}

      {/* Add the modal at the end of your component */}
      <GeneralSaleModal />
    </div>
  );
}

// ========== ALTERNATIVE: SIMPLER INTEGRATION ==========
// If you want to keep it simple without the pre-dialog:

// Just add to your dashboard:
/*
const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);

// Button in JSX
<button
  onClick={() => setIsGeneralSaleOpen(true)}
  className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold"
>
  🛒 General Sale
</button>

// Modal in JSX
<MultiItemOrderCart
  isOpen={isGeneralSaleOpen}
  onClose={() => setIsGeneralSaleOpen(false)}
  onSubmit={handleBulkSaleSubmit}
  isProcessing={isProcessingBulkSale}
/>
*/

// ========== TOAST FUNCTION (if you don't have it) ==========
// Ensure your showToast function exists in your dashboard
// It should look like this:
/*
const showToast = (
  title: string,
  description: string,
  type: "success" | "error"
) => {
  const id = toastIdRef.current++;
  const toast: ToastMessage = { id, title, description, type };
  setToasts((prev) => [...prev, toast]);

  setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, 5000);
};
*/
