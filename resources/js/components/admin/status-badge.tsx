export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'suspended';

export function StatusBadge({ status }: { status: SubscriptionStatus | string }) {
    const styles: Record<string, string> = {
        active:    'bg-brand-accent/20 text-brand-dark',
        trial:     'bg-amber-100 text-amber-800',
        overdue:   'bg-red-100 text-red-800',
        suspended: 'bg-gray-200 text-gray-700',
    };

    return (
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${styles[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {status}
        </span>
    );
}
