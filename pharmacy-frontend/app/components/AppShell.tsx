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

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:gap-6 lg:px-5">
        <aside className="hidden h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200/60 bg-white px-4 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] pb-4 md:flex md:sticky md:top-0">
          <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3 shadow-sm">
            <div className="relative h-32 w-full">
              <Image
                src="/Logo.jpg"
                alt="Express Pharma Wholesale Suite"
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.25em] text-slate-700">
              Wholesale Suite
            </p>
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
                  className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span>
                    <span className="block text-[0.92rem] font-bold">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
                      {item.description}
                    </span>
                  </span>
                  {isActive ? (
                    <span className="ml-3 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
              Profile
            </div>
            <div className="mt-3">
              <p className="text-base font-bold text-slate-950">
                {profileName}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                {userRole || "User"}
              </p>
            </div>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-red-700 hover:shadow-xl active:scale-95"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </aside>

        {isOpen ? (
          <div
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out md:hidden"
            style={{ transform: "translateX(0)" }}
          >
            <aside className="flex h-full w-full flex-col justify-between overflow-y-auto bg-white px-4 py-5 pb-4">
              <div className="rounded-3xl border border-slate-100 bg-slate-50/80 p-3 shadow-sm">
                <div className="relative h-32 w-full">
                  <Image
                    src="/Logo.jpg"
                    alt="Express Pharma Wholesale Suite"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <p className="mt-3 text-center text-xs font-black uppercase tracking-[0.25em] text-slate-700">
                  Wholesale Suite
                </p>
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
                      className={`group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 shadow-sm"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span>
                        <span className="block text-[0.92rem] font-bold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
                          {item.description}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="ml-3 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-auto rounded-3xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
                  Profile
                </div>
                <div className="mt-3">
                  <p className="text-base font-bold text-slate-950">
                    {profileName}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {userRole || "User"}
                  </p>
                </div>
                {onSignOut ? (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white shadow-lg transition-all duration-200 hover:bg-red-700 hover:shadow-xl active:scale-95"
                  >
                    Sign out
                  </button>
                ) : null}
              </div>
            </aside>
          </div>
        ) : null}

        <main className="flex-1 overflow-hidden bg-slate-50/50">
          <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
