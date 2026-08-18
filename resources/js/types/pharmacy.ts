export interface BatchOption {
    id: number;
    batch_number: string;
    quantity: number;
    expiry_date: string;
}

export interface MedicineSearchResult {
    id: number;
    name: string;
    generic_name: string | null;
    unit: string;
    price: number;
    available_stock: number;
    /** FEFO order: first entry is the batch auto-selected at checkout. */
    batches: BatchOption[];
}

export interface CartItem {
    id: string;
    medicineId: number;
    medicineName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    /** null = FEFO auto-selection on the server (default checkout path). */
    batchId: number | null;
    batchNumber: string;
    expiryDate: string;
    availableStock: number;
    batches: BatchOption[];
}

export interface SaleMeta {
    customer_name: string;
    customer_tin: string;
    customer_sno?: string;
    invoice_no?: string;
    seller_name?: string;
    receiver_name?: string;
    reference?: string;
    payment_method: 'cash' | 'credit';
}

export interface ReceiptItem {
    medicine_name: string;
    batch_number: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    expiry_date: string;
}

export interface Receipt {
    id: string;
    invoice_no: string;
    created_at: string;
    customer_name: string | null;
    customer_tin: string | null;
    customer_sno: string | null;
    receiver_name: string | null;
    reference: string | null;
    payment_method: string;
    seller_name: string;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    items: ReceiptItem[];
}

export interface InventoryRow {
    id: number;
    medicine_id: number;
    name: string;
    category: string | null;
    batch_number: string;
    quantity: number;
    initial_quantity: number;
    unit: string;
    price: number;
    expiry_date: string;
    is_expired: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
