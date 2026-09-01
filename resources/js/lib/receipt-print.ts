import type { StoreBranding } from '@/types';
import type { Receipt } from '@/types/pharmacy';

const formatExpiry = (dateValue?: string | null): string => {
    if (!dateValue) return '';
    const ymdMatch = String(dateValue)
        .trim()
        .match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
        return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1].slice(-2)}`;
    }
    return String(dateValue);
};

const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * A4 invoice print via popup window — ported from the legacy
 * MultiItemOrderCart.exportReceiptPDF, with store branding from shared props
 * and totals/invoice number coming from the server-recorded sale.
 */
export function printReceipt(receipt: Receipt, store: StoreBranding | null): void {
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const storeName = escapeHtml(store?.name ?? 'Pharmacy');
    const saleDate = new Date(receipt.created_at).toLocaleDateString('en-GB');

    const contactLines = [
        `<div>${storeName}</div>`,
        receipt.customer_tin ? '' : '',
        store?.phone ? `<div>Tell: ${escapeHtml(store.phone)}</div>` : '',
        store?.address ? `<div>${escapeHtml(store.address)}</div>` : '',
    ].join('');

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          html, body { margin: 0; padding: 0; }
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
            padding: 8mm;
            background: #fff;
          }
          .invoice-header, .invoice-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            box-sizing: border-box;
            width: 100%;
            background: #fff;
          }
          .receipt-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin: 12px 0 16px;
          }
          .info-box { border: 1px solid #111; padding: 8px; }
          .company-title { font-size: 24px; font-weight: 700; color: #111; line-height: 1.2; }
          .invoice-title { font-size: 30px; font-weight: 800; color: #111; line-height: 1.2; }
          .company-contact { font-size: 14px; color: #475569; line-height: 1.45; }
          .section-label {
            font-size: 14px; font-weight: 700; color: #64748b;
            text-transform: uppercase; letter-spacing: 0.06em;
          }
          .items-table {
            width: 100%; border-collapse: collapse; table-layout: fixed;
            margin: 10px 0 8px; border: 1px solid #111;
          }
          .items-table thead { display: table-header-group; }
          .items-table tr { page-break-inside: avoid; break-inside: avoid; }
          .items-table th, .items-table td {
            border: 1px solid #111; padding: 4px 6px; font-size: 10px;
            line-height: 1.15; vertical-align: top; white-space: nowrap;
            overflow-wrap: anywhere; background: #fff; color: #111;
          }
          .items-table th { background-color: #f3f4f6; font-weight: 700; text-align: left; }
          .items-table td.description-cell { white-space: normal; overflow-wrap: anywhere; }
          .items-table tbody td { font-size: 14px; }
          .signature-section { margin-top: 18px; padding-top: 12px; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
          .signature-box {
            text-align: center; display: flex; flex-direction: column;
            align-items: center; justify-content: flex-end; gap: 8px;
          }
          .signature-box::before {
            content: ""; display: block; width: 100%; height: 60px;
            border-bottom: 1px solid #111;
          }
          .signature-label { font-size: 14px; font-weight: bold; color: #111; }
          .legal-disclaimer {
            margin-top: auto; text-align: center; font-size: 12px; font-weight: 900;
            text-transform: uppercase; letter-spacing: 0.8px;
            padding-top: 12px; padding-bottom: 4px; width: 100%; display: block;
          }
          @media print {
            @page { size: A4; margin: 20mm; }
            html, body { width: 210mm; min-height: 297mm; margin: 0; padding: 0; }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-shell">
        <div class="invoice-header" style="margin-bottom:12px;">
          <div style="display:flex;align-items:center;text-align:left;gap:12px;">
            <div>
              <div class="company-title">${storeName}</div>
              <table style="margin-top:8px;border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Invoice No</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${escapeHtml(receipt.invoice_no)}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">FS No</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${escapeHtml(receipt.customer_sno || '-')}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Reference</td>
                  <td style="border:1px solid #111;padding:4px 8px;">${escapeHtml(receipt.reference || '')}</td>
                </tr>
                <tr>
                  <td style="border:1px solid #111;padding:4px 8px;font-weight:700;background:#f8fafc;">Date</td>
                  <td style="border:1px solid #111;padding:4px 8px;color:#111;font-weight:700;font-size:14px;">${saleDate}</td>
                </tr>
              </table>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="invoice-title">INVOICE</div>
            <div class="company-contact" style="margin-top:6px;">
              ${contactLines}
            </div>
          </div>
        </div>

        <div class="receipt-info">
          <div class="info-box">
            <div class="section-label">Customer Name</div>
            <div style="font-size:15px; color:#111827;">${escapeHtml(receipt.customer_name || 'N/A')}</div>
          </div>
          <div class="info-box">
            <div class="section-label">TIN Number</div>
            <div style="font-size:15px; color:#111827;">${escapeHtml(receipt.customer_tin || 'N/A')}</div>
          </div>
          <div class="info-box">
            <div class="section-label">Payment Method</div>
            <div style="font-size:15px; color:#111827;">${receipt.payment_method === 'cash' ? 'Cash' : 'Credit'}</div>
          </div>
        </div>

        <table class="items-table">
          <colgroup>
            <col style="width: 5%;" /><col style="width: 35%;" /><col style="width: 12%;" />
            <col style="width: 8%;" /><col style="width: 10%;" /><col style="width: 8%;" />
            <col style="width: 10%;" /><col style="width: 12%;" />
          </colgroup>
          <thead>
            <tr>
              <th>S.No</th><th>Description</th><th>Batch #</th>
              <th style="text-align:center;">Unit</th><th style="text-align:center;">Exp.</th>
              <th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${receipt.items
                .map(
                    (item, index) => `
              <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td class="description-cell">${escapeHtml(item.medicine_name)}</td>
                <td>${escapeHtml(item.batch_number)}</td>
                <td style="text-align:center;">${escapeHtml(item.unit || '-')}</td>
                <td style="text-align:center;">${formatExpiry(item.expiry_date)}</td>
                <td style="text-align:center;">${item.quantity}</td>
                <td style="text-align:right;">${item.unit_price.toFixed(2)}</td>
                <td style="text-align:right;">${item.total_price.toFixed(2)}</td>
              </tr>`,
                )
                .join('')}
          </tbody>
        </table>

        <div style="margin-top: 8px; padding-top: 10px; border-top: 2px solid #111;">
          <div style="width: 260px; margin-left: auto;">
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 6px;">
              <span style="color: #374151;">total</span>
              <span style="font-weight: 700; color: #111827;">ETB ${receipt.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 15px; margin-bottom: 8px;">
              <span style="color: #374151;">Not Taxable</span>
              <span style="font-weight: 700; color: #111827;">ETB ${receipt.tax_amount.toFixed(2)}</span>
            </div>
            <div style="border-top: 1px solid #111; margin: 4px 0 6px;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800;">
              <span style="color: #10B981;">GRAND TOTAL</span>
              <span style="color: #10B981;">ETB ${receipt.total_amount.toFixed(2)}</span>
            </div>
            <div style="border-bottom: 3px solid #111; margin-top: 3px;"></div>
          </div>
        </div>

        <div class="signature-section">
          <div class="signature-grid">
            <div class="signature-box"><div class="signature-label">Prepared By</div></div>
            <div class="signature-box"><div class="signature-label">Received By</div></div>
            <div class="signature-box"><div class="signature-label">Approved By</div></div>
          </div>
        </div>

        <div class="invoice-footer legal-disclaimer">
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
}

/* ── Pre-sale invoice PDF download ─────────────────────────────────────────
 * Called from the receipt-review / invoice-preview screen BEFORE the sale is
 * confirmed.  Builds the same A4 invoice HTML as printReceipt() but sources
 * its data from the live cart state instead of a server Receipt object.
 * Opening a popup + print() lets the user "Save as PDF" via the browser's
 * native print dialog (works in every modern browser with no extra deps).
 * ─────────────────────────────────────────────────────────────────────────── */

export interface PreSaleInvoiceData {
    store: StoreBranding | null;
    invoiceNo: string;
    customerSNo: string;
    reference: string;
    customerName: string;
    customerTin: string;
    paymentMethod: string;
    sellerName: string;
    date: string;
    items: {
        name: string;
        batchNumber: string;
        unit: string;
        expiryDate: string;
        quantity: number;
        unitPrice: number;
    }[];
    totalPrice: number;
}

export function downloadInvoicePdf(data: PreSaleInvoiceData): void {
    const printWindow = window.open('', '_blank', 'height=700,width=900');
    if (!printWindow) return;

    const storeName = escapeHtml(data.store?.name ?? 'Pharmacy');

    const contactLines = [
        `<div>${storeName}</div>`,
        data.store?.phone ? `<div>Tel: ${escapeHtml(data.store.phone)}</div>` : '',
        data.store?.address ? `<div>${escapeHtml(data.store.address)}</div>` : '',
    ].join('');

    const itemRows = data.items
        .map(
            (item, i) => `
      <tr>
        <td style="text-align:center;border:1px solid #ccc;padding:4px 5px;">${i + 1}</td>
        <td style="border:1px solid #ccc;padding:4px 5px;white-space:normal;word-break:break-word;">${escapeHtml(item.name)}</td>
        <td style="border:1px solid #ccc;padding:4px 5px;">${escapeHtml(item.batchNumber)}</td>
        <td style="text-align:center;border:1px solid #ccc;padding:4px 5px;">${escapeHtml((item.unit ?? '-').toUpperCase())}</td>
        <td style="text-align:center;border:1px solid #ccc;padding:4px 5px;">${formatExpiry(item.expiryDate)}</td>
        <td style="text-align:right;border:1px solid #ccc;padding:4px 5px;">${item.quantity}</td>
        <td style="text-align:right;border:1px solid #ccc;padding:4px 5px;">${item.unitPrice.toFixed(2)}</td>
        <td style="text-align:right;border:1px solid #ccc;padding:4px 5px;">${(item.quantity * item.unitPrice).toFixed(2)}</td>
      </tr>`,
        )
        .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(data.invoiceNo || '—')}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Arial, sans-serif; color: #111; }
    .shell {
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 10mm 12mm;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .company-title { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -.01em; }
    .invoice-label { font-size: 28px; font-weight: 900; letter-spacing: .02em; text-align: right; }
    .contact { font-size: 12px; color: #475569; line-height: 1.5; text-align: right; margin-top: 4px; }
    .meta-table { margin-top: 10px; border-collapse: collapse; font-size: 11px; }
    .meta-table td { border: 1px solid #111; padding: 3px 8px; }
    .meta-table td:first-child { font-weight: 700; background: #f8fafc; white-space: nowrap; }
    .customer-row { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 1px solid #111; margin: 14px 0 10px; }
    .customer-cell { padding: 6px 10px; border-right: 1px solid #111; }
    .customer-cell:last-child { border-right: none; }
    .cell-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #64748b; }
    .cell-value { font-size: 13px; color: #111827; margin-top: 2px; }
    .items-table { width: 100%; border-collapse: collapse; border: 1px solid #111; table-layout: fixed; font-size: 11px; }
    .items-table th { background: #f3f4f6; font-weight: 700; border: 1px solid #111; padding: 4px 5px; }
    .items-table thead th:nth-child(1) { width:5%; }
    .items-table thead th:nth-child(2) { width:33%; }
    .items-table thead th:nth-child(3) { width:13%; }
    .items-table thead th:nth-child(4) { width:8%; text-align:center; }
    .items-table thead th:nth-child(5) { width:10%; text-align:center; }
    .items-table thead th:nth-child(6) { width:7%; text-align:right; }
    .items-table thead th:nth-child(7) { width:11%; text-align:right; }
    .items-table thead th:nth-child(8) { width:13%; text-align:right; }
    .totals { width: 220px; margin-left: auto; margin-top: 10px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
    .grand-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 900; color: #10B981; margin-top: 4px; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 28px; }
    .sig-box { text-align: center; }
    .sig-line { border-bottom: 1px solid #111; height: 40px; display: block; }
    .sig-label { font-size: 12px; font-weight: 700; margin-top: 4px; display: block; }
    .legal { margin-top: auto; text-align: center; font-size: 9px; font-weight: 900;
             text-transform: uppercase; letter-spacing: .8px; color: #9ca3af; padding-top: 16px; }
    @media print {
      @page { size: A4; margin: 15mm; }
      html, body { width: 210mm; margin: 0; padding: 0; }
      .shell { padding: 0; min-height: auto; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <!-- HEADER -->
    <div class="header">
      <div>
        <div class="company-title">${storeName}</div>
        <table class="meta-table">
          <tr><td>Invoice No</td><td>${escapeHtml(data.invoiceNo || '—')}</td></tr>
          <tr><td>FS No</td><td>${escapeHtml(data.customerSNo || '—')}</td></tr>
          <tr><td>Reference</td><td>${escapeHtml(data.reference || '—')}</td></tr>
          <tr><td>Date</td><td style="font-weight:700;">${escapeHtml(data.date)}</td></tr>
        </table>
      </div>
      <div>
        <div class="invoice-label">INVOICE</div>
        <div class="contact">${contactLines}</div>
      </div>
    </div>

    <!-- CUSTOMER ROW -->
    <div class="customer-row">
      <div class="customer-cell">
        <div class="cell-label">Customer Name</div>
        <div class="cell-value">${escapeHtml(data.customerName || '—')}</div>
      </div>
      <div class="customer-cell">
        <div class="cell-label">TIN Number</div>
        <div class="cell-value">${escapeHtml(data.customerTin || '—')}</div>
      </div>
      <div class="customer-cell">
        <div class="cell-label">Payment Method</div>
        <div class="cell-value">${data.paymentMethod === 'cash' ? 'Cash' : 'Credit'}</div>
      </div>
    </div>

    <!-- ITEMS TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th>S.No</th><th style="text-align:left;">Description</th><th style="text-align:left;">Batch #</th>
          <th style="text-align:center;">Unit</th><th style="text-align:center;">Exp.</th>
          <th style="text-align:right;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- TOTALS -->
    <div style="margin-top:10px;border-top:2px solid #111;padding-top:8px;">
      <div class="totals">
        <div class="totals-row"><span style="color:#374151;">total</span><span style="font-weight:700;">ETB ${data.totalPrice.toFixed(2)}</span></div>
        <div class="totals-row"><span style="color:#374151;">Not Taxable</span><span style="font-weight:700;">ETB 0.00</span></div>
        <div style="border-top:1px solid #111;margin:4px 0;"></div>
        <div class="grand-total"><span>GRAND TOTAL</span><span>ETB ${data.totalPrice.toFixed(2)}</span></div>
        <div style="border-bottom:3px solid #10B981;margin-top:3px;"></div>
      </div>
    </div>

    ${data.sellerName ? `<div style="margin-top:8px;font-size:11px;color:#64748b;">Seller: <strong>${escapeHtml(data.sellerName)}</strong></div>` : ''}

    <!-- SIGNATURES -->
    <div class="sig-grid">
      ${['Prepared By', 'Received By', 'Approved By']
          .map(
              (l) =>
                  `<div class="sig-box"><span class="sig-line"></span><span class="sig-label">${l}</span></div>`,
          )
          .join('')}
    </div>

    <div class="legal">Invalid without fiscal or refund receipt attached</div>
  </div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 300);
}
