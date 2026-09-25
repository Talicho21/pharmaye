import { Link, router, usePage } from '@inertiajs/react';
import { BarChart3, LayoutDashboard, Menu, Package, Settings, ShoppingCart, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { useStoreSuspensionGuard } from '@/hooks/use-store-suspension-guard';
import type { SharedData } from '@/types';

type NavItem = {
    href: string;
    label: string;
    description: string;
    adminOnly?: boolean;
    icon?: React.ElementType;
    activeBase?: string; // match active state on this prefix instead of href
};

type AppShellProps = {
    children: ReactNode;
    pageTitle?: string;
    pageSubtitle?: string;
};

const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', description: 'Overview and quick actions', icon: LayoutDashboard },
    { href: '/inventory', label: 'Inventory', description: 'View and manage stock items', icon: Package },
    { href: '/sell-out', label: 'Sell Out', description: 'Process outgoing sales', icon: ShoppingCart },
    { href: '/reports', label: 'Reports', description: 'Analytics and sales reports', icon: BarChart3 },
    { href: '/settings/profile', label: 'Settings', description: '', icon: Settings, activeBase: '/settings' },
];

/**
 * Ported from the legacy Next.js AppShell: same blue sidebar / mobile drawer
 * markup, adapted to Inertia (Link, usePage().url, shared store branding).
 */
export function AppShell({ children, pageTitle, pageSubtitle }: AppShellProps) {
    const { auth, store } = usePage<SharedData>().props;
    const pathname = usePage().url;
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Redirect to /store-suspended immediately if the store is suspended.
    // This covers the case where a user types a URL directly.
    useStoreSuspensionGuard();

    const isAdmin = auth.user?.role === 'admin';
    const visibleNavItems = navItems.filter((item) => !item.adminOnly || isAdmin);

    const storeName = store?.name ?? 'Pharmacy';
    const [brandFirst, ...brandRest] = storeName.split(' ');

    /* ── Scroll-lock while drawer is open ── */
    useEffect(() => {
        document.body.style.overflow = drawerOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [drawerOpen]);

    /* ── Close drawer on route change ── */
    useEffect(() => {
        setDrawerOpen(false);
    }, [pathname]);

    const closeDrawer = () => setDrawerOpen(false);
    const handleSignOut = () => router.post(route('logout'));

    const brand = (
        <span className="text-base font-black tracking-wide text-white">
            {brandFirst} {brandRest.length > 0 && <span className="text-brand-accent">{brandRest.join(' ')}</span>}
        </span>
    );

    /* ── Sidebar content (shared between desktop sticky and mobile drawer) ── */
    const sidebarContent = (
        <div className="flex flex-col">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-center shadow-sm backdrop-blur-xs transition-all duration-200 dark:border-white/10 dark:bg-white/[0.06]">
                {store?.logo_url && (
                    <img
                        src={store.logo_url}
                        alt={`${storeName} logo`}
                        className="mx-auto mb-2 h-11 w-11 rounded-xl object-cover shadow-sm ring-1 ring-white/15"
                    />
                )}
                <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">
                    {brandFirst} {brandRest.length > 0 && <span className="text-brand-accent">{brandRest.join(' ')}</span>}
                </h2>
            </div>

            <nav className="mt-4 space-y-1.5" aria-label="Main navigation">
                {visibleNavItems.map((item) => {
                    const base = item.activeBase ?? item.href;
                    const isActive = pathname === item.href || pathname.startsWith(base + '?') || pathname.startsWith(base + '/') || pathname === base;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeDrawer}
                            className={`group flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3 transition-all duration-200 ease-out ${
                                isActive
                                    ? 'border-l-4 border-brand-accent bg-white/10 text-white shadow-sm'
                                    : 'border-l-4 border-transparent hover:bg-white/[0.06] hover:translate-x-1 active:scale-[0.99]'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {Icon && (
                                    <Icon
                                        className={`h-5 w-5 shrink-0 transition-all duration-200 ease-out ${
                                            isActive ? 'text-white' : 'text-emerald-100/60 group-hover:text-white'
                                        }`}
                                        aria-hidden="true"
                                    />
                                )}
                                <div className="flex flex-col">
                                    <span
                                        className={
                                            isActive
                                                ? 'text-base font-semibold tracking-tight text-white'
                                                : 'text-base font-semibold tracking-tight text-slate-200 group-hover:text-white'
                                        }
                                    >
                                        {item.label}
                                    </span>
                                    {item.description ? (
                                        <span
                                            className={`text-xs font-normal leading-relaxed transition-all duration-200 ease-out ${
                                                isActive
                                                    ? 'text-emerald-100/90'
                                                    : 'text-emerald-100/60 group-hover:text-emerald-100/90'
                                            }`}
                                        >
                                            {item.description}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                            {isActive ? (
                                <span className="relative ml-3 flex h-2.5 w-2.5 shrink-0">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );

    return (
        <div className="min-h-screen bg-brand-background text-brand-text dark:bg-brand-background">
            {/* ── Mobile / Tablet top header bar ── */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-brand-dark/20 bg-brand-dark px-4 lg:hidden">
                <button
                    type="button"
                    aria-label="Open navigation menu"
                    aria-expanded={drawerOpen}
                    aria-controls="mobile-nav-drawer"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                    <Menu className="h-6 w-6" aria-hidden="true" />
                </button>
                {brand}
            </header>

            {/* ── Backdrop ── */}
            <div
                aria-hidden="true"
                onClick={closeDrawer}
                className={`duration-250 fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
                    drawerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            {/* ── Slide-in Drawer ── */}
            <aside
                id="mobile-nav-drawer"
                role="navigation"
                aria-label="Main navigation drawer"
                className={`duration-250 fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-brand-dark shadow-2xl transition-transform ease-in-out lg:hidden ${
                    drawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Drawer header with X button */}
                <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
                    {brand}
                    <button
                        type="button"
                        aria-label="Close navigation menu"
                        onClick={closeDrawer}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition duration-150 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Scrollable nav content */}
                <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-3.5 pb-6">{sidebarContent}</div>
            </aside>

            {/* ── Main layout: desktop sidebar + content ── */}
            <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl gap-4 px-3 py-2 lg:min-h-screen lg:gap-6 lg:px-5 lg:py-0">
                {/* Desktop persistent sidebar */}
                <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-brand-dark/80 bg-brand-dark px-4 pt-3 pb-4 shadow-2xl dark:border-slate-700/60 dark:shadow-slate-950/80 lg:sticky lg:top-0 lg:flex">
                    {sidebarContent}
                </aside>

                {/* Page content */}
                <main className="min-w-0 flex-1 flex-col overflow-x-hidden bg-brand-background dark:bg-brand-background">
                    <div className={`flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-10 ${pageTitle ? 'pt-3 pb-2.5' : 'pt-2.5 pb-0.5'}`}>
                        {/* Page title — rendered in the top bar, same row as Logout */}
                        {pageTitle ? (
                            <div>
                                {pageSubtitle && (
                                    <p className="text-xs font-black tracking-[0.3em] text-brand-text/70 uppercase">
                                        {pageSubtitle}
                                    </p>
                                )}
                                <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-brand-text">
                                    {pageTitle}
                                </h1>
                            </div>
                        ) : (
                            <div />
                        )}
                        <button
                            type="button"
                            onClick={handleSignOut}
                            className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-brand-primary shadow-sm transition-all duration-200 hover:bg-brand-primary hover:text-white hover:shadow-md active:scale-95 dark:bg-brand-dark dark:text-brand-accent dark:hover:bg-brand-primary dark:hover:text-white"
                        >
                            Logout
                        </button>
                    </div>
                    <div className={`mx-auto w-full max-w-5xl px-4 pb-4 sm:px-6 md:px-8 lg:pb-5 ${pageTitle ? '' : 'pt-1'}`}>{children}</div>
                </main>
            </div>
        </div>
    );
}
