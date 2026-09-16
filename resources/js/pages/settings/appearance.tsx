import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';


import { AppShell } from '@/components/pharmacy/app-shell';
import SettingsLayout from '@/layouts/settings/layout';



export default function Appearance() {
    return (
        <AppShell>
            <Head title="Appearance settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Appearance settings" description="Update your account's appearance settings" />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppShell>
    );
}
