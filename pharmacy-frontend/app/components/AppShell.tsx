"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Menu, X } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

type AppShellProps = {
  children: ReactNode;
  profileName: string;
  profileEmail: string;
  userRole?: string;
  onSignOut?: () => void;
  navItems?: NavItem[];
  /** @deprecated AppShell now self-manages the drawer. These props are kept for backward compat but are ignored. */
  isOpen?: boolean;
  /** @deprecated See isOpen. */
  onClose?: () => void;
};

const defaultNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", description: "Overview and quick actions" },
  {
    href: "/stock-entry",
    label: "Stock Entry",
    description: "Add incoming batches",
  },
  {
    href: "/sell-out",
    label: "Sell Out",
    description: "Process outgoing sales",
  },
  { href: "/analytics", label: "Analytics", description: "Charts and trends" },
  { href: "/reports", label: "Reports", description: "Detailed sales reports" },
];

export function AppShell({
  children,
  profileName,
  profileEmail,
  userRole,
  onSignOut,
  navItems = defaultNavItems,
}: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const normalizedRole = (userRole || "").toLowerCase();
  const visibleNavItems = navItems.filter((item) => {
    if (normalizedRole === "staff") {
      return !["/analytics", "/reports"].includes(item.href);
    }
    return true;
  });

  /* ── Scroll-lock while drawer is open ── */
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  /* ── Close drawer on route change ── */
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const closeDrawer = () => setDrawerOpen(false);

  /* ── Sidebar content (shared between desktop sticky and mobile drawer) ── */
  const sidebarContent = (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm text-center">
        <h2 className="text-xl font-black tracking-wide text-white">
          Hawan <span className="text-grass-green">Drug Store</span>
        </h2>
      </div>

      <nav className="mt-6 space-y-2" aria-label="Main navigation">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeDrawer}
              className={`group flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "border-l-4 border-grass-green bg-pure-white/10 text-pure-white shadow-sm"
                  : "border-l-4 border-transparent text-off-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>
                <span className="block text-[0.92rem] font-bold">
                  {item.label}
                </span>
                <span
                  className={`mt-0.5 block text-xs font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-grass-green/80"
                      : "text-off-white/80/70 group-hover:text-off-white/80"
                  }`}
                >
                  {item.description}
                </span>
              </span>
              {isActive ? (
                <span className="ml-3 h-2 w-2 rounded-full bg-grass-green shadow-[0_0_8px_rgba(78,159,61,0.4)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-grass-green">
          Profile
        </div>
        <div className="mt-3">
          <p className="text-base font-bold text-white">{profileName}</p>
          <p className="mt-1 text-sm font-semibold text-off-white/80">
            {userRole || "User"}
          </p>
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 min-h-[44px] w-full rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary-blue transition-all duration-200 hover:bg-grass-green hover:text-white hover:shadow-md active:scale-95"
          >
            Sign out
          </button>
        ) : null}
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
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        <span className="text-base font-black tracking-wide text-white">
          Hawan <span className="text-grass-green">Drug Store</span>
        </span>
      </header>

      {/* ── Backdrop ── */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-250 lg:hidden ${
          drawerOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      {/* ── Slide-in Drawer ── */}
      <aside
        id="mobile-nav-drawer"
        role="navigation"
        aria-label="Main navigation drawer"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary-blue shadow-2xl transition-transform duration-250 ease-in-out lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header with X button */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
          <span className="text-base font-black tracking-wide text-white">
            Hawan <span className="text-grass-green">Drug Store</span>
          </span>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={closeDrawer}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white transition duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable nav content */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto px-4 py-5 pb-6">
          {sidebarContent}
        </div>
      </aside>

      {/* ── Main layout: desktop sidebar + content ── */}
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-7xl gap-4 px-3 py-3 lg:min-h-screen lg:gap-6 lg:px-5 lg:py-0">
        {/* Desktop persistent sidebar */}
        <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-primary-blue/80 bg-primary-blue px-4 py-5 shadow-2xl pb-4 lg:flex lg:sticky lg:top-0">
          {sidebarContent}
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-off-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
