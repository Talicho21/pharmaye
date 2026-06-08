"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname || "/";
  const permissions = getRolePermissions(userRole);
  const effectiveNavItems = navItems || getDefaultNavItems(userRole);

  const closeDrawer = () => setDrawerOpen(false);
  const toggleDrawer = () => setDrawerOpen((previous) => !previous);

  const navPanel = (
    <div className="flex h-full flex-col">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-2 shadow-sm">
        <div className="relative h-20 w-full">
          <Image
            src="/Logo.jpg"
            alt="Express Pharma Wholesale Suite"
            fill
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-2 text-center text-xs font-black uppercase tracking-[0.2em] text-slate-700">
          Wholesale Suite
        </p>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {effectiveNavItems.map((item) => {
          const isActive =
            currentPath === item.href ||
            (item.href !== "/" && currentPath.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={closeDrawer}
            >
              <span>
                <span className="block text-sm font-bold">{item.label}</span>
                <span className="mt-0.5 block text-xs font-medium text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
                  {item.description}
                </span>
              </span>
              {isActive ? (
                <span className="ml-2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
          Profile
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-xs font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)]">
            {profileName.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-950">
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
            onClick={() => {
              closeDrawer();
              onSignOut();
            }}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:bg-rose-700"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900">
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 rounded-xl overflow-hidden bg-slate-100">
            <Image
              src="/Logo.jpg"
              alt="Express Pharma"
              fill
              className="object-cover"
              priority
            />
          </div>
          <span className="text-sm font-bold text-slate-900">
            Express Pharma
          </span>
        </div>
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          {drawerOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={closeDrawer}
        />
      ) : null}

      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-64 md:flex-col md:border-r md:border-slate-200/60 md:bg-white md:px-4 md:py-4 md:shadow-[0_10px_30px_rgba(15,23,42,0.04)] lg:w-72">
        {navPanel}
      </aside>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white p-4 shadow-2xl transition-transform duration-300 md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Menu</p>
            <p className="text-xs text-slate-500">Navigation drawer</p>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4">{navPanel}</div>
      </div>

      <main className="relative overflow-hidden bg-slate-50/50 pt-14 md:ml-64 lg:ml-72">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
