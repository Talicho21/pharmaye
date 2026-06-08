"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/AppShell";
import {
  MultiItemOrderCart,
  type CartItem,
} from "@/app/components/MultiItemOrderCart";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/app/utils/session";

const SESSION_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

type UserRole = "admin" | "staff";

type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
  message?: string;
};

type InventoryItem = {
  id: number;
  name: string;
  category_name?: string | null;
  batch_number: string;
  quantity: number;
  expiry_date: string | null;
  price_per_unit: number | null;
};

type CategoryOption = {
  id: string;
  label: string;
};

type Toast = {
  title: string;
  description: string;
  tone: "success" | "error" | "info";
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isSellOutOpen, setIsSellOutOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const pageClassName =
    theme === "dark"
      ? "min-h-screen bg-[radial-gradient(circle_at_top,#020617,#0f172a_45%,#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8"
      : "min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff,#f8fafc_40%,#e9eefb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8";

  const dashboardFrameClassName =
    theme === "dark"
      ? "mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-6 lg:p-8"
      : "mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-white/80 bg-slate-50/60 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md sm:p-6 lg:p-8";

  const sectionTitleClassName =
    "group inline-flex items-center gap-2 text-xl font-bold text-slate-950 transition-colors duration-300 hover:text-emerald-600";

  const titleLineClassName =
    "relative inline-flex pb-1 after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-emerald-500 after:transition-transform after:duration-300 group-hover:after:scale-x-100";

  const metricCardClassName =
    "group rounded-4xl border border-emerald-100/80 bg-linear-to-br from-white to-emerald-50/60 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_26px_80px_rgba(15,23,42,0.14)]";

  const headerButtonClassName =
    "inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:text-white hover:shadow-[0_12px_30px_rgba(255,255,255,0.16)] active:translate-y-0";

  const actionTileTitleClassName =
    "mt-3 text-2xl font-black text-slate-950 transition-colors duration-300 group-hover:text-emerald-700 group-hover:underline group-hover:decoration-emerald-400 group-hover:decoration-2 group-hover:underline-offset-8";

  const actionTileCaptionClassName =
    "mt-2 text-sm leading-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-700";

  const headerClassName =
    theme === "dark"
      ? "rounded-4xl border border-slate-800 bg-linear-to-r from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.3)] sm:p-8"
      : "rounded-4xl border border-white/80 bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-8";

  const loadInventory = useCallback(
    async (quiet = false) => {
      if (!token || !user) {
        return;
      }

      setIsLoadingInventory(true);
      try {
        const response = await fetch(`${API_BASE}/inventory`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load inventory");
        }

        const data = await response.json();
        setInventory(Array.isArray(data) ? data : []);
      } catch {
        if (!quiet) {
          setToast({
            title: "Inventory unavailable",
            description: "The backend did not return inventory data.",
            tone: "info",
          });
        }
      } finally {
        setIsLoadingInventory(false);
      }
    },
    [token, user],
  );

  const handleRefreshInventory = useCallback(() => {
    void loadInventory(false);
  }, [loadInventory]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    setMounted(true);
    const hydrateSession = async () => {
      try {
        const savedTheme = localStorage.getItem("pharmacy_theme_v1") as
          | "light"
          | "dark"
          | null;
        const prefersDark =
          window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
        const initialTheme = savedTheme ?? (prefersDark ? "dark" : "light");
        setTheme(initialTheme);
        document.documentElement.dataset.theme = initialTheme;
        document.documentElement.classList.toggle(
          "dark",
          initialTheme === "dark",
        );

        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          const cookieToken = readSessionCookie();
          if (!cookieToken) {
            return;
          }

          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              Authorization: `Bearer ${cookieToken}`,
            },
          });

          if (!response.ok) {
            clearSessionCookie();
            localStorage.removeItem(SESSION_KEY);
            return;
          }

          const payload = (await response.json()) as { user?: AuthUser };
          if (payload?.user) {
            setToken(cookieToken);
            setUser(payload.user);
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ token: cookieToken, user: payload.user }),
            );
            setSessionCookie(cookieToken);
          }
          return;
        }

        const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
        if (parsed?.token && parsed?.user) {
          setToken(parsed.token);
          setUser(parsed.user);
          setSessionCookie(parsed.token);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setAuthChecked(true);
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pharmacy_theme_v1", theme);
  }, [mounted, theme]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!token || !user) {
      setInventory([]);
      return;
    }

    void loadInventory(true);
  }, [loadInventory, token, user]);

  const lowStockCount = useMemo(
    () => inventory.filter((item) => item.quantity <= 10).length,
    [inventory],
  );

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const options = new Map<string, CategoryOption>();
    options.set("all", { id: "all", label: "All categories" });

    for (const item of inventory) {
      const label = item.category_name?.trim() || "Uncategorized";
      const key = label.toLowerCase();
      if (!options.has(key)) {
        options.set(key, { id: key, label });
      }
    }

    return Array.from(options.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [inventory]);

  const visibleInventory = useMemo(() => {
    const query = inventoryQuery.trim().toLowerCase();

    return inventory.filter((item) => {
      const categoryLabel = item.category_name?.trim() || "Uncategorized";
      const matchesCategory =
        selectedCategory === "all" ||
        categoryLabel.toLowerCase() === selectedCategory;
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.batch_number.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  }, [inventory, inventoryQuery, selectedCategory]);

  const expiredCount = useMemo(
    () =>
      inventory.filter((item) => {
        if (!item.expiry_date) {
          return false;
        }

        return new Date(item.expiry_date).getTime() < Date.now();
      }).length,
    [inventory],
  );

  const handleSellOutSubmit = async (
    items: CartItem[],
    customerName: string,
    tinNumber: string,
    sellerName?: string,
    customerSNo?: string,
    paymentMethod?: "cash" | "credit",
    invoiceNo?: string,
    reference?: string,
  ) => {
    if (!token) {
      throw new Error("Missing auth token");
    }

    setIsProcessingSale(true);

    try {
      const salesPayload = items.map((item) => ({
        batch_id: item.medicineId,
        quantity_sold: item.quantity,
        medicine_name: item.medicineName,
      }));

      const response = await fetch(`${API_BASE}/inventory/bulk-sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sales: salesPayload,
          items: items.map((item) => ({
            medicine_id: item.medicineId,
            batch_number: item.batchNumber,
            medicine_name: item.medicineName,
            quantity: item.quantity,
            price_per_unit: item.pricePerUnit,
          })),
          seller_name: sellerName?.trim() || undefined,
          receiver_name: customerName.trim(),
          customer_name: customerName.trim(),
          customer_tin: tinNumber.trim(),
          tin_number: tinNumber.trim(),
          customer_sno: customerSNo?.trim() || null,
          payment_method: paymentMethod || "cash",
          invoice_no: invoiceNo || undefined,
          reference: reference || undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Could not process bulk sale");
      }

      setToast({
        title: "Sale recorded",
        description: `Processed ${payload?.data?.total_items_processed ?? items.length} item(s).`,
        tone: "success",
      });

      // Reflect stock updates immediately in UI, then sync from server.
      const soldById = new Map<number, number>();
      for (const item of items) {
        soldById.set(
          item.medicineId,
          (soldById.get(item.medicineId) || 0) + item.quantity,
        );
      }

      setInventory((previous) =>
        previous.map((row) => {
          const sold = soldById.get(row.id) || 0;
          return sold > 0
            ? {
                ...row,
                quantity: Math.max(0, row.quantity - sold),
              }
            : row;
        }),
      );

      setIsSellOutOpen(false);
      await fetch(`${API_BASE}/inventory`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => setInventory(Array.isArray(data) ? data : []));
    } catch (error) {
      setToast({
        title: "Sale failed",
        description:
          error instanceof Error ? error.message : "Unable to process sale.",
        tone: "error",
      });
      throw error;
    } finally {
      setIsProcessingSale(false);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setToast(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as LoginResponse & {
        error?: string;
      };

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error ?? data.message ?? "Login failed");
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ token: data.token, user: data.user }),
      );
      setSessionCookie(data.token);
      setPassword("");
      setToast({
        title: "Signed in",
        description: `Welcome back, ${data.user.username}.`,
        tone: "success",
      });
    } catch (error) {
      setToast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Unable to authenticate.",
        tone: "error",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setInventory([]);
    localStorage.removeItem(SESSION_KEY);
    clearSessionCookie();
    setToast({
      title: "Signed out",
      description: "Your session was cleared.",
      tone: "info",
    });
  };

  if (!mounted || !authChecked) {
    return (
      <main className={pageClassName}>
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-slate-500 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            Loading pharmacy dashboard...
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className={pageClassName}>
        <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
              Pharmacy system
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Faster stock entry, cleaner analytics, and a simpler dashboard.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Stock entry now lives on its own page, analytics live
                separately, and the main dashboard stays focused on login,
                status, and shortcuts.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Dedicated stock page", value: "/stock-entry" },
                { label: "Analytics page", value: "/analytics" },
                { label: "PostgreSQL auth", value: "Active" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-4xl border border-white/80 bg-white/85 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-950">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-bold text-slate-950">Sign in</h2>
              <p className="text-sm leading-6 text-slate-500">
                Use your pharmacy account to access the dashboard.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {toast ? (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                  toast.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : toast.tone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                <div className="font-semibold">{toast.title}</div>
                <div className="mt-1">{toast.description}</div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      profileName={user.username}
      profileEmail={`${user.username}@expresspharma.local`}
      userRole={user.role}
      onSignOut={handleLogout}
    >
      <div className={dashboardFrameClassName}>
        <header className={headerClassName}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/85">
                Pharmacy dashboard
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Welcome back, {user.username}.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-sky-50/90 sm:text-base">
                Stock entry and analytics now live on separate pages so the
                dashboard stays open and readable.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefreshInventory}
                disabled={isLoadingInventory}
                className={
                  headerButtonClassName +
                  " disabled:cursor-not-allowed disabled:opacity-70"
                }
              >
                {isLoadingInventory ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className={headerButtonClassName}
              >
                {theme === "dark" ? "Light mode" : "Night mode"}
              </button>
            </div>
          </div>
        </header>

        {toast ? (
          <div
            className={`rounded-4xl border px-5 py-4 text-sm shadow-[0_20px_50px_rgba(15,23,42,0.08)] ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : toast.tone === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-800"
                  : "border-sky-200 bg-sky-50 text-sky-800"
            }`}
          >
            <div className="font-semibold">{toast.title}</div>
            <div className="mt-1">{toast.description}</div>
          </div>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setIsSellOutOpen(true)}
            className="group rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6 text-left shadow-[0_18px_55px_rgba(16,24,40,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/80 hover:shadow-[0_24px_70px_rgba(16,24,40,0.14)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700 transition-colors duration-300 group-hover:text-emerald-600">
              Sell out
            </div>
            <div className="mt-3 text-2xl font-black text-slate-950 transition-colors duration-300 group-hover:text-emerald-700 group-hover:underline group-hover:decoration-emerald-400 group-hover:decoration-2 group-hover:underline-offset-8">
              Open sales cart
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
              Use the existing attachment flow to sell one or more medicines.
            </p>
          </button>
          <Link
            href="/stock-entry"
            className="group rounded-3xl border border-sky-100 bg-sky-50/60 p-6 shadow-[0_18px_55px_rgba(16,24,40,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:bg-sky-50/80 hover:shadow-[0_24px_70px_rgba(16,24,40,0.14)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 transition-colors duration-300 group-hover:text-sky-600">
              Stock entry
            </div>
            <div className={actionTileTitleClassName}>Add or receive stock</div>
            <p className={actionTileCaptionClassName}>
              Use the dedicated stock page for new inventory, optional category
              entry, and category auto-creation.
            </p>
          </Link>
          <Link
            href="/analytics"
            className="group rounded-3xl border border-violet-100 bg-violet-50/60 p-6 shadow-[0_18px_55px_rgba(16,24,40,0.10)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-50/80 hover:shadow-[0_24px_70px_rgba(16,24,40,0.14)]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 transition-colors duration-300 group-hover:text-sky-600">
              Analytics
            </div>
            <div className={actionTileTitleClassName}>
              View charts and reports
            </div>
            <p className={actionTileCaptionClassName}>
              Inventory trends, inactivity, and sales reporting now have their
              own page.
            </p>
          </Link>
          <div className="group rounded-3xl border border-slate-100 bg-slate-50/70 p-6 shadow-[0_18px_55px_rgba(16,24,40,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-200 hover:bg-slate-50/90 hover:shadow-[0_24px_70px_rgba(16,24,40,0.12)]">
            <div className="group inline-flex items-center text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition-colors duration-300 hover:text-slate-700">
              <span className={titleLineClassName}>Session</span>
            </div>
            <div className="mt-3 text-2xl font-black text-slate-950 transition-colors duration-300 group-hover:text-slate-700 group-hover:underline group-hover:decoration-slate-400 group-hover:decoration-2 group-hover:underline-offset-8">
              {user.role}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500 transition-colors duration-300 group-hover:text-slate-700">
              Signed in as {user.username}.
            </p>
          </div>
        </section>

        <MultiItemOrderCart
          isOpen={isSellOutOpen}
          onClose={() => setIsSellOutOpen(false)}
          onSubmit={handleSellOutSubmit}
          isProcessing={isProcessingSale}
        />

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Items loaded", value: inventory.length },
            { label: "Low stock", value: lowStockCount },
            { label: "Expired", value: expiredCount },
          ].map((item) => (
            <div key={item.label} className={metricCardClassName}>
              <div className="group/title inline-flex items-center text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 transition-colors duration-300 hover:text-emerald-600">
                <span className={titleLineClassName}>{item.label}</span>
              </div>
              <div className="mt-3 text-3xl font-black text-slate-950 transition-colors duration-300 group-hover:text-emerald-700 group-hover:underline group-hover:decoration-emerald-400 group-hover:decoration-2 group-hover:underline-offset-8">
                {item.value}
              </div>
              <div className="mt-4 h-px w-full bg-linear-to-r from-emerald-200 via-emerald-100 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
            </div>
          ))}
        </section>

        <section className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className={sectionTitleClassName}>
                <span className={titleLineClassName}>Current inventory</span>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Search by medicine name or batch number, then filter by
                category.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={inventoryQuery}
                onChange={(event) => setInventoryQuery(event.target.value)}
                placeholder="Search by name or batch"
                className="min-w-55 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              {isLoadingInventory ? (
                <span className="text-sm font-semibold text-slate-500">
                  Refreshing...
                </span>
              ) : null}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {visibleInventory.slice(0, 10).map((item) => {
                  const initialQty =
                    (item as any).initial_batch_quantity ??
                    (item as any).initial_quantity ??
                    item.quantity;
                  const pct = initialQty > 0 ? item.quantity / initialQty : 1;
                  const now = new Date();
                  const expiry = item.expiry_date
                    ? new Date(item.expiry_date)
                    : null;
                  let expiryMessage: {
                    tone?: "danger" | "warning" | "ok";
                    text?: string;
                  } = {};

                  if (expiry) {
                    const monthsLeft =
                      (expiry.getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24 * 30);
                    if (expiry.getTime() < now.getTime()) {
                      expiryMessage = {
                        tone: "danger",
                        text: "This medicine is expired — remove from stock",
                      };
                    } else if (monthsLeft <= 6) {
                      expiryMessage = {
                        tone: "warning",
                        text: "Expires in under 6 months — sell immediately",
                      };
                    }
                  }

                  const lowStock = pct <= 0.2;

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="inventory-note mt-1">
                            Batch {item.batch_number}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.category_name ?? "Uncategorized"}
                      </td>
                      <td className="px-4 py-3">{item.batch_number}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold">
                            {item.quantity}
                          </span>
                          {lowStock ? (
                            <span
                              className="badge-cool"
                              title="Low stock — add to stock"
                            >
                              This item may disappear — add to stock
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span>{item.expiry_date ?? "-"}</span>
                          {expiryMessage.tone === "danger" ? (
                            <span className="badge-danger">
                              {expiryMessage.text}
                            </span>
                          ) : expiryMessage.tone === "warning" ? (
                            <span className="badge-warning">
                              {expiryMessage.text}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!visibleInventory.length ? (
                  <tr>
                    <td
                      className="px-4 py-8 text-center text-slate-500"
                      colSpan={5}
                    >
                      No inventory matches the current search and category
                      filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
