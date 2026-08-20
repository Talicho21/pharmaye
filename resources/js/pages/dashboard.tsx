import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, Boxes, CircleDollarSign, PackageSearch, Pencil, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

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
    };
    flash: { success?: string };
}

export default function Dashboard() {
    const { props } = usePage<DashboardProps>();
    const { batches, categories, filters, kpis, auth, flash } = props;

    const isAdmin = auth.user?.role === 'admin';
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState<string>(filters.category ? String(filters.category) : 'all');
    const [toastMessage, setToastMessage] = useState('');
    const [editing, setEditing] = useState<InventoryRow | null>(null);

    useEffect(() => {
        if (flash.success) setToastMessage(flash.success);
    }, [flash.success]);

    /* Debounced server-side filtering via Inertia partial reloads. */
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
        { label: 'Batches In Stock', value: kpis.total_batches, icon: Boxes, accent: 'text-primary-blue' },
        { label: 'Low Stock Medicines', value: kpis.low_stock, icon: AlertTriangle, accent: 'text-accent-gold' },
        { label: 'Expired Batches', value: kpis.expired, icon: PackageSearch, accent: 'text-accent-red' },
        {
            label: 'Inventory Value',
            value: `ETB ${kpis.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: CircleDollarSign,
            accent: 'text-grass-green',
        },
    ];

    return (
        <AppShell>
            <Head title="Dashboard" />

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Overview</p>
                    <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-dark-charcoal">Welcome back, {auth.user?.name}</h1>
                </div>
                <button
                    type="button"
                    onClick={() => router.reload()}
                    className="vibrant-btn inline-flex items-center gap-2 rounded-lg border border-border-gray bg-pure-white px-4 py-2 text-sm font-semibold text-dark-charcoal"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {kpiCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-border-gray bg-pure-white p-4 shadow-sm">
                        <card.icon className={`h-5 w-5 ${card.accent}`} />
                        <p className="mt-3 text-xl font-black text-dark-charcoal tabular-nums">{card.value}</p>
                        <p className="mt-1 text-xs font-semibold text-dark-charcoal/70">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick links */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link
                    href={route('sell-out')}
                    className="vibrant-btn rounded-xl border border-grass-green/30 bg-grass-green/10 p-4 text-sm font-bold text-dark-charcoal"
                >
                    Process Sale →
                </Link>
                <Link
                    href={route('stock-entry')}
                    className="vibrant-btn rounded-xl border border-primary-blue/30 bg-primary-blue/10 p-4 text-sm font-bold text-dark-charcoal"
                >
                    Restock Inventory →
                </Link>
                {isAdmin && (
                    <Link
                        href={route('reports')}
                        className="vibrant-btn rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4 text-sm font-bold text-dark-charcoal"
                    >
                        Sales Reports →
                    </Link>
                )}
            </div>

            {/* Inventory table */}
            <div className="mt-6 overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-border-gray bg-off-white/60 px-4 py-3">
                    <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Inventory</h2>
                    <div className="relative ml-auto">
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-dark-charcoal/60" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name or batch…"
                            className="w-56 rounded-lg border border-border-gray bg-pure-white py-2 pr-3 pl-9 text-sm text-dark-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                        />
                    </div>
                    <SearchableSelect
                        className="w-64"
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
                            <tr className="border-b border-border-gray bg-off-white/40 text-xs font-black tracking-wider text-dark-charcoal/70 uppercase">
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
                        <tbody className="divide-y divide-border-gray/60">
                            {batches.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-dark-charcoal/60">
                                        No inventory found. Add stock from the Stock Entry page.
                                    </td>
                                </tr>
                            ) : (
                                batches.data.map((row) => (
                                    <tr key={row.id} className={row.quantity <= 20 ? 'bg-amber-50/50' : undefined}>
                                        <td className="px-4 py-3 font-semibold text-dark-charcoal">{row.name}</td>
                                        <td className="px-4 py-3 text-dark-charcoal/80">{row.category ?? 'Uncategorized'}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-dark-charcoal/80">{row.batch_number}</td>
                                        <td className="px-4 py-3 text-right font-bold text-dark-charcoal tabular-nums">
                                            {row.quantity === 0 ? (
                                                <span className="badge-danger">Out</span>
                                            ) : row.quantity <= 10 ? (
                                                <span className="badge-warning">{row.quantity}</span>
                                            ) : (
                                                row.quantity
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-dark-charcoal/80 uppercase">{row.unit}</td>
                                        <td className="px-4 py-3 text-right text-dark-charcoal tabular-nums">{row.price.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            {row.is_expired ? (
                                                <span className="badge-danger">{row.expiry_date}</span>
                                            ) : (
                                                <span className="text-dark-charcoal/80">{row.expiry_date}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(row)}
                                                    aria-label={`Edit ${row.name}`}
                                                    className="rounded-lg p-1.5 text-dark-charcoal/60 transition hover:bg-primary-blue/10 hover:text-primary-blue"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {isAdmin && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteBatch(row)}
                                                        aria-label={`Delete ${row.name}`}
                                                        className="rounded-lg p-1.5 text-dark-charcoal/60 transition hover:bg-red-50 hover:text-accent-red"
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
                    <div className="flex items-center justify-between border-t border-border-gray bg-off-white/40 px-4 py-3 text-sm">
                        <span className="text-dark-charcoal/70">
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

            {/* Edit modal */}
            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
                    <div
                        className="w-full max-w-md rounded-xl border border-border-gray bg-pure-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-dark-charcoal">Edit Inventory Item</h3>
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                aria-label="Close"
                                className="rounded p-1 text-dark-charcoal/60 hover:bg-off-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={submitEdit} className="space-y-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Medicine Name</label>
                                <input
                                    type="text"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Batch Number</label>
                                    <input
                                        type="text"
                                        value={editForm.data.batch_number}
                                        onChange={(e) => editForm.setData('batch_number', e.target.value)}
                                        className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={editForm.data.expiry_date}
                                        onChange={(e) => editForm.setData('expiry_date', e.target.value)}
                                        className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Quantity</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={editForm.data.quantity}
                                        onChange={(e) => editForm.setData('quantity', Number(e.target.value))}
                                        className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-dark-charcoal/70">Price (ETB)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={editForm.data.price}
                                        onChange={(e) => editForm.setData('price', Number(e.target.value))}
                                        className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                                    />
                                </div>
                            </div>
                            {Object.values(editForm.errors).length > 0 && (
                                <p className="text-sm font-medium text-accent-red">{Object.values(editForm.errors)[0]}</p>
                            )}
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditing(null)}
                                    className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-semibold text-dark-charcoal hover:bg-border-gray"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="flex-[2] rounded-lg bg-primary-blue px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
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
