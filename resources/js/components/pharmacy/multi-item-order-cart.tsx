import { router, usePage } from '@inertiajs/react';
import { AlertCircle, Download, Loader2, Paperclip, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { downloadInvoicePdf } from '@/lib/receipt-print';
import type { SharedData } from '@/types';
import type { BatchOption, CartItem, DynamicFieldConfig, MedicineSearchResult, SaleMeta } from '@/types/pharmacy';

type EditableForm = {
    medicine: MedicineSearchResult | null;
    quantity: number;
    unitPrice: number;
    /** null = FEFO auto-select (default); a batch id = manual override. */
    batchId: number | null;
};

const emptyForm = (): EditableForm => ({
    medicine: null,
    quantity: 1,
    unitPrice: 0,
    batchId: null,
});

const formatExpiry = (dateValue?: string | null): string => {
    if (!dateValue) return '';
    const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1].slice(-2)}` : String(dateValue);
};

type MultiItemOrderCartProps = {
    results: MedicineSearchResult[];
    fieldConfigs?: Record<string, DynamicFieldConfig[]>;
    onSubmit: (items: CartItem[], meta: SaleMeta) => void;
    isProcessing?: boolean;
    serverError?: string;
};

/**
 * Ported from the legacy MultiItemOrderCart. Markup/styling preserved;
 * data-fetching adapted from fetch/useEffect to Inertia partial reloads
 * (search results arrive via the `results` page prop) and useForm submission
 * in the parent page. FEFO batch selection happens on the server by default,
 * with a per-line manual batch override for edge cases.
 */
export function MultiItemOrderCart({ results, fieldConfigs = {}, onSubmit, isProcessing = false, serverError }: MultiItemOrderCartProps) {
    const inputClass =
        'w-full rounded-lg border border-brand-muted bg-brand-background px-3 py-2.5 text-sm text-brand-text transition duration-150 outline-none placeholder:text-brand-text/70 focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50';

    const { auth, store } = usePage<SharedData>().props;
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [medicineSearch, setMedicineSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editableForm, setEditableForm] = useState<EditableForm>(emptyForm());
    const [dynamicValues, setDynamicValues] = useState<Record<string, string>>({
        payment_method: 'cash',
        seller_name: auth.user?.name ?? '',
    });

    const updateDynamicValue = (key: string, value: string) => {
        setDynamicValues((prev) => ({ ...prev, [key]: value }));
    };

    const customerName = dynamicValues['customer_name'] || '';
    const tinNumber = dynamicValues['customer_tin'] || '';
    const invoiceNo = dynamicValues['invoice_no'] || '';
    const customerSNo = dynamicValues['customer_sno'] || '';
    const reference = dynamicValues['reference'] || '';
    const sellerName = dynamicValues['seller_name'] || '';
    const paymentMethod = dynamicValues['payment_method'] || 'cash';
    const [viewMode, setViewMode] = useState<'cart' | 'receipt'>('cart');
    /** Errors about item selection / quantity — shown in the LEFT column */
    const [itemError, setItemError] = useState('');
    /** Errors about missing required checkout fields — shown in the RIGHT column */
    const [checkoutError, setCheckoutError] = useState('');
    /** field_key of the first failing required field (for auto-focus) */
    const [focusFieldKey, setFocusFieldKey] = useState<string | null>(null);
    const skipNextSearch = useRef(false);
    /** Ref map so we can focus dynamic inputs by field_key */
    const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});

    /* ── Debounced medicine search via Inertia partial reload ── */
    useEffect(() => {
        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }

        const trimmed = medicineSearch.trim();
        if (!trimmed) {
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        const timeoutId = window.setTimeout(() => {
            router.get(
                route('sell-out'),
                { search: trimmed },
                {
                    only: ['results', 'search'],
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    onFinish: () => setIsSearching(false),
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [medicineSearch]);

    const cartTotals = useMemo(
        () => ({
            itemCount: cartItems.length,
            totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: cartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
        }),
        [cartItems],
    );

    const selectedBatch: BatchOption | null = useMemo(() => {
        if (!editableForm.medicine) return null;
        if (editableForm.batchId === null) return editableForm.medicine.batches[0] ?? null;
        return editableForm.medicine.batches.find((b) => b.id === editableForm.batchId) ?? null;
    }, [editableForm]);

    const availableForSelection = editableForm.batchId === null ? (editableForm.medicine?.available_stock ?? 0) : (selectedBatch?.quantity ?? 0);

    const handleSelectSearchResult = (medicine: MedicineSearchResult) => {
        skipNextSearch.current = true;
        setEditableForm({
            medicine,
            quantity: 1,
            unitPrice: medicine.price,
            batchId: null,
        });
        setMedicineSearch('');
        setItemError('');
    };

    const addItemToCart = () => {
        setItemError('');
        const { medicine, quantity, unitPrice, batchId } = editableForm;

        if (!medicine) {
            setItemError('Please select a medicine before adding to cart.');
            return;
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            setItemError('Quantity must be a positive whole number.');
            return;
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            setItemError('Price must be a valid non-negative number.');
            return;
        }
        if (quantity > availableForSelection) {
            setItemError(`Cannot add ${quantity} units. Only ${availableForSelection} units are available for ${medicine.name}.`);
            return;
        }

        const batch = batchId === null ? medicine.batches[0] : medicine.batches.find((b) => b.id === batchId);

        setCartItems([
            ...cartItems,
            {
                id: `${Date.now()}-${Math.random()}`,
                medicineId: medicine.id,
                medicineName: medicine.name,
                unit: medicine.unit,
                quantity,
                unitPrice,
                batchId,
                batchNumber: batchId === null ? `${batch?.batch_number ?? ''} (FEFO)` : (batch?.batch_number ?? ''),
                expiryDate: batch?.expiry_date ?? '',
                availableStock: availableForSelection,
                batches: medicine.batches,
            },
        ]);
        setEditableForm(emptyForm());
    };

    const updateCartItem = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
        setCartItems(
            cartItems.map((item) => {
                if (item.id !== id) return item;
                if (field === 'quantity') {
                    if (value > item.availableStock) {
                        setItemError(
                            `Insufficient stock: ${item.medicineName} has only ${item.availableStock} units available, but you are trying to sell ${value} units.`,
                        );
                        return item;
                    }
                    setItemError('');
                }
                return { ...item, [field]: value };
            }),
        );
    };

    const removeItemFromCart = (id: string) => {
        setCartItems(cartItems.filter((item) => item.id !== id));
    };

    const resetAll = () => {
        setCartItems([]);
        setDynamicValues({
            payment_method: 'cash',
            seller_name: auth.user?.name ?? '',
        });
        setViewMode('cart');
        setItemError('');
        setCheckoutError('');
        setFocusFieldKey(null);
    };

    const handleSubmit = () => {
        setItemError('');
        setCheckoutError('');
        setFocusFieldKey(null);

        if (cartItems.length === 0) {
            // Cart is empty — surface in right column (checkout area)
            setCheckoutError('Please add at least one item to the order.');
            return;
        }

        for (const sectionFields of Object.values(fieldConfigs)) {
            for (const field of sectionFields) {
                if (field.is_required && (!dynamicValues[field.field_key] || !dynamicValues[field.field_key].trim())) {
                    setCheckoutError(`Please enter the ${field.label}.`);
                    setFocusFieldKey(field.field_key);
                    return;
                }
            }
        }

        if (viewMode === 'cart') {
            setViewMode('receipt');
            return;
        }

        onSubmit(cartItems, {
            ...dynamicValues,
            customer_name: customerName.trim(),
            customer_tin: tinNumber.trim(),
            customer_sno: customerSNo.trim() || undefined,
            invoice_no: invoiceNo.trim() || undefined,
            seller_name: sellerName.trim() || undefined,
            receiver_name: customerName.trim(),
            reference: reference.trim() || undefined,
            payment_method: paymentMethod,
        });
    };

    // Expose reset so the parent can clear the cart after a successful sale.
    useEffect(() => {
        const handler = () => resetAll();
        window.addEventListener('pharmacy:sale-completed', handler);
        return () => window.removeEventListener('pharmacy:sale-completed', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Server-side errors (from Inertia props) are treated as checkout errors */
    const effectiveCheckoutError = checkoutError || serverError || '';

    /** Auto-focus the offending field whenever focusFieldKey changes */
    useEffect(() => {
        if (!focusFieldKey) return;
        const el = fieldRefs.current[focusFieldKey];
        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [focusFieldKey]);

    const handleDownloadPdf = () => {
        downloadInvoicePdf({
            store,
            invoiceNo,
            customerSNo,
            reference,
            customerName,
            customerTin: tinNumber,
            paymentMethod,
            sellerName,
            date: new Date().toLocaleDateString('en-GB'),
            items: cartItems.map((item) => ({
                name: item.medicineName,
                batchNumber: item.batchNumber,
                unit: item.unit,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
            totalPrice: cartTotals.totalPrice,
        });
    };

    /* ── RECEIPT VIEW (review before confirming) ── */
    if (viewMode === 'receipt') {
        return (
            <div className="overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                <div className="border-b border-brand-muted bg-brand-background px-6 py-4 dark:border-brand-muted/80 dark:bg-brand-dark/40">
                    <h2 className="text-lg font-bold text-brand-text">Sale Receipt — Review Before Confirming</h2>
                    <p className="mt-0.5 text-sm text-brand-text/70">
                        {invoiceNo.trim()
                            ? `Invoice ${invoiceNo.trim()} will be recorded when the sale is confirmed.`
                            : 'The invoice number is assigned by the system when the sale is confirmed.'}
                    </p>
                </div>
                <div className="space-y-4 overflow-y-auto p-6">
                    {effectiveCheckoutError && (
                        <div className="flex items-start gap-3 rounded-lg border border-brand-danger/30 bg-red-50 px-4 py-3 dark:border-brand-danger/30 dark:bg-red-900/20">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                            <p className="text-sm font-medium text-brand-danger">{effectiveCheckoutError}</p>
                        </div>
                    )}

                    <div className="rounded-lg border border-brand-muted bg-white p-4 dark:border-brand-muted/80 dark:bg-brand-dark/60">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase dark:text-slate-400">Customer Name:</p>
                                <p className="text-lg font-semibold text-[#334155] dark:text-slate-100">{customerName}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase dark:text-slate-400">TIN Number:</p>
                                <p className="text-lg font-semibold text-[#334155] dark:text-slate-100">{tinNumber}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase dark:text-slate-400">Payment:</p>
                                <p className="text-lg font-semibold text-[#334155] capitalize dark:text-slate-100">{paymentMethod}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase dark:text-slate-400">Seller Name:</p>
                                <p className="text-lg font-semibold text-[#334155] dark:text-slate-100">{sellerName || '—'}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase dark:text-slate-400">Date:</p>
                                <p className="text-lg font-semibold text-[#334155] dark:text-slate-100">{new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white dark:border-slate-700 dark:bg-brand-dark/60">
                        <div className="grid grid-cols-12 gap-2 bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#64748B] dark:bg-slate-700/60 dark:text-slate-400">
                            <div className="col-span-4">Description</div>
                            <div className="col-span-2">Batch #</div>
                            <div className="col-span-1">Unit</div>
                            <div className="col-span-2">Expiry Date</div>
                            <div className="col-span-1 text-right">Qty</div>
                            <div className="col-span-2 text-right">Total</div>
                        </div>
                        <div className="divide-y">
                            {cartItems.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
                                    <div className="col-span-4 font-semibold text-[#334155] dark:text-slate-200">{item.medicineName}</div>
                                    <div className="col-span-2 text-[#64748B] dark:text-slate-400">{item.batchNumber}</div>
                                    <div className="col-span-1 text-[#64748B] uppercase dark:text-slate-400">{item.unit || '-'}</div>
                                    <div className="col-span-2 text-[#64748B] dark:text-slate-400">{formatExpiry(item.expiryDate)}</div>
                                    <div className="col-span-1 text-right text-[#334155] dark:text-slate-200">{item.quantity}</div>
                                    <div className="col-span-2 text-right font-bold text-green-600">
                                        ETB {(item.quantity * item.unitPrice).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 dark:border-slate-700 dark:bg-brand-dark/60">
                        <div className="ml-auto w-64">
                            <div className="mb-2 flex justify-between text-sm">
                                <span className="text-[#64748B] dark:text-slate-400">total</span>
                                <span className="font-semibold text-[#334155] tabular-nums dark:text-slate-200">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="mb-3 flex justify-between text-sm">
                                <span className="text-[#64748B] dark:text-slate-400">Not Taxable</span>
                                <span className="font-semibold text-[#334155] tabular-nums dark:text-slate-200">ETB 0.00</span>
                            </div>
                            <div className="my-2 border-t border-[#2563EB]" />
                            <div className="flex justify-between text-base font-bold">
                                <span className="text-lg text-[#10B981] dark:text-emerald-400">GRAND TOTAL</span>
                                <span className="text-lg text-[#10B981] tabular-nums dark:text-emerald-400">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="mt-1 border-b-4 border-[#10B981]" />
                        </div>
                    </div>
                </div>

                {/* ── INVOICE ATTACHMENT / PDF DOWNLOAD ── */}
                <div className="flex items-center justify-between border-t border-brand-muted bg-[#f8fafc] px-6 py-4 dark:border-slate-700 dark:bg-brand-dark/40">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-brand-dark" />
                        <span className="text-xs font-black tracking-[0.2em] text-brand-text/60 uppercase">
                            Invoice Attachment
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand-dark px-3 py-1.5 text-xs font-bold text-white shadow-md transition duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 active:translate-y-0"
                        title="Download invoice as PDF"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                    </button>
                </div>

                <div className="flex gap-3 border-t border-brand-muted bg-brand-background/40 px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setViewMode('cart')}
                        disabled={isProcessing}
                        className="flex-1 rounded-lg border border-brand-muted bg-brand-background px-4 py-2.5 text-sm font-semibold text-brand-text transition duration-150 hover:bg-brand-muted focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ← Back to Cart
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isProcessing}
                        className="flex-[2] rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isProcessing ? 'Processing…' : '✓ Confirm & Process Sale'}
                    </button>
                </div>
            </div>
        );
    }

    /* ── CART VIEW — 2-column POS layout ── */
    return (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
            {/* ── LEFT COLUMN: Add Items to Order ── */}
            <div className="flex flex-col gap-5 rounded-xl border border-brand-muted bg-white p-6 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Item Search</p>
                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-brand-text">Add Items to Order</h2>
                </div>

                {/* Item-level errors only — e.g. stock exceeded, no medicine selected */}
                {itemError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700/60 dark:bg-amber-900/20">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <p className="text-sm font-medium text-amber-800">{itemError}</p>
                    </div>
                )}

                {/* Medicine Search */}
                <div>
                    <label
                        htmlFor="pos-medicine-search"
                        className="mb-1.5 block text-xs font-black tracking-[0.22em] text-brand-text/70 uppercase"
                    >
                        Search Medicine
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-text/80" />
                        <input
                            id="pos-medicine-search"
                            type="text"
                            placeholder="Search by medicine name, generic name or batch number…"
                            value={medicineSearch}
                            onChange={(e) => setMedicineSearch(e.target.value)}
                            disabled={isProcessing}
                            className="w-full rounded-lg border border-brand-muted bg-brand-background py-2.5 pr-3 pl-9 text-sm text-brand-text transition duration-150 outline-none placeholder:text-brand-text/70 focus:border-brand-muted focus:ring-1 focus:ring-brand-muted focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-50 dark:border-brand-muted dark:bg-brand-dark/90 dark:text-brand-text dark:placeholder:text-brand-text/40"
                        />
                        {medicineSearch.trim() && (
                            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-brand-muted bg-white shadow-lg dark:border-brand-muted/80 dark:bg-brand-dark dark:shadow-slate-950/70">
                                {isSearching ? (
                                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-brand-text/70">
                                        <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />
                                        Searching…
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-brand-text/70">No matching inventory found.</div>
                                ) : (
                                    results.map((medicine) => (
                                        <button
                                            key={medicine.id}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(medicine)}
                                            className="flex w-full flex-col gap-0.5 border-b border-brand-muted/50 px-4 py-3 text-left transition duration-150 last:border-0 hover:bg-brand-background focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none focus-visible:ring-inset dark:border-brand-muted/30 dark:hover:bg-brand-dark/90"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-semibold text-brand-text">{medicine.name}</span>
                                                <span className="shrink-0 text-xs font-bold text-brand-text">
                                                    ETB {medicine.price.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-brand-text/70">
                                                Stock: {medicine.available_stock} · Batches: {medicine.batches.length}
                                                {medicine.batches[0] && <> · Next exp: {medicine.batches[0].expiry_date}</>}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Selected Item Details */}
                {editableForm.medicine && (
                    <div className="space-y-4 rounded-lg border border-brand-muted bg-brand-background/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate font-bold text-brand-text">{editableForm.medicine.name}</p>
                                <p className="text-xs text-brand-text/70">
                                    {editableForm.batchId === null
                                        ? `FEFO auto-batch: ${selectedBatch?.batch_number ?? '—'} (exp ${selectedBatch?.expiry_date ?? '—'})`
                                        : `Manual batch: ${selectedBatch?.batch_number} (exp ${selectedBatch?.expiry_date})`}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-brand-accent/20 bg-brand-dark/10 px-2.5 py-1 text-xs font-bold text-brand-text uppercase">
                                {editableForm.medicine.unit}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-brand-text/70">Quantity</label>
                                <input
                                    type="number"
                                    value={editableForm.quantity}
                                    onChange={(e) => setEditableForm((c) => ({ ...c, quantity: Number(e.target.value) || 0 }))}
                                    disabled={isProcessing}
                                    min="1"
                                    className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:bg-brand-background disabled:opacity-70"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-brand-text/70">Unit Price (ETB)</label>
                                <input
                                    type="number"
                                    value={editableForm.unitPrice}
                                    onChange={(e) => setEditableForm((c) => ({ ...c, unitPrice: Number(e.target.value) || 0 }))}
                                    disabled={isProcessing}
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:bg-brand-background disabled:opacity-70"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-brand-text/70">Line Subtotal</label>
                                <div className="rounded-lg border border-brand-muted/50 bg-brand-background px-3 py-2 text-sm font-semibold text-brand-text">
                                    ETB {(editableForm.quantity * editableForm.unitPrice).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Batch override picker — default is FEFO, no choice required */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-brand-text/70">Batch (advanced)</label>
                            <select
                                value={editableForm.batchId ?? ''}
                                onChange={(e) =>
                                    setEditableForm((c) => ({
                                        ...c,
                                        batchId: e.target.value === '' ? null : Number(e.target.value),
                                    }))
                                }
                                disabled={isProcessing}
                                className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:bg-brand-background disabled:opacity-70"
                            >
                                <option value="">Automatic (earliest expiry first)</option>
                                {editableForm.medicine.batches.map((batch) => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.batch_number} — {batch.quantity} in stock, exp {batch.expiry_date}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className="text-xs text-brand-text/70">
                            Available stock: <span className="font-bold text-brand-text">{availableForSelection}</span> units
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={addItemToCart}
                    disabled={isProcessing || !editableForm.medicine || editableForm.quantity <= 0}
                    className="mt-auto w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Plus className="mr-1.5 -mt-0.5 inline-block h-4 w-4" />
                    Add Medicine to Order
                </button>
            </div>

            {/* ── RIGHT COLUMN: Order Summary & Checkout ── */}
            <div className="pos-right-col flex flex-col gap-5 rounded-xl border border-brand-muted bg-white p-6 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Checkout</p>
                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-brand-text">Order Summary</h2>
                </div>

                {/* Dynamic Sections */}
                {['order_summary', 'customer_information', 'cash_credit'].map((sectionKey) => {
                    const fields = fieldConfigs[sectionKey] || [];
                    if (fields.length === 0) return null;

                    const title = {
                        order_summary: 'Order Summary',
                        customer_information: 'Customer Information',
                        cash_credit: 'Cash / Credit',
                    }[sectionKey];

                    return (
                        <div key={sectionKey}>
                            <p className="mb-3 text-xs font-black tracking-[0.22em] text-brand-text/70 uppercase">{title}</p>
                            <div className="grid grid-cols-2 gap-3">
                                {fields.map((field) => {
                                    // Make these fields full-width, everything else half-width
                                    const isFullWidth = ['customer_name', 'customer_tin', 'payment_method'].includes(field.field_key) || field.input_type === 'dropdown';
                                    const colClass = isFullWidth ? 'col-span-2' : 'col-span-1';

                                    if (field.field_key === 'payment_method') {
                                        return (
                                            <div key={field.id} className={`${colClass} flex items-center gap-2 pt-1`}>
                                                {(['cash', 'credit'] as const).map((method) => (
                                                    <button
                                                        key={method}
                                                        type="button"
                                                        onClick={() => updateDynamicValue(field.field_key, method)}
                                                        disabled={isProcessing}
                                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition duration-150 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none ${
                                                            paymentMethod === method
                                                                ? 'bg-brand-dark text-white shadow-sm dark:bg-brand-accent dark:text-brand-dark'
                                                                : 'bg-brand-background text-brand-text/80 hover:bg-brand-muted hover:text-brand-text dark:bg-brand-dark/60 dark:text-brand-text/80 dark:hover:bg-brand-dark'
                                                        }`}
                                                    >
                                                        {method}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    }

                                    if (field.input_type === 'dropdown') {
                                        return (
                                            <div key={field.id} className={colClass}>
                                                <select
                                                    value={dynamicValues[field.field_key] || ''}
                                                    onChange={(e) => updateDynamicValue(field.field_key, e.target.value)}
                                                    disabled={isProcessing}
                                                    required={field.is_required}
                                                    className={inputClass}
                                                >
                                                    <option value="" disabled>Select {field.label}{field.is_required ? ' *' : ''}</option>
                                                    <option value="cash">Cash</option>
                                                    <option value="credit">Credit</option>
                                                </select>
                                            </div>
                                        );
                                    }

                                    const isInvalid = focusFieldKey === field.field_key;
                                    return (
                                        <div key={field.id} className={colClass}>
                                            <input
                                                ref={(el) => { fieldRefs.current[field.field_key] = el; }}
                                                type={field.input_type === 'number' ? 'number' : field.input_type === 'date' ? 'date' : 'text'}
                                                placeholder={`${field.label}${field.is_required ? ' *' : ''}`}
                                                value={dynamicValues[field.field_key] || ''}
                                                onChange={(e) => {
                                                    updateDynamicValue(field.field_key, e.target.value);
                                                    // Clear the error once the user starts correcting the field
                                                    if (focusFieldKey === field.field_key) {
                                                        setCheckoutError('');
                                                        setFocusFieldKey(null);
                                                    }
                                                }}
                                                disabled={isProcessing}
                                                required={field.is_required}
                                                className={`${inputClass}${isInvalid ? ' border-brand-danger ring-2 ring-brand-danger/40' : ''}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Cart Items */}
                <div>
                    <p className="mb-2 text-xs font-black tracking-[0.22em] text-brand-text/70 uppercase">Cart Items ({cartTotals.itemCount})</p>
                    {cartItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-brand-muted/50 bg-brand-background/30 py-10 text-center">
                            <ShoppingCart className="h-8 w-8 text-brand-muted" />
                            <p className="text-sm font-semibold text-brand-text/70">Cart is empty. Search medicines on the left to start.</p>
                        </div>
                    ) : (
                        <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                            {cartItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="group rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-150 hover:shadow-md dark:border-slate-700 dark:bg-brand-dark/60"
                                >
                                    {/* ── Header row: name + badges + trash ── */}
                                    <div className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-brand-text leading-snug">
                                                {item.medicineName}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                {/* Batch number badge */}
                                                <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 ring-inset dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">
                                                    {item.batchNumber}
                                                </span>
                                                {/* Expiry badge */}
                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200 ring-inset dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-700/50">
                                                    Exp {formatExpiry(item.expiryDate)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItemFromCart(item.id)}
                                            disabled={isProcessing}
                                            aria-label={`Remove ${item.medicineName}`}
                                            className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-400 transition duration-150 hover:bg-red-50 hover:text-brand-danger focus-visible:ring-2 focus-visible:ring-brand-danger focus-visible:outline-none disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* ── Divider ── */}
                                    <div className="mx-3.5 border-t border-slate-100 dark:border-slate-700" />

                                    {/* ── Controls row: Qty + Price inputs + read-only subtotal ── */}
                                    <div className="flex items-end gap-3 px-3.5 pt-2.5 pb-3">
                                        {/* Qty */}
                                        <div className="w-16 shrink-0">
                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Qty
                                            </label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const qty = Number(e.target.value);
                                                    if (qty > 0) updateCartItem(item.id, 'quantity', qty);
                                                }}
                                                disabled={isProcessing}
                                                min="1"
                                                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-brand-text outline-none transition focus:border-brand-dark focus:bg-white focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:focus:bg-slate-700 dark:placeholder:text-slate-500"
                                            />
                                        </div>

                                        {/* Unit Price */}
                                        <div className="min-w-0 flex-1">
                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Price (ETB)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => {
                                                    const p = Number(e.target.value);
                                                    if (p >= 0) updateCartItem(item.id, 'unitPrice', p);
                                                }}
                                                disabled={isProcessing}
                                                step="0.01"
                                                min="0"
                                                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-brand-text outline-none transition focus:border-brand-dark focus:bg-white focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-60 dark:border-slate-600 dark:bg-slate-700/60 dark:text-slate-100 dark:focus:bg-slate-700 dark:placeholder:text-slate-500"
                                            />
                                        </div>

                                        {/* Subtotal — read-only display */}
                                        <div className="shrink-0 text-right">
                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                                Subtotal
                                            </p>
                                            <p className="text-sm font-black tabular-nums text-brand-accent">
                                                ETB {(item.quantity * item.unitPrice).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals Box + Actions — sticky on mobile, static on desktop */}
                <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-xl border-t border-brand-muted bg-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:static lg:gap-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                    <div className="rounded-xl bg-brand-dark p-4 text-white">
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
                            <span className="text-xs font-black tracking-[0.2em] text-white/50 uppercase">Grand Total</span>
                            <span className="text-2xl font-black text-brand-accent tabular-nums">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Checkout / required-field validation error — RIGHT column only */}
                    {effectiveCheckoutError && (
                        <div className="flex items-start gap-3 rounded-lg border border-brand-danger/30 bg-red-50 px-4 py-3 dark:border-brand-danger/30 dark:bg-red-900/20">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-danger" />
                            <p className="text-sm font-medium text-brand-danger">{effectiveCheckoutError}</p>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={resetAll}
                            disabled={isProcessing}
                            className="flex-1 rounded-lg border border-brand-muted bg-brand-background px-4 py-2.5 text-sm font-semibold text-brand-text transition duration-150 hover:bg-brand-muted focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-muted/80 dark:bg-brand-dark/50 dark:hover:bg-brand-dark/80"
                        >
                            Clear Order
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isProcessing || cartItems.length === 0}
                            className="flex-[2] rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isProcessing ? 'Processing…' : 'Review & Continue →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
