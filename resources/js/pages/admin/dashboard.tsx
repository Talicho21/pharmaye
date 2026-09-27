import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, Building2, CircleDollarSign, Clock, ShieldAlert } from 'lucide-react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Toast } from '@/components/pharmacy/toast';
import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';
import { useEffect, useState } from 'react';

type StoreRow = {
    id: number;
    name: string;
    slug: string;
    plan: string;
    subscription_status: string;
    monthly_fee: number;
    this_month_revenue: number;
};

interface AdminDashboardProps extends SharedData {
    kpis: {
        total_stores: number;
        active: number;
        trial: number;
        overdue: number;
        suspended: number;
        mrr: number;
    };
    attention: {
        overdue: { id: number; name: string; slug: string }[];
        trials_ending: { id: number; name: string; slug: string; trial_ends_at: string | null }[];
    };
    stores: Paginated<StoreRow>;
    flash: { success?: string };
}

export default function AdminDashboard() {
    const { kpis, attention, stores, flash } = usePage<AdminDashboardProps>().props;
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (flash.success) setToast(flash.success);
    }, [flash.success]);

    const cards = [
        { label: 'Total stores', value: kpis.total_stores, icon: Building2, accent: 'text-brand-dark' },
        { label: 'Active subscriptions', value: kpis.active, icon: ShieldAlert, accent: 'text-brand-accent' },
        {
            label: 'MRR',
            value: `ETB ${kpis.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: CircleDollarSign,
            accent: 'text-amber-400',
        },
        { label: 'Overdue', value: kpis.overdue, icon: Clock, accent: 'text-brand-danger' },
    ];

    const hasAttention = attention.overdue.length > 0 || attention.trials_ending.length > 0;

    return (
        <AdminLayout title="Overview">
            <Head title="Platform overview" />
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm">
                        <card.icon className={`h-5 w-5 ${card.accent}`} />
                        <p className="mt-3 text-xl font-black text-brand-text tabular-nums">{card.value}</p>
                        <p className="mt-1 text-xs font-semibold text-brand-text/70">{card.label}</p>
                    </div>
                ))}
            </div>

            {hasAttention && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-950">
                        <p className="font-bold">Needs attention</p>
                        {attention.overdue.length > 0 && (
                            <p className="mt-1">
                                Overdue: {attention.overdue.map((s) => s.name).join(', ')}
                            </p>
                        )}
                        {attention.trials_ending.length > 0 && (
                            <p className="mt-1">
                                Trials ending within 7 days: {attention.trials_ending.map((s) => `${s.name} (${s.trial_ends_at})`).join(', ')}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="mt-6 overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-brand-muted px-4 py-3">
                    <h2 className="text-sm font-black tracking-wide text-brand-text/80 uppercase">Stores</h2>
                    <Link
                        href={route('admin.stores.create')}
                        prefetch
                        className="text-sm font-bold text-brand-dark hover:underline"
                    >
                        New store
                    </Link>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-brand-background text-xs font-bold text-brand-text/70 uppercase">
                        <tr>
                            <th className="px-4 py-3">Store</th>
                            <th className="px-4 py-3">Plan</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">This month</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-muted">
                        {stores.data.map((store) => (
                            <tr key={store.id} className="hover:bg-brand-background/60">
                                <td className="px-4 py-3">
                                    <Link
                                        href={route('admin.stores.show', store.id)}
                                        prefetch
                                        cacheFor="30s"
                                        className="font-semibold text-brand-dark hover:underline"
                                    >
                                        {store.name}
                                    </Link>
                                    <p className="text-xs text-brand-text/60">{store.slug}</p>
                                </td>
                                <td className="px-4 py-3 capitalize">{store.plan}</td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={store.subscription_status} />
                                </td>
                                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                    ETB {store.this_month_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        {stores.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-brand-text/60">
                                    No stores yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>
        </AdminLayout>
    );
}
