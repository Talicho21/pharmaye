"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { UserRole } from "@/app/utils/rolePermissions";
import { Loader2 } from "lucide-react";

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

type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

const SESSION_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

const normalizeAuthToken = (value: string | null | undefined): string =>
  String(value ?? "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^[\s"'`]+|[\s"'`]+$/g, "")
    .trim();

export default function SellOutPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    description: string;
    tone: "success" | "error" | "info";
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          const cookieToken = readSessionCookie();
          if (!cookieToken) {
            router.replace("/");
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
            router.replace("/");
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
          router.replace("/");
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
          router.replace("/");
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
        router.replace("/");
      } finally {
        setAuthChecked(true);
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const loadInventory = async () => {
      const sessionToken = normalizeAuthToken(
        readSessionCookie("token") || token,
      );
      const authorizationHeader = sessionToken ? `Bearer ${sessionToken}` : "";

      if (!sessionToken) {
        return;
      }

      setToken(sessionToken);
      setIsLoadingInventory(true);
      try {
        const url = `${API_BASE}/inventory?page=1&pageSize=200`;
        const response = await fetch(url, {
          headers: {
            "Accept-Encoding": "identity",
            Authorization: authorizationHeader,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load inventory");
        }

        const data = await response.json();
        const nextInventory = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        setInventory(nextInventory);
      } catch (error) {
        console.error("Inventory fetch failure:", error);
        setInventory([]);
      } finally {
        setIsLoadingInventory(false);
      }
    };

    void loadInventory();
  }, [token, user]);

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
    const authorizationHeader = sessionToken ? `Bearer ${sessionToken}` : "";

    if (!sessionToken) {
      throw new Error("Missing auth token");
    }

    setToken(sessionToken);
    setIsProcessingSale(true);

    try {
      const sessionCheckResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          "Accept-Encoding": "identity",
          Authorization: authorizationHeader,
        },
      });

      if (!sessionCheckResponse.ok) {
        clearSessionCookie();
        localStorage.removeItem(SESSION_KEY);
        setToken(null);
        setUser(null);
        router.replace("/");
        throw new Error("Invalid or expired token.");
      }

      const sessionPayload = (await sessionCheckResponse.json()) as {
        user?: AuthUser;
      };

      if (!sessionPayload?.user) {
        clearSessionCookie();
        localStorage.removeItem(SESSION_KEY);
        setToken(null);
        setUser(null);
        router.replace("/");
        throw new Error("Invalid or expired token.");
      }

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
          Authorization: authorizationHeader,
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

      // Update inventory after sale
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

      // Refresh inventory from server
      const refreshResponse = await fetch(`${API_BASE}/inventory`, {
        headers: {
          Authorization: authorizationHeader,
        },
      });
      const refreshData = await refreshResponse.json();
      setInventory(Array.isArray(refreshData) ? refreshData : []);
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
        router.replace("/");
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

  if (!authChecked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-off-white">
        <div className="flex items-center gap-3 rounded-xl border border-border-gray bg-pure-white px-8 py-6 text-sm font-semibold text-dark-charcoal/70 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-grass-green" />
          Loading POS session…
        </div>
      </div>
    );
  }

  return (
    <AppShell
      profileName={user.username}
      profileEmail={`${user.username}@expresspharma.local`}
      userRole={user.role}
      onSignOut={handleLogout}
    >
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
            Sell Out
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-dark-charcoal">
            Process Outgoing Sale (POS)
          </h1>
          <p className="mt-1 text-sm text-dark-charcoal/70">
            Search medicines, build customer orders, and complete sales
            transactions.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-grass-green/20 bg-primary-blue/10 px-3 py-1.5 text-xs font-bold text-dark-charcoal">
            <span className="h-2 w-2 animate-pulse rounded-full bg-grass-green" />
            Active Sale Session
          </span>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`mb-5 rounded-xl border px-5 py-4 text-sm shadow-sm ${
            toast.tone === "success"
              ? "border-grass-green/30 bg-primary-blue/10 text-dark-charcoal"
              : toast.tone === "error"
                ? "border-danger/30 bg-red-50 text-accent-red"
                : "border-border-gray bg-off-white text-dark-charcoal"
          }`}
        >
          <div className="font-bold">{toast.title}</div>
          <div className="mt-0.5 text-xs">{toast.description}</div>
        </div>
      )}

      {/* ── POS Workspace ── */}
      <MultiItemOrderCart
        isOpen={true}
        onClose={() => {
          window.location.href = "/";
        }}
        onSubmit={handleSellOutSubmit}
        isProcessing={isProcessingSale}
      />
    </AppShell>
  );
}
