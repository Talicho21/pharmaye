import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
    value: string;
    label: string;
};

type SearchableSelectProps = {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    emptyMessage?: string;
    /** Values kept at the top; everything else is sorted A–Z. */
    pinValues?: string[];
};

function sortByLabel(options: SearchableSelectOption[]): SearchableSelectOption[] {
    return [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Search…',
    className,
    inputClassName,
    emptyMessage = 'No matches',
    pinValues = [],
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');

    const ordered = useMemo(() => {
        const pinned = new Set(pinValues);
        const head = pinValues
            .map((pin) => options.find((option) => option.value === pin))
            .filter((option): option is SearchableSelectOption => option !== undefined);
        const rest = sortByLabel(options.filter((option) => !pinned.has(option.value)));

        return [...head, ...rest];
    }, [options, pinValues]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (needle === '') {
            return ordered;
        }

        return ordered.filter((option) => option.label.toLowerCase().includes(needle));
    }, [ordered, query]);

    const selectedLabel = options.find((option) => option.value === value)?.label ?? '';

    return (
        <Combobox
            value={value}
            immediate
            onChange={(next) => {
                if (next !== null) {
                    onChange(next);
                }
            }}
            onClose={() => setQuery('')}
        >
            <div className={cn('relative', className)}>
                <ComboboxInput
                    autoComplete="off"
                    displayValue={() => selectedLabel}
                    placeholder={placeholder}
                    onChange={(event) => setQuery(event.target.value)}
                    className={cn(
                        'w-full rounded-lg border border-brand-muted bg-white py-2 pl-3 text-sm text-brand-text outline-none placeholder:text-brand-text/50 focus-visible:ring-2 focus-visible:ring-brand-primary dark:border-brand-muted dark:bg-brand-dark/90 dark:text-brand-text dark:placeholder:text-brand-text/40',
                        inputClassName,
                        'pr-9',
                    )}
                />
                <ComboboxButton className="absolute inset-y-0 right-0 flex items-center px-2 text-brand-text/60">
                    <ChevronsUpDown className="h-4 w-4" />
                </ComboboxButton>

                <ComboboxOptions
                    anchor="bottom start"
                    className="z-50 max-h-60 w-[var(--input-width)] overflow-auto rounded-lg border border-brand-muted bg-white py-1 shadow-sm [--anchor-gap:4px] empty:invisible dark:border-brand-muted/80 dark:bg-brand-dark dark:shadow-slate-950/70"
                >
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-brand-text/60">{emptyMessage}</p>
                    ) : (
                        filtered.map((option) => (
                            <ComboboxOption
                                key={option.value || option.label}
                                value={option.value}
                                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-brand-text select-none data-focus:bg-brand-dark/10 dark:data-focus:bg-white/10"
                            >
                                {({ selected }) => (
                                    <>
                                        <Check className={cn('h-3.5 w-3.5 shrink-0 text-brand-dark dark:text-brand-accent', selected ? 'opacity-100' : 'opacity-0')} />
                                        <span className={cn('truncate', selected && 'font-semibold')}>{option.label}</span>
                                    </>
                                )}
                            </ComboboxOption>
                        ))
                    )}
                </ComboboxOptions>
            </div>
        </Combobox>
    );
}
