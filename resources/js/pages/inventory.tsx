import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/pharmacy/app-shell';
import { SearchableSelect } from '@/components/pharmacy/searchable-select';
import type { SharedData } from '@/types';
import type { InventoryRow, Paginated } from '@/types/pharmacy';

interface InventoryProps extends SharedData {
    batches: Paginated<InventoryRow>;
    categories: { id: number; name: string }[];
    filters: { search: string; category: number | null };
}

export default function Inventory() {
    const { props } = usePage<InventoryProps>();
    const { batches, categories, filters } = props;

    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState<string>(filters.category ? String(filters.category) : 'all');

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            const params: Record<string, string> = {};
            if (search.trim()) params.search = search.trim();
            if (category !== 'all') params.category = category;

            router.get(route('inventory.index'), params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, category]);

    return (
        <AppShell>
            <Head title="Inventory" />

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Management</p>
                    <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-brand-text">Inventory</h1>
                </div>
                <Link
                    href={route('stock-entry')}
                    prefetch
                    cacheFor="1m"
                    className="vibrant-btn inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark/90"
                >
                    <Plus className="h-4 w-4" />
                    Add Stock
                </Link>
            </div>

            {/* Inventory table */}
            <div className="overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                <div className="flex flex-wrap items-center gap-3 border-b border-brand-muted bg-brand-background/60 px-4 py-3 dark:border-brand-muted/80 dark:bg-brand-dark/40">
                    <h2 className="text-sm font-black tracking-[0.2em] text-brand-text/80 uppercase">Stock List</h2>
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-muted/60 dark:divide-brand-muted/40">
                            {batches.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-brand-text/60">
                                        No inventory found. Add stock using the "Add Stock" button.
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
                                        prefetch
                                        cacheFor="30s"
                                        preserveScroll
                                        preserveState
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
        </AppShell>
    );
}
