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

type InventoryItem = {
  id: number;
  name: string;
  category_name?: string | null;
  batch_number: string;
  quantity: number;
  expiry_date: string | null;
  price_per_unit: number | null;
};

type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

const SESSION_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

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
        if (parsed?.token && parsed?.user) {
          setToken(parsed.token);
          setUser(parsed.user);
          setSessionCookie(parsed.token);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
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
      } catch (error) {
        setToast({
          title: "Inventory unavailable",
          description: "The backend did not return inventory data.",
          tone: "info",
        });
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
          return sold > 0
            ? {
                ...row,
                quantity: Math.max(0, row.quantity - sold),
              }
            : row;
        }),
      );

      // Refresh inventory from server
      const refreshResponse = await fetch(`${API_BASE}/inventory`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const refreshData = await refreshResponse.json();
      setInventory(Array.isArray(refreshData) ? refreshData : []);
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
    router.replace("/");
  };

  if (!authChecked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-slate-500 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          Loading sell out page...
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
      <div className="mx-auto max-w-7xl space-y-8 rounded-[2rem] border border-white/80 bg-slate-50/60 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md sm:p-6 lg:p-8">
        <header className="rounded-4xl border border-white/80 bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-white/85">
                Sell Out
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Process Sales Transactions
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-sky-50/90 sm:text-base">
                Add items to the cart, enter customer details, and complete the
                sale. Available for all authorized users.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  if (!token) return;
                  setIsLoadingInventory(true);
                  try {
                    const response = await fetch(`${API_BASE}/inventory`, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    });
                    const data = await response.json();
                    setInventory(Array.isArray(data) ? data : []);
                  } catch {
                    setToast({
                      title: "Refresh failed",
                      description: "Could not reload inventory.",
                      tone: "error",
                    });
                  } finally {
                    setIsLoadingInventory(false);
                  }
                })()
              }
              disabled={isLoadingInventory}
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/20 hover:text-white hover:shadow-[0_12px_30px_rgba(255,255,255,0.16)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingInventory ? "Refreshing..." : "Refresh Inventory"}
            </button>
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

        <section className="rounded-4xl border border-white/80 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h2 className="mb-6 text-2xl font-bold text-slate-950">Sales Cart</h2>
          <p className="mb-6 text-sm text-slate-600">
            Click the button below to open the sales cart interface. Add
            multiple medicines and complete the transaction.
          </p>
          <MultiItemOrderCart
            isOpen={true}
            onClose={() => {
              // Redirect back to dashboard after closing
              window.location.href = "/";
            }}
            onSubmit={handleSellOutSubmit}
            isProcessing={isProcessingSale}
          />
        </section>

        <section className="rounded-4xl border border-white/80 bg-white/85 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <h3 className="mb-4 text-lg font-bold text-slate-950">
            Current Inventory Status
          </h3>
          <p className="mb-4 text-sm text-slate-600">
            Total items available:{" "}
            <span className="font-bold text-emerald-700">
              {inventory.length}
            </span>
          </p>
          {isLoadingInventory ? (
            <p className="text-sm text-slate-500">Loading inventory...</p>
          ) : inventory.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-[0.2em] text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Medicine Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Available Qty</th>
                    <th className="px-4 py-3">Price/Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                  {inventory.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {item.name}
                      </td>
                      <td className="px-4 py-3">
                        {item.category_name || "Uncategorized"}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.batch_number}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        PKR {item.price_per_unit?.toLocaleString() || "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {inventory.length > 10 && (
                <div className="bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                  Showing 10 of {inventory.length} items
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No inventory loaded.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
