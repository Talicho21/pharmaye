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
    { href: '/admin/dashboard', label: 'Overview',      icon: LayoutDashboard },
    { href: '/admin/stores',    label: 'Stores',        icon: Building2 },
    { href: '/admin/users',     label: 'Users',         icon: Users },
    { href: '/admin/billing',   label: 'Billing',       icon: CreditCard },
    { href: '/admin/activity',  label: 'Activity log',  icon: Activity },
    { href: '/admin/sell-out-field-settings', label: 'Sell Out Form', icon: LayoutDashboard },
    { href: '/admin/settings',  label: 'Settings',      icon: Settings },
];

/** Shared nav body — used in both the desktop sidebar and the mobile drawer */
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
        <div className="flex h-full flex-col">
            {/* Brand */}
            <Link
                href={route('admin.dashboard')}
                prefetch
                cacheFor="1m"
                className="mb-8 flex items-center gap-3"
                onClick={onNavigate}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <AppLogoIcon className="size-6 fill-current" />
                </div>
                <div>
                    <p className="text-sm font-black tracking-wide">
                        Pharma<span className="text-brand-accent">ye</span>
                    </p>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Platform</p>
                </div>
            </Link>

            {/* Scrollable nav links */}
            <nav className="flex-1 space-y-1 overflow-y-auto" aria-label="Platform admin">
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
                            prefetch
                            cacheFor="1m"
                            onClick={onNavigate}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
                                isActive
                                    ? 'bg-white text-brand-dark shadow-sm'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User profile + sign-out — pinned to bottom */}
            <div className="mt-4 shrink-0 border-t border-white/10 pt-4">
                <p className="truncate text-sm font-semibold">{admin?.name}</p>
                <p className="truncate text-xs text-white/60">{admin?.email}</p>
                <button
                    type="button"
                    onClick={() => router.post(route('admin.logout'))}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white/70 transition hover:text-white"
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                </button>
            </div>
        </div>
    );
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
    const { auth } = usePage<SharedData>().props;
    const pathname = usePage().url;
    const admin = auth.admin;

    // Desktop: sidebar open/closed (defaults open)
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Mobile: drawer open/closed (defaults closed)
    const [drawerOpen, setDrawerOpen] = useState(false);

    const closeDrawer = () => setDrawerOpen(false);
    const toggleSidebar = () => {
        // On mobile (< md), open/close the drawer
        if (window.innerWidth < 768) {
            setDrawerOpen((prev) => !prev);
        } else {
            // On desktop, collapse/expand the sidebar
            setSidebarOpen((prev) => !prev);
        }
    };

    /* Scroll-lock body while mobile drawer is open */
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [drawerOpen]);

    /* Auto-close mobile drawer on route change */
    useEffect(() => {
        closeDrawer();
    }, [pathname]);

    return (
        <div className="flex min-h-screen bg-brand-background dark:bg-brand-background">

            {/* ══════════════════════════════════════════
                DESKTOP SIDEBAR — visible on md+
                Slides in/out with sidebarOpen state
            ══════════════════════════════════════════ */}
            <aside
                className={`hidden md:flex fixed inset-y-0 left-0 z-20 flex-col bg-brand-dark p-5 text-white overflow-y-auto shadow-xl transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
                }`}
            >
                <SidebarContent admin={admin} pathname={pathname} />
            </aside>

            {/* ══════════════════════════════════════════
                MOBILE BACKDROP
            ══════════════════════════════════════════ */}
            <div
                aria-hidden="true"
                onClick={closeDrawer}
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-250 md:hidden ${
                    drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            {/* ══════════════════════════════════════════
                MOBILE SLIDE-IN DRAWER
            ══════════════════════════════════════════ */}
            <aside
                id="admin-mobile-drawer"
                role="navigation"
                aria-label="Admin navigation drawer"
                className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-brand-dark shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
                    drawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer top bar with X close */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                    <div>
                        <p className="text-sm font-black tracking-wide text-white">
                            Pharma<span className="text-brand-accent">ye</span>
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

                {/* Scrollable drawer content */}
                <div className="flex flex-1 flex-col overflow-y-auto p-5 text-white">
                    <SidebarContent admin={admin} pathname={pathname} onNavigate={closeDrawer} />
                </div>
            </aside>

            {/* ══════════════════════════════════════════
                MAIN CONTENT COLUMN
                Shifts right when desktop sidebar is open
            ══════════════════════════════════════════ */}
            <div
                className={`flex min-h-screen w-full flex-col transition-all duration-300 ease-in-out ${
                    sidebarOpen ? 'md:pl-64' : 'md:pl-0'
                }`}
            >
                {/* ── Sticky top header (ALL screen sizes) ── */}
                <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-brand-muted bg-white/95 px-4 shadow-sm backdrop-blur sm:px-6 dark:border-brand-muted dark:bg-brand-dark/95">
                    {/* Hamburger — always visible, toggles sidebar on desktop / drawer on mobile */}
                    <button
                        type="button"
                        aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
                        aria-expanded={sidebarOpen}
                        onClick={toggleSidebar}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-text/60 transition hover:bg-brand-background hover:text-brand-text focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none dark:text-brand-text dark:hover:bg-brand-dark dark:hover:text-white"
                    >
                        <Menu className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <h1 className="flex-1 text-base font-bold text-brand-text truncate">{title ?? 'Platform'}</h1>

                    <span className="shrink-0 rounded-full bg-brand-primary/10 px-3 py-1 text-[10px] font-black tracking-widest text-brand-primary uppercase dark:bg-brand-primary/20 dark:text-brand-accent">
                        Super admin
                    </span>
                </header>

                {/* ── Page content — scrolls both X and Y ── */}
                <main className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 lg:p-8 dark:bg-brand-background">
                    <div className="min-w-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
