/**
 * AnalyticsPanel — shared analytics UI component.
 *
 * Used on both the dedicated Reports page (resources/js/pages/reports.tsx)
 * and embedded on the Dashboard (resources/js/pages/dashboard.tsx).
 *
 * All data is received as explicit props — this component never calls
 * usePage() itself, so it works on any Inertia page whose controller
 * supplies the analytics props.
 *
 * All filter interactions (range pills, date filter, ledger search,
 * expiry donut, pagination) call `props.applyFilters(params)`. The
 * parent decides where to navigate:
 *   - Reports page: in-page Inertia reload (preserveState + replace)
 *   - Dashboard:    full navigation to the Reports page
 */

import { BarChart3, Search, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Paginated } from '@/types/pharmacy';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RangeOption = '24h' | 'monthly' | '6months' | 'yearly';
export type ExpiryStatus = 'healthy' | 'expiring_soon' | 'expired';

export interface SaleRow {
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

export interface ExpiryBatchRow {
    id: number;
    medicine_name: string;
    category: string;
    batch_number: string;
    quantity: number;
    unit: string;
    price: number;
    expiry_date: string;
}

export interface AnalyticsData {
    range: RangeOption;
    overview: { totalRevenue: number; totalItemsSold: number; salesCount: number };
    topSelling: { medicineName: string; quantitySold: number; totalRevenue: number }[];
    salesLog: Paginated<SaleRow>;
    expiryHealth: {
        counts: { healthy: number; expiring_soon: number; expired: number };
        status: ExpiryStatus;
        items: Paginated<ExpiryBatchRow>;
    };
    filters: { startDate: string; endDate: string; search: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPIRY_SEGMENTS: { key: ExpiryStatus; label: string; color: string }[] = [
    { key: 'healthy', label: 'Healthy', color: '#4E9F3D' },
    { key: 'expiring_soon', label: 'Expiring Soon', color: '#f97316' },
    { key: 'expired', label: 'Expired', color: '#ef4444' },
];

const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
    healthy: 'Healthy',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
};

export const RANGE_LABELS: Record<RangeOption, string> = {
    '24h': 'Last 24 hours',
    monthly: 'Last 30 days',
    '6months': 'Last 6 months',
    yearly: 'Last year',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract only the pagination key(s) from a paginator link URL.
 * We deliberately ignore other query params from the URL to avoid stale
 * values overriding the current filter state managed by this component.
 */
function extractPageParam(url: string, pageKey: string): Record<string, string> {
    try {
        const parsed = new URL(url);
        const value = parsed.searchParams.get(pageKey);
        return value ? { [pageKey]: value } : {};
    } catch {
        return {};
    }
}

// ─── Sub-component: ExpiryDonut ───────────────────────────────────────────────

function ExpiryDonut({
    counts,
    selected,
    onSelect,
}: {
    counts: { healthy: number; expiring_soon: number; expired: number };
    selected: ExpiryStatus;
    onSelect: (status: ExpiryStatus) => void;
}) {
    const total = EXPIRY_SEGMENTS.reduce((sum, segment) => sum + counts[segment.key], 0);
    const cx = 100;
    const cy = 100;
    const radius = 72;
    const circumference = 2 * Math.PI * radius;
    const gap = total > 0 ? (4 / 360) * circumference : 0;
    const selectedCount = counts[selected];
    const selectedPercent = total > 0 ? Math.round((selectedCount / total) * 100) : 0;

    let offset = 0;
    const arcs = EXPIRY_SEGMENTS.map((segment) => {
        const value = counts[segment.key];
        const raw = total > 0 ? (value / total) * circumference : 0;
        const arc = { ...segment, value, length: Math.max(0, raw - gap), offset };
        offset += raw;
        return arc;
    });

    return (
        <svg viewBox="0 0 200 200" className="mx-auto h-56 w-full max-w-[16rem]" role="img" aria-label="Inventory health breakdown">
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#E8EBF2" strokeWidth="30" />
            <g transform={`rotate(-90 ${cx} ${cy})`}>
                {arcs.map((arc) =>
                    arc.value === 0 ? null : (
                        <circle
                            key={arc.key}
                            cx={cx}
                            cy={cy}
                            r={radius}
                            fill="none"
                            stroke={arc.color}
                            strokeWidth={selected === arc.key ? 34 : 30}
                            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
                            strokeDashoffset={-arc.offset - gap / 2}
                            className="cursor-pointer transition-[stroke-width]"
                            onClick={() => onSelect(arc.key)}
                        />
                    ),
                )}
            </g>
            <text x={cx} y={cy - 6} textAnchor="middle" fill="#2E2E38" fontSize="26" fontWeight="800">
                {total === 0 ? '—' : `${selectedPercent}%`}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" fill="#6B7280" fontSize="10" fontWeight="700">
                {EXPIRY_LABELS[selected].toUpperCase()}
            </text>
        </svg>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AnalyticsPanelProps {
    data: AnalyticsData;
    /**
     * Called whenever any filter or pagination changes.
     * Receives a flat params object — the same shape as the Reports page
     * query string (range, startDate, endDate, search, expiryStatus, page,
     * healthPage).
     *
     * Reports page: passes directly to router.get(route('reports'), params, ...)
     * Dashboard:    passes to router.get(route('reports'), params) — i.e. navigates
     *               to the Reports page with the selected filter pre-applied.
     */
    applyFilters: (params: Record<string, string>) => void;
}

export function AnalyticsPanel({ data, applyFilters }: AnalyticsPanelProps) {
    const { range, overview, topSelling, salesLog, expiryHealth, filters } = data;

    // Local state for inputs that haven't been submitted yet.
    // Synced back from server props on each full page render.
    const [startDate, setStartDate] = useState(filters.startDate);
    const [endDate, setEndDate] = useState(filters.endDate);
    const [search, setSearch] = useState(filters.search);

    // Re-sync when server props change (e.g. after navigation or partial reload).
    useEffect(() => { setStartDate(filters.startDate); }, [filters.startDate]);
    useEffect(() => { setEndDate(filters.endDate); }, [filters.endDate]);
    useEffect(() => { setSearch(filters.search); }, [filters.search]);

    /** Build the full params object from current state, then call the parent handler. */
    const handleApply = (extra: Record<string, string> = {}) => {
        const params: Record<string, string> = {
            range,
            startDate,
            endDate,
            expiryStatus: expiryHealth.status,
            ...extra,
        };
        if (search.trim()) params.search = search.trim();
        applyFilters(params);
    };

    /* Debounced ledger search */
    useEffect(() => {
        if (search === filters.search) return;
        const id = window.setTimeout(() => handleApply(), 400);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <>
            {/* ── Range pills ────────────────────────────────────────── */}
            <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(RANGE_LABELS) as RangeOption[]).map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => handleApply({ range: option })}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                            range === option
                                ? 'bg-primary-blue text-white'
                                : 'bg-pure-white text-dark-charcoal/80 hover:bg-border-gray'
                        }`}
                    >
                        {RANGE_LABELS[option]}
                    </button>
                ))}
            </div>

            {/* ── Overview cards ─────────────────────────────────────── */}
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

            {/* ── Top selling medicines ──────────────────────────────── */}
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

            {/* ── Sales ledger ───────────────────────────────────────── */}
            <div className="mt-5 overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-border-gray bg-off-white/60 px-4 py-3">
                    <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Sales Ledger</h2>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            onBlur={() => handleApply()}
                            className="rounded-lg border border-border-gray bg-pure-white px-2 py-1.5 text-xs text-dark-charcoal outline-none"
                        />
                        <span className="text-xs text-dark-charcoal/60">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            onBlur={() => handleApply()}
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
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleApply(extractPageParam(link.url!, 'page'))}
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

            {/* ── Inventory health: donut + expiry batch table ────────── */}
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
                {/* Left: donut + segment buttons */}
                <div className="rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm lg:col-span-1">
                    <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Expiry Status</p>
                    <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">Inventory Health Breakdown</h2>

                    <div className="mt-4 rounded-lg bg-off-white/40 p-2">
                        <ExpiryDonut
                            counts={expiryHealth.counts}
                            selected={expiryHealth.status}
                            onSelect={(status) => handleApply({ expiryStatus: status })}
                        />
                    </div>

                    <div className="mt-4 space-y-2">
                        {EXPIRY_SEGMENTS.map((segment) => {
                            const isActive = expiryHealth.status === segment.key;
                            return (
                                <button
                                    key={segment.key}
                                    type="button"
                                    onClick={() => handleApply({ expiryStatus: segment.key })}
                                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left transition ${
                                        isActive
                                            ? 'border-primary-blue/40 bg-off-white ring-2 ring-primary-blue/25'
                                            : 'border-border-gray bg-off-white hover:border-dark-charcoal/20'
                                    }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                                        <span className="text-sm font-semibold text-dark-charcoal">{segment.label}</span>
                                    </span>
                                    <span className="text-sm font-black text-dark-charcoal tabular-nums">
                                        {expiryHealth.counts[segment.key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right: expiry batch table */}
                <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm lg:col-span-2">
                    <div className="border-b border-border-gray bg-off-white/60 px-4 py-3">
                        <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">
                            {EXPIRY_LABELS[expiryHealth.status]} batches
                        </h2>
                        <p className="mt-0.5 text-xs text-dark-charcoal/60">
                            In-stock lots · {expiryHealth.items.total}{' '}
                            {expiryHealth.items.total === 1 ? 'batch' : 'batches'}
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border-gray bg-off-white/40 text-xs font-black tracking-wider text-dark-charcoal/70 uppercase">
                                    <th className="px-4 py-3">Medicine</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Batch</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3">Expiry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-gray/60">
                                {expiryHealth.items.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm font-semibold text-dark-charcoal/60">
                                            No in-stock batches in this category.
                                        </td>
                                    </tr>
                                ) : (
                                    expiryHealth.items.data.map((row) => (
                                        <tr key={row.id}>
                                            <td className="px-4 py-3 font-semibold text-dark-charcoal">{row.medicine_name}</td>
                                            <td className="px-4 py-3 text-dark-charcoal/80">{row.category}</td>
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-primary-blue">{row.batch_number}</td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {row.quantity} {row.unit}
                                            </td>
                                            <td className="px-4 py-3 text-dark-charcoal/80">{row.expiry_date}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {expiryHealth.items.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-border-gray bg-off-white/40 px-4 py-3 text-sm">
                            <span className="text-dark-charcoal/70">
                                Page {expiryHealth.items.current_page} of {expiryHealth.items.last_page}
                            </span>
                            <div className="flex gap-1">
                                {expiryHealth.items.links.map((link, i) =>
                                    link.url ? (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleApply(extractPageParam(link.url!, 'healthPage'))}
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
            </div>
        </>
    );
}
