import { Head, usePage } from '@inertiajs/react';

import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';

export default function AdminSettings() {
    const { auth } = usePage<SharedData>().props;

    return (
        <AdminLayout title="Settings">
            <Head title="Platform settings" />
            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                <p className="text-sm font-semibold">{auth.admin?.name}</p>
                <p className="text-sm text-dark-charcoal/70">{auth.admin?.email}</p>
                <p className="mt-4 text-sm text-dark-charcoal/70">
                    Platform admins are stored separately from store users. Additional owner accounts should be created in the database or seeder —
                    there is no self-serve registration.
                </p>
            </div>
        </AdminLayout>
    );
}
