import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import AdminLayout from '@/layouts/admin-layout';

export default function StoreCreate({ statuses }: { statuses: string[] }) {
    const form = useForm({
        name: '',
        slug: '',
        address: '',
        phone: '',
        plan: 'standard',
        monthly_fee: 1500,
        subscription_status: 'trial',
        trial_ends_at: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('admin.stores.store'));
    };

    const inputClass =
        'w-full rounded-lg border border-brand-muted bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-primary';

    return (
        <AdminLayout title="Create store">
            <Head title="Create store" />

            <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
                <div className="rounded-xl border border-brand-muted bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-sm font-black tracking-wide text-brand-text/80 uppercase">Store</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold">Name *</label>
                            <input className={inputClass} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                            <InputError message={form.errors.name} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Slug</label>
                            <input className={inputClass} value={form.data.slug} onChange={(e) => form.setData('slug', e.target.value)} placeholder="auto from name" />
                            <InputError message={form.errors.slug} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Phone</label>
                            <input className={inputClass} value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold">Address</label>
                            <input className={inputClass} value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Plan</label>
                            <input className={inputClass} value={form.data.plan} onChange={(e) => form.setData('plan', e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Monthly fee (ETB)</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                className={inputClass}
                                value={form.data.monthly_fee}
                                onChange={(e) => form.setData('monthly_fee', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Status</label>
                            <select className={inputClass} value={form.data.subscription_status} onChange={(e) => form.setData('subscription_status', e.target.value)}>
                                {statuses.map((status) => (
                                    <option key={status} value={status}>
                                        {status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Trial ends</label>
                            <input type="date" className={inputClass} value={form.data.trial_ends_at} onChange={(e) => form.setData('trial_ends_at', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-brand-muted bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-sm font-black tracking-wide text-brand-text/80 uppercase">First tenant admin</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Name *</label>
                            <input className={inputClass} value={form.data.admin_name} onChange={(e) => form.setData('admin_name', e.target.value)} required />
                            <InputError message={form.errors.admin_name} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold">Email *</label>
                            <input type="email" className={inputClass} value={form.data.admin_email} onChange={(e) => form.setData('admin_email', e.target.value)} required />
                            <InputError message={form.errors.admin_email} />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold">Password *</label>
                            <input type="password" className={inputClass} value={form.data.admin_password} onChange={(e) => form.setData('admin_password', e.target.value)} required />
                            <InputError message={form.errors.admin_password} />
                        </div>
                    </div>
                </div>

                <button type="submit" disabled={form.processing} className="w-full rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                    {form.processing ? 'Creating…' : 'Create store'}
                </button>
            </form>
        </AdminLayout>
    );
}
