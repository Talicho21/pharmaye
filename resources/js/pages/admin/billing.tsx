import { Head } from '@inertiajs/react';

import AdminLayout from '@/layouts/admin-layout';

export default function AdminBilling() {
    return (
        <AdminLayout title="Billing">
            <Head title="Billing" />
            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                <p className="text-sm text-dark-charcoal/80">
                    Monthly recurring revenue is calculated from active stores&apos; monthly fees. Per-store invoices are not issued from this screen
                    yet — use store detail to change plan and fee.
                </p>
            </div>
        </AdminLayout>
    );
}
