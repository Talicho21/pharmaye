import { Download } from 'lucide-react';

import { downloadInvoicePdf } from '@/lib/receipt-print';
import type { StoreBranding } from '@/types';
import type { CartItem } from '@/types/pharmacy';

interface InvoicePreviewProps {
    store: StoreBranding | null;
    customerName: string;
    tinNumber: string;
    invoiceNo: string;
    customerSNo: string;
    reference: string;
    sellerName: string;
    paymentMethod: string;
    cartItems: CartItem[];
    totalPrice: number;
    date: string;
}

const formatExpiry = (dateValue?: string | null): string => {
    if (!dateValue) return '';
    const match = String(dateValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1].slice(-2)}` : String(dateValue);
};

export function InvoicePreview({
    store,
    customerName,
    tinNumber,
    invoiceNo,
    customerSNo,
    reference,
    sellerName,
    paymentMethod,
    cartItems,
    totalPrice,
    date,
}: InvoicePreviewProps) {
    const storeName = store?.name ?? 'Pharmacy';

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
            date,
            items: cartItems.map((item) => ({
                name: item.medicineName,
                batchNumber: item.batchNumber,
                unit: item.unit,
                expiryDate: item.expiryDate,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
            totalPrice,
        });
    };

    return (
        /* Outer wrapper — relative so the download button can float top-right */
        <div
            className="relative mx-auto w-full max-w-2xl overflow-visible rounded-sm bg-white"
            style={{
                boxShadow:
                    '0 1px 1px rgba(0,0,0,.06), 0 2px 4px rgba(0,0,0,.06), 0 4px 8px rgba(0,0,0,.05), 0 1px 0 rgba(0,0,0,.12)',
                fontFamily: 'Arial, sans-serif',
            }}
        >
            {/* ── Download PDF button — floats above the top-right corner ── */}
            <div className="absolute -top-9 right-0">
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

            {/* Torn-edge stripe at top */}
            <div
                className="h-1.5 w-full rounded-t-sm"
                style={{
                    background: 'repeating-linear-gradient(90deg,#2563eb 0,#2563eb 18px,#fff 18px,#fff 22px)',
                    opacity: 0.7,
                }}
            />

            <div className="px-8 py-6">
                {/* ── HEADER ── */}
                <div className="flex items-start justify-between gap-4">
                    {/* Left: store name + invoice meta table */}
                    <div>
                        <div
                            className="text-2xl font-black uppercase text-gray-900"
                            style={{ letterSpacing: '-0.01em' }}
                        >
                            {storeName}
                        </div>

                        <table
                            className="mt-3 border-collapse text-xs"
                            style={{ border: '1px solid #111' }}
                        >
                            <tbody>
                                {[
                                    ['FS No', customerSNo || '—'],
                                    ['Reference', reference || '—'],
                                ].map(([label, value]) => (
                                    <tr key={label}>
                                        <td
                                            className="font-bold"
                                            style={{
                                                border: '1px solid #111',
                                                padding: '3px 8px',
                                                background: '#f8fafc',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {label}
                                        </td>
                                        <td
                                            style={{
                                                border: '1px solid #111',
                                                padding: '3px 10px',
                                                minWidth: 80,
                                            }}
                                        >
                                            {value}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Right: INVOICE title + contact */}
                    <div className="text-right">
                        <div
                            className="text-3xl font-black text-gray-900"
                            style={{ letterSpacing: '0.02em' }}
                        >
                            INVOICE
                        </div>
                        <div className="mt-1.5 space-y-0.5 text-xs text-gray-500">
                            <div className="font-semibold text-gray-700">{storeName}</div>
                            {store?.phone && <div>Tel: {store.phone}</div>}
                            {store?.address && <div>{store.address}</div>}
                        </div>
                    </div>
                </div>

                {/* ── CUSTOMER INFO ROW ── */}
                <div className="mt-4 grid grid-cols-3" style={{ border: '1px solid #111' }}>
                    {[
                        ['Customer Name', customerName || '—'],
                        ['TIN Number', tinNumber || '—'],
                        ['Payment Method', paymentMethod === 'cash' ? 'Cash' : 'Credit'],
                    ].map(([label, value], i) => (
                        <div
                            key={label}
                            style={{
                                borderRight: i < 2 ? '1px solid #111' : 'none',
                                padding: '6px 10px',
                            }}
                        >
                            <div
                                className="text-xs font-bold uppercase text-gray-500"
                                style={{ letterSpacing: '0.05em' }}
                            >
                                {label}
                            </div>
                            <div className="mt-0.5 text-sm text-gray-800">{value}</div>
                        </div>
                    ))}
                </div>

                {/* ── ITEMS TABLE ── */}
                <table
                    className="mt-3 w-full border-collapse text-xs"
                    style={{ border: '1px solid #111', tableLayout: 'fixed' }}
                >
                    <colgroup>
                        <col style={{ width: '5%' }} />
                        <col style={{ width: '33%' }} />
                        <col style={{ width: '14%' }} />
                        <col style={{ width: '8%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '7%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                        <tr style={{ background: '#f3f4f6' }}>
                            {['S.No', 'Description', 'Batch #', 'Unit', 'Exp.', 'Qty', 'Price', 'Total'].map(
                                (h, i) => (
                                    <th
                                        key={h}
                                        className="font-bold"
                                        style={{
                                            border: '1px solid #111',
                                            padding: '4px 5px',
                                            textAlign: i >= 5 ? 'right' : i === 3 || i === 4 ? 'center' : 'left',
                                        }}
                                    >
                                        {h}
                                    </th>
                                ),
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {cartItems.map((item, index) => (
                            <tr key={item.id}>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'center' }}>
                                    {index + 1}
                                </td>
                                <td
                                    style={{
                                        border: '1px solid #ccc',
                                        padding: '4px 5px',
                                        wordBreak: 'break-word',
                                        whiteSpace: 'normal',
                                    }}
                                >
                                    {item.medicineName}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px' }}>
                                    {item.batchNumber}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'center' }}>
                                    {item.unit?.toUpperCase() || '-'}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'center' }}>
                                    {formatExpiry(item.expiryDate)}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'right' }}>
                                    {item.quantity}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'right' }}>
                                    {item.unitPrice.toFixed(2)}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px 5px', textAlign: 'right' }}>
                                    {(item.quantity * item.unitPrice).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── TOTALS ── */}
                <div className="mt-3 border-t-2 border-gray-900 pt-2">
                    <div className="ml-auto w-56">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">total</span>
                            <span className="font-semibold text-gray-800">ETB {totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="mt-1 flex justify-between text-sm">
                            <span className="text-gray-500">Not Taxable</span>
                            <span className="font-semibold text-gray-800">ETB 0.00</span>
                        </div>
                        <div className="my-1.5 border-t border-gray-900" />
                        <div className="flex justify-between text-base font-black">
                            <span style={{ color: '#10B981' }}>GRAND TOTAL</span>
                            <span style={{ color: '#10B981' }}>ETB {totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="mt-0.5 border-b-4" style={{ borderColor: '#10B981' }} />
                    </div>
                </div>


                {/* ── SIGNATURE ROW ── */}
                <div className="mt-6 grid grid-cols-3 gap-6">
                    {['Prepared By', 'Received By', 'Approved By'].map((label) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                            <div className="h-10 w-full border-b border-gray-900" />
                            <span className="text-xs font-bold text-gray-700">{label}</span>
                        </div>
                    ))}
                </div>

                {/* ── LEGAL FOOTER ── */}
                <div className="mt-4 text-center text-[9px] font-black uppercase tracking-widest text-gray-400">
                    Invalid without fiscal or refund receipt attached
                </div>
            </div>

            {/* Torn-edge stripe at bottom */}
            <div
                className="h-1.5 w-full rounded-b-sm"
                style={{
                    background: 'repeating-linear-gradient(90deg,#2563eb 0,#2563eb 18px,#fff 18px,#fff 22px)',
                    opacity: 0.7,
                }}
            />
        </div>
    );
}
