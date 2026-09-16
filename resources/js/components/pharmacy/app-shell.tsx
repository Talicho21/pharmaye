import { Link, router, usePage } from '@inertiajs/react';
import { Menu, Settings, X } from 'lucide-react';
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
};

const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', description: 'Overview and quick actions' },
    { href: '/stock-entry', label: 'Stock Entry', description: 'Add incoming batches' },
    { href: '/sell-out', label: 'Sell Out', description: 'Process outgoing sales' },
    { href: '/reports', label: 'Reports', description: 'Analytics and sales reports', adminOnly: true },
    { href: '/settings/profile', label: 'Settings', description: '', icon: Settings, activeBase: '/settings' },
];

/**
 * Ported from the legacy Next.js AppShell: same blue sidebar / mobile drawer
 * markup, adapted to Inertia (Link, usePage().url, shared store branding).
 */
export function AppShell({ children }: AppShellProps) {
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
            {brandFirst} {brandRest.length > 0 && <span className="text-grass-green">{brandRest.join(' ')}</span>}
        </span>
    );

    /* ── Sidebar content (shared between desktop sticky and mobile drawer) ── */
    const sidebarContent = (
        <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-sm">
                {store?.logo_url && <img src={store.logo_url} alt={`${storeName} logo`} className="mx-auto mb-2 h-12 w-12 rounded-lg object-cover" />}
                <h2 className="text-xl font-black tracking-wide text-white">
                    {brandFirst} {brandRest.length > 0 && <span className="text-grass-green">{brandRest.join(' ')}</span>}
                </h2>
            </div>

            <nav className="mt-6 space-y-2" aria-label="Main navigation">
                {visibleNavItems.map((item) => {
                    const base = item.activeBase ?? item.href;
                    const isActive = pathname === item.href || pathname.startsWith(base + '?') || pathname.startsWith(base + '/') || pathname === base;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={closeDrawer}
                            className={`group flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                                isActive
                                    ? 'border-l-4 border-grass-green bg-pure-white/10 text-pure-white shadow-sm'
                                    : 'border-l-4 border-transparent text-off-white/80 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span>
                                <span className="block text-[0.92rem] font-bold">{item.label}</span>
                                <span
                                    className={`mt-0.5 block text-xs font-medium transition-colors duration-200 ${
                                        isActive ? 'text-grass-green/80' : 'text-off-white/60 group-hover:text-off-white/80'
                                    }`}
                                >
                                    {item.description}
                                </span>
                            </span>
                            {isActive ? <span className="ml-3 h-2 w-2 rounded-full bg-grass-green shadow-[0_0_8px_rgba(78,159,61,0.4)]" /> : null}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
                <div className="text-xs font-black tracking-[0.28em] text-grass-green uppercase">Profile</div>
                <div className="mt-3">
                    <p className="text-base font-bold text-white">{auth.user?.name}</p>
                    <p className="mt-1 text-sm font-semibold text-off-white/80 capitalize">{auth.user?.role ?? 'User'}</p>
                </div>
                <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-4 min-h-[44px] w-full rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary-blue transition-all duration-200 hover:bg-grass-green hover:text-white hover:shadow-md active:scale-95"
                >
                    Sign out
                </button>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-off-white text-dark-charcoal">
            {/* ── Mobile / Tablet top header bar ── */}
            <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-primary-blue/20 bg-primary-blue px-4 lg:hidden">
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
                className={`duration-250 fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-blue shadow-2xl transition-transform ease-in-out lg:hidden ${
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
                <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-5 pb-6">{sidebarContent}</div>
            </aside>

            {/* ── Main layout: desktop sidebar + content ── */}
            <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl gap-4 px-3 py-3 lg:min-h-screen lg:gap-6 lg:px-5 lg:py-0">
                {/* Desktop persistent sidebar */}
                <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-primary-blue/80 bg-primary-blue px-4 py-5 pb-4 shadow-2xl lg:sticky lg:top-0 lg:flex">
                    {sidebarContent}
                </aside>

                {/* Page content */}
                <main className="min-w-0 flex-1 overflow-y-auto bg-off-white">
                    <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 lg:py-5">{children}</div>
                </main>
            </div>
        </div>
    );
}
