"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Flag, Menu, Moon, RotateCw, Sun } from "lucide-react";
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
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isSellOutOpen, setIsSellOutOpen] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === "dark" ? "light" : "dark"));
  }, []);

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

  // Ensure on a full browser refresh we attempt a quiet initial load
  // after auth/session hydration completes, using safe date fallbacks.
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
    <>
      <AppShell
        profileName={user.username}
        profileEmail={`${user.username}@expresspharma.local`}
        userRole={user.role}
        onSignOut={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      >
        <div className={dashboardFrameClassName}>
          <div className="flex items-center justify-between border-b border-slate-100 bg-white p-4 md:hidden">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Menu
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Pharmacy tools
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
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
              <div className="flex flex-row items-center space-x-3">
                <button
                  type="button"
                  onClick={handleRefreshInventory}
                  disabled={isLoadingInventory}
                  aria-label="Refresh inventory"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:shadow-[0_12px_30px_rgba(255,255,255,0.16)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoadingInventory ? (
                    <RotateCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 p-2.5 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:shadow-[0_12px_30px_rgba(255,255,255,0.16)] active:translate-y-0"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
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

          <MultiItemOrderCart
            isOpen={isSellOutOpen}
            onClose={() => setIsSellOutOpen(false)}
            onSubmit={handleSellOutSubmit}
            isProcessing={isProcessingSale}
          />

          <section className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: "Items loaded",
                value: inventoryTotal || inventory.length,
              },
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
            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
              <div className="min-w-200 overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <table className="w-full divide-y divide-slate-100 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Medicine</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Expiry</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {currentItems.map((item) => {
                      const initialQty =
                        (item as any).initial_batch_quantity ??
                        (item as any).initial_quantity ??
                        item.quantity;
                      const pct =
                        initialQty > 0 ? item.quantity / initialQty : 1;
                      const now = new Date();
                      const expiry = item.expiry_date
                        ? new Date(item.expiry_date)
                        : null;
                      const isExpired = Boolean(
                        expiry && expiry.getTime() < now.getTime(),
                      );
                      const isExpiringSoon = Boolean(
                        expiry &&
                        !isExpired &&
                        expiry.getTime() - now.getTime() <=
                          1000 * 60 * 60 * 24 * 30 * 6,
                      );
                      const isLowStock = item.quantity <= 20 || pct <= 0.2;

                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 font-medium text-slate-950">
                            <div className="flex flex-col gap-2">
                              <div>
                                <span>{item.name}</span>
                                <span className="inventory-note mt-1 block">
                                  Batch {item.batch_number}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {isLowStock ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                                    Low Stock
                                  </span>
                                ) : null}
                                {isExpiringSoon ? (
                                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 animate-pulse">
                                    Expiring Soon - Sell Out!
                                  </span>
                                ) : null}
                                {isExpired ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700 animate-pulse">
                                    <Flag className="h-3.5 w-3.5" />
                                    Expired!
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {item.category_name ?? "Uncategorized"}
                          </td>
                          <td className="px-4 py-3">{item.batch_number}</td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span>{item.expiry_date ?? "-"}</span>
                            </div>
                          </td>
                          <td className="flex gap-2 px-4 py-3">
                            <button
                              onClick={() => handleViewDetails(item)}
                              className="inline-flex items-center justify-center rounded bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition-all duration-300 hover:bg-emerald-700 active:scale-95"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => handleDeleteClick(item.id)}
                              className="inline-flex items-center justify-center rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-all duration-300 hover:bg-red-700 active:scale-95"
                              title="Delete this item"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!visibleInventory.length ? (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-slate-500"
                          colSpan={6}
                        >
                          No inventory matches the current search and category
                          filter.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
                <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      disabled={currentPage === 1}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <div className="text-sm font-semibold text-slate-600">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* MODAL OVERLAY FOR VIEWING/EDITING DETAILS */}
        {showModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/80 bg-white shadow-2xl">
              {/* Modal Header */}
              <div className="sticky top-0 border-b border-slate-200 bg-linear-to-r from-emerald-50 to-slate-50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedItem.name}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="rounded-full p-1 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Batch: {selectedItem.batch_number}
                </p>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 p-6">
                {/* Medicine Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.name || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter medicine name"
                  />
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
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
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter batch number"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
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
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter quantity"
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={editFormData.unit || ""}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, unit: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter unit (e.g., tablets, bottles)"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
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
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700">
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
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Enter price"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-all duration-300 hover:bg-slate-100 active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSubmit}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-emerald-700 active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
      {isMobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          role="presentation"
        />
      ) : null}
    </>
  );
}
