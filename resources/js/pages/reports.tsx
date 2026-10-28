import { Head, router, usePage } from '@inertiajs/react';
import { Download, Printer } from 'lucide-react';

import { AnalyticsPanel, type AnalyticsData } from '@/components/pharmacy/analytics-panel';
import { AppShell } from '@/components/pharmacy/app-shell';
import type { SharedData } from '@/types';
import type { Paginated } from '@/types/pharmacy';
import type { ExpiryBatchRow, ExpiryStatus, RangeOption, SaleRow } from '@/components/pharmacy/analytics-panel';

interface ReportsProps extends SharedData {
    range: RangeOption;
    overview: { totalRevenue: number; totalItemsSold: number; salesCount: number };
    topSelling: { medicineName: string; quantitySold: number; totalRevenue: number }[];
    salesLog: Paginated<SaleRow>;
    expiryHealth: {
        counts: { healthy: number; expiring_soon: number; expired: number };
        status: ExpiryStatus;
        items: Paginated<ExpiryBatchRow>;
    };
    filters: { startDate: string; endDate: string; search: string };
}

export default function Reports() {
    const { props } = usePage<ReportsProps>();
    const { range, overview, topSelling, salesLog, expiryHealth, filters } = props;

    const analyticsData: AnalyticsData = { range, overview, topSelling, salesLog, expiryHealth, filters };

    /**
     * In-page Inertia reload — identical behaviour to before the refactor.
     * replace:true keeps the address bar clean during filter interactions.
     */
    const applyFilters = (params: Record<string, string>) => {
        router.get(route('reports'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const exportCsv = () => {
        const header = ['Invoice', 'Date', 'Customer', 'Seller', 'Payment', 'Medicine', 'Batch', 'Qty', 'Unit Price', 'Line Total'];
        const rows = salesLog.data.flatMap((sale) =>
            sale.items.map((item) => [
                sale.invoice_no,
                new Date(sale.created_at).toLocaleString(),
                sale.customer_name ?? '',
                sale.seller_name ?? '',
                sale.payment_method,
                item.medicine_name,
                item.batch_number,
                String(item.quantity),
                item.unit_price.toFixed(2),
                item.total_price.toFixed(2),
            ]),
        );
        const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sales-log-${filters.startDate}-to-${filters.endDate}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <AppShell>
            <Head title="Reports" />

            {/* Page header — kept here (not in AnalyticsPanel) so Refresh / Export / Print
                remain Reports-only actions. Dashboard shows the panel without these buttons. */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Analytics &amp; Audit</p>
                    <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-brand-text">Sales Reports</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={exportCsv}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg border border-brand-muted bg-white px-3 py-2 text-sm font-semibold text-brand-text dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:text-brand-text dark:hover:bg-brand-dark"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg bg-brand-dark px-3 py-2 text-sm font-bold text-white dark:bg-brand-accent dark:text-brand-dark"
                    >
                        <Printer className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            {/* All analytics UI lives in the shared AnalyticsPanel component. */}
            <AnalyticsPanel data={analyticsData} applyFilters={applyFilters} />
        </AppShell>
    );
}
