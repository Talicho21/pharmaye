import { Head, Link, router, usePage } from '@inertiajs/react';
import { BarChart3, Download, Printer, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/pharmacy/app-shell';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';

type RangeOption = '24h' | 'monthly' | '6months' | 'yearly';

interface SaleRow {
    id: string;
    invoice_no: string;
    created_at: string;
    customer_name: string | null;
    receiver_name: string | null;
    seller_name: string | null;
    payment_method: string;
    total_amount: number;
    items: {
        medicine_name: string;
        batch_number: string;
        quantity: number;
        unit_price: number;
        total_price: number;
    }[];
}

interface ReportsProps extends SharedData {
    range: RangeOption;
    overview: { totalRevenue: number; totalItemsSold: number; salesCount: number };
    topSelling: { medicineName: string; quantitySold: number; totalRevenue: number }[];
    salesLog: Paginated<SaleRow>;
    inactive: {
        medicineId: number;
        medicineName: string;
        categoryName: string;
        lastSaleDate: string | null;
        daysSinceLastSale: number | null;
        totalSales: number;
        totalQuantitySold: number;
    }[];
    filters: { startDate: string; endDate: string; search: string; thresholdMonths: number };
}

const RANGE_LABELS: Record<RangeOption, string> = {
    '24h': 'Last 24 hours',
    monthly: 'Last 30 days',
    '6months': 'Last 6 months',
    yearly: 'Last year',
};

export default function Reports() {
    const { props } = usePage<ReportsProps>();
    const { range, overview, topSelling, salesLog, inactive, filters } = props;

    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [search, setSearch] = useState(filters.search);

    const applyFilters = (extra: Record<string, string> = {}) => {
        router.get(
            route('reports'),
            {
                range,
                startDate,
                endDate,
                search: search.trim() || undefined,
                ...extra,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    /* Debounce ledger search */
    useEffect(() => {
        if (search === filters.search) return;
        const timeoutId = window.setTimeout(() => applyFilters(), 400);
        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const setRange = (value: RangeOption) => applyFilters({ range: value });

    const exportCsv = () => {
        const header = ['Invoice', 'Date', 'Customer', 'Seller', 'Payment', 'Medicine', 'Batch', 'Qty', 'Unit Price', 'Line Total'];
        const rows = salesLog.data.flatMap((sale) =>
            sale.items.map((item) => [
                sale.invoice_no,
                new Date(sale.created_at).toLocaleString(),
                sale.customer_name ?? '',
                sale.seller_name ?? '',
                sale.payment_method,
                item.medicine_name,
                item.batch_number,
                String(item.quantity),
                item.unit_price.toFixed(2),
                item.total_price.toFixed(2),
            ]),
        );
        const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sales-log-${startDate}-to-${endDate}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <AppShell>
            <Head title="Reports" />

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Analytics & Audit</p>
                    <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-dark-charcoal">Sales Reports</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => router.reload()}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm font-semibold text-dark-charcoal"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={exportCsv}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm font-semibold text-dark-charcoal"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg bg-primary-blue px-3 py-2 text-sm font-bold text-white"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* Range pills */}
            <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(RANGE_LABELS) as RangeOption[]).map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => setRange(option)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                            range === option ? 'bg-primary-blue text-white' : 'bg-pure-white text-dark-charcoal/80 hover:bg-border-gray'
                        }`}
                    >
                        {RANGE_LABELS[option]}
                    </button>
                ))}
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border-gray bg-pure-white p-4 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-grass-green" />
                    <p className="mt-3 text-xl font-black text-dark-charcoal tabular-nums">
                        ETB {overview.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-dark-charcoal/70">Revenue · {RANGE_LABELS[range]}</p>
                </div>
                <div className="rounded-xl border border-border-gray bg-pure-white p-4 shadow-sm">
                    <BarChart3 className="h-5 w-5 text-primary-blue" />
                    <p className="mt-3 text-xl font-black text-dark-charcoal tabular-nums">{overview.totalItemsSold.toLocaleString()}</p>
                    <p className="mt-1 text-xs font-semibold text-dark-charcoal/70">Items Sold · {RANGE_LABELS[range]}</p>
                </div>
                <div className="rounded-xl border border-border-gray bg-pure-white p-4 shadow-sm">
                    <BarChart3 className="h-5 w-5 text-accent-gold" />
                    <p className="mt-3 text-xl font-black text-dark-charcoal tabular-nums">{overview.salesCount.toLocaleString()}</p>
                    <p className="mt-1 text-xs font-semibold text-dark-charcoal/70">Invoices · {RANGE_LABELS[range]}</p>
                </div>
            </div>

            {/* Top sellers */}
            <div className="mt-5 rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Top Selling Medicines</h2>
                {topSelling.length === 0 ? (
                    <p className="text-sm text-dark-charcoal/60">No sales recorded in this range.</p>
                ) : (
                    <div className="space-y-2">
                        {topSelling.map((item, index) => {
                            const max = topSelling[0]?.quantitySold || 1;
                            return (
                                <div key={item.medicineName} className="flex items-center gap-3">
                                    <span className="w-5 text-xs font-black text-dark-charcoal/50">#{index + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-dark-charcoal">{item.medicineName}</p>
                                            <p className="shrink-0 text-xs font-bold text-dark-charcoal/70">
                                                {item.quantitySold} sold · ETB {item.totalRevenue.toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-off-white">
                                            <div
                                                className="h-full rounded-full bg-grass-green"
                                                style={{ width: `${Math.max(6, (item.quantitySold / max) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sales ledger */}
            <div className="mt-5 overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-border-gray bg-off-white/60 px-4 py-3">
                    <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Sales Ledger</h2>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onBlur={() => applyFilters()}
                            className="rounded-lg border border-border-gray bg-pure-white px-2 py-1.5 text-xs text-dark-charcoal outline-none"
                        />
                        <span className="text-xs text-dark-charcoal/60">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            onBlur={() => applyFilters()}
                            className="rounded-lg border border-border-gray bg-pure-white px-2 py-1.5 text-xs text-dark-charcoal outline-none"
                        />
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-dark-charcoal/60" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search invoice, medicine, customer…"
                                className="w-56 rounded-lg border border-border-gray bg-pure-white py-1.5 pr-2 pl-8 text-xs text-dark-charcoal outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-border-gray bg-off-white/40 text-xs font-black tracking-wider text-dark-charcoal/70 uppercase">
                                <th className="px-4 py-3">Invoice</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Customer</th>
                                <th className="px-4 py-3">Seller</th>
                                <th className="px-4 py-3">Items</th>
                                <th className="px-4 py-3">Payment</th>
                                <th className="px-4 py-3 text-right">Total (ETB)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-gray/60">
                            {salesLog.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-dark-charcoal/60">
                                        No sales found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                salesLog.data.map((sale) => (
                                    <tr key={sale.id}>
                                        <td className="px-4 py-3 font-mono text-xs font-bold text-primary-blue">{sale.invoice_no}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">{new Date(sale.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">{sale.customer_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">{sale.seller_name ?? '—'}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">
                                            {sale.items.map((item) => (
                                                <div key={`${sale.id}-${item.batch_number}-${item.medicine_name}`} className="text-xs">
                                                    {item.medicine_name} × {item.quantity}
                                                </div>
                                            ))}
                                        </td>
                                        <td className="px-4 py-3 text-dark-charcoal/80 capitalize">{sale.payment_method}</td>
                                        <td className="px-4 py-3 text-right font-bold text-dark-charcoal tabular-nums">
                                            {sale.total_amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {salesLog.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-border-gray bg-off-white/40 px-4 py-3 text-sm">
                        <span className="text-dark-charcoal/70">
                            Page {salesLog.current_page} of {salesLog.last_page} · {salesLog.total} invoices
                        </span>
                        <div className="flex gap-1">
                            {salesLog.links.map((link, i) =>
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                                            link.active
                                                ? 'bg-primary-blue text-white'
                                                : 'bg-pure-white text-dark-charcoal/80 hover:bg-border-gray'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-dark-charcoal/40"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Inactive stock */}
            <div className="mt-5 overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <div className="border-b border-border-gray bg-off-white/60 px-4 py-3">
                    <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">
                        Inactive Stock (no sale in {filters.thresholdMonths}+ months)
                    </h2>
                </div>
                {inactive.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-dark-charcoal/60">Every medicine has sold recently. Nothing stale.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border-gray bg-off-white/40 text-xs font-black tracking-wider text-dark-charcoal/70 uppercase">
                                    <th className="px-4 py-3">Medicine</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Last Sale</th>
                                    <th className="px-4 py-3 text-right">Days Idle</th>
                                    <th className="px-4 py-3 text-right">Lifetime Sold</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-gray/60">
                                {inactive.map((row) => (
                                    <tr key={row.medicineId}>
                                        <td className="px-4 py-3 font-semibold text-dark-charcoal">{row.medicineName}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">{row.categoryName}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">
                                            {row.lastSaleDate ? new Date(row.lastSaleDate).toLocaleDateString() : 'Never sold'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {row.daysSinceLastSale !== null ? Math.round(row.daysSinceLastSale) : '∞'}
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums">{row.totalQuantitySold}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppShell>
    );
}
