"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/app/components/AppShell";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/app/utils/session";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
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
  expiry_date?: string | null;
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

type ExpiryStatusPoint = {
  name: string;
  value: number;
  color: string;
};

const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

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

export default function AnalyticsPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reportRange, setReportRange] =
    useState<SalesReportData["range"]>("24h");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [userRole, setUserRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);

  const refreshAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      const inventoryResponse = await fetch(`${API_BASE}/inventory`, {
        cache: "no-store",
      });
      const inventoryPayload = await inventoryResponse.json();
      setInventory(normalizeInventoryPayload(inventoryPayload));

      if (authToken) {
        const reportResponse = await fetch(
          `${API_BASE}/reports?range=${encodeURIComponent(reportRange)}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );
        const reportPayload = await reportResponse.json();
        setReportData(reportPayload as SalesReportData);
      }
    } catch (error) {
      console.error("Failed to refresh analytics:", error);
      setInventory([]);
      setReportData(null);
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
            window.location.replace("/");
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
            window.location.replace("/");
            return;
          }

          const payload = (await response.json()) as {
            user?: { username?: string; role?: "admin" | "staff" };
          };
          if (payload?.user?.username) {
            setAuthToken(cookieToken);
            setProfileName(payload.user.username);
            setProfileEmail(`${payload.user.username}@expresspharma.local`);
            if (payload.user.role) {
              setUserRole(payload.user.role);
            }
            window.localStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({ token: cookieToken, user: payload.user }),
            );
            setSessionCookie(cookieToken);
            setSessionReady(true);
          }

          return;
        }

        const parsed = JSON.parse(storedSession) as {
          token?: string;
          user?: { username?: string; role?: "admin" | "staff" };
        };
        if (parsed?.token) {
          setAuthToken(parsed.token);
        }

        if (parsed?.user?.username) {
          setProfileName(parsed.user.username);
          setProfileEmail(`${parsed.user.username}@expresspharma.local`);
        }

        if (parsed?.user?.role) {
          setUserRole(parsed.user.role);
        }

        setSessionReady(true);
      } catch (error) {
        console.error("Session validation failed:", error);
        setAuthToken(null);
        window.location.replace("/");
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    if (userRole === "staff") {
      router.push("/");
      return;
    }

    void refreshAnalytics();
  }, [refreshAnalytics, router, sessionReady, userRole]);

  const totalInventoryValue = useMemo(
    () =>
      inventory.reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.price_per_unit || 0),
        0,
      ),
    [inventory],
  );

  const outOfStockCount = useMemo(
    () => inventory.filter((item) => Number(item.quantity) <= 0).length,
    [inventory],
  );

  const mostSoldMedicines = useMemo(
    () =>
      reportData?.topSellingMedicines
        ?.slice(0, 3)
        .map((item) => item.medicineName) ?? [],
    [reportData],
  );

  const lowStockData = useMemo(
    () =>
      inventory
        .slice()
        .sort((left, right) => Number(left.quantity) - Number(right.quantity))
        .slice(0, 6)
        .map((item) => ({ name: item.name, quantity: Number(item.quantity) })),
    [inventory],
  );

  const expiryStatusData = useMemo<ExpiryStatusPoint[]>(() => {
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(now.getMonth() + 6);

    const counts = {
      Healthy: 0,
      "Expiring Soon": 0,
      Expired: 0,
    };

    inventory.forEach((item) => {
      if (!item.expiry_date) {
        counts.Healthy += 1;
        return;
      }

      const expiry = new Date(item.expiry_date);
      if (Number.isNaN(expiry.getTime())) {
        counts.Healthy += 1;
        return;
      }

      if (expiry < now) {
        counts.Expired += 1;
      } else if (expiry <= sixMonthsFromNow) {
        counts["Expiring Soon"] += 1;
      } else {
        counts.Healthy += 1;
      }
    });

    return [
      { name: "Healthy", value: counts.Healthy, color: "#22c55e" },
      {
        name: "Expiring Soon",
        value: counts["Expiring Soon"],
        color: "#f97316",
      },
      { name: "Expired", value: counts.Expired, color: "#ef4444" },
    ];
  }, [inventory]);

  const summaryLabel = mostSoldMedicines.length
    ? mostSoldMedicines.join(", ")
    : "No sales yet";

  const handleSignOut = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("rememberMe");
    clearSessionCookie();
    window.location.href = "/";
  }, []);

  return (
    <AppShell
      profileName={profileName}
      profileEmail={profileEmail}
      userRole={userRole}
      onSignOut={handleSignOut}
    >
      <div className="flex flex-col gap-8">
        <header className="rounded-4xl bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-sky-100/80">
            Analytics
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Inventory analytics built for action
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-tight tracking-tight text-sky-50/85">
                Dedicated analytics, separate from the dashboard, with inventory
                health and sales insights.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshAnalytics}
              className="inline-flex items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-4xl border border-white/80 bg-white/90 p-8 text-sm font-semibold text-slate-600 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
            Loading analytics...
          </div>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.75rem] border border-slate-200/60 bg-slate-50/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">
                  Total Inventory Value
                </p>
                <p className="mt-3 flex items-baseline gap-2 text-xl font-bold tracking-tight text-slate-900">
                  <span className="text-xs font-medium text-slate-400">
                    ETB
                  </span>
                  <span>{totalInventoryValue.toFixed(2)}</span>
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">
                  Out of Stock Items
                </p>
                <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                  {outOfStockCount}
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-slate-200/60 bg-slate-50/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 leading-tight">
                  Most Sold Medicines
                </p>
                <p className="mt-3 max-h-24 overflow-hidden text-sm font-semibold leading-snug text-slate-800">
                  {summaryLabel}
                </p>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                      Low-stock chart
                    </p>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                      Lowest quantity medicines
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {lowStockData.length} items
                  </span>
                </div>
                <div className="h-104 rounded-3xl bg-linear-to-b from-slate-50 to-white p-4">
                  {lowStockData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={lowStockData}
                        layout="vertical"
                        margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          type="number"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#0f172a", fontSize: 12, width: 140 }}
                          width={140}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(15, 23, 42, 0.05)" }}
                          contentStyle={{
                            borderRadius: "16px",
                            border: "none",
                            boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
                          }}
                        />
                        <Bar
                          dataKey="quantity"
                          fill="#2563eb"
                          radius={[10, 10, 10, 10]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex min-h-[240px] items-center justify-center text-sm font-semibold text-slate-500">
                      No low-stock medicines available.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <div className="mb-4">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">
                    Expiry status
                  </p>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                    Inventory health breakdown
                  </h2>
                </div>
                <div className="h-80 rounded-3xl bg-linear-to-b from-slate-50 to-white p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expiryStatusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={96}
                        paddingAngle={4}
                        label={({ name, percent }) =>
                          `${name} ${Math.round((percent || 0) * 100)}%`
                        }
                      >
                        {expiryStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "none",
                          boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {expiryStatusData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ background: item.color }}
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Top selling medicines
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {reportData?.topSellingMedicines?.length ?? 0}
                  </span>
                </div>
                {reportData?.topSellingMedicines?.length ? (
                  <div className="space-y-3">
                    {reportData.topSellingMedicines.map((item) => (
                      <div
                        key={item.medicineName}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.medicineName}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {item.quantitySold} units sold
                            </p>
                          </div>
                          <p className="text-sm font-bold text-emerald-700">
                            ETB {item.totalRevenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No sales data is available for the selected date range.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
