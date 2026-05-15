"use client";
import { useEffect, useState, useMemo } from "react";
import { generateInvoiceNumber } from "../utils/invoiceUtils";

export type CartItem = {
  id: string; // Unique ID for this cart item (not batch_id)
  medicineId: number;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  pricePerUnit: number;
  expiryDate: string;
  // availableStock is the current stock for this batch at time of adding to cart
  availableStock?: number;
};

type MultiItemOrderCartProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    items: CartItem[],
    customerName: string,
    tinNumber: string,
    sellerName?: string,
    customerSNo?: string,
    paymentMethod?: "cash" | "credit",
    invoiceNo?: string,
    reference?: string,
  ) => Promise<void>;
  isProcessing?: boolean;
};

export function MultiItemOrderCart({
  isOpen,
  onClose,
  onSubmit,
  isProcessing = false,
}: MultiItemOrderCartProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      batch_id: number;
      medicine_id: number;
      medicine_name: string;
      batch_number: string;
      quantity: number;
      price_per_unit: number;
      expiry_date: string;
      category_name?: string | null;
    }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newMedicineId, setNewMedicineId] = useState("");
  const [newBatchNumber, setNewBatchNumber] = useState("");
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [newPricePerUnit, setNewPricePerUnit] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [tinNumber, setTinNumber] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerSNo, setCustomerSNo] = useState("");
  const [reference, setReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash");
  const [sellerName, setSellerName] = useState("");
  const [newAvailableStock, setNewAvailableStock] = useState<number | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"cart" | "receipt">("cart");
  const [stockValidationError, setStockValidationError] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [itemSoldOutDate, setItemSoldOutDate] = useState("");

  const formattedSoldOutDate = (() => {
    const source = itemSoldOutDate || new Date().toISOString();
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toLocaleDateString("en-GB");
    }
    return parsed.toLocaleDateString("en-GB");
  })();

  useEffect(() => {
    const trimmedQuery = medicineSearch.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    setIsSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/inventory/search?query=${encodeURIComponent(trimmedQuery)}`,
        );
        const data = await response.json();

        if (!isActive) return;

        if (response.ok && data.success) {
          setSearchResults(Array.isArray(data.results) ? data.results : []);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (!isActive) return;
        console.error("Inventory search failed:", error);
        setSearchResults([]);
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [medicineSearch]);

  // Calculate totals
  const cartTotals = useMemo(() => {
    return {
      itemCount: cartItems.length,
      totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: cartItems.reduce(
        (sum, item) => sum + item.quantity * item.pricePerUnit,
        0,
      ),
    };
  }, [cartItems]);

  const addItemToCart = () => {
    // Validation
    if (
      !newMedicineId.trim() ||
      !newMedicineName.trim() ||
      !newBatchNumber.trim() ||
      !newPricePerUnit.trim() ||
      !newExpiryDate.trim()
    ) {
      alert("Please fill in all fields");
      return;
    }

    const quantity = Number(newQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert("Quantity must be a positive whole number");
      return;
    }

    const price = Number(newPricePerUnit);
    if (!Number.isFinite(price) || price < 0) {
      alert("Price must be a valid non-negative number");
      return;
    }
    // Validate against available stock (if known)
    if (newAvailableStock !== null && quantity > newAvailableStock) {
      alert(
        `Cannot add ${quantity} units — only ${newAvailableStock} units available in stock for ${newMedicineName}.`,
      );
      return;
    }

    // Create new cart item (store availableStock for later validation)
    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`, // Client-side unique ID
      medicineId: Number(newMedicineId),
      batchNumber: newBatchNumber.trim(),
      medicineName: newMedicineName.trim(),
      quantity,
      pricePerUnit: price,
      expiryDate: newExpiryDate.trim(),
      availableStock: newAvailableStock ?? undefined,
    };

    // Add to cart (allows same medicine to be added multiple times)
    setCartItems([...cartItems, cartItem]);

    // Reset form
    setNewMedicineId("");
    setNewBatchNumber("");
    setNewMedicineName("");
    setNewQuantity("1");
    setNewPricePerUnit("");
    setNewExpiryDate("");
    setNewAvailableStock(null);
  };

  const handleSelectSearchResult = (item: {
    batch_id: number;
    medicine_id: number;
    medicine_name: string;
    batch_number: string;
    quantity: number;
    price_per_unit: number;
    expiry_date: string;
  }) => {
    setNewMedicineId(String(item.medicine_id));
    setNewMedicineName(item.medicine_name);
    setNewBatchNumber(item.batch_number);
    setNewPricePerUnit(String(item.price_per_unit));
    setNewExpiryDate(item.expiry_date);
    setNewQuantity("1");
    setMedicineSearch("");
    setSearchResults([]);
    setStockValidationError("");
    setNewAvailableStock(Number(item.quantity ?? 0));
  };

  const validateStock = (): boolean => {
    setStockValidationError("");

    for (const item of cartItems) {
      const avail =
        typeof item.availableStock === "number" ? item.availableStock : null;
      if (avail !== null && item.quantity > avail) {
        setStockValidationError(
          `✕ Insufficient Stock: ${item.medicineName} (Batch ${item.batchNumber}) has only ${avail} units available, but you are trying to sell ${item.quantity} units. Please adjust the quantity accordingly.`,
        );
        return false;
      }
    }

    return true;
  };

  const exportReceiptPDF = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (!printWindow) return;
    const printableInvoiceNumber =
      invoiceNumber ||
      invoiceNo ||
      generateInvoiceNumber(customerName, tinNumber);
    const printableSoldOutDate = formattedSoldOutDate;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          :root {
            --print-margin: 20mm;
            --header-space: 78mm;
            --footer-space: 22mm;
          }

          html,
          body {
            margin: 0;
            padding: 0;
          }

          body {
            font-family: Arial, sans-serif;
            color: #111;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff;
          }

          .receipt-shell {
            position: relative;
            box-sizing: border-box;
            min-height: calc(297mm - (var(--print-margin) * 2));
            padding-top: var(--header-space);
            padding-bottom: var(--footer-space);
          }

          .invoice-fixed-header,
          .invoice-fixed-footer {
            position: fixed;
            left: var(--print-margin);
            right: var(--print-margin);
            z-index: 10;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .invoice-fixed-header {
            top: var(--print-margin);
          }

          .invoice-fixed-footer {
            bottom: var(--print-margin);
          }

          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin: 12px 0;
          }

          .info-box {
            border: 1px solid #111;
            padding: 8px;
          }

          .label {
            font-weight: bold;
            color: #222;
          }

          .items-section {
            display: block;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 10px 0 8px;
            border: 1px solid #111;
          }

          .items-table thead {
            display: table-header-group;
          }

          .items-table tfoot {
            display: table-footer-group;
          }

          .items-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .items-table th,
          .items-table td {
            border: 1px solid #111;
            padding: 6px 8px;
            font-size: 12px;
            vertical-align: top;
            white-space: normal;
            overflow-wrap: anywhere;
            background: #fff;
            color: #111;
          }

          .items-table th {
            background-color: #f3f4f6;
            font-weight: 700;
            text-align: left;
          }

          .signature-section {
            margin-top: 8px;
            border-top: 2px solid #111;
            padding-top: 8px;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
          }

          .signature-box {
            text-align: center;
            border-top: 1px solid #111;
            padding-top: 6px;
            min-height: 28px;
          }

          .signature-label {
            font-size: 12px;
            font-weight: bold;
            color: #111;
          }

          .legal-disclaimer {
            border-top: 2px solid #111;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            padding-top: 6px;
          }

          @media print {
            @page {
              size: A4;
              margin: var(--print-margin);
            }

            html,
            body {
              width: 210mm;
              min-height: 297mm;
              margin: 0;
              padding: 0;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }

            .invoice-fixed-header,
            .invoice-fixed-footer {
              display: block;
            }
          }
        </style>
        <script>
          function sanitizeAboutBlank() {
            try {
              const elements = document.querySelectorAll('body *');
              elements.forEach((el) => {
                el.childNodes.forEach((child) => {
                  if (child.nodeType === Node.TEXT_NODE && child.nodeValue && child.nodeValue.indexOf('about:blank') !== -1) {
                    child.nodeValue = child.nodeValue.replace(//gi, '');
                  }
                });
              });
            } catch (e) { /* ignore */ }
          }
          window.addEventListener('DOMContentLoaded', sanitizeAboutBlank);
          window.addEventListener('beforeprint', sanitizeAboutBlank);
        </script>
      </head>
      <body>
        <div class="receipt-shell">
        <div class="invoice-fixed-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
          <div style="display:flex;align-items:center;text-align:left;gap:12px;">
            <div>
              <div style="font-size:18px;font-weight:700;">EXPRESS PHARMA ONE ME.PLC</div>
              <table style="margin-top:8px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:11px;">
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Invoice No</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${printableInvoiceNumber}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">FS No</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${customerSNo || "-"}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Reference</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${reference || ""}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Date</td>
                  <td style="border:1px solid #111;padding:4px 8px;color:#2563EB;font-weight:700;">${printableSoldOutDate}</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:800;">INVOICE</div>
            <div style="font-size:12px;color:#333;margin-top:6px;">
              <div>Express Pharma One Me. PLC</div>
              <div>TIN: 0098248381</div>
              <div>Tell: 0981798081</div>
              <div>E-mail: epharm38@gmail.com</div>
            </div>
          </div>
        </div>

        <div class="receipt-info">
          <div class="info-box">
            <div class="label">Customer Name:</div>
            <div>${customerName || "N/A"}</div>
          </div>
          <div class="info-box">
            <div class="label">TIN Number:</div>
            <div>${tinNumber || "N/A"}</div>
          </div>
          <div class="info-box">
            <div class="label">Payment Method:</div>
            <div>${paymentMethod === "cash" ? "Cash" : "Credit"}</div>
          </div>
        </div>

        <div class="items-section">
        <table class="items-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>Batch #</th>
              <th>Expiry Date</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Unit Price (ETB)</th>
              <th style="text-align: right;">Total (ETB)</th>
            </tr>
          </thead>
          <tbody>
            ${cartItems
              .map((item, index) => {
                const d = new Date(item.expiryDate);
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();
                const expiry = isNaN(d.getTime())
                  ? item.expiryDate
                  : `${mm}/${yyyy}`;
                return `
              <tr>
                <td>${index + 1}</td>
                <td>${item.medicineName}</td>
                <td>${item.batchNumber}</td>
                <td>${expiry}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${item.pricePerUnit.toFixed(2)}</td>
                <td style="text-align: right;">${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
        </div>

        <div style="margin-top: 8px; padding-top: 10px; border-top: 2px solid #111;">
          <div style="width: 260px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
              <span style="color: #374151;">total</span>
              <span style="font-weight: 700; color: #111827;">ETB ${cartTotals.totalPrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px;">
              <span style="color: #374151;">Not Taxable</span>
              <span style="font-weight: 700; color: #111827;">ETB 0.00</span>
            </div>
            <div style="border-top: 1px solid #111; margin: 4px 0 6px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 800;">
              <span style="color: #111827;">GRAND TOTAL</span>
              <span style="color: #111827;">ETB ${cartTotals.totalPrice.toFixed(2)}</span>
            </div>
            <div style="border-bottom: 3px solid #111; margin-top: 3px;"></div>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-grid">
            <div class="signature-box">
              <div class="signature-label">Prepared By</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Received By</div>
            </div>
            <div class="signature-box">
              <div class="signature-label">Approved By</div>
            </div>
          </div>
        </div>

        <div class="invoice-fixed-footer legal-disclaimer">
          INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED
        </div>

        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const updateCartItem = (id: string, field: keyof CartItem, value: any) => {
    // When updating quantity, enforce availableStock if present
    if (field === "quantity") {
      const qty = Number(value);
      setCartItems(
        cartItems.map((item) => {
          if (item.id !== id) return item;
          const avail =
            typeof item.availableStock === "number"
              ? item.availableStock
              : null;
          if (avail !== null && qty > avail) {
            setStockValidationError(
              `✕ Insufficient Stock: ${item.medicineName} (Batch ${item.batchNumber}) has only ${avail} units available, but you are trying to sell ${qty} units. Please adjust the quantity accordingly.`,
            );
            return item; // ignore update
          }
          setStockValidationError("");
          return { ...item, [field]: qty };
        }),
      );
      return;
    }

    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItemFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (cartItems.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }

    if (!customerName.trim()) {
      alert("Please enter the customer name");
      return;
    }

    if (!tinNumber.trim()) {
      alert("Please enter the TIN number");
      return;
    }

    if (!customerSNo.trim()) {
      // allow blank but warn; optional requirement can be toggled
      // we'll let it proceed but trim the value
    }

    // Validate stock before showing receipt
    if (viewMode === "cart") {
      if (!validateStock()) {
        return;
      }
      // Generate dynamic invoice number: INV-[First 3 Letters of Customer Name]-[Last 4 Digits of TIN]
      const generatedInvoiceNo =
        invoiceNo.trim() || generateInvoiceNumber(customerName, tinNumber);
      setInvoiceNo(generatedInvoiceNo);
      setInvoiceNumber(generatedInvoiceNo);
      setItemSoldOutDate(new Date().toISOString());
      // Switch to receipt view
      setViewMode("receipt");
      return;
    }

    // Process the sale (only when in receipt view)
    try {
      // Pass invoice_no and reference (empty string) to backend
      await onSubmit(
        cartItems,
        customerName.trim(),
        tinNumber.trim(),
        sellerName.trim() || undefined,
        customerSNo.trim() || undefined,
        paymentMethod,
        invoiceNumber || invoiceNo, // Dynamic invoice number
        reference.trim() || undefined,
      );
      setCartItems([]); // Clear cart on success
      setCustomerName("");
      setTinNumber("");
      setSellerName("");
      setInvoiceNo("");
      setCustomerSNo("");
      setReference("");
      setInvoiceNumber("");
      setItemSoldOutDate("");
      setViewMode("cart");
      onClose(); // Close modal after successful sale
    } catch (error) {
      console.error("Error processing order:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#2563EB]/10 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="w-full max-h-[90vh] bg-white rounded-t-lg sm:rounded-lg shadow-2xl flex flex-col max-w-2xl">
        {/* Header */}
        <div className="border-b border-[#E2E8F0] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2563EB]">
            🛒 Multi-Item Order (General Sale)
          </h2>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {viewMode === "cart" ? (
            <>
              {/* Stock Validation Error */}
              {stockValidationError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">
                    {stockValidationError}
                  </p>
                </div>
              )}

              {/* Customer Details */}
              <div className="mb-6 p-4 bg-white rounded-lg border border-[#E2E8F0]">
                <h3 className="mb-4 font-semibold text-[#2563EB]">
                  👤 Customer Information I{" "}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#334155] disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="TIN Number"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#334155] disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="Invoice No"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm text-[#334155] disabled:bg-slate-100"
                  />
                  <input
                    type="text"
                    placeholder="S.No "
                    value={customerSNo}
                    onChange={(e) => setCustomerSNo(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="Reference (optional)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="Seller Name"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    disabled={isProcessing}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />

                  <div className="flex items-center gap-4 pt-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "cash"}
                        onChange={() => setPaymentMethod("cash")}
                        disabled={isProcessing}
                      />
                      <span className="text-sm">Cash</span>
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === "credit"}
                        onChange={() => setPaymentMethod("credit")}
                        disabled={isProcessing}
                      />
                      <span className="text-sm">Credit</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Add Item Form */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-4">
                  ➕ Add Medicine to Order
                </h3>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Search by medicine name or batch number"
                    value={medicineSearch}
                    onChange={(e) => setMedicineSearch(e.target.value)}
                    disabled={isProcessing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />

                  {medicineSearch.trim() && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                      {isSearching ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          No matching inventory found.
                        </div>
                      ) : (
                        searchResults.map((item) => (
                          <button
                            key={`${item.medicine_id}-${item.batch_id}`}
                            type="button"
                            onClick={() => handleSelectSearchResult(item)}
                            className="flex w-full flex-col gap-1 border-b border-slate-100 px-4 py-3 text-left hover:bg-blue-50"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-slate-900">
                                {item.medicine_name}
                              </span>
                              <span className="text-xs font-bold text-emerald-600">
                                ETB{" "}
                                {Number(item.price_per_unit || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Batch: {item.batch_number} | Stock:{" "}
                              {item.quantity} | Exp: {item.expiry_date}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Selected Medicine ID"
                    value={newMedicineId}
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="Selected Medicine Name"
                    value={newMedicineName}
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="Selected Batch Number"
                    value={newBatchNumber}
                    readOnly
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    disabled={isProcessing}
                    min="1"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                  />
                  <input
                    type="number"
                    placeholder="Price Per Unit (ETB)"
                    value={newPricePerUnit}
                    readOnly
                    step="0.01"
                    min="0"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                  />
                  <input
                    type="date"
                    placeholder="Expiry Date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={addItemToCart}
                  disabled={isProcessing}
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition"
                >
                  Add Item to Cart
                </button>
              </div>

              {/* Cart Items */}
              {cartItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Start by adding medicines above.
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    📋 Order Items ({cartItems.length})
                  </h3>
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.medicineName}
                          </p>
                          <p className="text-xs text-gray-600">
                            Batch: {item.batchNumber} | Expires:{" "}
                            {item.expiryDate}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItemFromCart(item.id)}
                          disabled={isProcessing}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = Number(e.target.value);
                              if (qty > 0) {
                                updateCartItem(item.id, "quantity", qty);
                              }
                            }}
                            disabled={isProcessing}
                            min="1"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            Unit Price (ETB)
                          </label>
                          <input
                            type="number"
                            value={item.pricePerUnit}
                            onChange={(e) => {
                              const price = Number(e.target.value);
                              if (price >= 0) {
                                updateCartItem(item.id, "pricePerUnit", price);
                              }
                            }}
                            disabled={isProcessing}
                            step="0.01"
                            min="0"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            Subtotal (ETB)
                          </label>
                          <div className="px-2 py-1 bg-gray-100 rounded text-sm font-semibold">
                            {(item.quantity * item.pricePerUnit).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* RECEIPT VIEW */
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  📄 SALE RECEIPT
                </h3>
                <p className="text-sm text-gray-600">
                  Review the order details before confirming
                </p>
              </div>

              {/* Receipt Header */}
              <div className="p-4 bg-white rounded-lg border border-slate-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center text-left gap-4">
                    {/* <img
                      src="/Logo.jpg"
                      alt="Logo"
                      className="w-20 h-20 object-contain rounded"
                    /> */}
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">
                        EXPRESS PHARMA ONE ME.PLC
                      </h2>
                      <table className="mt-2 border-collapse font-[Arial] text-[11px]">
                        <tbody>
                          <tr>
                            <td className="border border-black bg-slate-50 px-2 py-1 font-bold">
                              Invoice No
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-slate-900">
                              {invoiceNumber || `INV-${Date.now()}`}
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-slate-50 px-2 py-1 font-bold">
                              FS No
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-slate-900">
                              000000010
                            </td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-slate-50 px-2 py-1 font-bold">
                              Reference
                            </td>
                            <td className="border border-black px-2 py-1 font-mono text-slate-900"></td>
                          </tr>
                          <tr>
                            <td className="border border-black bg-slate-50 px-2 py-1 font-bold">
                              Date
                            </td>
                            <td className="border border-black bg-blue-50 px-2 py-1 font-mono font-bold text-[#2563EB]">
                              {formattedSoldOutDate}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="text-right">
                    <h3 className="text-2xl font-extrabold text-slate-900">
                      INVOICE
                    </h3>
                    <div className="mt-2 text-sm text-slate-700">
                      <div>Express Pharma One Me. PLC</div>
                      <div>TIN: 0098248381</div>
                      <div>Tell: 0981798081</div>
                      <div>E-mail: epharm38@gmail.com</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-semibold">
                      Customer Name:
                    </p>
                    <p className="text-gray-900 font-semibold">
                      {customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-semibold">TIN Number:</p>
                    <p className="text-gray-900 font-semibold">{tinNumber}</p>
                  </div>
                </div>
              </div>

              {/* Receipt Items */}
              <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
                <div className="bg-[#F8FAFC] px-4 py-3 grid grid-cols-12 gap-2 text-xs font-bold text-[#64748B]">
                  <div className="col-span-4">Description</div>
                  <div className="col-span-2">Batch #</div>
                  <div className="col-span-2">Expiry Date</div>
                  <div className="col-span-1 text-right">Qty</div>
                  <div className="col-span-1 text-right">Unit Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>
                <div className="divide-y">
                  {cartItems.map((item) => {
                    const subtotal = item.quantity * item.pricePerUnit;
                    return (
                      <div
                        key={item.id}
                        className="px-4 py-3 grid grid-cols-12 gap-2 text-sm"
                      >
                        <div className="col-span-4 font-semibold text-[#334155]">
                          {item.medicineName}
                        </div>
                        <div className="col-span-2 text-[#64748B]">
                          {item.batchNumber}
                        </div>
                        <div className="col-span-2 text-[#64748B]">
                          {item.expiryDate}
                        </div>
                        <div className="col-span-1 text-right text-[#334155]">
                          {item.quantity}
                        </div>
                        <div className="col-span-1 text-right font-semibold text-[#334155]">
                          ETB {item.pricePerUnit.toFixed(2)}
                        </div>
                        <div className="col-span-2 text-right font-bold text-green-600">
                          ETB {subtotal.toFixed(2)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Receipt Summary */}
              <div className="p-4 bg-white rounded-lg border border-[#E2E8F0]">
                {/* <div className="text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">
                    Order Summary
                  </div> */}
                {/* <div className="flex justify-between gap-4">
                      <span>Total Items</span>
                      <span className="font-semibold">
                        {cartTotals.itemCount}
                      </span>
                    </div> */}
                {/* <div className="flex justify-between gap-4">
                      <span>Total Quantity</span>
                      <span className="font-semibold">
                        {cartTotals.totalQuantity}
                      </span>
                    </div> */}

                <div className="ml-auto w-64">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-[#64748B]">total</span>
                    <span className="font-semibold tabular-nums text-[#334155]">
                      ETB {cartTotals.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-[#64748B]">Not Taxable</span>
                    <span className="font-semibold tabular-nums text-[#334155]">
                      ETB 0.00
                    </span>
                  </div>
                  <div className="border-t border-[#2563EB] my-2" />
                  <div className="flex justify-between text-base font-bold">
                    <span className="text-[#10B981]">GRAND TOTAL</span>
                    <span className="tabular-nums text-[#10B981]">
                      ETB {cartTotals.totalPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-b-4 border-[#10B981] mt-1" />
                </div>
              </div>

              <div className="text-center text-xs text-[#64748B] italic py-2">
                Please review all details carefully before confirming the sale.
              </div>
            </div>
          )}
        </div>

        {/* Footer / Summary & Actions */}
        <div className="border-t border-[#E2E8F0] px-6 py-4 bg-white">
          {viewMode === "cart" ? (
            <>
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Items in Cart:</span>
                  <span className="font-semibold">{cartTotals.itemCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Total Quantity:</span>
                  <span className="font-semibold">
                    {cartTotals.totalQuantity}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-[#2563EB]">Total Price (ETB):</span>
                  <span className="text-[#10B981]">
                    {cartTotals.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing || cartItems.length === 0}
                  className="flex-1 px-4 py-2 bg-[#10B981] hover:bg-[#059669] disabled:bg-green-300 text-white font-semibold rounded-lg transition"
                >
                  {isProcessing ? "Processing..." : "📋 Review & Continue"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setViewMode("cart");
                    setStockValidationError("");
                  }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50"
                >
                  ← Back to Cart
                </button>
                <button
                  onClick={exportReceiptPDF}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border border-blue-300 text-blue-700 font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  📥 Export to PDF
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold rounded-lg transition"
                >
                  {isProcessing ? "Processing..." : "✓ Confirm & Process Sale"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
