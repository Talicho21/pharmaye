import { Head, router, usePage } from '@inertiajs/react';
import { Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

import AdminLayout from '@/layouts/admin-layout';
import type { SharedData } from '@/types';

type FieldConfig = {
    id: number;
    section: string;
    field_key: string;
    label: string;
    input_type: string;
    is_required: boolean;
    is_active: boolean;
    sort_order: number;
};

type Store = {
    id: number;
    name: string;
};

interface SettingsProps extends SharedData {
    stores: Store[];
    selectedStoreId: number;
    fields: Record<string, FieldConfig[]>;
}

const SECTIONS = [
    { key: 'order_summary', label: 'Order Summary' },
    { key: 'customer_information', label: 'Customer Information' },
    { key: 'cash_credit', label: 'Cash/Credit' },
];

export default function SellOutFieldSettings() {
    const { stores, selectedStoreId, fields } = usePage<SettingsProps>().props;
    const [isProcessing, setIsProcessing] = useState(false);

    // Form state for adding new field
    const [activeSection, setActiveSection] = useState('customer_information');
    const [newLabel, setNewLabel] = useState('');
    const [newKey, setNewKey] = useState('');
    const [newType, setNewType] = useState('text');
    const [newRequired, setNewRequired] = useState(false);

    const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        router.get(
            route('admin.sell-out-field-settings.index'),
            { store_id: e.target.value },
            { preserveState: true }
        );
    };

    const handleAddField = (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        router.post(
            route('admin.sell-out-field-settings.store'),
            {
                store_id: selectedStoreId,
                section: activeSection,
                label: newLabel,
                field_key: newKey,
                input_type: newType,
                is_required: newRequired,
            },
            {
                onSuccess: () => {
                    setNewLabel('');
                    setNewKey('');
                    setNewType('text');
                    setNewRequired(false);
                },
                onFinish: () => setIsProcessing(false),
            }
        );
    };

    const toggleRequired = (field: FieldConfig) => {
        router.put(
            route('admin.sell-out-field-settings.update', field.id),
            { is_required: !field.is_required, is_active: field.is_active },
            { preserveScroll: true }
        );
    };

    const deactivateField = (field: FieldConfig) => {
        if (confirm(`Are you sure you want to deactivate the field "${field.label}"?`)) {
            router.delete(route('admin.sell-out-field-settings.destroy', field.id), { preserveScroll: true });
        }
    };

    // Auto-generate key from label
    const handleLabelChange = (val: string) => {
        setNewLabel(val);
        setNewKey(val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
    };

    return (
        <AdminLayout title="Sell Out Field Settings">
            <Head title="Sell Out Field Settings" />

            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-brand-text">Sell Out Field Settings</h1>
                    <p className="mt-1 text-sm text-brand-text/70">
                        Dynamically configure which fields appear on the POS checkout screen per store.
                    </p>
                </div>
                <div>
                    <select
                        value={selectedStoreId}
                        onChange={handleStoreChange}
                        className="rounded-lg border border-brand-muted px-4 py-2 outline-none focus:ring-2 focus:ring-brand-primary bg-white font-semibold text-brand-text"
                    >
                        {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                                {store.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
                {/* Main list of sections and fields */}
                <div className="space-y-6">
                    {SECTIONS.map((sectionDef) => {
                        const sectionFields = fields[sectionDef.key] || [];
                        const activeFields = sectionFields.filter((f) => f.is_active);

                        return (
                            <div key={sectionDef.key} className="overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm">
                                <div className="border-b border-brand-muted bg-brand-background/50 px-4 py-3 flex justify-between items-center">
                                    <h2 className="text-sm font-black tracking-wide text-brand-text/80 uppercase">{sectionDef.label}</h2>
                                </div>
                                <div className="p-4">
                                    {activeFields.length === 0 ? (
                                        <p className="text-sm text-brand-text/60">No active fields in this section.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {activeFields.map((field) => (
                                                <div key={field.id} className="flex items-center justify-between rounded-lg border border-brand-muted/60 p-3 bg-brand-background/30">
                                                    <div>
                                                        <p className="font-semibold text-brand-text">{field.label}</p>
                                                        <p className="text-xs text-brand-text/60">
                                                            Key: <code className="bg-brand-muted/30 px-1 py-0.5 rounded">{field.field_key}</code> · 
                                                            Type: <span className="capitalize">{field.input_type}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            onClick={() => toggleRequired(field)}
                                                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-md transition ${field.is_required ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                                                        >
                                                            {field.is_required ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                            {field.is_required ? 'Required' : 'Optional'}
                                                        </button>
                                                        <button
                                                            onClick={() => deactivateField(field)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition"
                                                            title="Deactivate Field"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar for adding new field */}
                <div>
                    <div className="sticky top-20 rounded-xl border border-brand-muted bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <Plus className="h-5 w-5 text-brand-dark" />
                            <h3 className="font-bold text-brand-text">Add New Field</h3>
                        </div>
                        
                        <form onSubmit={handleAddField} className="space-y-4 text-sm">
                            <div>
                                <label className="mb-1 block font-semibold text-brand-text/70 text-xs uppercase tracking-wide">Section</label>
                                <select 
                                    value={activeSection}
                                    onChange={(e) => setActiveSection(e.target.value)}
                                    className="w-full rounded-lg border border-brand-muted px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
                                >
                                    {SECTIONS.map((s) => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-brand-text/70 text-xs uppercase tracking-wide">Field Label</label>
                                <input 
                                    type="text" 
                                    value={newLabel}
                                    onChange={(e) => handleLabelChange(e.target.value)}
                                    placeholder="e.g. Doctor Name"
                                    required
                                    className="w-full rounded-lg border border-brand-muted px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-brand-text/70 text-xs uppercase tracking-wide">Field Key</label>
                                <input 
                                    type="text" 
                                    value={newKey}
                                    onChange={(e) => setNewKey(e.target.value)}
                                    required
                                    pattern="^[a-z0-9_]+$"
                                    title="Only lowercase letters, numbers, and underscores"
                                    className="w-full rounded-lg border border-brand-muted px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary bg-brand-background"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block font-semibold text-brand-text/70 text-xs uppercase tracking-wide">Input Type</label>
                                <select 
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="w-full rounded-lg border border-brand-muted px-3 py-2 outline-none focus:ring-2 focus:ring-brand-primary"
                                >
                                    <option value="text">Text</option>
                                    <option value="number">Number</option>
                                    <option value="date">Date</option>
                                    <option value="dropdown">Dropdown</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input 
                                    type="checkbox" 
                                    id="req-checkbox"
                                    checked={newRequired}
                                    onChange={(e) => setNewRequired(e.target.checked)}
                                    className="rounded text-brand-dark focus:ring-brand-primary"
                                />
                                <label htmlFor="req-checkbox" className="font-semibold text-brand-text">Is Required?</label>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full mt-2 rounded-lg bg-brand-dark px-4 py-2 font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                            >
                                {isProcessing ? 'Adding...' : 'Add Field'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
