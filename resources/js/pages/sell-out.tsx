import { Head, router, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';

import { AppShell } from '@/components/pharmacy/app-shell';
import { MultiItemOrderCart } from '@/components/pharmacy/multi-item-order-cart';
import { Toast } from '@/components/pharmacy/toast';
import { printReceipt } from '@/lib/receipt-print';
import type { SharedData } from '@/types';
import type { CartItem, MedicineSearchResult, Receipt, SaleMeta } from '@/types/pharmacy';

interface SellOutProps extends SharedData {
    results: MedicineSearchResult[];
    search: string;
    fieldConfigs: Record<string, any[]>;
    flash: { success?: string; receipt?: Receipt };
    errors: Record<string, string>;
}

export default function SellOut() {
    const { props } = usePage<SellOutProps>();
    const { results, store, fieldConfigs, flash, errors } = props;

    const [isProcessing, setIsProcessing] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);

    /* After a successful sale the server flashes the recorded receipt. */
    useEffect(() => {
        if (flash.receipt) {
            setLastReceipt(flash.receipt);
            setToastMessage(`Sale ${flash.receipt.invoice_no} processed successfully.`);
            window.dispatchEvent(new Event('pharmacy:sale-completed'));
        }
    }, [flash.receipt]);

    const handleSubmit = (items: CartItem[], meta: SaleMeta) => {
        setIsProcessing(true);
        router.post(
            route('sales.store'),
            {
                items: items.map((item) => ({
                    medicine_id: item.medicineId,
                    quantity: item.quantity,
                    batch_id: item.batchId,
                    unit_price: item.unitPrice,
                })),
                ...meta,
            },
            {
                preserveScroll: true,
                onFinish: () => setIsProcessing(false),
            },
        );
    };

    return (
        <AppShell>
            <Head title="Sell Out" />

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Point of Sale</p>
                    <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-brand-text">Sell Out</h1>
                </div>
                {lastReceipt && (
                    <button
                        type="button"
                        onClick={() => printReceipt(lastReceipt, store)}
                        className="vibrant-btn inline-flex items-center gap-2 rounded-lg bg-brand-dark px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                    >
                        <Printer className="h-4 w-4" />
                        Print Invoice {lastReceipt.invoice_no}
                    </button>
                )}
            </div>

            <MultiItemOrderCart 
                results={results} 
                fieldConfigs={fieldConfigs}
                onSubmit={handleSubmit} 
                isProcessing={isProcessing} 
                serverError={errors.items} 
            />
        </AppShell>
    );
}
