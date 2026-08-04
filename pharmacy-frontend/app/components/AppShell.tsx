"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { ReactNode } from "react";

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
  isOpen?: boolean;
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
  isOpen = false,
  onClose,
}: AppShellProps) {
  const pathname = usePathname();
  const normalizedRole = (userRole || "").toLowerCase();
  const visibleNavItems = navItems.filter((item) => {
    if (normalizedRole === "staff") {
      return !["/analytics", "/reports"].includes(item.href);
    }
    return true;
  });

  const sidebarContent = (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-sm text-center">
        <h2 className="text-xl font-black tracking-wide text-white">
          Hawan <span className="text-grass-green">Drug Store</span>
        </h2>
      </div>

      <nav className="mt-6 space-y-2">
        {visibleNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "border-l-4 border-grass-green bg-pure-white/10 text-pure-white shadow-sm"
                  : "border-l-4 border-transparent text-off-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span>
                <span className="block text-[0.92rem] font-bold">
                  {item.label}
                </span>
                <span className={`mt-0.5 block text-xs font-medium transition-colors duration-200 ${isActive ? "text-grass-green/80" : "text-off-white/80/70 group-hover:text-off-white/80"}`}>
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
          <p className="text-base font-bold text-white">
            {profileName}
          </p>
          <p className="mt-1 text-sm font-semibold text-off-white/80">
            {userRole || "User"}
          </p>
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 w-full rounded-lg bg-white px-4 py-2 text-sm font-bold text-primary-blue transition-all duration-200 hover:bg-grass-green hover:text-white hover:shadow-md active:scale-95"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-off-white text-dark-charcoal">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:gap-6 lg:px-5">
        <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-primary-blue/80 bg-primary-blue px-4 py-5 shadow-2xl pb-4 md:flex md:sticky md:top-0">
          {sidebarContent}
        </aside>

        {isOpen ? (
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-primary-blue shadow-2xl transition-transform duration-300 ease-in-out md:hidden"
            style={{ transform: "translateX(0)" }}
          >
            <aside className="flex h-full w-full flex-col justify-between overflow-y-auto px-4 py-5 pb-4">
              {sidebarContent}
            </aside>
          </div>
        ) : null}

        <main className="flex-1 min-w-0 overflow-y-auto bg-off-white">
          <div className="mx-auto w-full max-w-5xl px-4 py-4 md:px-8 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
