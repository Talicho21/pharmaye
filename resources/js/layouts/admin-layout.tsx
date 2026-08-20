import { Link, router, usePage } from '@inertiajs/react';
import { Activity, Building2, CreditCard, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import AppLogoIcon from '@/components/app-logo-icon';
import type { SharedData } from '@/types';

type AdminLayoutProps = {
    children: ReactNode;
    title?: string;
};

const navItems = [
    { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/stores', label: 'Stores', icon: Building2 },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/billing', label: 'Billing', icon: CreditCard },
    { href: '/admin/activity', label: 'Activity log', icon: Activity },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children, title }: AdminLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const pathname = usePage().url;
    const admin = auth.admin;

    return (
        <div className="min-h-screen bg-off-white">
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-primary-blue p-5 text-white lg:flex">
                <Link href={route('admin.dashboard')} className="mb-8 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                        <AppLogoIcon className="size-6 fill-current" />
                    </div>
                    <div>
                        <p className="text-sm font-black tracking-wide">
                            Pharma<span className="text-grass-green">ye</span>
                        </p>
                        <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Platform</p>
                    </div>
                </Link>

                <nav className="flex-1 space-y-1" aria-label="Platform admin">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/') || pathname.startsWith(item.href + '?');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                    isActive ? 'bg-white text-primary-blue' : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="truncate text-sm font-semibold">{admin?.name}</p>
                    <p className="truncate text-xs text-white/60">{admin?.email}</p>
                    <button
                        type="button"
                        onClick={() => router.post(route('admin.logout'))}
                        className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign out
                    </button>
                </div>
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-10 border-b border-border-gray bg-pure-white/90 px-6 py-4 backdrop-blur">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold text-dark-charcoal">{title ?? 'Platform'}</h1>
                        <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-[10px] font-black tracking-widest text-primary-blue uppercase">
                            Super admin
                        </span>
                    </div>
                </header>
                <main className="p-6">{children}</main>
            </div>
        </div>
    );
}
