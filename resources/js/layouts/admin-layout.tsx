import { Link, router, usePage } from '@inertiajs/react';
import { Activity, Building2, CreditCard, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

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

/** Shared nav body — rendered inside both desktop aside and mobile drawer */
function SidebarContent({
    admin,
    pathname,
    onNavigate,
}: {
    admin: { name?: string; email?: string } | null | undefined;
    pathname: string;
    onNavigate?: () => void;
}) {
    return (
        <>
            {/* Brand */}
            <Link
                href={route('admin.dashboard')}
                className="mb-8 flex items-center gap-3"
                onClick={onNavigate}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <AppLogoIcon className="size-6 fill-current" />
                </div>
                <div>
                    <p className="text-sm font-black tracking-wide">
                        Pharma<span className="text-grass-green">ye</span>
                    </p>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Platform</p>
                </div>
            </Link>

            {/* Nav links */}
            <nav className="flex-1 space-y-1" aria-label="Platform admin">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + '/') ||
                        pathname.startsWith(item.href + '?');
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                                isActive
                                    ? 'bg-white text-primary-blue'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User profile + sign-out */}
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
        </>
    );
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const pathname = usePage().url;
    const admin = auth.admin;

    const [drawerOpen, setDrawerOpen] = useState(false);
    const closeDrawer = () => setDrawerOpen(false);

    /* Scroll-lock body while drawer is open */
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [drawerOpen]);

    /* Auto-close drawer on route change */
    useEffect(() => {
        closeDrawer();
    }, [pathname]);

    return (
        <div className="min-h-screen bg-off-white">

            {/* ── Desktop sidebar (md and up) ── */}
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-primary-blue p-5 text-white md:flex">
                <SidebarContent admin={admin} pathname={pathname} />
            </aside>

            {/* ── Mobile sticky top header (below md) ── */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-primary-blue/20 bg-primary-blue px-4 md:hidden">
                <button
                    type="button"
                    aria-label="Open navigation menu"
                    aria-expanded={drawerOpen}
                    aria-controls="admin-mobile-drawer"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                </button>
                <div>
                    <p className="text-sm font-black tracking-wide text-white">
                        Pharma<span className="text-grass-green">ye</span>
                    </p>
                    <p className="text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase">Platform</p>
                </div>
            </header>

            {/* ── Backdrop ── */}
            <div
                aria-hidden="true"
                onClick={closeDrawer}
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-250 md:hidden ${
                    drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            {/* ── Mobile slide-in drawer ── */}
            <aside
                id="admin-mobile-drawer"
                role="navigation"
                aria-label="Admin navigation drawer"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-blue shadow-2xl transition-transform duration-250 ease-in-out md:hidden ${
                    drawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer top bar */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                    <div>
                        <p className="text-sm font-black tracking-wide text-white">
                            Pharma<span className="text-grass-green">ye</span>
                        </p>
                        <p className="text-[9px] font-bold tracking-[0.2em] text-white/60 uppercase">Platform</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={closeDrawer}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Scrollable nav content — reuses the same SidebarContent */}
                <div className="flex flex-1 flex-col overflow-y-auto p-5 text-white">
                    <SidebarContent admin={admin} pathname={pathname} onNavigate={closeDrawer} />
                </div>
            </aside>

            {/* ── Content area (offset by sidebar on md+) ── */}
            <div className="md:pl-64">
                {/* Top bar with page title */}
                <header className="sticky top-0 z-10 border-b border-border-gray bg-pure-white/90 px-4 py-4 backdrop-blur sm:px-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold text-dark-charcoal">{title ?? 'Platform'}</h1>
                        <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-[10px] font-black tracking-widest text-primary-blue uppercase">
                            Super admin
                        </span>
                    </div>
                </header>

                {/* Page content */}
                <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
