"use client";
import { useEffect, useState, useMemo } from "react";
import { generateInvoiceNumber } from "../utils/invoiceUtils";
import {
  AlertCircle,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";


export type CartItem = {
  id: string; // Unique ID for this cart item (not batch_id)
  medicineId: number;
  batchNumber: string;
  medicineName: string;
  quantity: number;
  pricePerUnit: number;
  expiryDate: string;
  unit?: string;
  // availableStock is the current stock for this batch at time of adding to cart
  availableStock?: number;
};

type EditableMedicineForm = {
  medicineId: number;
  medicineName: string;
  batchNumber: string;
  quantity: number;
  pricePerUnit: number;
  expiryDate: string;
  unit: string;
};

type SearchDropdownItem = {
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  price_per_unit: number;
  expiry_date?: string | null;
  category_name?: string | null;
  unit?: string | null;
};

const normalizeSearchResults = (data: unknown): SearchDropdownItem[] => {
  const payload = Array.isArray(data)
    ? data
    : Array.isArray((data as { results?: unknown[] } | null)?.results)
      ? (data as { results: unknown[] }).results
      : Array.isArray((data as { items?: unknown[] } | null)?.items)
        ? (data as { items: unknown[] }).items
        : [];

  return payload.map((raw: any) => ({
    batch_id: Number(raw.batch_id ?? raw.batchId ?? raw.id ?? 0),
    medicine_id: Number(
      raw.medicine_id ?? raw.medicineId ?? raw.id ?? raw.medicine?.id ?? 0,
    ),
    medicine_name: String(
      raw.medicine_name ?? raw.name ?? raw.medicine?.name ?? "",
    ),
    batch_number: String(
      raw.batch_number ?? raw.batchNumber ?? raw.batch_no ?? "",
    ),
    quantity: Number(raw.quantity ?? 0),
    price_per_unit: Number(raw.price_per_unit ?? raw.pricePerUnit ?? 0),
    expiry_date: raw.expiry_date ?? raw.expiryDate ?? "",
    unit: String(raw.unit ?? raw.medicine?.unit ?? ""),
    category_name:
      raw.category_name ?? raw.categoryName ?? raw.category?.name ?? null,
  }));
};

const formatDateForInput = (value?: string | null) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().split("T")[0];
};

const initialEditableForm = (): EditableMedicineForm => ({
  medicineId: 0,
  medicineName: "",
  batchNumber: "",
  quantity: 1,
  pricePerUnit: 0,
  expiryDate: "",
  unit: "",
});

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
  const [searchResults, setSearchResults] = useState<SearchDropdownItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editableForm, setEditableForm] = useState<EditableMedicineForm>(
    initialEditableForm(),
  );
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
  const [formValidationError, setFormValidationError] = useState("");
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

  const formatInvoiceExpiryDate = (dateValue?: string | null) => {
    if (!dateValue) return "";

    const raw = String(dateValue).trim();
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(raw)) {
      const [day, month, year] = raw.split("/");
      return `${day}/${month}/${String(year).slice(-2)}`;
    }

    const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1].slice(-2)}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return raw;
    }

    const day = String(parsed.getUTCDate()).padStart(2, "0");
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const year = String(parsed.getUTCFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    const trimmedQuery = medicineSearch.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    setIsSearching(true);
    setSearchResults([]);

    const API_BASE = "/api/backend";
    const searchUrl = `${API_BASE}/inventory/search?query=${encodeURIComponent(trimmedQuery)}`;
    const fallbackUrl = `${API_BASE}/inventory?search=${encodeURIComponent(trimmedQuery)}&page=1&pageSize=25`;

    const timeoutId = window.setTimeout(async () => {
      try {
        const fetchOptions = {
          credentials: "include" as const,
          cache: "no-store" as const,
          signal: controller.signal,
          headers: {
            "Accept-Encoding": "identity",
            "X-Requested-With": "pharmacy-ui",
          },
        };

        const primaryResponse = await fetch(searchUrl, fetchOptions);
        const primaryData = await primaryResponse.json();

        if (!isActive) return;

        const primaryResults = normalizeSearchResults(primaryData);
        if (primaryResponse.ok && primaryResults.length > 0) {
          setSearchResults(primaryResults);
          return;
        }

        const fallbackResponse = await fetch(fallbackUrl, fetchOptions);
        const fallbackData = await fallbackResponse.json();

        if (!isActive) return;

        if (fallbackResponse.ok) {
          const fallbackResults = normalizeSearchResults(fallbackData);
          setSearchResults(fallbackResults);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (!isActive) return;
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        console.error("Inventory search failed:", error);
        setSearchResults([]);
      } finally {
        if (isActive) setIsSearching(false);
      }
    }, 300);

    return () => {
      isActive = false;
      controller.abort();
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
    setFormValidationError("");

    const {
      medicineId,
      medicineName,
      batchNumber,
      quantity,
      pricePerUnit,
      expiryDate,
      unit,
    } = editableForm;

    if (
      !medicineId ||
      !medicineName.trim() ||
      !batchNumber.trim() ||
      !expiryDate.trim()
    ) {
      setFormValidationError(
        "Please fill in all required medicine fields before adding to cart.",
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormValidationError("Quantity must be a positive whole number.");
      return;
    }

    const price = Number(pricePerUnit);
    if (!Number.isFinite(price) || price < 0) {
      setFormValidationError("Price must be a valid non-negative number.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      setFormValidationError("Expiry date must use the YYYY-MM-DD format.");
      return;
    }

    if (newAvailableStock !== null && quantity > newAvailableStock) {
      setFormValidationError(
        `Cannot add ${quantity} units. Only ${newAvailableStock} units are available for ${medicineName}.`,
      );
      return;
    }

    const cartItem: CartItem = {
      id: `${Date.now()}-${Math.random()}`,
      medicineId,
      batchNumber: batchNumber.trim(),
      medicineName: medicineName.trim(),
      quantity,
      pricePerUnit: price,
      expiryDate,
      unit: unit.trim(),
      availableStock: newAvailableStock ?? undefined,
    };

    setCartItems([...cartItems, cartItem]);
    setEditableForm(initialEditableForm());
    setNewAvailableStock(null);
    setFormValidationError("");
  };

  const handleSelectSearchResult = (item: SearchDropdownItem) => {
    const selectedUnit = String(item.unit ?? "PKT").trim() || "PKT";

    setEditableForm({
      medicineId: Number(item.medicine_id ?? item.batch_id ?? 0),
      medicineName: item.medicine_name ?? "",
      batchNumber: item.batch_number ?? "",
      quantity: 1,
      pricePerUnit: Number(item.price_per_unit ?? 0),
      expiryDate: formatDateForInput(item.expiry_date),
      unit: selectedUnit,
    });
    setMedicineSearch("");
    setSearchResults([]);
    setStockValidationError("");
    setFormValidationError("");
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
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            height: auto;
            padding: 8mm;
            background: #fff;
          }

          /* Use standard document flow for header/footer to avoid overlap in print */
          .invoice-header,
          .invoice-footer {
            position: static;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            box-sizing: border-box;
            width: 100%;
            background: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin: 12px 0 16px;
          }

          .info-box {
            border: 1px solid #111;
            padding: 8px;
          }

          .label {
            font-weight: bold;
            color: #222;
          }

          .company-title {
            font-size: 24px;
            font-weight: 700;
            color: #111;
            line-height: 1.2;
          }

          .invoice-title {
            font-size: 30px;
            font-weight: 800;
            color: #111;
            line-height: 1.2;
          }

          .company-contact {
            font-size: 14px;
            color: #475569;
            line-height: 1.45;
          }

          .section-label {
            font-size: 14px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .totals-label {
            font-size: 14px;
            font-weight: 700;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .items-section {
            display: block;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 10px 0 8px;
            height: auto;
            border: 1px solid #111;
            overflow: hidden;
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
            padding: 4px 6px;
            font-size: 10px;
            line-height: 1.15;
            vertical-align: top;
            white-space: nowrap;
            overflow-wrap: anywhere;
            background: #fff;
            color: #111;
          }

          .items-table th {
            background-color: #f3f4f6;
            font-weight: 700;
            text-align: left;
            font-size: 10px;
            line-height: 1.15;
            white-space: nowrap;
          }

          .items-table td.description-cell {
            white-space: normal;
            overflow-wrap: anywhere;
          }

          .items-table tbody td {
            font-size: 14px;
          }

          .signature-section {
            margin-top: 18px;
            border-top: 0;
            padding-top: 12px;
          }

          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 24px;
          }

          .signature-box {
            text-align: center;
            border-top: 0;
            padding-top: 0;
            min-height: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
          }

          .signature-box::before {
            content: "";
            display: block;
            width: 100%;
            height: 60px;
            border-bottom: 1px solid #111;
          }

          .signature-label {
            font-size: 14px;
            font-weight: bold;
            color: #111;
          }

          .legal-disclaimer {
            margin-top: auto;
            border-top: 0;
            text-align: center;
            font-size: 12px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            padding-top: 12px;
            padding-bottom: 4px;
            width: 100%;
            display: block;
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

            .invoice-header,
            .invoice-footer {
              display: flex;
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
        <div class="invoice-header" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;text-align:left;gap:12px;">
            <div>
              <div class="company-title">Hawan Drug Store</div>
              <table style="margin-top:8px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;font-size:12px;">Invoice No</td>
                  <td style="border:1px solid #111;padding:4px 8px;font-size:12px;">${printableInvoiceNumber}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;font-size:12px;">FS No</td>
                  <td style="border:1px solid #111;padding:4px 8px;font-size:12px;">${customerSNo || "-"}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;font-size:12px;">Reference</td>
                  <td style="border:1px solid #111;padding:4px 8px;font-size:12px;">${reference || ""}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;font-size:12px;">Date</td>
                  <td style="border:1px solid #111;padding:4px 8px;color:#111;font-weight:700;font-size:14px;">${printableSoldOutDate}</td>
                </tr>
              </table>
            </div>
          </div>

          <div style="text-align:right;">
            <div class="invoice-title">INVOICE</div>
            <div class="company-contact" style="margin-top:6px;">
              <div>Hawan Drug Store</div>
              <div>TIN: 0098248381</div>
              <div>Tell: 092180070</div>
              <div>E-mail: getchdr@gmail.com</div>
            </div>
          </div>
        </div>

        <div class="receipt-info">
          <div class="info-box">
            <div class="section-label">Customer Name</div>
            <div style="font-size:15px; color:#111827;">${customerName || "N/A"}</div>
          </div>
          <div class="info-box">
            <div class="section-label">TIN Number</div>
            <div style="font-size:15px; color:#111827;">${tinNumber || "N/A"}</div>
          </div>
          <div class="info-box">
            <div class="section-label">Payment Method</div>
            <div style="font-size:15px; color:#111827;">${paymentMethod === "cash" ? "Cash" : "Credit"}</div>
          </div>
        </div>

        <div class="items-section">
        <table class="items-table" style="height:auto;">
          <colgroup>
            <col style="width: 5%;" />
            <col style="width: 35%;" />
            <col style="width: 12%;" />
            <col style="width: 8%;" />
            <col style="width: 10%;" />
            <col style="width: 8%;" />
            <col style="width: 10%;" />
            <col style="width: 12%;" />
          </colgroup>
          <thead>
            <tr>
              <th style="white-space:nowrap;">S.No</th>
              <th style="white-space:nowrap;">Description</th>
              <th style="white-space:nowrap;">Batch #</th>
              <th style="white-space:nowrap; text-align:center;">Unit</th>
              <th style="white-space:nowrap; text-align:center;">Exp.</th>
              <th style="white-space:nowrap; text-align:center;">Qty</th>
              <th style="white-space:nowrap; text-align:right;">Price</th>
              <th style="white-space:nowrap; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cartItems
              .map((item, index) => {
                const expiry = formatInvoiceExpiryDate(item.expiryDate);
                return `
              <tr style="height:auto;">
                <td style="padding:4px 6px; text-align:center;">${index + 1}</td>
                <td class="description-cell" style="padding:4px 6px;">${item.medicineName}</td>
                <td style="padding:4px 6px;">${item.batchNumber}</td>
                <td style="padding:4px 6px; text-align:center;">${item.unit || "-"}</td>
                <td style="padding:4px 6px; text-align:center;">${expiry}</td>
                <td style="padding:4px 6px; text-align:center;">${item.quantity}</td>
                <td style="padding:4px 6px; text-align:right;">${item.pricePerUnit.toFixed(2)}</td>
                <td style="padding:4px 6px; text-align:right;">${(item.quantity * item.pricePerUnit).toFixed(2)}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>
        </div>

        <div style="margin-top: 8px; padding-top: 10px; border-top: 2px solid #111;">
          <div style="width: 260px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 6px;">
              <span style="color: #374151;">total</span>
              <span style="font-weight: 700; color: #111827;">ETB ${cartTotals.totalPrice.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 8px;">
              <span style="color: #374151;">Not Taxable</span>
              <span style="font-weight: 700; color: #111827;">ETB 0.00</span>
            </div>
            <div style="border-top: 1px solid #111; margin: 4px 0 6px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800;">
              <span style="color: #10B981;">GRAND TOTAL</span>
              <span style="color: #10B981;">ETB ${cartTotals.totalPrice.toFixed(2)}</span>
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

        <div class="invoice-footer legal-disclaimer" style="margin-top: auto; padding-bottom: 4px;">
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
    setFormValidationError("");

    const safeCustomerName = String(customerName ?? "").trim();
    const safeTinNumber = String(tinNumber ?? "").trim();
    const safeSellerName = String(sellerName ?? "").trim();
    const safeCustomerSNo = String(customerSNo ?? "").trim();
    const safeInvoiceNo = String(invoiceNo ?? "").trim();
    const safeReference = String(reference ?? "").trim();

    if (cartItems.length === 0) {
      setFormValidationError("Please add at least one item to the order.");
      return;
    }

    if (!safeCustomerName) {
      setFormValidationError("Please enter the customer name.");
      return;
    }

    if (!safeTinNumber) {
      setFormValidationError("Please enter the TIN number.");
      return;
    }

    // Validate stock before showing receipt
    if (viewMode === "cart") {
      if (!validateStock()) {
        return;
      }

      const generatedInvoiceNo =
        safeInvoiceNo || generateInvoiceNumber(safeCustomerName, safeTinNumber);
      setInvoiceNo(generatedInvoiceNo);
      setInvoiceNumber(generatedInvoiceNo);
      setItemSoldOutDate(new Date().toISOString());
      setViewMode("receipt");
      return;
    }

    try {
      await onSubmit(
        cartItems,
        safeCustomerName,
        safeTinNumber,
        safeSellerName || undefined,
        safeCustomerSNo || undefined,
        paymentMethod,
        invoiceNumber || safeInvoiceNo || undefined,
        safeReference || undefined,
      );

      setCartItems([]);
      setCustomerName("");
      setTinNumber("");
      setSellerName("");
      setInvoiceNo("");
      setCustomerSNo("");
      setReference("");
      setInvoiceNumber("");
      setItemSoldOutDate("");
      setViewMode("cart");
      onClose();
    } catch (error) {
      console.error("Error processing order:", error);
      setFormValidationError(
        error instanceof Error
          ? error.message
          : "Unable to process the sale right now.",
      );
    }
  };


  if (!isOpen) return null;

  const getExpiryBadge = (dateStr: string) => {
    if (!dateStr) return null;
    const now = new Date();
    const exp = new Date(dateStr);
    if (Number.isNaN(exp.getTime())) return null;
    if (exp < now)
      return {
        label: "Expired",
        cls: "border border-danger/30 bg-red-50 text-accent-red",
      };
    const soon = new Date();
    soon.setMonth(now.getMonth() + 6);
    if (exp <= soon)
      return {
        label: "Expiring Soon",
        cls: "border border-amber-300 bg-amber-50 text-amber-800",
      };
    return {
      label: "Healthy",
      cls: "border border-grass-green/20 bg-primary-blue/10 text-dark-charcoal",
    };
  };

  const expiryBadge = editableForm.expiryDate
    ? getExpiryBadge(editableForm.expiryDate)
    : null;
  const canAddToCart =
    editableForm.medicineId > 0 &&
    editableForm.medicineName.trim().length > 0 &&
    editableForm.expiryDate.trim().length > 0 &&
    editableForm.quantity > 0;

  /* ── RECEIPT VIEW ── */
  if (viewMode === "receipt") {
    return (
      <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
        <div className="border-b border-border-gray bg-off-white px-6 py-4">
          <h2 className="text-lg font-bold text-dark-charcoal">
            Sale Receipt — Review Before Confirming
          </h2>
          <p className="mt-0.5 text-sm text-dark-charcoal/70">
            Review all details carefully before confirming the sale.
          </p>
        </div>
        <div className="space-y-4 overflow-y-auto p-6">
          {/* Receipt Header */}
          <div className="rounded-lg border border-dark-teal/20 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 text-left">
                <div>
                  <h2 className="text-3xl font-bold leading-tight text-[#2563EB]">
                    Hawan Drug Store
                  </h2>
                  <table className="mt-3 border-collapse font-[Arial] text-sm">
                    <tbody>
                      <tr>
                        <td className="border border-black bg-off-white px-2 py-1.5 font-bold text-slate-700">
                          Invoice No
                        </td>
                        <td className="border border-black px-2 py-1.5 font-mono text-slate-800">
                          {invoiceNumber || `INV-${Date.now()}`}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-off-white px-2 py-1.5 font-bold text-slate-700">
                          FS No
                        </td>
                        <td className="border border-black px-2 py-1.5 font-mono text-slate-800">
                          000000010
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-off-white px-2 py-1.5 font-bold text-slate-700">
                          Reference
                        </td>
                        <td className="border border-black px-2 py-1.5 font-mono text-slate-800"></td>
                      </tr>
                      <tr>
                        <td className="border border-black bg-off-white px-2 py-1.5 font-bold text-slate-700">
                          Date
                        </td>
                        <td className="border border-black bg-blue-50 px-2 py-1.5 font-mono font-bold text-[#2563EB]">
                          {formattedSoldOutDate}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-4xl font-extrabold leading-none text-[#2563EB]">
                  INVOICE
                </h3>
                <div className="mt-2 text-base leading-relaxed text-[#64748B]">
                  <div>Hawan Drug Store</div>
                  <div>TIN: 0098248381</div>
                  <div>Tell: 092180070</div>
                  <div>E-mail: getchdr@gmail.com</div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#64748B]">
                  Customer Name:
                </p>
                <p className="text-lg font-semibold text-[#334155]">
                  {customerName}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-[#64748B]">
                  TIN Number:
                </p>
                <p className="text-lg font-semibold text-[#334155]">
                  {tinNumber}
                </p>
              </div>
            </div>
          </div>

          {/* Receipt Items */}
          <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
            <div className="grid grid-cols-12 gap-2 bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#64748B]">
              <div className="col-span-4">Description</div>
              <div className="col-span-2">Batch #</div>
              <div className="col-span-1">Unit</div>
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
                    className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
                  >
                    <div className="col-span-4 font-semibold text-[#334155]">
                      {item.medicineName}
                    </div>
                    <div className="col-span-2 text-[#64748B]">
                      {item.batchNumber}
                    </div>
                    <div className="col-span-1 text-[#64748B]">
                      {item.unit || "-"}
                    </div>
                    <div className="col-span-2 text-[#64748B]">
                      {formatInvoiceExpiryDate(item.expiryDate)}
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
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
            <div className="ml-auto w-64">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-[#64748B]">total</span>
                <span className="tabular-nums font-semibold text-[#334155]">
                  ETB {cartTotals.totalPrice.toFixed(2)}
                </span>
              </div>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-[#64748B]">Not Taxable</span>
                <span className="tabular-nums font-semibold text-[#334155]">
                  ETB 0.00
                </span>
              </div>
              <div className="my-2 border-t border-[#2563EB]" />
              <div className="flex justify-between text-base font-bold">
                <span className="text-lg text-[#10B981]">GRAND TOTAL</span>
                <span className="tabular-nums text-lg text-[#10B981]">
                  ETB {cartTotals.totalPrice.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 border-b-4 border-[#10B981]" />
            </div>
          </div>
        </div>

        {/* Receipt footer actions */}
        <div className="flex gap-3 border-t border-border-gray bg-off-white/40 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              setViewMode("cart");
              setStockValidationError("");
            }}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-navy-border hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Back to Cart
          </button>
          <button
            type="button"
            onClick={exportReceiptPDF}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-navy-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex-[2] rounded-lg bg-grass-green px-4 py-2.5 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-0"
          >
            {isProcessing ? "Processing\u2026" : "\u2713 Confirm & Process Sale"}
          </button>
        </div>
      </div>
    );
  }

  /* ── CART VIEW — 2-column POS layout ── */
  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      {/* ── LEFT COLUMN: Add Items to Order ── */}
      <div className="flex flex-col gap-5 rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
            Item Search
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">
            Add Items to Order
          </h2>
        </div>

        {/* Form validation error */}
        {formValidationError && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-sm font-medium text-amber-800">
              {formValidationError}
            </p>
          </div>
        )}

        {/* Medicine Search */}
        <div>
          <label
            htmlFor="pos-medicine-search"
            className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70"
          >
            Search Medicine
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
            <input
              id="pos-medicine-search"
              type="text"
              placeholder="Search by medicine name or batch number\u2026"
              value={medicineSearch}
              onChange={(e) => setMedicineSearch(e.target.value)}
              disabled={isProcessing}
              className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-9 pr-3 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
            />
            {medicineSearch.trim() && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-gray bg-pure-white shadow-lg">
                {isSearching ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-dark-charcoal/70">
                    <Loader2 className="h-4 w-4 animate-spin text-grass-green" />
                    Searching\u2026
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-dark-charcoal/70">
                    No matching inventory found.
                  </div>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={`${item.medicine_id}-${item.batch_id}`}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="flex w-full flex-col gap-0.5 border-b border-border-gray/50 px-4 py-3 text-left transition duration-150 last:border-0 hover:bg-off-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-blue"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-dark-charcoal">
                          {item.medicine_name}
                        </span>
                        <span className="shrink-0 text-xs font-bold text-dark-charcoal">
                          ETB {Number(item.price_per_unit || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-dark-charcoal/70">
                        Batch: {item.batch_number} \u00b7 Stock: {item.quantity}{" "}
                        \u00b7 Exp: {item.expiry_date}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Item Details */}
        {editableForm.medicineId > 0 && (
          <div className="space-y-4 rounded-lg border border-border-gray bg-off-white/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-dark-charcoal">
                  {editableForm.medicineName}
                </p>
                <p className="text-xs text-dark-charcoal/70">
                  Batch: {editableForm.batchNumber}
                </p>
              </div>
              {expiryBadge && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${expiryBadge.cls}`}
                >
                  {expiryBadge.label}
                </span>
              )}
            </div>

            {/* Hidden medicine ID field — preserves existing logic */}
            <input
              type="number"
              value={editableForm.medicineId || ""}
              onChange={(e) =>
                setEditableForm((c) => ({
                  ...c,
                  medicineId: Number(e.target.value) || 0,
                }))
              }
              disabled={isProcessing}
              min="1"
              aria-hidden
              tabIndex={-1}
              className="sr-only"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Medicine Name
                </label>
                <input
                  type="text"
                  value={editableForm.medicineName}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      medicineName: e.target.value,
                    }))
                  }
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Batch Number
                </label>
                <input
                  type="text"
                  value={editableForm.batchNumber}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      batchNumber: e.target.value,
                    }))
                  }
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Quantity
                </label>
                <input
                  type="number"
                  value={editableForm.quantity}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      quantity: Number(e.target.value) || 0,
                    }))
                  }
                  disabled={isProcessing}
                  min="1"
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Unit
                </label>
                <input
                  type="text"
                  value={editableForm.unit}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      unit: e.target.value.toUpperCase(),
                    }))
                  }
                  disabled={isProcessing}
                  placeholder="PKT"
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={editableForm.expiryDate}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      expiryDate: e.target.value,
                    }))
                  }
                  disabled={isProcessing}
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Unit Price (ETB)
                </label>
                <input
                  type="number"
                  value={editableForm.pricePerUnit}
                  onChange={(e) =>
                    setEditableForm((c) => ({
                      ...c,
                      pricePerUnit: Number(e.target.value) || 0,
                    }))
                  }
                  disabled={isProcessing}
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">
                  Line Subtotal
                </label>
                <div className="rounded-lg border border-border-gray/50 bg-off-white px-3 py-2 text-sm font-semibold text-dark-charcoal">
                  ETB{" "}
                  {(editableForm.quantity * editableForm.pricePerUnit).toFixed(
                    2,
                  )}
                </div>
              </div>
            </div>

            {newAvailableStock !== null && (
              <p className="text-xs text-dark-charcoal/70">
                Available stock:{" "}
                <span className="font-bold text-dark-charcoal">
                  {newAvailableStock}
                </span>{" "}
                units
              </p>
            )}
          </div>
        )}

        {/* Add Medicine to Order button */}
        <button
          type="button"
          onClick={addItemToCart}
          disabled={isProcessing || !canAddToCart}
          className="mt-auto w-full rounded-lg bg-grass-green px-4 py-3 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-0"
        >
          <Plus className="-mt-0.5 mr-1.5 inline-block h-4 w-4" />
          Add Medicine to Order
        </button>
      </div>

      {/* ── RIGHT COLUMN: Order Summary & Checkout ── */}
      <div className="flex flex-col gap-5 rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
            Checkout
          </p>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">
            Order Summary
          </h2>
        </div>

        {/* Stock validation error */}
        {stockValidationError && (
          <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-red" />
            <p className="text-sm font-medium text-accent-red">
              {stockValidationError}
            </p>
          </div>
        )}

        {/* Customer Information */}
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70">
            Customer Information
          </p>
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Customer Name *"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isProcessing}
              className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
            />
            <input
              type="text"
              placeholder="TIN Number *"
              value={tinNumber}
              onChange={(e) => setTinNumber(e.target.value)}
              disabled={isProcessing}
              className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Invoice No"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
              />
              <input
                type="text"
                placeholder="S.No"
                value={customerSNo}
                onChange={(e) => setCustomerSNo(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
              />
              <input
                type="text"
                placeholder="Seller Name"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                disabled={isProcessing}
                className="w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
              />
            </div>
            {/* Payment method pill buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                disabled={isProcessing}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
                  paymentMethod === "cash"
                    ? "bg-primary-blue text-white"
                    : "bg-off-white text-dark-charcoal/80 hover:bg-navy-border hover:text-dark-charcoal"
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("credit")}
                disabled={isProcessing}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue ${
                  paymentMethod === "credit"
                    ? "bg-primary-blue text-white"
                    : "bg-off-white text-dark-charcoal/80 hover:bg-navy-border hover:text-dark-charcoal"
                }`}
              >
                Credit
              </button>
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70">
            Cart Items ({cartTotals.itemCount})
          </p>
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-gray/50 bg-off-white/30 py-10 text-center">
              <ShoppingCart className="h-8 w-8 text-border-gray" />
              <p className="text-sm font-semibold text-dark-charcoal/70">
                Cart is empty. Search medicines on the left to start.
              </p>
            </div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border-gray bg-off-white/30 p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-dark-charcoal">
                        {item.medicineName}
                      </p>
                      <p className="text-xs text-dark-charcoal/70">
                        Batch: {item.batchNumber} \u00b7 Exp: {item.expiryDate}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItemFromCart(item.id)}
                      disabled={isProcessing}
                      aria-label={`Remove ${item.medicineName}`}
                      className="shrink-0 rounded p-0.5 text-dark-charcoal/70 transition duration-150 hover:bg-red-50 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* Inline-editable cart item fields */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={item.medicineName}
                          onChange={(e) =>
                            updateCartItem(
                              item.id,
                              "medicineName",
                              e.target.value,
                            )
                          }
                          disabled={isProcessing}
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Batch Number
                        </label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) =>
                            updateCartItem(
                              item.id,
                              "batchNumber",
                              e.target.value,
                            )
                          }
                          disabled={isProcessing}
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Expiry
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) =>
                            updateCartItem(
                              item.id,
                              "expiryDate",
                              e.target.value,
                            )
                          }
                          disabled={isProcessing}
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={item.unit || ""}
                          onChange={(e) =>
                            updateCartItem(
                              item.id,
                              "unit",
                              e.target.value.toUpperCase(),
                            )
                          }
                          disabled={isProcessing}
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Qty
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = Number(e.target.value);
                            if (qty > 0)
                              updateCartItem(item.id, "quantity", qty);
                          }}
                          disabled={isProcessing}
                          min="1"
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Unit Price (ETB)
                        </label>
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) => {
                            const p = Number(e.target.value);
                            if (p >= 0)
                              updateCartItem(item.id, "pricePerUnit", p);
                          }}
                          disabled={isProcessing}
                          step="0.01"
                          min="0"
                          className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-xs text-dark-charcoal/70">
                          Subtotal (ETB)
                        </label>
                        <div className="rounded border border-border-gray/50 bg-off-white px-2 py-1 text-xs font-semibold text-dark-charcoal">
                          {(item.quantity * item.pricePerUnit).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals Box */}
        <div className="rounded-xl bg-primary-blue p-4 text-white">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Items in cart</span>
              <span className="font-semibold">{cartTotals.itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Total quantity</span>
              <span className="font-semibold">{cartTotals.totalQuantity}</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/50">
              Grand Total
            </span>
            <span className="tabular-nums text-2xl font-black text-grass-green">
              ETB {cartTotals.totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-navy-border hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Order
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing || cartItems.length === 0}
            className="flex-[2] rounded-lg bg-grass-green px-4 py-2.5 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 active:translate-y-0"
          >
            {isProcessing ? "Processing\u2026" : "Review & Continue \u2192"}
          </button>
        </div>
      </div>
    </div>
  );
}
