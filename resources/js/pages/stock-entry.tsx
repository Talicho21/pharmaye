import { Head, useForm, usePage } from '@inertiajs/react';
import { Info, PackagePlus } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import { AppShell } from '@/components/pharmacy/app-shell';
import { Toast } from '@/components/pharmacy/toast';
import type { SharedData } from '@/types';

const UNITS = ['tablet', 'capsule', 'bottle', 'box', 'vial', 'ampoule', 'sachet', 'strip', 'tube', 'pack', 'piece', 'other'] as const;

interface StockEntryProps extends SharedData {
    categories: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
    medicines: { id: number; name: string; unit: string; default_price: string | number }[];
    flash: { success?: string };
}

export default function StockEntry() {
    const { props } = usePage<StockEntryProps>();
    const { categories, suppliers, medicines, flash } = props;

    const [toastMessage, setToastMessage] = useState('');
    const [medicineMode, setMedicineMode] = useState<'existing' | 'new'>('new');

    useEffect(() => {
        if (flash.success) setToastMessage(flash.success);
    }, [flash.success]);

    const form = useForm({
        medicine_id: '' as string | number,
        medicine_name: '',
        generic_name: '',
        unit: 'piece',
        units_per_box: '' as string | number,
        category_id: '' as string | number,
        new_category_name: '',
        default_price: '' as string | number,
        batch_number: '',
        quantity: '' as string | number,
        unit_cost: '' as string | number,
        expiry_date: '',
        supplier_id: '' as string | number,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post(route('batches.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setMedicineMode('new');
            },
        });
    };

    const inputClass =
        'w-full rounded-lg border border-border-gray bg-pure-white px-3 py-2.5 text-sm text-dark-charcoal outline-none transition duration-150 placeholder:text-dark-charcoal/50 focus-visible:ring-2 focus-visible:ring-primary-blue';
    const labelClass = 'mb-1 block text-xs font-semibold text-dark-charcoal/70';

    return (
        <AppShell>
            <Head title="Stock Entry" />

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

            <div className="mb-5">
                <p className="text-xs font-black tracking-[0.3em] text-dark-charcoal/70 uppercase">Inventory Intake</p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-dark-charcoal">Stock Entry</h1>
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-lg border border-primary-blue/20 bg-primary-blue/5 px-4 py-3">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-blue" />
                <p className="text-sm text-dark-charcoal/80">
                    Register each incoming batch with its own batch number and expiry date. Batches feed the FEFO (first-expiry-first-out)
                    selection at the point of sale.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Product section */}
                <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Product</h2>
                        <div className="flex gap-2">
                            {(['new', 'existing'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setMedicineMode(mode);
                                        form.setData('medicine_id', '');
                                        form.setData('medicine_name', '');
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                                        medicineMode === mode
                                            ? 'bg-primary-blue text-white'
                                            : 'bg-off-white text-dark-charcoal/80 hover:bg-border-gray'
                                    }`}
                                >
                                    {mode === 'new' ? 'New medicine' : 'Existing medicine'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {medicineMode === 'existing' ? (
                        <div>
                            <label className={labelClass}>Medicine</label>
                            <select
                                value={form.data.medicine_id}
                                onChange={(e) => form.setData('medicine_id', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Select a medicine…</option>
                                {medicines.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.unit})
                                    </option>
                                ))}
                            </select>
                            {form.errors.medicine_id && <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.medicine_id}</p>}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>Medicine Name *</label>
                                <input
                                    type="text"
                                    value={form.data.medicine_name}
                                    onChange={(e) => form.setData('medicine_name', e.target.value)}
                                    placeholder="e.g. Amoxicillin 500mg"
                                    className={inputClass}
                                />
                                {form.errors.medicine_name && (
                                    <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.medicine_name}</p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Generic Name</label>
                                <input
                                    type="text"
                                    value={form.data.generic_name}
                                    onChange={(e) => form.setData('generic_name', e.target.value)}
                                    placeholder="Optional"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Unit *</label>
                                <select value={form.data.unit} onChange={(e) => form.setData('unit', e.target.value)} className={inputClass}>
                                    {UNITS.map((u) => (
                                        <option key={u} value={u}>
                                            {u}
                                        </option>
                                    ))}
                                </select>
                                {form.errors.unit && <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.unit}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Units per Box</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={form.data.units_per_box}
                                    onChange={(e) => form.setData('units_per_box', e.target.value)}
                                    placeholder="Optional"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Category</label>
                                <select
                                    value={form.data.category_id}
                                    onChange={(e) => form.setData('category_id', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">No category / create new below</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>New Category Name</label>
                                <input
                                    type="text"
                                    value={form.data.new_category_name}
                                    onChange={(e) => form.setData('new_category_name', e.target.value)}
                                    placeholder="Only if not in the list"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Batch section */}
                <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
                    <h2 className="mb-4 text-sm font-black tracking-[0.2em] text-dark-charcoal/80 uppercase">Batch & Pricing</h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className={labelClass}>Batch Number *</label>
                            <input
                                type="text"
                                value={form.data.batch_number}
                                onChange={(e) => form.setData('batch_number', e.target.value)}
                                placeholder="e.g. B24X0091"
                                className={inputClass}
                            />
                            {form.errors.batch_number && <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.batch_number}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Quantity *</label>
                            <input
                                type="number"
                                min={1}
                                value={form.data.quantity}
                                onChange={(e) => form.setData('quantity', e.target.value)}
                                className={inputClass}
                            />
                            {form.errors.quantity && <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.quantity}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Expiry Date *</label>
                            <input
                                type="date"
                                value={form.data.expiry_date}
                                onChange={(e) => form.setData('expiry_date', e.target.value)}
                                className={inputClass}
                            />
                            {form.errors.expiry_date && <p className="mt-1 text-xs font-medium text-accent-red">{form.errors.expiry_date}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Unit Cost (ETB)</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.data.unit_cost}
                                onChange={(e) => form.setData('unit_cost', e.target.value)}
                                placeholder="Purchase cost per unit"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Selling Price (ETB)</label>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.data.default_price}
                                onChange={(e) => form.setData('default_price', e.target.value)}
                                placeholder="Price charged at POS"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Supplier</label>
                            <select
                                value={form.data.supplier_id}
                                onChange={(e) => form.setData('supplier_id', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">Unknown / not tracked</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => form.reset()}
                        className="flex-1 rounded-lg border border-border-gray bg-off-white px-4 py-3 text-sm font-semibold text-dark-charcoal transition hover:bg-border-gray"
                    >
                        Clear
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex-[2] rounded-lg bg-grass-green px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PackagePlus className="mr-1.5 -mt-0.5 inline-block h-4 w-4" />
                        {form.processing ? 'Saving…' : 'Add Stock Batch'}
                    </button>
                </div>
            </form>
        </AppShell>
    );
}
