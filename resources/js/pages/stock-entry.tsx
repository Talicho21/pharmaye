import { Head, useForm, usePage } from '@inertiajs/react';
import { Info, PackagePlus } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

import { AppShell } from '@/components/pharmacy/app-shell';
import { SearchableSelect } from '@/components/pharmacy/searchable-select';
import { Toast } from '@/components/pharmacy/toast';
import type { SharedData } from '@/types';

const UNITS = ['tablet', 'capsule', 'bottle', 'box', 'vial', 'ampoule', 'sachet', 'strip', 'tube', 'pack', 'piece', 'other'] as const;

interface StockEntryProps extends SharedData {
    categories: { id: number; name: string }[];
    suppliers: { id: number; name: string }[];
    medicines: { id: number; name: string; unit: string; default_price: string | number; reorder_level: number }[];
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
        reorder_level: 10 as string | number,
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
        'w-full rounded-lg border border-brand-muted bg-white px-3 py-2.5 text-sm text-brand-text outline-none transition duration-150 placeholder:text-brand-text/50 focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-dark/90 dark:text-brand-text dark:placeholder:text-brand-text/40';
    const labelClass = 'mb-1 block text-xs font-semibold text-brand-text/70';

    return (
        <AppShell>
            <Head title="Stock Entry" />

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}

            <div className="mb-5">
                <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">Inventory Intake</p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-brand-text">Stock Entry</h1>
            </div>

            <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-dark/20 bg-brand-dark/5 px-4 py-3 dark:border-brand-accent/20 dark:bg-brand-dark/40">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark dark:text-brand-accent" />
                <p className="text-sm text-brand-text/80">
                    Register each incoming batch with its own batch number and expiry date. Batches feed the FEFO (first-expiry-first-out)
                    selection at the point of sale.
                </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
                {/* Product section */}
                <div className="rounded-xl border border-brand-muted bg-white p-6 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-black tracking-[0.2em] text-brand-text/80 uppercase">Product</h2>
                        <div className="flex gap-2">
                            {(['new', 'existing'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => {
                                        setMedicineMode(mode);
                                        form.setData({
                                            ...form.data,
                                            medicine_id: '',
                                            medicine_name: '',
                                            reorder_level: 10,
                                        });
                                    }}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                                        medicineMode === mode
                                            ? 'bg-brand-dark text-white shadow-sm dark:bg-brand-accent dark:text-brand-dark'
                                            : 'bg-brand-background text-brand-text/80 hover:bg-brand-muted dark:bg-brand-dark/60 dark:text-brand-text/80 dark:hover:bg-brand-dark'
                                    }`}
                                >
                                    {mode === 'new' ? 'New medicine' : 'Existing medicine'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {medicineMode === 'existing' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Medicine</label>
                                <select
                                    value={form.data.medicine_id}
                                    onChange={(e) => {
                                        const selected = medicines.find((m) => String(m.id) === e.target.value);
                                        form.setData({
                                            ...form.data,
                                            medicine_id: e.target.value,
                                            default_price: selected?.default_price ?? '',
                                            reorder_level: selected?.reorder_level ?? 10,
                                        });
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">Select a medicine…</option>
                                    {medicines.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.unit})
                                        </option>
                                    ))}
                                </select>
                                {form.errors.medicine_id && <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.medicine_id}</p>}
                            </div>
                            <div>
                                <label className={labelClass}>Low Stock Level</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.data.reorder_level}
                                    onChange={(e) => form.setData('reorder_level', e.target.value)}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-brand-text/60">
                                    Flagged as low stock when remaining units fall to this number or below.
                                </p>
                                {form.errors.reorder_level && (
                                    <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.reorder_level}</p>
                                )}
                            </div>
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
                                    <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.medicine_name}</p>
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
                                {form.errors.unit && <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.unit}</p>}
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
                                <label className={labelClass}>Low Stock Level</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={form.data.reorder_level}
                                    onChange={(e) => form.setData('reorder_level', e.target.value)}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-brand-text/60">
                                    Flagged as low stock when remaining units fall to this number or below. Default is 10.
                                </p>
                                {form.errors.reorder_level && (
                                    <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.reorder_level}</p>
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>Category</label>
                                <SearchableSelect
                                    className="w-full"
                                    inputClassName={inputClass}
                                    value={String(form.data.category_id)}
                                    onChange={(next) => form.setData('category_id', next)}
                                    placeholder="Search categories…"
                                    pinValues={['']}
                                    options={[
                                        { value: '', label: 'No category / create new below' },
                                        ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                                    ]}
                                />
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
                <div className="rounded-xl border border-brand-muted bg-white p-6 shadow-sm dark:border-brand-muted/80 dark:bg-brand-dark/70 dark:shadow-slate-950/40">
                    <h2 className="mb-4 text-sm font-black tracking-[0.2em] text-brand-text/80 uppercase">Batch & Pricing</h2>
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
                            {form.errors.batch_number && <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.batch_number}</p>}
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
                            {form.errors.quantity && <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.quantity}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Expiry Date *</label>
                            <input
                                type="date"
                                value={form.data.expiry_date}
                                onChange={(e) => form.setData('expiry_date', e.target.value)}
                                className={inputClass}
                            />
                            {form.errors.expiry_date && <p className="mt-1 text-xs font-medium text-brand-danger">{form.errors.expiry_date}</p>}
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
                        className="flex-1 rounded-lg border border-brand-muted bg-brand-background px-4 py-3 text-sm font-semibold text-brand-text transition hover:bg-brand-muted dark:border-brand-muted/80 dark:bg-brand-dark/50 dark:hover:bg-brand-dark/80"
                    >
                        Clear
                    </button>
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="flex-[2] rounded-lg bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PackagePlus className="mr-1.5 -mt-0.5 inline-block h-4 w-4" />
                        {form.processing ? 'Saving…' : 'Add Stock Batch'}
                    </button>
                </div>
            </form>
        </AppShell>
    );
}
