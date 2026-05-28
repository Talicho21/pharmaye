"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/AppShell";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "@/app/utils/session";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type InventoryItem = {
  id: number;
  name: string;
  category_id?: number | null;
  category_name?: string | null;
  quantity: number;
  price_per_unit: number;
};

type SalesReportData = {
  range: "24h" | "monthly" | "6months" | "yearly";
  totalRevenue: number;
  totalItemsSold: number;
  topSellingMedicines: Array<{
    medicineName: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
};

type SalesLogData = {
  startDate: string;
  endDate: string;
  totalRecords: number;
  records: Array<{
    id: number;
    batchId: number;
    saleDate: string;
    medicineName: string;
    category: string;
    quantitySold: number;
    unitPrice: number;
    totalPrice: number;
    sellerName: string;
    receiverName: string;
  }>;
};

type InactivityData = {
  thresholdMonths: number;
  medicines: Array<{
    medicineId: number;
    medicineName: string;
    categoryName: string;
    lastSaleDate: string | null;
    daysSinceLastSale: number | null;
    totalSales: number;
    totalQuantitySold: number;
  }>;
  categories: Array<{
    categoryId: number;
    categoryName: string;
    medicineCount: number;
    lastSaleDate: string | null;
    daysSinceLastSale: number | null;
    totalSales: number;
    totalQuantitySold: number;
  }>;
};

type CategoryPoint = {
  category: string;
  quantity: number;
  medicines: number;
  value: number;
};

const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

export default function AnalyticsPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reportRange, setReportRange] = useState<SalesReportData["range"]>("24h");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [salesLogData, setSalesLogData] = useState<SalesLogData | null>(null);
  const [inactiveData, setInactiveData] = useState<InactivityData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [loading, setLoading] = useState(true);

  const refreshAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      const inventoryResponse = await fetch(`${API_BASE}/inventory`, {
        cache: "no-store",
      });
      const inventoryPayload = (await inventoryResponse.json()) as InventoryItem[];

      setInventory(Array.isArray(inventoryPayload) ? inventoryPayload : []);

      if (authToken) {
        const [reportResponse, logResponse, inactiveResponse] = await Promise.all([
          fetch(`${API_BASE}/reports?range=${encodeURIComponent(reportRange)}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
          fetch(
            `${API_BASE}/reports/sales-log?startDate=2026-05-20&endDate=2026-05-26`,
            { headers: { Authorization: `Bearer ${authToken}` } },
          ),
          fetch(`${API_BASE}/reports/inactive?thresholdMonths=3`, {
            headers: { Authorization: `Bearer ${authToken}` },
          }),
        ]);

        const [reportPayload, logPayload, inactivePayload] = await Promise.all([
          reportResponse.json(),
          logResponse.json(),
          inactiveResponse.json(),
        ]);

        setReportData(reportPayload as SalesReportData);
        setSalesLogData(logPayload as SalesLogData);
        setInactiveData(inactivePayload as InactivityData);
      }
    } catch {
      setInventory([]);
      setReportData(null);
      setSalesLogData(null);
      setInactiveData(null);
    } finally {
      setLoading(false);
    }
  }, [authToken, reportRange]);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!storedSession) {
        const cookieToken = readSessionCookie();
        if (!cookieToken) {
          window.location.replace("/login?next=/analytics");
          return;
        }

        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${cookieToken}`,
          },
        });

        if (!response.ok) {
          clearSessionCookie();
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
          window.location.replace("/login?next=/analytics");
          return;
        }

        const payload = (await response.json()) as { user?: { username?: string } };
        if (payload?.user?.username) {
          setAuthToken(cookieToken);
          setProfileName(payload.user.username);
          setProfileEmail(`${payload.user.username}@expresspharma.local`);
          window.localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ token: cookieToken, user: payload.user }),
          );
          setSessionCookie(cookieToken);
        }

        return;
      }

      const parsed = JSON.parse(storedSession) as { token?: string };
      if (parsed?.token) {
        setAuthToken(parsed.token);
      }

      const parsedUser = JSON.parse(storedSession) as { user?: { username?: string } };
      if (parsedUser?.user?.username) {
        setProfileName(parsedUser.user.username);
        setProfileEmail(`${parsedUser.user.username}@expresspharma.local`);
      }
      } catch {
        setAuthToken(null);
        window.location.replace("/login?next=/analytics");
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    void refreshAnalytics();
  }, [refreshAnalytics]);

  const categoryData = useMemo<CategoryPoint[]>(() => {
    const map = new Map<string, CategoryPoint>();

    inventory.forEach((item) => {
      const category = item.category_name?.trim() || "Uncategorized";
      const current = map.get(category) ?? {
        category,
        quantity: 0,
        medicines: 0,
        value: 0,
      };

      current.quantity += Number(item.quantity) || 0;
      current.medicines += 1;
      current.value += (Number(item.quantity) || 0) * (Number(item.price_per_unit) || 0);
      map.set(category, current);
    });

    return Array.from(map.values()).sort((left, right) => right.quantity - left.quantity);
  }, [inventory]);

  const totalInventoryValue = useMemo(
    () => categoryData.reduce((sum, entry) => sum + entry.value, 0),
    [categoryData],
  );

  const safeTotalRevenue = Number(reportData?.totalRevenue ?? 0);

  const handleSignOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    clearSessionCookie();
    window.location.href = "/";
  }, []);

  return (
    <AppShell profileName={profileName} profileEmail={profileEmail} onSignOut={handleSignOut}>
      <div className="flex flex-col gap-8">
        <header className="rounded-4xl bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-sky-100/80">Analytics</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">Graphical stock and sales insights</h1>
              <p className="mt-3 max-w-3xl text-sm leading-tight tracking-tight text-sky-50/85">
                This page holds the charts and operational report tables so the main dashboard stays clean and the stock entry workflow lives separately.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={refreshAnalytics}
                className="rounded-full border-2 border-emerald-500 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-4xl border border-white/80 bg-white/90 p-8 text-sm font-semibold text-slate-600 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
            Loading analytics...
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.75rem] border border-slate-200/60 bg-slate-50/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">Inventory Items</p>
                <p className="mt-3 text-xl font-bold tracking-tight text-slate-800">{inventory.length}</p>
              </div>
              <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">Stock Value</p>
                <p className="mt-3 flex items-baseline gap-1 whitespace-nowrap text-xl font-bold tracking-tight text-slate-800">
                  <span className="text-xs font-medium text-slate-400">ETB</span>
                  <span>{totalInventoryValue.toFixed(2)}</span>
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">Revenue Window</p>
                <p className="mt-3 flex items-baseline gap-1 whitespace-nowrap text-xl font-bold tracking-tight text-slate-800">
                  {reportData ? (
                    <>
                      <span className="text-xs font-medium text-slate-400">ETB</span>
                      <span>{safeTotalRevenue.toFixed(2)}</span>
                    </>
                  ) : (
                    <span>Locked</span>
                  )}
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-violet-100 bg-violet-50/60 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">Items Sold</p>
                <p className="mt-3 text-xl font-bold tracking-tight text-slate-800">{reportData ? reportData.totalItemsSold : "Locked"}</p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-700">Graph</p>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Category distribution</h2>
                  </div>
                  <select
                    value={reportRange}
                    onChange={(event) => setReportRange(event.target.value as SalesReportData["range"])}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="monthly">Monthly</option>
                    <option value="6months">6 Months</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="h-104 rounded-3xl bg-linear-to-b from-slate-50 to-white p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)" }}
                      />
                      <Bar dataKey="quantity" fill="#2563eb" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Top selling medicines</h3>
                  {reportData?.topSellingMedicines?.length ? (
                    <ul className="mt-4 space-y-3">
                      {reportData.topSellingMedicines.map((item) => (
                        <li key={item.medicineName} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                            <span>{item.medicineName}</span>
                            <span>{item.quantitySold} units</span>
                          </div>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                            ETB {item.totalRevenue.toFixed(2)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-slate-600">No sales data is available for the selected window.</p>
                  )}
                </div>

                <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Inactive stock history</h3>
                  {inactiveData?.medicines?.length ? (
                    <ul className="mt-4 space-y-3">
                      {inactiveData.medicines.slice(0, 5).map((item) => (
                        <li key={item.medicineId} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <div className="flex items-center justify-between gap-3 font-semibold">
                            <span>{item.medicineName}</span>
                            <span>{item.daysSinceLastSale === null ? "Never" : `${item.daysSinceLastSale}d`}</span>
                          </div>
                          <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-amber-700">
                            {item.categoryName}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm font-medium text-slate-600">No inactive medicines were returned for the current threshold.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Sales log</h3>
                {salesLogData?.records?.length ? (
                  <div className="mt-4 space-y-3">
                    {salesLogData.records.slice(0, 5).map((record) => (
                      <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                        <div className="flex items-center justify-between gap-3 font-semibold text-slate-700">
                          <span>{record.medicineName}</span>
                          <span>{record.quantitySold} units</span>
                        </div>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                          {new Date(record.saleDate).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-slate-600">No sales log rows were returned for the selected date range.</p>
                )}
              </div>

              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <h3 className="text-lg font-semibold tracking-tight text-slate-900 leading-tight">Inventory categories</h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.length ? (
                        categoryData.map((category) => (
                          <tr key={category.category} className="border-t border-slate-200 bg-white">
                            <td className="px-4 py-3 font-semibold text-slate-800">{category.category}</td>
                            <td className="px-4 py-3 text-slate-600">{category.medicines}</td>
                            <td className="px-4 py-3 text-slate-600">{category.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-6 text-slate-600" colSpan={3}>
                            No category data available yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
