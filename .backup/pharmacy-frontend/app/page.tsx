"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Flag, Menu, Moon, RotateCw, Sun, Package, Search, ShoppingCart, FileText, Eye, Trash2 } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { Toast } from "@/app/components/Toast";
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

const normalizeAuthToken = (value: string | null | undefined): string =>
  String(value ?? "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();

function normalizeInventoryPayload(payload: unknown): InventoryItem[] {
  if (Array.isArray(payload)) {
    return payload as InventoryItem[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as {
      items?: unknown;
      results?: unknown;
    };

    if (Array.isArray(record.items)) {
      return record.items as InventoryItem[];
    }

    if (Array.isArray(record.results)) {
      return record.results as InventoryItem[];
    }
  }

  return [];
}

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
  unit?: string | null;
};

type CategoryOption = {
  id: string;
  label: string;
};

type ToastData = {
  title: string;
  description: string;
  tone: "success" | "error" | "info";
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [popupToast, setPopupToast] = useState<string | null>(null);
  const [isSellOutOpen, setIsSellOutOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const pageClassName =
    "min-h-screen bg-off-white text-slate-800 sm:px-6 lg:px-8";

  const dashboardFrameClassName =
    "mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-dark-teal/10 bg-white p-4 shadow-xl sm:p-6 lg:p-8";

  const sectionTitleClassName =
    "group inline-flex items-center gap-2 text-xl font-bold text-slate-800 transition-colors duration-300 hover:text-dark-teal";

  const titleLineClassName =
    "relative inline-flex pb-1 after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-dark-teal text-slate-800 after:transition-transform after:duration-300 group-hover:after:scale-x-100";

  const metricCardClassName =
    "group rounded-4xl border border-muted-gold/30 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-dark-teal/50 hover:shadow-md";

  const headerButtonClassName =
    "inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:text-white active:translate-y-0";

  const actionTileTitleClassName =
    "mt-3 text-2xl font-black text-slate-800 transition-colors duration-300 group-hover:text-dark-teal group-hover:underline group-hover:decoration-muted-gold group-hover:decoration-2 group-hover:underline-offset-8";

  const actionTileCaptionClassName =
    "mt-2 text-sm leading-6 text-dark-charcoal/70 transition-colors duration-300 group-hover:text-slate-700";

  const headerClassName =
    "rounded-4xl border border-white/10 bg-gradient-to-br from-burnt-orange to-dark-teal p-6 text-white shadow-lg sm:p-8";

  const loadInventory = useCallback(
    async (quiet = false) => {
      const sessionToken = normalizeAuthToken(
        readSessionCookie("token") || token,
      );

      if (!sessionToken || !user) {
        return;
      }

      setToken(sessionToken);
      setIsLoadingInventory(true);
      try {
        const url = new URL(`${API_BASE}/inventory`, window.location.origin);
        url.searchParams.set("page", "1");
        url.searchParams.set("pageSize", "200");

        const response = await fetch(url.toString(), {
          headers: {
            "Accept-Encoding": "identity",
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load inventory");
        }

        const data = await response.json();
        const normalizedItems = normalizeInventoryPayload(data);
        const totalRecords = Number(
          typeof data === "object" && data !== null && "totalRecords" in data
            ? data.totalRecords
            : normalizedItems.length,
        );

        setInventory(normalizedItems);
        setInventoryTotal(
          Number.isFinite(totalRecords) ? totalRecords : normalizedItems.length,
        );
      } catch (err) {
        console.error("Refresh fetch failure:", err);
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

  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return "";
    return date.split("T")[0];
  };

  const handleViewDetails = useCallback((item: InventoryItem) => {
    setSelectedItem(item);
    setEditFormData({
      name: item.name,
      batchNumber: item.batch_number,
      expiryDate: item.expiry_date || "",
      quantity: item.quantity,
      unit: item.unit || "",
      price: item.price_per_unit || "",
    });
    setShowModal(true);
  }, []);

  const handleSaveSubmit = useCallback(async () => {
    if (!selectedItem) return;
    try {
      const parsedQuantity = parseInt(editFormData.quantity, 10);
      const parsedPrice = parseFloat(editFormData.price);

      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        throw new Error("Quantity must be a positive number");
      }
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error("Price must be a valid non-negative number");
      }

      const sessionToken = normalizeAuthToken(
        readSessionCookie("token") || token,
      );
      const authorizationHeader = sessionToken ? `Bearer ${sessionToken}` : "";

      if (!sessionToken) {
        throw new Error("Missing auth token");
      }

      const payload = {
        name: editFormData.name?.trim() || "",
        batchNumber: editFormData.batchNumber?.trim() || "",
        expiryDate: editFormData.expiryDate || "",
        quantity: parsedQuantity,
        unit: editFormData.unit?.trim() || "",
        price: parsedPrice,
      };

      console.log("Sending update payload:", payload);
      console.log(
        "Update endpoint:",
        `${API_BASE}/inventory/${selectedItem.id}`,
      );

      const response = await fetch(`${API_BASE}/inventory/${selectedItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "identity",
          Authorization: authorizationHeader,
        },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      const responseText = await response.text();
      console.log("Response body:", responseText);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} - ${responseText}`);
      }

      setShowModal(false);
      setSelectedItem(null);
      setEditFormData({});
      setToast({
        title: "Success",
        description: "Inventory item updated successfully.",
        tone: "success",
      });
      await loadInventory(true);
    } catch (err) {
      console.error("Save error:", err);
      setToast({
        title: "Update failed",
        description:
          err instanceof Error ? err.message : "Failed to update item.",
        tone: "error",
      });
    }
  }, [editFormData, selectedItem, token, loadInventory, API_BASE]);

  const handleDeleteClick = useCallback(
    async (id: number) => {
      const confirmed = window.confirm(
        "Are you sure you want to delete this inventory item? This action cannot be undone.",
      );
      if (!confirmed) return;

      try {
        const primaryUrl = `${API_BASE}/inventory/${id}`;
        const fallbackUrl = `${API_BASE}/inventory/delete/${id}`;

        console.log("Delete endpoint:", primaryUrl);
        const sessionToken = normalizeAuthToken(
          readSessionCookie("token") || token,
        );
        const authorizationHeader = sessionToken
          ? `Bearer ${sessionToken}`
          : "";

        let response = await fetch(primaryUrl, {
          method: "DELETE",
          headers: {
            "Accept-Encoding": "identity",
            Authorization: authorizationHeader,
          },
        });

        console.log("Delete response status:", response.status);

        if (!response.ok) {
          console.warn("Primary delete route failed, retrying fallback route.");
          response = await fetch(fallbackUrl, {
            method: "DELETE",
            headers: {
              "Accept-Encoding": "identity",
              Authorization: authorizationHeader,
            },
          });
        }

        if (!response.ok) {
          throw new Error(
            `Failed to delete inventory item: ${response.status}`,
          );
        }

        setInventory((currentInventory) =>
          currentInventory.filter((item) => item.id !== id),
        );
        setToast({
          title: "Deleted",
          description: "Inventory item deleted successfully.",
          tone: "success",
        });
        await loadInventory(true);
      } catch (err) {
        console.error("Delete error:", err);
        setToast({
          title: "Delete failed",
          description:
            err instanceof Error ? err.message : "Failed to delete item.",
          tone: "error",
        });
      }
    },
    [token, loadInventory],
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedItem(null);
    setEditFormData({});
  }, []);

  useEffect(() => {
    setMounted(true);
    const hydrateSession = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          const cookieToken = readSessionCookie();
          if (!cookieToken) {
            window.location.replace("/login");
            return;
          }

          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              "Accept-Encoding": "identity",
              Authorization: `Bearer ${cookieToken}`,
            },
          });

          if (!response.ok) {
            clearSessionCookie();
            localStorage.removeItem(SESSION_KEY);
            window.location.replace("/login");
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
        const savedToken = normalizeAuthToken(parsed?.token);

        if (!savedToken || !parsed?.user) {
          localStorage.removeItem(SESSION_KEY);
          clearSessionCookie();
          window.location.replace("/login");
          return;
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            "Accept-Encoding": "identity",
            Authorization: `Bearer ${savedToken}`,
          },
        });

        if (!response.ok) {
          clearSessionCookie();
          localStorage.removeItem(SESSION_KEY);
          window.location.replace("/login");
          return;
        }

        const payload = (await response.json()) as { user?: AuthUser };
        if (payload?.user) {
          setToken(savedToken);
          setUser(payload.user);
          localStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ token: savedToken, user: payload.user }),
          );
          setSessionCookie(savedToken);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        clearSessionCookie();
        window.location.replace("/login");
      } finally {
        setAuthChecked(true);
      }
    };

    void hydrateSession();
  }, []);

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

  useEffect(() => {
    if (!authChecked) return;
    if (!token || !user) return;
    void loadInventory(true);
  }, [authChecked, token, user, loadInventory]);

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

  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = visibleInventory.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(visibleInventory.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [inventoryQuery, selectedCategory]);

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
    const sessionToken = normalizeAuthToken(
      readSessionCookie("token") || token,
    );

    if (!sessionToken) {
      throw new Error("Missing auth token");
    }

    setToken(sessionToken);
    setIsProcessingSale(true);

    try {
      const salesPayload = items.map((item) => ({
        batch_id: item.medicineId,
        quantity_sold: item.quantity,
        medicine_name: item.medicineName,
        name: item.medicineName,
        batch_number: item.batchNumber,
        price_per_unit: item.pricePerUnit,
        expiry_date: item.expiryDate,
      }));

      const response = await fetch(`${API_BASE}/inventory/bulk-sell`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "identity",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          sales: salesPayload,
          items: items.map((item) => ({
            medicine_id: item.medicineId,
            batch_number: item.batchNumber,
            medicine_name: item.medicineName,
            quantity: item.quantity,
            price_per_unit: item.pricePerUnit,
            expiry_date: item.expiryDate,
            unit: item.unit || "",
          })),
          seller_name: sellerName?.trim() || undefined,
          receiver_name: customerName.trim(),
          customer_name: customerName.trim(),
          customer_tin: tinNumber.trim(),
          tin_number: tinNumber.trim(),
          customer_sno: customerSNo?.trim() || "",
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
      
      const totalAmount = items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity), 0);
      setPopupToast("Successfully sold out.");

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
          const editedItem = items.find((entry) => entry.medicineId === row.id);

          return sold > 0
            ? {
                ...row,
                quantity: Math.max(0, row.quantity - sold),
                name: editedItem?.medicineName ?? row.name,
                batch_number: editedItem?.batchNumber ?? row.batch_number,
                expiry_date: editedItem?.expiryDate ?? row.expiry_date,
                price_per_unit: editedItem?.pricePerUnit ?? row.price_per_unit,
              }
            : row;
        }),
      );

      setIsSellOutOpen(false);
      const refreshResponse = await fetch(`${API_BASE}/inventory`, {
        headers: {
          "Accept-Encoding": "identity",
          Authorization: `Bearer ${sessionToken}`,
        },
      });
      const refreshData = await refreshResponse.json();
      setInventory(normalizeInventoryPayload(refreshData));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to process sale.";

      if (
        /invalid or expired token|missing auth token|authentication required/i.test(
          message,
        )
      ) {
        clearSessionCookie();
        localStorage.removeItem(SESSION_KEY);
        setToken(null);
        setUser(null);
        window.location.replace("/login");
      }

      setToast({
        title: "Sale failed",
        description: message,
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
    localStorage.removeItem("token");
    localStorage.removeItem("rememberMe");
    clearSessionCookie();
    window.location.href = "/";
  };

  if (!mounted || !authChecked) {
    return (
      <main className={pageClassName}>
        <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center">
          <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-dark-charcoal/70 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
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
              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-slate-800 sm:text-5xl lg:text-6xl">
                Faster stock entry, cleaner analytics, and a simpler dashboard.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-dark-charcoal/70">
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
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-dark-charcoal/70">
                    {item.label}
                  </div>
                  <div className="mt-2 text-lg font-bold text-slate-800">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">Sign in</h2>
              <p className="text-sm leading-6 text-dark-charcoal/70">
                Use your pharmacy account to access the dashboard.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  className="w-full rounded-2xl border border-dark-teal/20 bg-off-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
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
                  className="w-full rounded-2xl border border-dark-teal/20 bg-off-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </label>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-primary-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {toast ? (
              <div
                className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
                  toast.tone === "success"
                    ? "border-dark-teal bg-off-white text-dark-teal"
                    : toast.tone === "error"
                      ? "border-rose-200 bg-[#FFEBEE] text-rose-800"
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
    <>
      <AppShell
        profileName={user.username}
        profileEmail={`${user.username}@expresspharma.local`}
        userRole={user.role}
        onSignOut={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <header className="rounded-2xl bg-primary-blue p-6 text-white shadow-lg sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-off-white">
                  Pharmacy Dashboard
                </div>
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Welcome back, {user.username}
                </h1>
                <p className="text-sm leading-relaxed text-off-white sm:text-base">
                  Here's your live inventory status and quick store actions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const newTheme = theme === "light" ? "dark" : "light";
                    setTheme(newTheme);
                    localStorage.setItem("theme", newTheme);
                    if (newTheme === "dark") {
                      document.documentElement.classList.add("dark");
                    } else {
                      document.documentElement.classList.remove("dark");
                    }
                  }}
                  aria-label="Toggle dark mode"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-off-white text-dark-charcoal transition duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                >
                  {theme === "light" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRefreshInventory}
                  disabled={isLoadingInventory}
                  aria-label="Refresh inventory"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-off-white text-dark-charcoal transition duration-150 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
                >
                  {isLoadingInventory ? (
                    <RotateCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <RotateCw className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {toast ? (
            <div
              className={`rounded-xl border px-5 py-4 text-sm font-semibold shadow-sm ${
                toast.tone === "success"
                  ? "border-grass-green/20 bg-primary-blue/10 text-dark-charcoal"
                  : toast.tone === "error"
                    ? "border-danger/30 bg-red-50 text-accent-red"
                    : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <div>{toast.title}</div>
              <div className="mt-0.5 font-normal">{toast.description}</div>
            </div>
          ) : null}

          <MultiItemOrderCart
            isOpen={isSellOutOpen}
            onClose={() => setIsSellOutOpen(false)}
            onSubmit={handleSellOutSubmit}
            isProcessing={isProcessingSale}
          />

          {/* KPI Row */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                  Items Loaded
                </span>
                <Package className="h-5 w-5 text-dark-charcoal/80" />
              </div>
              <div className="mt-4 text-3xl font-black text-dark-charcoal">
                {inventoryTotal || inventory.length}
              </div>
            </div>

            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                  Low Stock Items
                </span>
                <AlertTriangle className="h-5 w-5 text-accent-red" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-3xl font-black text-dark-charcoal">
                  {lowStockCount}
                </span>
                {lowStockCount > 0 && (
                  <span className="rounded-full bg-accent-red px-2.5 py-0.5 text-[11px] font-bold text-dark-charcoal">
                    Action Needed
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                  Expired / Expiring Items
                </span>
                <Flag className="h-5 w-5 text-accent-red" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-3xl font-black text-dark-charcoal">
                  {expiredCount}
                </span>
                {expiredCount > 0 && (
                  <span className="rounded-full bg-accent-red px-2.5 py-0.5 text-[11px] font-bold text-white">
                    Critical
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Quick Action Tiles */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/sell-out"
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border-gray bg-pure-white p-6 text-center shadow-sm transition duration-150 hover:bg-primary-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <div className="rounded-full bg-off-white p-3 text-dark-charcoal transition duration-150 group-hover:bg-white group-hover:text-dark-charcoal">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <span className="font-bold text-dark-charcoal">Process Sale</span>
            </Link>

            <Link
              href="/stock-entry"
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border-gray bg-pure-white p-6 text-center shadow-sm transition duration-150 hover:bg-primary-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <div className="rounded-full bg-off-white p-3 text-dark-charcoal transition duration-150 group-hover:bg-white group-hover:text-dark-charcoal">
                <Package className="h-6 w-6" />
              </div>
              <span className="font-bold text-dark-charcoal">Restock Inventory</span>
            </Link>

            <Link
              href="/reports"
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border-gray bg-pure-white p-6 text-center shadow-sm transition duration-150 hover:bg-primary-blue/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              <div className="rounded-full bg-off-white p-3 text-dark-charcoal transition duration-150 group-hover:bg-white group-hover:text-dark-charcoal">
                <FileText className="h-6 w-6" />
              </div>
              <span className="font-bold text-dark-charcoal">Sales Reports</span>
            </Link>
          </section>

          {/* Main Inventory Table Card */}
          <section className="flex flex-col overflow-hidden rounded-xl border border-border-gray bg-pure-white shadow-sm">
            {/* Toolbar */}
            <div className="border-b border-border-gray bg-pure-white px-5 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-dark-charcoal">
                    Current Inventory
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
                    <input
                      value={inventoryQuery}
                      onChange={(event) => setInventoryQuery(event.target.value)}
                      placeholder="Search by medicine name or batch number..."
                      className="w-full min-w-[260px] rounded-lg border border-border-gray bg-off-white py-2 pl-9 pr-3 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    />
                  </div>
                  <select
                    value={selectedCategory}
                    onChange={(event) => setSelectedCategory(event.target.value)}
                    className="rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm font-medium text-dark-charcoal outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                  >
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm text-dark-charcoal">
                <thead className="bg-off-white">
                  <tr>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Medicine
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Category
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Batch Number
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Quantity
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Expiry Date
                    </th>
                    <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-dark-charcoal/70">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-border">
                  {currentItems.map((item) => {
                    const isLowStock = item.quantity <= 20;
                    
                    let formattedExpiry = "-";
                    if (item.expiry_date) {
                      try {
                        formattedExpiry = new Date(item.expiry_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        });
                      } catch {
                        formattedExpiry = item.expiry_date;
                      }
                    }

                    return (
                      <tr
                        key={item.id}
                        className="transition-colors duration-150 hover:bg-off-white/70 even:bg-off-white/30"
                      >
                        <td className="px-5 py-3">
                          <div className="font-bold text-dark-charcoal">
                            {item.name}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center rounded-full bg-off-white px-2.5 py-0.5 text-[11px] font-bold text-dark-charcoal">
                            {item.category_name ?? "Uncategorized"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">
                          {item.batch_number}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`font-bold ${
                              isLowStock ? "text-accent-red" : "text-dark-charcoal"
                            }`}
                          >
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-medium">
                          {formattedExpiry}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDetails(item)}
                              title="View Details"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-charcoal transition duration-150 hover:bg-navy-border hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              title="Delete Item"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-charcoal transition duration-150 hover:bg-red-50 hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleInventory.length ? (
                    <tr>
                      <td
                        className="px-5 py-8 text-center text-sm font-medium text-dark-charcoal/70"
                        colSpan={6}
                      >
                        No inventory matches the current search and category filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Toolbar */}
            <div className="border-t border-border-gray bg-pure-white px-5 py-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-border-gray bg-white px-4 py-2 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-off-white hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-sm font-semibold text-dark-charcoal/70">
                  Page {currentPage} of {totalPages || 1}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="rounded-lg border border-border-gray bg-white px-4 py-2 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-off-white hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* MODAL OVERLAY FOR VIEWING/EDITING DETAILS */}
        {showModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-blue/60 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border-gray bg-pure-white shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 border-b border-border-gray bg-pure-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark-charcoal">
                    {selectedItem.name}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-dark-charcoal/80 transition-colors hover:bg-off-white hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-sm font-medium text-dark-charcoal/70">
                  Batch: {selectedItem.batch_number}
                </p>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 p-6">
                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    placeholder="Enter medicine name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.batchNumber || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        batchNumber: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    placeholder="Enter batch number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={editFormData.quantity || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        quantity: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editFormData.unit || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, unit: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    placeholder="Enter unit (e.g., PKT, BOT)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formatDateForInput(editFormData.expiryDate)}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        expiryDate: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Price Per Unit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.price || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        price: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border-gray bg-off-white px-3 py-2 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                    placeholder="Enter price"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 border-t border-border-gray bg-pure-white px-6 py-4">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-border-gray bg-transparent px-4 py-2 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-off-white hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubmit}
                  className="flex-1 rounded-lg bg-grass-green px-4 py-2 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
      {popupToast && (
        <Toast message={popupToast} onClose={() => setPopupToast(null)} />
      )}
      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-primary-blue/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        />
      ) : null}
    </>
  );
}
