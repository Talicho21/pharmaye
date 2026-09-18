import { Head, Link, router, usePage } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Toast } from '@/components/pharmacy/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';

type StoreStatus = 'trial' | 'active' | 'suspended';

interface StoreData {
    id: number;
    name: string;
    slug: string;
    planTier: string;
    monthlyRate: number;
    status: StoreStatus;
    nextRenewal: string;
}

interface AdminBillingProps {
    stores: StoreData[];
}

export default function AdminBilling({ stores }: AdminBillingProps) {
    const { flash } = usePage<any>().props;
    const [toastMessage, setToastMessage] = useState('');
    
    const [showBanner, setShowBanner] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | StoreStatus>('all');

    useEffect(() => {
        if (flash?.success) setToastMessage(flash.success);
    }, [flash?.success]);

    // KPI Calculations based on the full dataset
    const estimatedMRR = stores
        .filter((s) => s.status !== 'suspended')
        .reduce((sum, s) => sum + s.monthlyRate, 0);

    const activeOrTrialCount = stores
        .filter((s) => s.status === 'active' || s.status === 'trial')
        .length;

    const suspendedCount = stores.filter((s) => s.status === 'suspended').length;

    // Filtered data for the table
    const filteredStores = stores.filter((store) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = store.name.toLowerCase().includes(query) || store.slug.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount);
    };

    const handleDelete = (store: StoreData) => {
        if (window.confirm(`Are you sure you want to completely delete "${store.name}"?\n\nThis action cannot be undone and will delete all associated data including users, inventory, and sales.`)) {
            router.delete(route('admin.stores.destroy', store.id));
        }
    };

    return (
        <AdminLayout title="Billing">
            <Head title="Billing" />
            
            <div className="space-y-6">
                {/* 1. INFORMATIONAL BANNER */}
                {showBanner && (
                    <div className="flex items-start justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-900 shadow-sm">
                        <p className="text-sm">
                            Monthly recurring revenue is calculated from active stores&apos; monthly fees. Per-store invoices are not issued from this screen
                            yet — use store detail to change plan and fee.
                        </p>
                        <button 
                            onClick={() => setShowBanner(false)} 
                            className="ml-4 flex-shrink-0 text-blue-700 hover:text-blue-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 rounded-sm"
                            aria-label="Dismiss banner"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}

                {/* 2. KPI SUMMARY CARDS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card className="p-5 shadow-sm">
                        <h3 className="text-sm font-medium text-muted-foreground">Estimated MRR</h3>
                        <p className="mt-2 text-2xl font-bold text-foreground">{formatCurrency(estimatedMRR)}</p>
                    </Card>
                    <Card className="p-5 shadow-sm">
                        <h3 className="text-sm font-medium text-muted-foreground">Active / In Trial Stores</h3>
                        <p className="mt-2 text-2xl font-bold text-foreground">{activeOrTrialCount}</p>
                    </Card>
                    <Card className="p-5 shadow-sm">
                        <h3 className="text-sm font-medium text-muted-foreground">Suspended Stores</h3>
                        <p className="mt-2 text-2xl font-bold text-foreground">{suspendedCount}</p>
                    </Card>
                </div>

                {/* 4. SEARCH AND FILTERS */}
                <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search stores by name or slug..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | StoreStatus)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-48"
                        aria-label="Filter by status"
                    >
                        <option value="all">All Statuses</option>
                        <option value="trial">Trial</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                {/* 3. STORES TABLE */}
                <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-sm">
                    <table className="w-full min-w-[640px] text-left text-sm whitespace-nowrap">
                        <thead className="border-b bg-gray-50/50 text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3.5 font-medium">Store</th>
                                <th className="px-4 py-3.5 font-medium">Plan Tier</th>
                                <th className="px-4 py-3.5 font-medium">Monthly Rate</th>
                                <th className="px-4 py-3.5 font-medium">Status</th>
                                <th className="px-4 py-3.5 font-medium">Next Renewal</th>
                                <th className="px-4 py-3.5 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredStores.length > 0 ? (
                                filteredStores.map((store) => (
                                    <tr key={store.id} className="transition-colors hover:bg-gray-50/50">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-foreground">{store.name}</div>
                                            <div className="text-xs text-muted-foreground">{store.slug}</div>
                                        </td>
                                        <td className="px-4 py-3 text-foreground">{store.planTier}</td>
                                        <td className="px-4 py-3 text-foreground font-medium">{formatCurrency(store.monthlyRate)}</td>
                                        <td className="px-4 py-3">
                                            {store.status === 'active' && (
                                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-transparent shadow-none">Active</Badge>
                                            )}
                                            {store.status === 'trial' && (
                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent shadow-none">Trial</Badge>
                                            )}
                                            {store.status === 'suspended' && (
                                                <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-transparent shadow-none">Suspended</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-foreground">{store.nextRenewal}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href={route('admin.stores.show', store.id)}>
                                                        Manage Plan
                                                    </Link>
                                                </Button>
                                                
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    onClick={() => handleDelete(store)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-base font-medium text-foreground">No stores found</p>
                                            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} duration={3000} />}
        </AdminLayout>
    );
}

