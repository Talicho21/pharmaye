import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

import type { SharedData } from '@/types';

/**
 * Redirects the current user to /store-suspended if their store is suspended.
 *
 * Call this inside any component that renders inside the authenticated app
 * shell. The AppShell already calls it, so individual pages do NOT need to.
 *
 * The check reads from the `store_suspended` shared prop which is populated
 * from the DB on every Inertia request, so suspension takes effect
 * immediately on the next page visit or partial reload.
 */
export function useStoreSuspensionGuard(): void {
    const { store_suspended } = usePage<SharedData>().props;

    useEffect(() => {
        if (store_suspended) {
            router.replace(route('store.suspended'));
        }
    }, [store_suspended]);
}
