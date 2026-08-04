"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  PackageSearch,
  PackageX,
  RotateCw,
  TrendingUp,
} from "lucide-react";

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
      const inventoryPayload =
        (await inventoryResponse.json()) as InventoryItem[];
      setInventory(Array.isArray(inventoryPayload) ? inventoryPayload : []);

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
      { name: "Healthy", value: counts.Healthy, color: "#4E9F3D" },
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
      {/* ── Page Header ── */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
            Analytics
          </p>
          <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-dark-charcoal">
            Inventory Analytics Built for Action
          </h1>
          <p className="mt-1 text-sm text-dark-charcoal/70">
            Real-time inventory health and sales insights.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshAnalytics}
            className="inline-flex items-center gap-2 rounded-lg bg-grass-green px-4 py-2 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
          >
            <RotateCw className="h-4 w-4" />
            Refresh Data
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border-gray bg-off-white px-4 py-2 text-sm font-semibold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        /* ── Loading State ── */
        <div className="flex items-center justify-center rounded-xl border border-border-gray bg-pure-white p-12 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold text-dark-charcoal/70">
            <Loader2 className="h-5 w-5 animate-spin text-grass-green" />
            Loading analytics data…
          </div>
        </div>
      ) : (
        <>
          {/* ── KPI Row ── */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Inventory Value */}
            <div className="rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm transition duration-150 hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-off-white">
                  <DollarSign className="h-4 w-4 text-dark-charcoal/80" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70">
                  Total Inventory Value
                </p>
              </div>
              <p className="flex items-baseline gap-1.5 text-2xl font-black tracking-tight text-dark-charcoal">
                <span className="text-xs font-semibold text-dark-charcoal/70">ETB</span>
                {totalInventoryValue.toFixed(2)}
              </p>
            </div>

            {/* Out of Stock Items */}
            <div className="rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm transition duration-150 hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-off-white">
                  <PackageX className="h-4 w-4 text-dark-charcoal/80" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70">
                  Out of Stock Items
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-black tracking-tight text-dark-charcoal">
                  {outOfStockCount}
                </p>
                {outOfStockCount > 0 && (
                  <span className="badge-danger">Action needed</span>
                )}
              </div>
            </div>

            {/* Most Sold Medicine */}
            <div className="rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm transition duration-150 hover:shadow-md">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-off-white">
                  <TrendingUp className="h-4 w-4 text-dark-charcoal/80" />
                </span>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70">
                  Most Sold Medicine
                </p>
              </div>
              <p className="text-sm font-semibold leading-snug text-dark-charcoal line-clamp-2">
                {summaryLabel}
              </p>
              {reportData?.topSellingMedicines?.[0] && (
                <p className="mt-1 text-xs text-dark-charcoal/70">
                  {reportData.topSellingMedicines[0].quantitySold} units sold
                </p>
              )}
            </div>
          </div>

          {/* ── Charts Grid ── */}
          <div className="mb-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
            {/* Lowest Quantity Medicines */}
            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
                    Low-Stock Chart
                  </p>
                  <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">
                    Lowest Quantity Medicines
                  </h2>
                </div>
                <span className="self-start rounded-full bg-off-white px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-dark-charcoal/80 sm:self-auto">
                  {lowStockData.length} items
                </span>
              </div>
              <div className="h-72 rounded-lg bg-off-white/40 p-3">
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
                        stroke="#C5CADE"
                      />
                      <XAxis
                        type="number"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#8892AA", fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#1B2340", fontSize: 12, width: 140 }}
                        width={140}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(27, 35, 64, 0.05)" }}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid #C5CADE",
                          boxShadow: "0 4px 20px rgba(27, 35, 64, 0.10)",
                          backgroundColor: "#FFFFFF",
                        }}
                      />
                      <Bar
                        dataKey="quantity"
                        fill="#4E9F3D"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex min-h-full flex-col items-center justify-center gap-3 py-8 text-center">
                    <PackageSearch className="h-9 w-9 text-border-gray" />
                    <p className="text-sm font-semibold text-dark-charcoal/70">
                      No low-stock data available.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Inventory Health Breakdown */}
            <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
                  Expiry Status
                </p>
                <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">
                  Inventory Health Breakdown
                </h2>
              </div>
              <div className="h-64 rounded-lg bg-off-white/40 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expiryStatusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={88}
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
                        borderRadius: "10px",
                        border: "1px solid #C5CADE",
                        boxShadow: "0 4px 20px rgba(27, 35, 64, 0.10)",
                        backgroundColor: "#FFFFFF",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {expiryStatusData.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border border-border-gray bg-off-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm font-semibold text-dark-charcoal">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-black text-dark-charcoal">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Top Selling Medicines ── */}
          <div className="rounded-xl border border-border-gray bg-pure-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
                  Sales Report
                </p>
                <h2 className="mt-0.5 text-base font-bold tracking-tight text-dark-charcoal">
                  Top Selling Medicines
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(["24h", "monthly", "6months", "yearly"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReportRange(r)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-1 ${
                      reportRange === r
                        ? "bg-primary-blue text-white shadow-sm"
                        : "bg-off-white text-dark-charcoal/80 hover:bg-navy-border hover:text-dark-charcoal"
                    }`}
                  >
                    {r === "24h"
                      ? "24 h"
                      : r === "monthly"
                        ? "Monthly"
                        : r === "6months"
                          ? "6 Months"
                          : "Yearly"}
                  </button>
                ))}
                <span className="ml-1 rounded-full bg-off-white px-2.5 py-1 text-xs font-bold text-dark-charcoal/80">
                  {reportData?.topSellingMedicines?.length ?? 0} items
                </span>
              </div>
            </div>

            {reportData?.topSellingMedicines?.length ? (
              <div className="divide-y divide-navy-light">
                {reportData.topSellingMedicines.map((item, index) => (
                  <div
                    key={item.medicineName}
                    className="-mx-6 flex items-center justify-between gap-4 px-6 py-3 transition duration-150 first:pt-0 last:pb-0 hover:bg-off-white/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-blue/10 text-xs font-black text-dark-charcoal">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-dark-charcoal">
                          {item.medicineName}
                        </p>
                        <p className="text-xs text-dark-charcoal/70">
                          {item.quantitySold} units sold
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-black text-dark-charcoal">
                      ETB {item.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                <TrendingUp className="h-9 w-9 text-border-gray" />
                <p className="text-sm font-semibold text-dark-charcoal/70">
                  No sales data available for the selected range.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
