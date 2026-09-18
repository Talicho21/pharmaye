import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import { Toast } from '@/components/pharmacy/toast';
import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string;
    deactivated_at: string | null;
    store: { id: number; name: string; slug: string } | null;
};

interface UsersIndexProps extends SharedData {
    users: Paginated<UserRow>;
    stores: { id: number; name: string; slug: string }[];
    filters: { search: string; store_id: number | null };
    flash: { success?: string; error?: string };
}

export default function UsersIndex() {
    const { users, stores, filters, flash } = usePage<UsersIndexProps>().props;
    const [search, setSearch] = useState(filters.search ?? '');
    const [storeId, setStoreId] = useState(filters.store_id ? String(filters.store_id) : '');
    const [toast, setToast] = useState('');

    useEffect(() => {
        if (flash.success) setToast(flash.success);
        if (flash.error) setToast(flash.error);
    }, [flash.success, flash.error]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            router.get(
                route('admin.users.index'),
                { search: search.trim() || undefined, store_id: storeId || undefined },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, storeId]);

    return (
        <AdminLayout title="Users">
            <Head title="Users" />
            {toast && <Toast message={toast} onClose={() => setToast('')} />}

            <div className="mb-4 flex flex-wrap gap-2">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name or email"
                    className="rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                />
                <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="rounded-lg border border-border-gray bg-pure-white px-3 py-2 text-sm"
                >
                    <option value="">All stores</option>
                    {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                            {store.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-off-white text-xs font-bold text-dark-charcoal/70 uppercase">
                        <tr>
                            <th className="px-4 py-3">User</th>
                            <th className="px-4 py-3">Store</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-gray">
                        {users.data.map((user) => (
                            <tr key={user.id}>
                                <td className="px-4 py-3">
                                    <p className="font-semibold">{user.name}</p>
                                    <p className="text-xs text-dark-charcoal/60">{user.email}</p>
                                </td>
                                <td className="px-4 py-3">{user.store?.name ?? '—'}</td>
                                <td className="px-4 py-3 capitalize">{user.role}</td>
                                <td className="px-4 py-3">{user.deactivated_at ? 'Deactivated' : 'Active'}</td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            className="text-xs font-bold text-primary-blue hover:underline"
                                            onClick={() => {
                                                if (confirm(`Reset password for ${user.email}?`)) {
                                                    router.post(route('admin.users.password-reset', user.id));
                                                }
                                            }}
                                        >
                                            Reset password
                                        </button>
                                        {user.deactivated_at ? (
                                            <button
                                                type="button"
                                                className="text-xs font-bold text-grass-green hover:underline"
                                                onClick={() => router.post(route('admin.users.activate', user.id))}
                                            >
                                                Reactivate
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="text-xs font-bold text-accent-red hover:underline"
                                                onClick={() => {
                                                    if (confirm(`Deactivate ${user.email}?`)) {
                                                        router.post(route('admin.users.deactivate', user.id));
                                                    }
                                                }}
                                            >
                                                Deactivate
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
