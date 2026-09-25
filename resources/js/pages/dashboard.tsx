import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, BarChart3, Boxes, CircleDollarSign, PackageSearch, Pencil, RefreshCw, Search, Trash2, TrendingUp, X } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import { type RangeOption, RANGE_LABELS } from '@/components/pharmacy/analytics-panel';
import { AppShell } from '@/components/pharmacy/app-shell';
import { SearchableSelect } from '@/components/pharmacy/searchable-select';
import { Toast } from '@/components/pharmacy/toast';
import type { SharedData } from '@/types';
import type { InventoryRow, Paginated } from '@/types/pharmacy';

interface DashboardProps extends SharedData {
    batches: Paginated<InventoryRow>;
    categories: { id: number; name: string }[];
    filters: { search: string; category: number | null };
    kpis: {
        total_batches: number;
        total_medicines: number;
        low_stock: number;
        expired: number;
        inventory_value: number;
        expected_profit: number;
    };
    flash: { success?: string };
    /** Lightweight sales summary: range pills + overview cards + top sellers. */
    salesSummary: {
        range: RangeOption;
        overview: { totalRevenue: number; totalItemsSold: number; salesCount: number };
        topSelling: { medicineName: string; quantitySold: number; totalRevenue: number }[];
    };
}

export default function Dashboard() {
    const { props } = usePage<DashboardProps>();
    const { batches, categories, filters, kpis, auth, flash, salesSummary } = props;

    const isAdmin = auth.user?.role === 'admin';
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState<string>(filters.category ? String(filters.category) : 'all');
    const [toastMessage, setToastMessage] = useState('');
    const [editing, setEditing] = useState<InventoryRow | null>(null);

    useEffect(() => {
        if (flash.success) setToastMessage(flash.success);
    }, [flash.success]);

    /* Debounced server-side filtering via Inertia partial reloads.
       only: ['batches', 'filters', 'kpis'] intentionally excludes 'analytics'
       so the analytics section is not re-queried on every inventory search. */
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const params: Record<string, string> = {};
            if (search.trim()) params.search = search.trim();
            if (category !== 'all') params.category = category;

            router.get(route('dashboard'), params, {
                only: ['batches', 'filters', 'kpis'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, category]);

    const editForm = useForm({
        name: '',
        batch_number: '',
        expiry_date: '',
        quantity: 0,
        price: 0,
    });

    const openEdit = (row: InventoryRow) => {
        setEditing(row);
        editForm.setData({
            name: row.name,
            batch_number: row.batch_number,
            expiry_date: row.expiry_date,
            quantity: row.quantity,
            price: row.price,
        });
    };

    const submitEdit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!editing) return;
        editForm.put(route('batches.update', editing.id), {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        });
    };

    const deleteBatch = (row: InventoryRow) => {
        if (!confirm(`Delete batch ${row.batch_number} of ${row.name}? This cannot be undone.`)) return;
        router.delete(route('batches.destroy', row.id), { preserveScroll: true });
    };

    const kpiCards = [
        { label: 'Batches In Stock', value: kpis.total_batches, icon: Boxes, accent: 'text-brand-dark dark:text-brand-accent' },
        { label: 'Low Stock Medicines', value: kpis.low_stock, icon: AlertTriangle, accent: 'text-amber-400' },
        { label: 'Expired Batches', value: kpis.expired, icon: PackageSearch, accent: 'text-brand-danger' },
        {
            label: 'Inventory Value',
            value: `ETB ${kpis.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: CircleDollarSign,
            accent: 'text-brand-accent',
        },
        {
            label: 'Expected Profit',
            value: `ETB ${kpis.expected_profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: TrendingUp,
            accent: 'text-brand-dark dark:text-brand-accent',
        },
    ];

    /** Change range on the dashboard summary panel without reloading inventory. */
    const setRange = (value: RangeOption) => {
        router.get(route('dashboard'), { range: value }, {
            only: ['salesSummary'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AppShell
            pageSubtitle="Overview"
            pageTitle={`Welcome back, ${auth.user?.name}`}
        >
            <Head title="Dashboard" />

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}


            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                {kpiCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                        <card.icon className={`h-5 w-5 ${card.accent}`} />
                        <p className="mt-3 text-xl font-black text-brand-text tabular-nums">{card.value}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-text/70">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Sales Reports summary: range pills + overview cards + top sellers */}
            {salesSummary && (
                <div className="mt-6">
                    {/* Section header */}
                    <div className="mb-4">
                        <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Analytics</p>
                        <h2 className="mt-0.5 text-lg font-bold tracking-tight text-brand-text">Sales Reports</h2>
                    </div>

                    {/* Range pills */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {(Object.keys(RANGE_LABELS) as RangeOption[]).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setRange(option)}
                                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                                    salesSummary.range === option
                                        ? 'bg-brand-dark text-white shadow-sm dark:bg-brand-accent dark:text-brand-dark'
                                        : 'bg-white text-brand-text/80 hover:bg-brand-muted dark:border-brand-muted/80 dark:bg-brand-dark/60 dark:text-brand-text/80 dark:hover:bg-brand-dark'
                                }`}
                            >
                                {RANGE_LABELS[option]}
                            </button>
                        ))}
                    </div>

                    {/* Overview cards */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                            <BarChart3 className="h-5 w-5 text-brand-accent" />
                            <p className="mt-3 text-xl font-black text-brand-text tabular-nums">
                                ETB {salesSummary.overview.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-brand-text/70">Revenue · {RANGE_LABELS[salesSummary.range]}</p>
                        </div>
                        <div className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                            <BarChart3 className="h-5 w-5 text-brand-dark dark:text-brand-accent" />
                            <p className="mt-3 text-xl font-black text-brand-text tabular-nums">{salesSummary.overview.totalItemsSold.toLocaleString()}</p>
                            <p className="mt-1 text-xs font-semibold text-brand-text/70">Items Sold · {RANGE_LABELS[salesSummary.range]}</p>
                        </div>
                        <div className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                            <BarChart3 className="h-5 w-5 text-amber-400" />
                            <p className="mt-3 text-xl font-black text-brand-text tabular-nums">{salesSummary.overview.salesCount.toLocaleString()}</p>
                            <p className="mt-1 text-xs font-semibold text-brand-text/70">Invoices · {RANGE_LABELS[salesSummary.range]}</p>
                        </div>
                    </div>

                    {/* Top Selling Medicines */}
                    <div className="mt-5 rounded-xl border border-brand-muted bg-white p-5 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                        <h3 className="mb-3 text-sm font-black tracking-[0.2em] text-brand-text/80 uppercase">Top Selling Medicines</h3>
                        {salesSummary.topSelling.length === 0 ? (
                            <p className="text-sm text-brand-text/60">No sales recorded in this range.</p>
                        ) : (
                            <div className="space-y-2">
                                {salesSummary.topSelling.map((item, index) => {
                                    const max = salesSummary.topSelling[0]?.quantitySold || 1;
                                    return (
                                        <div key={item.medicineName} className="flex items-center gap-3">
                                            <span className="w-5 text-xs font-black text-brand-text/50">#{index + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-3">
                                                    <p className="truncate text-sm font-semibold text-brand-text">{item.medicineName}</p>
                                                    <p className="shrink-0 text-xs font-bold text-brand-text/70">
                                                        {item.quantitySold} sold · ETB {item.totalRevenue.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-brand-background dark:bg-brand-background/60">
                                                    <div
                                                        className="h-full rounded-full bg-brand-primary"
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
                </div>
            )}

            {/* Inventory table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                <div className="flex flex-wrap items-center gap-3 border-b border-brand-muted bg-brand-background/60 px-4 py-3 dark:border-brand-muted/80 dark:bg-brand-dark/40">
                    <h2 className="text-sm font-black tracking-[0.2em] text-brand-text/80 uppercase">Inventory</h2>
                    <div className="relative ml-auto w-full min-w-0 sm:w-56">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-brand-text/60" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or batch…"
                            className="w-full rounded-lg border border-brand-muted bg-white py-2 pr-3 pl-9 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-dark/90 dark:text-brand-text"
                        />
                    </div>
                    <SearchableSelect
                        className="w-full min-w-0 sm:w-64"
                        value={category}
                        onChange={setCategory}
                        placeholder="Search categories…"
                        pinValues={['all']}
                        options={[
                            { value: 'all', label: 'All categories' },
                            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-brand-muted bg-brand-background/40 text-xs font-black tracking-wider text-brand-text/70 uppercase dark:border-brand-muted/80 dark:bg-brand-dark/50">
                                <th className="px-4 py-3">Medicine</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3">Batch #</th>
                                <th className="px-4 py-3 text-right">Qty</th>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3 text-right">Price (ETB)</th>
                                <th className="px-4 py-3">Expiry</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-muted/60 dark:divide-brand-muted/40">
                            {batches.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-brand-text/60">
                                        No inventory found. Add stock from the Stock Entry page.
                                    </td>
                                </tr>
                            ) : (
                                batches.data.map((row) => (
                                    <tr key={row.id} className={row.quantity <= 20 ? 'bg-amber-50/50 dark:bg-amber-900/20' : undefined}>
                                        <td className="px-4 py-3 font-semibold text-brand-text">{row.name}</td>
                                        <td className="px-4 py-3 text-brand-text/80">{row.category ?? 'Uncategorized'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-brand-text/80">{row.batch_number}</td>
                                        <td className="px-4 py-3 text-right font-bold text-brand-text tabular-nums">
                                            {row.quantity === 0 ? (
                                                <span className="badge-danger">Out</span>
                                            ) : row.quantity <= 10 ? (
                                                <span className="badge-warning">{row.quantity}</span>
                                            ) : (
                                                row.quantity
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-brand-text/80 uppercase">{row.unit}</td>
                                        <td className="px-4 py-3 text-right text-brand-text tabular-nums">{row.price.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            {row.is_expired ? (
                                                <span className="badge-danger">{row.expiry_date}</span>
                                            ) : (
                                                <span className="text-brand-text/80">{row.expiry_date}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    aria-label={`Edit ${row.name}`}
                                                    className="rounded-lg p-1.5 text-brand-text/60 transition hover:bg-brand-dark/10 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteBatch(row)}
                                                        aria-label={`Delete ${row.name}`}
                                                        className="rounded-lg p-1.5 text-brand-text/60 transition hover:bg-red-50 hover:text-brand-danger dark:hover:bg-red-900/30 dark:hover:text-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {batches.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-brand-muted bg-brand-background/40 px-4 py-3 text-sm dark:border-brand-muted/80 dark:bg-brand-dark/40">
                        <span className="text-brand-text/70">
                            Page {batches.current_page} of {batches.last_page} · {batches.total} records
                        </span>
                        <div className="flex gap-1">
                            {batches.links.map((link, i) =>
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        only={['batches']}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                            link.active
                                                ? 'bg-brand-dark text-white shadow-sm dark:bg-brand-accent dark:text-brand-dark'
                                                : 'bg-white text-brand-text/80 hover:bg-brand-muted dark:bg-brand-dark/60 dark:text-brand-text/80 dark:hover:bg-brand-dark'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="rounded-lg px-3 py-1.5 text-xs font-bold text-brand-text/40"
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ),
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 dark:bg-black/70" onClick={() => setEditing(null)}>
                    <div
                        className="w-full max-w-md rounded-xl border border-brand-muted bg-white p-6 shadow-2xl dark:border-brand-muted/80 dark:bg-brand-dark dark:shadow-slate-950/80"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-brand-text">Edit Inventory Item</h3>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                aria-label="Close"
                                className="rounded p-1 text-brand-text/60 hover:bg-brand-background dark:hover:bg-brand-background/60"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitEdit} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-brand-text/70">Medicine Name</label>
                                <input
                                    type="text"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-background/70 dark:text-brand-text"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-brand-text/70">Batch Number</label>
                                    <input
                                        type="text"
                                        value={editForm.data.batch_number}
                                        onChange={(e) => editForm.setData('batch_number', e.target.value)}
                                        className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-background/70 dark:text-brand-text"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-brand-text/70">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={editForm.data.expiry_date}
                                        onChange={(e) => editForm.setData('expiry_date', e.target.value)}
                                        className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-background/70 dark:text-brand-text"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-brand-text/70">Quantity</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={editForm.data.quantity}
                                        onChange={(e) => editForm.setData('quantity', Number(e.target.value))}
                                        className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-background/70 dark:text-brand-text"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-brand-text/70">Price (ETB)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={editForm.data.price}
                                        onChange={(e) => editForm.setData('price', Number(e.target.value))}
                                        className="w-full rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm text-brand-text outline-none focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-background/70 dark:text-brand-text"
                                    />
                                </div>
                            </div>
                            {Object.values(editForm.errors).length > 0 && (
                                <p className="text-sm font-medium text-brand-danger">{Object.values(editForm.errors)[0]}</p>
                            )}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="flex-1 rounded-lg border border-brand-muted bg-brand-background px-4 py-2.5 text-sm font-semibold text-brand-text hover:bg-brand-muted dark:border-brand-muted dark:bg-brand-background/50 dark:hover:bg-brand-muted/40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="flex-[2] rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 dark:bg-brand-accent dark:text-brand-dark dark:hover:opacity-95"
                                >
                                    {editForm.processing ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
