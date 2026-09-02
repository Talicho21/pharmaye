import { router, usePage } from '@inertiajs/react';
import { AlertCircle, Download, Loader2, Paperclip, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { downloadInvoicePdf } from '@/lib/receipt-print';
import type { SharedData } from '@/types';
import type { BatchOption, CartItem, MedicineSearchResult, SaleMeta } from '@/types/pharmacy';

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
export function MultiItemOrderCart({ results, onSubmit, isProcessing = false, serverError }: MultiItemOrderCartProps) {
    const inputClass =
        'w-full rounded-lg border border-border-gray bg-off-white px-3 py-2.5 text-sm text-dark-charcoal transition duration-150 outline-none placeholder:text-dark-charcoal/70 focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50';

    const { auth, store } = usePage<SharedData>().props;
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [medicineSearch, setMedicineSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editableForm, setEditableForm] = useState<EditableForm>(emptyForm());
    const [customerName, setCustomerName] = useState('');
    const [tinNumber, setTinNumber] = useState('');
    const [invoiceNo, setInvoiceNo] = useState('');
    const [customerSNo, setCustomerSNo] = useState('');
    const [reference, setReference] = useState('');
    const [sellerName, setSellerName] = useState(auth.user?.name ?? '');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
    const [viewMode, setViewMode] = useState<'cart' | 'receipt'>('cart');
    const [formValidationError, setFormValidationError] = useState('');
    const skipNextSearch = useRef(false);

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
        setFormValidationError('');
    };

    const addItemToCart = () => {
        setFormValidationError('');
        const { medicine, quantity, unitPrice, batchId } = editableForm;

        if (!medicine) {
            setFormValidationError('Please select a medicine before adding to cart.');
            return;
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            setFormValidationError('Quantity must be a positive whole number.');
            return;
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            setFormValidationError('Price must be a valid non-negative number.');
            return;
        }
        if (quantity > availableForSelection) {
            setFormValidationError(`Cannot add ${quantity} units. Only ${availableForSelection} units are available for ${medicine.name}.`);
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
                        setFormValidationError(
                            `Insufficient stock: ${item.medicineName} has only ${item.availableStock} units available, but you are trying to sell ${value} units.`,
                        );
                        return item;
                    }
                    setFormValidationError('');
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
        setCustomerName('');
        setTinNumber('');
        setInvoiceNo('');
        setCustomerSNo('');
        setReference('');
        setSellerName(auth.user?.name ?? '');
        setPaymentMethod('cash');
        setViewMode('cart');
        setFormValidationError('');
    };

    const handleSubmit = () => {
        setFormValidationError('');

        if (cartItems.length === 0) {
            setFormValidationError('Please add at least one item to the order.');
            return;
        }
        if (!customerName.trim()) {
            setFormValidationError('Please enter the customer name.');
            return;
        }
        if (!tinNumber.trim()) {
            setFormValidationError('Please enter the TIN number.');
            return;
        }

        if (viewMode === 'cart') {
            setViewMode('receipt');
            return;
        }

        onSubmit(cartItems, {
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

    const validationError = formValidationError || serverError || '';

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
            <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <div className="border-b border-border-gray bg-off-white px-6 py-4">
                    <h2 className="text-lg font-bold text-dark-charcoal">Sale Receipt — Review Before Confirming</h2>
                    <p className="mt-0.5 text-sm text-dark-charcoal/70">
                        {invoiceNo.trim()
                            ? `Invoice ${invoiceNo.trim()} will be recorded when the sale is confirmed.`
                            : 'The invoice number is assigned by the system when the sale is confirmed.'}
                    </p>
                </div>
                <div className="space-y-4 overflow-y-auto p-6">
                    {validationError && (
                        <div className="flex items-start gap-3 rounded-lg border border-accent-red/30 bg-red-50 px-4 py-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-red" />
                            <p className="text-sm font-medium text-accent-red">{validationError}</p>
                        </div>
                    )}

                    <div className="rounded-lg border border-border-gray bg-white p-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase">Customer Name:</p>
                                <p className="text-lg font-semibold text-[#334155]">{customerName}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase">TIN Number:</p>
                                <p className="text-lg font-semibold text-[#334155]">{tinNumber}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase">Payment:</p>
                                <p className="text-lg font-semibold text-[#334155] capitalize">{paymentMethod}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase">Seller Name:</p>
                                <p className="text-lg font-semibold text-[#334155]">{sellerName || '—'}</p>
                            </div>
                            <div>
                                <p className="mb-1 text-sm font-semibold tracking-wide text-[#64748B] uppercase">Date:</p>
                                <p className="text-lg font-semibold text-[#334155]">{new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
                        <div className="grid grid-cols-12 gap-2 bg-[#F8FAFC] px-4 py-3 text-sm font-bold text-[#64748B]">
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
                                    <div className="col-span-4 font-semibold text-[#334155]">{item.medicineName}</div>
                                    <div className="col-span-2 text-[#64748B]">{item.batchNumber}</div>
                                    <div className="col-span-1 text-[#64748B] uppercase">{item.unit || '-'}</div>
                                    <div className="col-span-2 text-[#64748B]">{formatExpiry(item.expiryDate)}</div>
                                    <div className="col-span-1 text-right text-[#334155]">{item.quantity}</div>
                                    <div className="col-span-2 text-right font-bold text-green-600">
                                        ETB {(item.quantity * item.unitPrice).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-lg border border-[#E2E8F0] bg-white p-4">
                        <div className="ml-auto w-64">
                            <div className="mb-2 flex justify-between text-sm">
                                <span className="text-[#64748B]">total</span>
                                <span className="font-semibold text-[#334155] tabular-nums">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="mb-3 flex justify-between text-sm">
                                <span className="text-[#64748B]">Not Taxable</span>
                                <span className="font-semibold text-[#334155] tabular-nums">ETB 0.00</span>
                            </div>
                            <div className="my-2 border-t border-[#2563EB]" />
                            <div className="flex justify-between text-base font-bold">
                                <span className="text-lg text-[#10B981]">GRAND TOTAL</span>
                                <span className="text-lg text-[#10B981] tabular-nums">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                            </div>
                            <div className="mt-1 border-b-4 border-[#10B981]" />
                        </div>
                    </div>
                </div>

                {/* ── INVOICE ATTACHMENT / PDF DOWNLOAD ── */}
                <div className="flex items-center justify-between border-t border-border-gray bg-[#f8fafc] px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-primary-blue" />
                        <span className="text-xs font-black tracking-[0.2em] text-dark-charcoal/60 uppercase">
                            Invoice Attachment
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1.5 rounded-md bg-primary-blue px-3 py-1.5 text-xs font-bold text-white shadow-md transition duration-150 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
                        title="Download invoice as PDF"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                    </button>
                </div>

                <div className="flex gap-3 border-t border-border-gray bg-off-white/40 px-6 py-4">
                    <button
                        type="button"
                        onClick={() => setViewMode('cart')}
                        disabled={isProcessing}
                        className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        ← Back to Cart
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isProcessing}
                        className="flex-[2] rounded-lg bg-grass-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="flex flex-col gap-5 rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Item Search</p>
                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">Add Items to Order</h2>
                </div>

                {validationError && (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <p className="text-sm font-medium text-amber-800">{validationError}</p>
                    </div>
                )}

                {/* Medicine Search */}
                <div>
                    <label
                        htmlFor="pos-medicine-search"
                        className="mb-1.5 block text-xs font-black tracking-[0.22em] text-dark-charcoal/70 uppercase"
                    >
                        Search Medicine
                    </label>
                    <div className="relative">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
                        <input
                            id="pos-medicine-search"
                            type="text"
                            placeholder="Search by medicine name, generic name or batch number…"
                            value={medicineSearch}
                            onChange={(e) => setMedicineSearch(e.target.value)}
                            disabled={isProcessing}
                            className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pr-3 pl-9 text-sm text-dark-charcoal transition duration-150 outline-none placeholder:text-dark-charcoal/70 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
                        />
                        {medicineSearch.trim() && (
                            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border-gray bg-pure-white shadow-lg">
                                {isSearching ? (
                                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-dark-charcoal/70">
                                        <Loader2 className="h-4 w-4 animate-spin text-grass-green" />
                                        Searching…
                                    </div>
                                ) : results.length === 0 ? (
                                    <div className="px-4 py-3 text-sm text-dark-charcoal/70">No matching inventory found.</div>
                                ) : (
                                    results.map((medicine) => (
                                        <button
                                            key={medicine.id}
                                            type="button"
                                            onClick={() => handleSelectSearchResult(medicine)}
                                            className="flex w-full flex-col gap-0.5 border-b border-border-gray/50 px-4 py-3 text-left transition duration-150 last:border-0 hover:bg-off-white focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:outline-none focus-visible:ring-inset"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-semibold text-dark-charcoal">{medicine.name}</span>
                                                <span className="shrink-0 text-xs font-bold text-dark-charcoal">
                                                    ETB {medicine.price.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-dark-charcoal/70">
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
                    <div className="space-y-4 rounded-lg border border-border-gray bg-off-white/40 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate font-bold text-dark-charcoal">{editableForm.medicine.name}</p>
                                <p className="text-xs text-dark-charcoal/70">
                                    {editableForm.batchId === null
                                        ? `FEFO auto-batch: ${selectedBatch?.batch_number ?? '—'} (exp ${selectedBatch?.expiry_date ?? '—'})`
                                        : `Manual batch: ${selectedBatch?.batch_number} (exp ${selectedBatch?.expiry_date})`}
                                </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-grass-green/20 bg-primary-blue/10 px-2.5 py-1 text-xs font-bold text-dark-charcoal uppercase">
                                {editableForm.medicine.unit}
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Quantity</label>
                                <input
                                    type="number"
                                    value={editableForm.quantity}
                                    onChange={(e) => setEditableForm((c) => ({ ...c, quantity: Number(e.target.value) || 0 }))}
                                    disabled={isProcessing}
                                    min="1"
                                    className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Unit Price (ETB)</label>
                                <input
                                    type="number"
                                    value={editableForm.unitPrice}
                                    onChange={(e) => setEditableForm((c) => ({ ...c, unitPrice: Number(e.target.value) || 0 }))}
                                    disabled={isProcessing}
                                    step="0.01"
                                    min="0"
                                    className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Line Subtotal</label>
                                <div className="rounded-lg border border-border-gray/50 bg-off-white px-3 py-2 text-sm font-semibold text-dark-charcoal">
                                    ETB {(editableForm.quantity * editableForm.unitPrice).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Batch override picker — default is FEFO, no choice required */}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Batch (advanced)</label>
                            <select
                                value={editableForm.batchId ?? ''}
                                onChange={(e) =>
                                    setEditableForm((c) => ({
                                        ...c,
                                        batchId: e.target.value === '' ? null : Number(e.target.value),
                                    }))
                                }
                                disabled={isProcessing}
                                className="w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                            >
                                <option value="">Automatic (earliest expiry first)</option>
                                {editableForm.medicine.batches.map((batch) => (
                                    <option key={batch.id} value={batch.id}>
                                        {batch.batch_number} — {batch.quantity} in stock, exp {batch.expiry_date}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className="text-xs text-dark-charcoal/70">
                            Available stock: <span className="font-bold text-dark-charcoal">{availableForSelection}</span> units
                        </p>
                    </div>
                )}

                <button
                    type="button"
                    onClick={addItemToCart}
                    disabled={isProcessing || !editableForm.medicine || editableForm.quantity <= 0}
                    className="mt-auto w-full rounded-lg bg-grass-green px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Plus className="mr-1.5 -mt-0.5 inline-block h-4 w-4" />
                    Add Medicine to Order
                </button>
            </div>

            {/* ── RIGHT COLUMN: Order Summary & Checkout ── */}
            <div className="pos-right-col flex flex-col gap-5 rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Checkout</p>
                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">Order Summary</h2>
                </div>

                {/* Customer Information */}
                <div>
                    <p className="mb-3 text-xs font-black tracking-[0.22em] text-dark-charcoal/70 uppercase">Customer Information</p>
                    <div className="space-y-2.5">
                        <input
                            type="text"
                            placeholder="Customer Name *"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            disabled={isProcessing}
                            className={inputClass}
                        />
                        <input
                            type="text"
                            placeholder="TIN Number *"
                            value={tinNumber}
                            onChange={(e) => setTinNumber(e.target.value)}
                            disabled={isProcessing}
                            className={inputClass}
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                            <input
                                type="text"
                                placeholder="Invoice No"
                                value={invoiceNo}
                                onChange={(e) => setInvoiceNo(e.target.value)}
                                disabled={isProcessing}
                                className={inputClass}
                            />
                            <input
                                type="text"
                                placeholder="S.No"
                                value={customerSNo}
                                onChange={(e) => setCustomerSNo(e.target.value)}
                                disabled={isProcessing}
                                className={inputClass}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <input
                                type="text"
                                placeholder="Reference"
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                disabled={isProcessing}
                                className={inputClass}
                            />
                            <input
                                type="text"
                                placeholder="Seller Name"
                                value={sellerName}
                                onChange={(e) => setSellerName(e.target.value)}
                                disabled={isProcessing}
                                className={inputClass}
                            />
                        </div>
                        {/* Payment method pill buttons */}
                        <div className="flex items-center gap-2 pt-1">
                            {(['cash', 'credit'] as const).map((method) => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setPaymentMethod(method)}
                                    disabled={isProcessing}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition duration-150 focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:outline-none ${
                                        paymentMethod === method
                                            ? 'bg-primary-blue text-white'
                                            : 'bg-off-white text-dark-charcoal/80 hover:bg-border-gray hover:text-dark-charcoal'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Cart Items */}
                <div>
                    <p className="mb-2 text-xs font-black tracking-[0.22em] text-dark-charcoal/70 uppercase">Cart Items ({cartTotals.itemCount})</p>
                    {cartItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border-gray/50 bg-off-white/30 py-10 text-center">
                            <ShoppingCart className="h-8 w-8 text-border-gray" />
                            <p className="text-sm font-semibold text-dark-charcoal/70">Cart is empty. Search medicines on the left to start.</p>
                        </div>
                    ) : (
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {cartItems.map((item) => (
                                <div key={item.id} className="rounded-lg border border-border-gray bg-off-white/30 p-3">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-dark-charcoal">{item.medicineName}</p>
                                            <p className="text-xs text-dark-charcoal/70">
                                                Batch: {item.batchNumber} · Exp: {item.expiryDate}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItemFromCart(item.id)}
                                            disabled={isProcessing}
                                            aria-label={`Remove ${item.medicineName}`}
                                            className="shrink-0 rounded p-0.5 text-dark-charcoal/70 transition duration-150 hover:bg-red-50 hover:text-accent-red focus-visible:ring-2 focus-visible:ring-accent-red focus-visible:outline-none disabled:opacity-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="mb-0.5 block text-xs text-dark-charcoal/70">Qty</label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const qty = Number(e.target.value);
                                                    if (qty > 0) updateCartItem(item.id, 'quantity', qty);
                                                }}
                                                disabled={isProcessing}
                                                min="1"
                                                className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-0.5 block text-xs text-dark-charcoal/70">Unit Price (ETB)</label>
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
                                                className="w-full rounded border border-border-gray bg-pure-white px-2 py-1 text-xs text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:bg-off-white disabled:opacity-70"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-0.5 block text-xs text-dark-charcoal/70">Subtotal (ETB)</label>
                                            <div className="rounded border border-border-gray/50 bg-off-white px-2 py-1 text-xs font-semibold text-dark-charcoal">
                                                {(item.quantity * item.unitPrice).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Totals Box + Actions — sticky on mobile, static on desktop */}
                <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-xl border-t border-border-gray bg-pure-white p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:static lg:gap-5 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
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
                            <span className="text-xs font-black tracking-[0.2em] text-white/50 uppercase">Grand Total</span>
                            <span className="text-2xl font-black text-grass-green tabular-nums">ETB {cartTotals.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={resetAll}
                            disabled={isProcessing}
                            className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Clear Order
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isProcessing || cartItems.length === 0}
                            className="flex-[2] rounded-lg bg-grass-green px-4 py-2.5 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {isProcessing ? 'Processing…' : 'Review & Continue →'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
