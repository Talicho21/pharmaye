/**
 * Invoice Number Generation Utilities
 * 
 * Format: INV-[First 3 Letters of Customer Name]-[Last 4 Digits of TIN]
 */

/**
 * Generate dynamic invoice number from customer details
 * @param {string} customerName - Full customer name
 * @param {string} tinNumber - Customer TIN (Tax Identification Number)
 * @returns {string} Generated invoice number (e.g., "INV-ABD-1234")
 */
export function generateInvoiceNumber(customerName: string, tinNumber: string): string {
  // Extract first 3 letters from customer name
  const namePrefix = customerName
    .trim()
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  // Extract last 4 digits from TIN
  const tinSuffix = tinNumber
    .trim()
    .replace(/\D/g, "") // Keep only digits
    .slice(-4)
    .padStart(4, "0"); // Pad with zeros if necessary

  // Ensure we have valid components
  if (!namePrefix || !tinSuffix) {
    // Fallback to timestamp-based invoice if components are invalid
    return `INV-${Date.now()}`;
  }

  return `INV-${namePrefix}-${tinSuffix}`;
}

/**
 * Validate invoice number format
 * @param {string} invoiceNo - Invoice number to validate
 * @returns {boolean} True if valid format
 */
export function isValidInvoiceNumber(invoiceNo: string): boolean {
  const invoicePattern = /^INV-[A-Z]{1,3}-\d{4}$/;
  return invoicePattern.test(invoiceNo);
}

/**
 * Parse invoice number to extract components
 * @param {string} invoiceNo - Invoice number to parse
 * @returns {Object|null} Object with namePrefix and tinSuffix, or null if invalid
 */
export function parseInvoiceNumber(invoiceNo: string): {
  namePrefix: string;
  tinSuffix: string;
} | null {
  const match = invoiceNo.match(/^INV-([A-Z]+)-(\d{4})$/);
  if (!match) return null;

  return {
    namePrefix: match[1],
    tinSuffix: match[2],
  };
}
