"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import type { ReactNode } from "react";
import type { UserRole } from "@/app/utils/rolePermissions";
import { getRolePermissions } from "@/app/utils/rolePermissions";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

type AppShellProps = {
  children: ReactNode;
  profileName: string;
  profileEmail: string;
  userRole?: UserRole;
  onSignOut?: () => void;
  navItems?: NavItem[];
};

const adminNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", description: "Overview and quick actions" },
  {
    href: "/stock-entry",
    label: "Stock Entry",
    description: "Add incoming batches",
  },
  { href: "/sell-out", label: "Sell Out", description: "Process sales" },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Charts and insights",
  },
  { href: "/reports", label: "Reports", description: "Detailed analytics" },
];

const staffNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", description: "Overview and quick actions" },
  {
    href: "/stock-entry",
    label: "Stock Entry",
    description: "Add incoming batches",
  },
  { href: "/sell-out", label: "Sell Out", description: "Process sales" },
];

const getDefaultNavItems = (role?: UserRole): NavItem[] => {
  if (role === "admin") {
    return adminNavItems;
  }
  return staffNavItems;
};

export function AppShell({
  children,
  profileName,
  profileEmail,
  userRole = "staff",
  onSignOut,
  navItems,
}: AppShellProps) {
  const pathname = usePathname();
  const permissions = getRolePermissions(userRole);
  const effectiveNavItems = navItems || getDefaultNavItems(userRole);

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-400">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200/60 bg-white px-4 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
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

          {onSignOut ? (
            <div className="mt-5 rounded-3xl border border-rose-100 bg-rose-50/80 p-3 shadow-sm">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-rose-700"
              >
                Sign out
              </button>
            </div>
          ) : null}

          <nav className="mt-6 space-y-2">
            {effectiveNavItems.map((item) => {
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

          {onSignOut ? (
            <div className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/80 p-4 shadow-sm">
              <button
                type="button"
                onClick={onSignOut}
                className="w-full rounded-2xl border border-rose-200 bg-rose-100 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors duration-200 hover:bg-rose-200"
              >
                Sign out
              </button>
            </div>
          ) : null}

          <div className="mt-auto rounded-3xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
              Profile
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)]">
                {profileName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {profileName}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {userRole === "admin" ? "Administrator" : "Staff Member"}
                </p>
              </div>
            </div>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
              >
                Sign out
              </button>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 overflow-hidden bg-slate-50/50">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
