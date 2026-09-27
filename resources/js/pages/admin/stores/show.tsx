import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';

import { StatusBadge } from '@/components/admin/status-badge';
import { Toast } from '@/components/pharmacy/toast';
import AdminLayout from '@/layouts/admin-layout';
import type { SharedData, StoreBranding } from '@/types';

type StoreUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    deactivated_at: string | null;
};

interface StoreShowProps extends SharedData {
    store: StoreBranding & {
        id: number;
        plan: string;
        monthly_fee: number;
        subscription_status: string;
        trial_ends_at: string | null;
    };
    statuses: string[];
    users: StoreUser[];
    stats: {
        this_month_revenue: number;
        inventory_value: number;
        medicine_count: number;
        user_count: number;
    };
    flash: { success?: string };
}

export default function StoreShow() {
    const { store, statuses, users, stats, flash } = usePage<StoreShowProps>().props;
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (flash.success) setToast(flash.success);
    }, [flash.success]);

    const form = useForm({
        name: store.name,
        slug: store.slug,
        address: store.address ?? '',
        phone: store.phone ?? '',
        plan: store.plan,
        monthly_fee: store.monthly_fee,
        subscription_status: store.subscription_status,
        trial_ends_at: store.trial_ends_at ?? '',
    });

    useEffect(() => {
        form.setData({
            name: store.name,
            slug: store.slug,
            address: store.address ?? '',
            phone: store.phone ?? '',
            plan: store.plan,
            monthly_fee: store.monthly_fee,
            subscription_status: store.subscription_status,
            trial_ends_at: store.trial_ends_at ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store.id, store.subscription_status]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.put(route('admin.stores.update', store.id), { preserveScroll: true });
    };

    const inputClass =
        'w-full rounded-lg border border-brand-muted bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

    return (
        <AdminLayout title={store.name}>
            <Head title={store.name} />
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Link
                        href={route('admin.stores.index')}
                        prefetch
                        cacheFor="30s"
                        className="text-xs font-bold text-brand-dark hover:underline"
                    >
                        ← All stores
                    </Link>
                    <div className="mt-1 flex items-center gap-2">
                        <h2 className="text-2xl font-black text-brand-text">{store.name}</h2>
                        <StatusBadge status={store.subscription_status} />
                    </div>
                    <p className="text-sm text-brand-text/60">{store.slug}</p>
                </div>
                <div className="flex gap-2">
                    {store.subscription_status === 'suspended' ? (
                        <button
                            type="button"
                            onClick={() => router.post(route('admin.stores.activate', store.id))}
                            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-white"
                        >
                            Activate
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                if (confirm(`Suspend ${store.name}? Store users keep their accounts but the tenant is marked suspended.`)) {
                                    router.post(route('admin.stores.suspend', store.id));
                                }
                            }}
                            className="rounded-lg bg-brand-danger px-4 py-2 text-sm font-bold text-white"
                        >
                            Suspend
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="This month sales" value={`ETB ${stats.this_month_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <Stat label="Inventory value" value={`ETB ${stats.inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                <Stat label="Medicines" value={stats.medicine_count} />
                <Stat label="Users" value={stats.user_count} />
            </div>

            <form onSubmit={submit} className="mb-5 rounded-xl border border-brand-muted bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-black tracking-wide text-brand-text/80 uppercase">Branding & plan</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name">
                        <input className={inputClass} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    </Field>
                    <Field label="Slug">
                        <input className={inputClass} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} />
                    </Field>
                    <Field label="Address">
                        <input className={inputClass} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                    </Field>
                    <Field label="Phone">
                        <input className={inputClass} value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                    </Field>
                    <Field label="Plan">
                        <input className={inputClass} value={form.data.plan} onChange={(e) => form.setData('plan', e.target.value)} />
                    </Field>
                    <Field label="Monthly fee">
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={inputClass}
                            value={form.data.monthly_fee}
                            onChange={(e) => form.setData('monthly_fee', Number(e.target.value))}
                        />
                    </Field>
                    <Field label="Status">
                        <select className={inputClass} value={form.data.subscription_status} onChange={(e) => form.setData('subscription_status', e.target.value)}>
                            {statuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Trial ends">
                        <input type="date" className={inputClass} value={form.data.trial_ends_at} onChange={(e) => form.setData('trial_ends_at', e.target.value)} />
                    </Field>
                </div>
                <button type="submit" disabled={form.processing} className="mt-4 rounded-lg bg-brand-dark px-4 py-2 text-sm font-bold text-white">
                    Save changes
                </button>
            </form>

            <div className="rounded-xl border border-brand-muted bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-black tracking-wide text-brand-text/80 uppercase">Users</h3>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-left text-sm">
                    <thead className="text-xs font-bold text-brand-text/70 uppercase">
                        <tr>
                            <th className="py-2">Name</th>
                            <th className="py-2">Email</th>
                            <th className="py-2">Role</th>
                            <th className="py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-muted">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="py-2 font-semibold">{user.name}</td>
                                <td className="py-2">{user.email}</td>
                                <td className="py-2 capitalize">{user.role}</td>
                                <td className="py-2">{user.deactivated_at ? 'Deactivated' : 'Active'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </AdminLayout>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-brand-muted bg-white p-4 shadow-sm">
            <p className="text-lg font-black text-brand-text tabular-nums">{value}</p>
            <p className="mt-1 text-xs font-semibold text-brand-text/70">{label}</p>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold">{label}</label>
            {children}
        </div>
    );
}
