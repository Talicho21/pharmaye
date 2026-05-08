"use client";

/**
 * PrintableInvoice Component
 *
 * A professional, print-optimized invoice component for pharmacy sales.
 * Features:
 * - Dynamic data mapping from cart items
 * - Professional table layout with sharp borders
 * - Print-specific CSS that hides UI elements
 * - Signature lines for approval workflow
 * - Currency formatting (ETB)
 * - Ethiopian date formatting
 */

export type CartItem = {
  id: string;
  medicineId: number;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  pricePerUnit: number;
  expiryDate: string;
  availableStock?: number;
};

type PrintableInvoiceProps = {
  cartItems: CartItem[];
  customerName: string;
  tinNumber: string;
  invoiceNo: string; // Generated from transaction ID
  paymentMethod?: "cash" | "credit"; // NEW: Cash or Credit payment
  customerSNo?: string;
  onPrint?: () => void; // Called after print dialog closes
};

/**
 * FORMAT HELPERS
 * These utilities handle currency and date formatting for Ethiopia
 */

const formatCurrency = (value: number): string => {
  return `ETB ${value.toFixed(2)}`;
};

const formatEthiopianDate = (date: Date = new Date()): string => {
  // For Ethiopian date, we show in format: 05/07/2026 (MM/DD/YYYY)
  // In production, you'd use a library like date-fns with Ethiopian calendar
  return date.toLocaleDateString("en-ET", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

/**
 * FORMAT EXPIRY DATE AS MM/YYYY
 * Input: "2026-12-15" or "12/15/2026"
 * Output: "12/2026"
 *
 * Why: Pharmaceutical invoices typically show only month/year
 * for expiry dates to reduce line-item width and improve readability.
 */
const formatExpiryDateMonthYear = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${year}`;
  } catch (error) {
    console.warn(`Invalid date format: ${dateString}`);
    return dateString; // fallback to original string
  }
};

/**
 * CALCULATE NON-TAXABLE AMOUNT
 *
 * Default: 0 (no items are tax-exempt)
 *
 * PRO USAGE: Filter by category to calculate dynamically
 * Example:
 *   const nonTaxableAmount = cartItems
 *     .filter(item => item.category === 'vaccine' || item.category === 'essential')
 *     .reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0);
 */
const calculateNonTaxable = (items: CartItem[]): number => {
  // Default implementation: no items are tax-exempt
  return 0;
};

/**
 * PREPARE PAYMENT METHOD DISPLAY
 *
 * Input: paymentMethod string ('cash' | 'credit')
 * Output: Formatted label with visual indicator
 */
const getPaymentMethodLabel = (
  paymentMethod: "cash" | "credit" = "cash",
): { label: string; color: string } => {
  return paymentMethod === "cash"
    ? { label: "Cash", color: "bg-green-100 text-green-900" }
    : { label: "Credit", color: "bg-blue-100 text-blue-900" };
};

/**
 * CALCULATION HELPERS
 * These compute dynamic totals based on cart items
 */

const calculateLineTotal = (quantity: number, pricePerUnit: number): number => {
  return quantity * pricePerUnit;
};

const calculateSubtotal = (items: CartItem[]): number => {
  return items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.pricePerUnit),
    0,
  );
};

const calculateTax = (subtotal: number, taxRate: number = 0.15): number => {
  return subtotal * taxRate; // 15% VAT (common in Ethiopia)
};

const calculateGrandTotal = (subtotal: number): number => {
  const tax = calculateTax(subtotal);
  return subtotal + tax;
};

export function PrintableInvoice({
  cartItems,
  customerName,
  tinNumber,
  invoiceNo,
  paymentMethod = "cash",
  customerSNo,
  onPrint,
}: PrintableInvoiceProps) {
  const currentDate = new Date();
  const invoiceDate = formatEthiopianDate(currentDate);
  const invoiceTime = formatTime(currentDate);

  // Calculate totals dynamically
  const subtotal = calculateSubtotal(cartItems);
  const nonTaxable = calculateNonTaxable(cartItems);
  const tax = calculateTax(subtotal);
  const grandTotal = calculateGrandTotal(subtotal);
  const totalItems = cartItems.length;
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const paymentDisplay = getPaymentMethodLabel(paymentMethod);

  /**
   * PRINT HANDLER
   *
   * Why window.print()?
   * - Opens native browser print dialog
   * - Respects @media print CSS (hides non-printable elements)
   * - Allows user to select printer or save as PDF
   * - Triggers AFTER successful sale confirmation
   */
  const handlePrint = () => {
    // Small delay ensures DOM has fully rendered
    setTimeout(() => {
      window.print();
      onPrint?.();
    }, 100);
  };

  return (
    <>
      {/* PRINT STYLESHEET */}
      {/* 
        @media print targets only printer output
        - display: none hides everything except invoice
        - @page sets margins
        - page-break-* prevents splits mid-table
      */}
      <style>{`
        @media print {
          /* Hide entire page body so only invoice prints */
          body * {
            display: none;
          }

          /* Show ONLY the invoice container */
          #invoice-container,
          #invoice-container * {
            display: block;
          }

          /* Page setup */
          @page {
            margin: 10mm;
            size: A4;
          }

          /* Prevent table rows from breaking across pages */
          #invoice-table tbody tr {
            page-break-inside: avoid;
          }

          /* Prevent table headers from orphaning */
          #invoice-table thead {
            display: table-header-group;
          }

          /* Ensure borders print in all browsers */
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Force background colors in print */
          .invoice-header,
          .invoice-footer,
          .invoice-summary {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Responsive adjustments for A4 */
          .invoice-container {
            width: 100%;
            max-width: 210mm;
          }
        }

        @media screen {
          /* Hide print button on screen */
          #print-button {
            display: block;
          }
        }
      `}</style>

      {/* DOCUMENT WRAPPER - Only this renders in print mode */}
      <div id="invoice-container" className="w-full bg-white p-0">
        {/* ========== HEADER SECTION ========== */}
        <div className="invoice-header border-b-2 border-gray-900 pb-4 mb-6">
          {/* Company Branding */}
          <div className="flex items-start justify-between mb-4">
            {/* Left: Logo + Company Name */}
            <div className="flex items-center gap-4">
              <img
                src="/Logo.jpg"
                alt="Express Pharmaceutical Wholesale"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  EXPRESS PHARMA ONE ME.PLS
                </h1>
                <p className="text-sm text-gray-600">
                  Pharmaceutical Wholesale & Distribution
                </p>
              </div>
            </div>

            {/* Right: Invoice Title */}
            <div className="text-right">
              <h2 className="text-4xl font-extrabold text-gray-900">INVOICE</h2>
              <p className="text-xs text-gray-500 mt-1">Professional Receipt</p>
            </div>
          </div>

          {/* Company Contact Info */}
          <div className="grid grid-cols-2 gap-8 text-sm text-gray-700 border-t pt-2">
            <div>
              <p className="font-semibold text-gray-900">Contact Information</p>
              <p>TIN: 0098248381</p>
              <p>Phone: 0981798081</p>
              <p>Email: israelmohamed3@gmail.com</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">Invoice Details</p>
              <p>
                Invoice No:{" "}
                <span className="font-mono font-bold">{invoiceNo}</span>
              </p>
              <p>Date: {invoiceDate}</p>
              <p>Time: {invoiceTime}</p>
            </div>
          </div>
        </div>

        {/* ========== CUSTOMER SECTION (ENHANCED) ========== */}
        <div className="grid grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          {/* Left: Bill To */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Bill To
            </p>
            <p className="text-sm text-gray-600">S.No: {customerSNo || "-"}</p>
            <p className="text-lg font-semibold text-gray-900">
              {customerName || "N/A"}
            </p>
            <p className="text-sm text-gray-600">TIN: {tinNumber || "N/A"}</p>
          </div>

          {/* Center: Payment Method */}
          <div className="text-center">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Payment Method
            </p>
            <p
              className={`text-lg font-bold text-gray-900 px-3 py-1 rounded inline-block ${paymentDisplay.color}`}
            >
              {paymentDisplay.label}
            </p>
          </div>

          {/* Right: Transaction Details */}
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Transaction
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Items:</span> {totalItems}
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Total Qty:</span> {totalQuantity}
            </p>
          </div>
        </div>

        {/* ========== ITEMS TABLE (ENHANCED) ========== */}
        {/* 
          ENHANCEMENTS:
          
          1. S.No Column: Uses .map()'s second parameter (index) for row numbering
             - Starts at 1 (index + 1) for human-readable numbering
             - Essential for audit trails and physical stock verification
          
          2. Expiry Date Formatting: Extracts MM/YYYY only
             - Input: "2026-12-15" → Output: "12/2026"
             - Improves readability on paper, saves horizontal space
          
          3. Column Order: S.No → Description → Batch → Unit Price → Exp.Date → Qty → Total
             - S.No first helps with sequential verification during delivery
        */}
        <table
          id="invoice-table"
          className="w-full border-collapse border border-gray-900"
          cellPadding={0}
          cellSpacing={0}
        >
          {/* TABLE HEADER */}
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="border border-gray-900 px-2 py-2 text-center font-semibold text-xs w-8">
                S.No
              </th>
              <th className="border border-gray-900 px-3 py-2 text-left font-semibold text-xs">
                Description
              </th>
              <th className="border border-gray-900 px-3 py-2 text-left font-semibold text-xs">
                Batch #
              </th>
              <th className="border border-gray-900 px-3 py-2 text-right font-semibold text-xs">
                Unit Price (ETB)
              </th>
              <th className="border border-gray-900 px-3 py-2 text-center font-semibold text-xs">
                Exp. Date
              </th>
              <th className="border border-gray-900 px-3 py-2 text-center font-semibold text-xs">
                Qty
              </th>
              <th className="border border-gray-900 px-3 py-2 text-right font-semibold text-xs">
                Total (ETB)
              </th>
            </tr>
          </thead>

          {/* TABLE BODY WITH S.NO */}
          <tbody>
            {cartItems.map((item, index) => {
              const lineTotal = calculateLineTotal(
                item.quantity,
                item.pricePerUnit,
              );

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  {/* S.No: Auto-generated from array index */}
                  <td className="border border-gray-900 px-2 py-2 text-center font-semibold text-sm text-gray-900">
                    {index + 1}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-sm font-medium text-gray-900">
                    {item.medicineName}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-sm text-gray-700">
                    {item.batchNumber}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-sm text-right text-gray-900 font-semibold">
                    {formatCurrency(item.pricePerUnit)}
                  </td>

                  {/* Expiry Date: Formatted as MM/YYYY */}
                  <td className="border border-gray-900 px-3 py-2 text-sm text-center text-gray-700 font-medium">
                    {formatExpiryDateMonthYear(item.expiryDate)}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-sm text-center text-gray-900 font-medium">
                    {item.quantity}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-sm text-right font-bold text-green-600">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ========== PROFESSIONAL PHARMACEUTICAL ACCOUNTING TOTALS SECTION ========== */}
        {/* 
          ACCOUNTING FORMAT DESIGN:
          - Three-row vertical layout (sub total → Non-Taxable → Grand Total)
          - Pinned to right side of page using ml-auto (margin-left: auto)
          - Fixed width (w-64) for consistent decimal alignment
          - Professional accounting lines: single line above Grand Total, double line below
          - Labels left-aligned, currency values right-aligned for columnar alignment
          
          WHY THIS DESIGN?
          - Mimics traditional pharmaceutical invoices used by auditors and tax authorities
          - Decimal alignment ensures visual accuracy on printed A4
          - Bottom double-line signals "final amount" in accounting convention
        */}
        <div className="invoice-summary mt-8 mb-6">
          {/* TOP SECTION: Order Summary Stats (Left-aligned for reference) */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded w-fit">
            <p className="text-xs font-semibold text-blue-900 uppercase mb-2">
              Order Summary
            </p>
            <div className="space-y-1 text-sm text-blue-900">
              <p>
                Total Items: <span className="font-bold">{totalItems}</span>
              </p>
              <p>
                Total Quantity:{" "}
                <span className="font-bold">{totalQuantity}</span>
              </p>
            </div>
          </div>

          {/* ACCOUNTING TOTALS: Three-row format pinned to RIGHT using ml-auto */}
          <div className="w-64 ml-auto">
            {/* ROW 1: sub total (lowercase) */}
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-normal">sub total</span>
              <span className="text-gray-900 font-semibold tabular-nums">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* ROW 2: Not Taxable (proper case) */}
            {/* 
              NON-TAXABLE LOGIC:
              - Default: 0 (displays "ETB 0.00")
              - Future: Calculate based on medicine category
              - Example: Vaccines, Essential medicines could be 0% VAT
            */}
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-700 font-normal">Not Taxable</span>
              <span className="text-gray-900 font-semibold tabular-nums">
                {formatCurrency(nonTaxable)}
              </span>
            </div>

            {/* SEPARATOR: Single line above Grand Total */}
            <div className="border-t border-gray-900 my-2" />

            {/* ROW 3: Grand Total (Bold with accounting line below) */}
            <div className="flex justify-between mb-0">
              <span className="text-gray-900 font-bold text-sm">
                GRAND TOTAL
              </span>
              <span className="text-gray-900 font-bold text-sm tabular-nums">
                {formatCurrency(grandTotal)}
              </span>
            </div>

            {/* Double line below Grand Total (pharmaceutical accounting convention) */}
            <div className="border-b-4 border-gray-900 my-0" />
          </div>
        </div>

        {/* ========== FOOTER: HORIZONTAL SIGNATURE SECTION (REFACTORED) ========== */}
        {/* 
          SIGNATURE LAYOUT:
          - Flex row with three equal columns (Prepared By | Received By | Approved By)
          - Each has a solid line above for signature
          - Lines are 100% width within column for clean alignment
          - Solid border ensures it prints clearly on A4 paper
        */}
        <div className="invoice-footer border-t-2 border-gray-900 mt-8 pt-6">
          <div className="grid grid-cols-3 gap-8">
            {/* Column 1: Prepared By */}
            <div className="flex flex-col">
              {/* Signature Line */}
              <div
                className="border-b-2 border-gray-900 mb-2"
                style={{ height: "50px" }}
              />

              {/* Label */}
              <p className="text-xs font-semibold text-gray-900 text-center uppercase tracking-wide">
                Prepared By
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">
                Name & Date
              </p>
            </div>

            {/* Column 2: Received By */}
            <div className="flex flex-col">
              {/* Signature Line */}
              <div
                className="border-b-2 border-gray-900 mb-2"
                style={{ height: "50px" }}
              />

              {/* Label */}
              <p className="text-xs font-semibold text-gray-900 text-center uppercase tracking-wide">
                Received By
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">
                Name & Date
              </p>
            </div>

            {/* Column 3: Approved By */}
            <div className="flex flex-col">
              {/* Signature Line */}
              <div
                className="border-b-2 border-gray-900 mb-2"
                style={{ height: "50px" }}
              />

              {/* Label */}
              <p className="text-xs font-semibold text-gray-900 text-center uppercase tracking-wide">
                Approved By
              </p>
              <p className="text-xs text-gray-600 text-center mt-1">
                Name & Date
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PRINT BUTTON - Only visible on screen, not in print */}
      <div
        id="print-button"
        className="print:hidden sticky bottom-4 right-4 flex gap-2 mt-6"
      >
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-lg transition transform hover:scale-105"
        >
          🖨️ Print Invoice
        </button>
      </div>
    </>
  );
}
