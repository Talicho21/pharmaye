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
  reference?: string; // NEW: Reference note (can be blank/null for manual input)
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
 * FORMAT EXPIRY DATE AS DD/MM/YY for compact invoice columns.
 * Input variants supported:
 * - "YYYY-MM-DD" (preferred from HTML5 date inputs)
 * - "YYYY-MM-DDTHH:mm:ssZ" (ISO timestamp)
 * - "DD/MM/YYYY" (already formatted)
 */
const formatInvoiceExpiryDate = (dateString: string): string => {
  if (!dateString) return "";

  const raw = String(dateString).trim();

  // Already in DD/MM/YYYY or DD/MM/YY
  if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(raw)) {
    const [day, month, year] = raw.split("/");
    return `${day}/${month}/${String(year).slice(-2)}`;
  }

  // Plain YYYY-MM-DD (no timezone) — parse components directly to avoid TZ shifts
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1].slice(-2)}`;
  }

  // ISO-like string (with time and possibly timezone) — use UTC getters
  try {
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;

    const day = String(dt.getUTCDate()).padStart(2, "0");
    const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const year = String(dt.getUTCFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.warn(`Invalid expiry date: ${dateString}`);
    return raw;
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

const NUMBER_WORDS_ONES = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];

const NUMBER_WORDS_TEENS = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const NUMBER_WORDS_TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

const convertHundredsToWords = (value: number): string => {
  if (value === 0) return "";

  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;

  if (hundreds > 0) {
    parts.push(`${NUMBER_WORDS_ONES[hundreds]} Hundred`);
  }

  if (remainder >= 10 && remainder < 20) {
    parts.push(NUMBER_WORDS_TEENS[remainder - 10]);
  } else {
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;

    if (tens > 1) {
      parts.push(
        ones > 0
          ? `${NUMBER_WORDS_TENS[tens]} ${NUMBER_WORDS_ONES[ones]}`
          : NUMBER_WORDS_TENS[tens],
      );
    } else if (remainder > 0) {
      parts.push(NUMBER_WORDS_ONES[remainder]);
    }
  }

  return parts.join(" ").trim();
};

const numberToWords = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "Zero";
  }

  const normalizedValue = Math.round(value * 100) / 100;
  const absoluteValue = Math.abs(normalizedValue);
  const wholeNumber = Math.floor(absoluteValue);
  const cents = Math.round((absoluteValue - wholeNumber) * 100);

  if (wholeNumber === 0) {
    return cents > 0 ? `${convertHundredsToWords(cents)} Cents` : "Zero";
  }

  const chunkLabels = ["", "Thousand", "Million", "Billion", "Trillion"];
  const chunks: string[] = [];
  let remaining = wholeNumber;
  let chunkIndex = 0;

  while (remaining > 0 && chunkIndex < chunkLabels.length) {
    const chunk = remaining % 1000;

    if (chunk > 0) {
      const chunkWords = convertHundredsToWords(chunk);
      chunks.unshift(
        chunkLabels[chunkIndex]
          ? `${chunkWords} ${chunkLabels[chunkIndex]}`
          : chunkWords,
      );
    }

    remaining = Math.floor(remaining / 1000);
    chunkIndex += 1;
  }

  const wholeWords = chunks.join(" ").trim();

  if (cents === 0) {
    return `${wholeWords} ETB Only`;
  }

  return `${wholeWords} ETB and ${convertHundredsToWords(cents)} Cents Only`;
};

export function PrintableInvoice({
  cartItems,
  customerName,
  tinNumber,
  invoiceNo,
  paymentMethod = "cash",
  customerSNo,
  reference = "",
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
  const grandTotalInWords = numberToWords(grandTotal);
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
    const sanitizeAboutBlank = () => {
      try {
        const container = document.getElementById("invoice-container");
        if (!container) return;
        // Walk elements and clean text nodes that include 'about:blank'
        const elements = container.querySelectorAll("*");
        elements.forEach((el) => {
          el.childNodes.forEach((child) => {
            if (
              child.nodeType === Node.TEXT_NODE &&
              child.nodeValue &&
              child.nodeValue.indexOf("about:blank") !== -1
            ) {
              child.nodeValue = child.nodeValue.replace(/about:blank/gi, "");
            }
          });
        });
      } catch (err) {
        // silent
        console.warn("sanitizeAboutBlank failed", err);
      }
    };

    setTimeout(() => {
      sanitizeAboutBlank();
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
            visibility: hidden;
          }

          /* Show ONLY the invoice container */
          #invoice-container,
          #invoice-container * {
            visibility: visible;
          }

          #invoice-container {
            position: absolute;
            inset: 0;
            width: 100%;
            padding: 20mm;
            box-sizing: border-box;
          }

          /* Page setup */
          @page {
            margin: 0;
            size: A4;
          }

          html,
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }

          body::before,
          body::after {
            content: none !important;
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

          .invoice-total-box {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Remove all borders from the invoice areas that were causing persistent lines */
          .invoice-header,
          .invoice-header *,
          .invoice-summary,
          .invoice-summary *,
          .invoice-total-box,
          .invoice-total-box *,
          #invoice-table,
          #invoice-table *,
          .invoice-footer,
          .invoice-footer *,
          .amount-in-words-box,
          .amount-in-words-box * {
            border: 0 !important;
          }

          #invoice-table {
            border: none !important;
            border-collapse: collapse !important;
          }

          /* CRITICAL: Keep signature footer horizontal in print */
          .invoice-footer > div {
            display: flex !important;
            justify-content: space-between !important;
            gap: 1.5rem !important;
            width: 100% !important;
            align-items: flex-start !important;
            flex-wrap: nowrap !important;
          }

          .invoice-footer > div > div {
            display: block !important;
            flex: 1 1 0% !important;
            text-align: center !important;
            min-width: 0 !important;
          }

          .invoice-signoff {
            margin-top: 28mm !important;
            padding-top: 8mm !important;
          }

          .invoice-signoff-lines > div {
            border-top: 0 !important;
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
      <div
        id="invoice-container"
        className="relative w-full bg-white p-0 pb-16"
      >
        {/* ========== HEADER SECTION ========== */}
        <div className="invoice-header pb-4 mb-6">
          {/* Company Branding - Simplified without Logo */}
          <div className="flex items-start justify-between mb-4">
            {/* Left: Company Name */}
            <div>
              <h1 className="text-4xl font-bold text-[#2563EB]">
                EXPRESS PHARMA ONE ME. PLC
              </h1>

              <p className="text-base text-[#64748B] mt-1">
                Pharmaceutical Wholesale & Distribution
              </p>

              {/* METADATA TABLE: Positioned beneath Pharmacy Name */}
              <div className="mt-4">
                <table
                  className="border-collapse"
                  cellPadding={0}
                  cellSpacing={0}
                >
                  <tbody>
                    {/* Row 1: Invoice No */}
                    <tr>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-semibold text-gray-700 bg-gray-50 w-20">
                        Invoice No
                      </td>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-mono text-gray-900 bg-white">
                        {invoiceNo}
                      </td>
                    </tr>

                    {/* Row 2: S.No (Customer) - moved here per spec (replaces FS No) */}
                    <tr>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-semibold text-gray-700 bg-gray-50">
                        FS.No
                      </td>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-mono text-gray-900 bg-white">
                        {customerSNo || "-"}
                      </td>
                    </tr>

                    {/* Row 3: Reference - Can be blank/null for manual input */}
                    <tr>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-semibold text-gray-700 bg-gray-50">
                        Reference
                      </td>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-mono text-gray-900 bg-white">
                        {reference || ""}
                      </td>
                    </tr>

                    {/* Row 4: Date - Dynamic */}
                    <tr>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-semibold text-gray-700 bg-gray-50">
                        Date
                      </td>
                      <td className="border border-gray-900 px-3 py-1.5 text-base font-mono font-bold text-gray-900 bg-gray-50">
                        {invoiceDate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Invoice Title */}
            <div className="text-right">
              <h2 className="text-5xl font-extrabold text-gray-900">INVOICE</h2>
            </div>
          </div>

          {/* Company Contact Info */}
          <div className="grid grid-cols-2 gap-8 text-lg text-[#64748B] pt-2">
            <div>
              <p className="font-semibold text-gray-900">Contact Information</p>
              <p className="text-base">TIN: 0098248381</p>
              <p className="text-base">Phone: +251981798081</p>
              <p className="text-base">Email: epharm38@gmail.com</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">Invoice Details</p>
              <p className="text-base">
                Invoice No:{" "}
                <span className="font-mono font-bold">{invoiceNo}</span>
              </p>
              <p className="text-base">Date: {invoiceDate}</p>
              <p className="text-base">Time: {invoiceTime}</p>
            </div>
          </div>
        </div>

        {/* ========== CUSTOMER SECTION (ENHANCED) ========== */}
        <div className="grid grid-cols-3 gap-6 mb-6 p-4 bg-white border border-[#E2E8F0] rounded">
          {/* Left: Bill To */}
          <div>
            <p className="text-base font-semibold text-[#64748B] uppercase tracking-wide mb-1">
              Bill To
            </p>
            <p className="text-xl font-semibold text-[#334155]">
              {customerName || "N/A"}
            </p>
            <p className="text-base text-[#64748B]">
              TIN: {tinNumber || "N/A"}
            </p>
          </div>

          {/* Center: Payment Method */}
          <div className="text-center">
            <p className="text-base font-semibold text-[#64748B] uppercase tracking-wide mb-1">
              Payment Method
            </p>
            <p
              className={`text-xl font-bold text-[#334155] px-3 py-1 rounded inline-block ${paymentDisplay.color}`}
            >
              {paymentDisplay.label}
            </p>
          </div>

          {/* Right: Transaction Details */}
          <div className="text-right">
            <p className="text-base font-semibold text-[#64748B] uppercase tracking-wide mb-1">
              Transaction
            </p>
            <p className="text-base text-[#64748B]">
              <span className="font-semibold">Items:</span> {totalItems}
            </p>
            <p className="text-base text-[#64748B]">
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
          
          2. Expiry Date Formatting: Uses compact DD/MM/YY
             - Input: "2026-12-15" → Output: "15/12/26"
             - Keeps the expiry column compact while preserving the full day
          
          3. Column Order: S.No → Description → Batch → Unit Price → Exp.Date → Qty → Total
             - S.No first helps with sequential verification during delivery
        */}
        <table
          id="invoice-table"
          className="w-full"
          style={{ border: "none", borderCollapse: "collapse" }}
          cellPadding={0}
          cellSpacing={0}
        >
          {/* TABLE HEADER */}
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="border border-gray-900 px-2 py-2 text-center font-semibold text-base w-[6%]">
                S.No
              </th>
              <th className="border border-gray-900 px-3 py-2 text-left font-semibold text-base w-[40%]">
                Description
              </th>
              <th className="border border-gray-900 px-3 py-2 text-left font-semibold text-base">
                Batch #
              </th>
              <th className="border border-gray-900 px-3 py-2 text-right font-semibold text-base">
                Unit Price (ETB)
              </th>
              <th className="border border-gray-900 px-3 py-2 text-center font-semibold text-base">
                Exp. Date
              </th>
              <th className="border border-gray-900 px-3 py-2 text-center font-semibold text-base w-[8%]">
                Qty
              </th>
              <th className="border border-gray-900 px-3 py-2 text-right font-semibold text-base">
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
                  <td className="border border-gray-900 px-2 py-2 text-center font-semibold text-base text-gray-900 w-[6%]">
                    {index + 1}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-base font-medium text-gray-900 w-[40%]">
                    {item.medicineName}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-base text-gray-700">
                    {item.batchNumber}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-base text-right text-gray-900 font-semibold">
                    {formatCurrency(item.pricePerUnit)}
                  </td>

                  {/* Expiry Date: Compact DD/MM/YY for a narrow invoice column */}
                  <td className="border border-gray-900 px-3 py-2 text-base text-center text-gray-700 font-medium">
                    {formatInvoiceExpiryDate(item.expiryDate)}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-base text-center text-gray-900 font-medium w-[8%]">
                    {item.quantity}
                  </td>

                  <td className="border border-gray-900 px-3 py-2 text-base text-right font-bold text-green-600">
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
          - Three-row vertical layout (Total → Not Taxable → Grand Total)
          - Single line separator above Grand Total
          - Double line beneath Grand Total amount to signify closed balance
          - Pinned to right side using ml-auto
          - Fixed width for consistent decimal alignment
        */}
        <div className="invoice-summary mt-8 mb-6">
          {/* TOTALS BLOCK: Grouped and positioned to RIGHT */}
          <div className="invoice-total-box ml-auto w-72 rounded p-4 bg-white">
            {/* Totals Group Header */}
            <div className="mb-3">
              <p className="text-base font-semibold text-gray-600 uppercase tracking-wide mb-3">
                Order Totals
              </p>

              {/* ROW 1: Total */}
              <div className="flex justify-between text-base mb-2">
                <span className="text-[#64748B] font-normal">Total</span>
                <span className="text-[#334155] font-semibold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* ROW 2: Not Taxable */}
              <div className="flex justify-between text-base mb-3">
                <span className="text-[#64748B] font-normal">Not Taxable</span>
                <span className="text-[#334155] font-semibold tabular-nums">
                  {formatCurrency(nonTaxable)}
                </span>
              </div>

              {/* ROW 3: Grand Total with Double line below */}
              <div className="flex justify-between">
                <span className="text-[#10B981] font-bold text-lg">
                  GRAND TOTAL
                </span>
                <span className="text-[#10B981] font-bold text-lg tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== SIGNATURE + FOOTER SECTION ========== */}
        <div className="invoice-signoff mt-32 pt-24">
          <div className="invoice-signoff-lines flex flex-row gap-12 items-end justify-between">
            <div className="flex-1">
              <div className="text-center">
                <div
                  style={{
                    height: "60px",
                    borderBottom: "1px solid #111",
                    marginBottom: "8px",
                  }}
                />
                <p className="mt-3 text-base font-semibold text-gray-900 uppercase tracking-wide">
                  Prepared By
                </p>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-center">
                <div
                  style={{
                    height: "60px",
                    borderBottom: "1px solid #111",
                    marginBottom: "8px",
                  }}
                />
                <p className="mt-3 text-base font-semibold text-gray-900 uppercase tracking-wide">
                  Received By
                </p>
              </div>
            </div>

            <div className="flex-1">
              <div className="text-center">
                <div
                  style={{
                    height: "60px",
                    borderBottom: "1px solid #111",
                    marginBottom: "8px",
                  }}
                />
                <p className="mt-3 text-base font-semibold text-gray-900 uppercase tracking-wide">
                  Approved By
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center font-bold uppercase text-xs text-gray-900">
            INVALID WITHOUT FISCAL OR REFUND RECEIPT ATTACHED
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
