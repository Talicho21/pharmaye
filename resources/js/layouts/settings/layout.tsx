import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        url: '/settings/profile',
        icon: null,
    },
    {
        title: 'Password',
        url: '/settings/password',
        icon: null,
    },
    {
        title: 'Appearance',
        url: '/settings/appearance',
        icon: null,
    },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const { url } = usePage();
    const currentPath = url.split('?')[0];

    return (
        <div className="px-4 py-6">
            <Heading title="Settings" description="Manage your profile and account settings" />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item) => {
                            const isActive = currentPath === item.url || currentPath.startsWith(item.url + '?');
                            return (
                                <Button
                                    key={item.url}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn('w-full justify-start', {
                                        'bg-brand-dark/10 text-brand-dark font-bold dark:bg-brand-dark/80 dark:text-brand-accent': isActive,
                                        'text-brand-text/70 font-medium hover:bg-brand-dark/10 dark:hover:bg-brand-dark/50 dark:text-brand-text/70': !isActive,
                                    })}
                                >
                                    <Link href={item.url} prefetch>
                                        {item.title}
                                    </Link>
                                </Button>
                            );
                        })}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
