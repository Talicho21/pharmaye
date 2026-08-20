import { Head, usePage } from '@inertiajs/react';

import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';

type LogRow = {
    id: number;
    action: string;
    description: string;
    admin_name: string | null;
    created_at: string;
};

interface ActivityLogProps extends SharedData {
    logs: Paginated<LogRow>;
}

export default function ActivityLogIndex() {
    const { logs } = usePage<ActivityLogProps>().props;

    return (
        <AdminLayout title="Activity log">
            <Head title="Activity log" />

            <div className="overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-off-white text-xs font-bold text-dark-charcoal/70 uppercase">
                        <tr>
                            <th className="px-4 py-3">When</th>
                            <th className="px-4 py-3">Admin</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Description</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-gray">
                        {logs.data.map((log) => (
                            <tr key={log.id}>
                                <td className="px-4 py-3 text-xs text-dark-charcoal/70">
                                    {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 font-semibold">{log.admin_name ?? '—'}</td>
                                <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                                <td className="px-4 py-3">{log.description}</td>
                            </tr>
                        ))}
                        {logs.data.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-dark-charcoal/60">
                                    No activity yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
