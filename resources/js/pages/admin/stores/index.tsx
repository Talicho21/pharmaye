import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Toast } from '@/components/pharmacy/toast';
import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';

type StoreRow = {
    id: number;
    name: string;
    slug: string;
    plan: string;
    subscription_status: string;
    monthly_fee: number;
    this_month_revenue: number;
};

interface StoresIndexProps extends SharedData {
    stores: Paginated<StoreRow>;
    filters: { search: string; status: string | null };
    flash: { success?: string };
}

export default function StoresIndex() {
    const { stores, filters, flash } = usePage<StoresIndexProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (flash.success) setToast(flash.success);
    }, [flash.success]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            router.get(
                route('admin.stores.index'),
                { search: search.trim() || undefined, status: status || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, status]);

    return (
        <AdminLayout title="Stores">
            <Head title="Stores" />
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or slug"
                        className="rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                    />
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm"
                    >
                        <option value="">All statuses</option>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="overdue">Overdue</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
                <Link
                    href={route('admin.stores.create')}
                    className="rounded-lg bg-primary-blue px-4 py-2 text-sm font-bold text-white shadow-sm"
                >
                    New store
                </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-off-white text-xs font-bold text-dark-charcoal/70 uppercase">
                        <tr>
                            <th className="px-4 py-3">Store</th>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">This month</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-gray">
                        {stores.data.map((store) => (
                            <tr key={store.id}>
                                <td className="px-4 py-3">
                                    <Link href={route('admin.stores.show', store.id)} className="font-semibold text-primary-blue hover:underline">
                                        {store.name}
                                    </Link>
                                    <p className="text-xs text-dark-charcoal/60">{store.slug}</p>
                                </td>
                                <td className="px-4 py-3 capitalize">{store.plan}</td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={store.subscription_status} />
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    ETB {store.this_month_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
