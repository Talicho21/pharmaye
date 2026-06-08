"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/AppShell";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import {
  clearSessionCookie,
  readSessionCookie,
  setSessionCookie,
} from "@/app/utils/session";

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

const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

export default function ReportsPage() {
  const [reportRange, setReportRange] =
    useState<SalesReportData["range"]>("monthly");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [inactiveData, setInactiveData] = useState<InactivityData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [loading, setLoading] = useState(true);

  const refreshReports = useCallback(async () => {
    setLoading(true);

    try {
      if (!authToken) {
        return;
      }

      const [reportResponse, inactiveResponse] = await Promise.all([
        fetch(`${API_BASE}/reports?range=${encodeURIComponent(reportRange)}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_BASE}/reports/inactive?thresholdMonths=3`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const [reportPayload, inactivePayload] = await Promise.all([
        reportResponse.json(),
        inactiveResponse.json(),
      ]);

      setReportData(reportPayload as SalesReportData);
      setInactiveData(inactivePayload as InactivityData);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      setReportData(null);
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
            user?: { username?: string; role?: string };
          };
          if (payload?.user?.username && payload?.user?.role === "admin") {
            setAuthToken(cookieToken);
            setProfileName(payload.user.username);
            setProfileEmail(`${payload.user.username}@expresspharma.local`);
            window.localStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({ token: cookieToken, user: payload.user }),
            );
            setSessionCookie(cookieToken);
          } else {
            window.location.replace("/");
          }

          setSessionReady(true);
          return;
        }

        const parsed = JSON.parse(storedSession) as {
          token?: string;
          user?: { role?: string };
        };
        if (parsed?.token && parsed?.user?.role === "admin") {
          setAuthToken(parsed.token);
        }

        const parsedUser = JSON.parse(storedSession) as {
          user?: { username?: string };
        };
        if (parsedUser?.user?.username) {
          setProfileName(parsedUser.user.username);
          setProfileEmail(`${parsedUser.user.username}@expresspharma.local`);
        }

        setSessionReady(true);
      } catch {
        window.location.replace("/");
      }
    };

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    void refreshReports();
  }, [refreshReports, sessionReady]);

  const handleSignOut = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    clearSessionCookie();
    window.location.href = "/";
  };

  if (!sessionReady || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-slate-500 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          Loading reports...
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="admin" routePath="/reports">
      <AppShell
        profileName={profileName}
        profileEmail={profileEmail}
        userRole="admin"
        onSignOut={handleSignOut}
      >
        <div className="flex flex-col gap-8">
          <header className="rounded-4xl bg-linear-to-r from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-sky-100/80">
              Reports
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Sales & Activity Reports
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-tight tracking-tight text-sky-50/85">
                  Detailed sales analysis, revenue trends, and product
                  inactivity monitoring. Admin-only access.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  value={reportRange}
                  onChange={(e) =>
                    setReportRange(e.target.value as SalesReportData["range"])
                  }
                  className="inline-flex rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/20"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="monthly">Last month</option>
                  <option value="6months">Last 6 months</option>
                  <option value="yearly">Last year</option>
                </select>
                <button
                  type="button"
                  onClick={() => void refreshReports()}
                  className="inline-flex rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/20"
                >
                  Refresh
                </button>
              </div>
            </div>
          </header>

          {/* Sales Report Card */}
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
              <div className="mb-6 inline-flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-950">
                  Sales Summary
                </h2>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {reportRange}
                </span>
              </div>

              {reportData ? (
                <div className="space-y-4">
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-700">
                      Total Revenue
                    </div>
                    <div className="mt-2 text-3xl font-black text-slate-950">
                      PKR {reportData.totalRevenue?.toLocaleString() || "0"}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-sky-100 bg-sky-50/60 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
                      Items Sold
                    </div>
                    <div className="mt-2 text-3xl font-black text-slate-950">
                      {reportData.totalItemsSold?.toLocaleString() || "0"}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No sales data available.
                </p>
              )}
            </div>

            {/* Top Selling Medicines */}
            <div className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
              <h2 className="mb-6 text-xl font-bold text-slate-950">
                Top Selling Medicines
              </h2>

              {reportData?.topSellingMedicines &&
              reportData.topSellingMedicines.length > 0 ? (
                <div className="space-y-3">
                  {reportData.topSellingMedicines
                    .slice(0, 5)
                    .map((medicine, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-slate-200 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-950">
                              {medicine.medicineName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {medicine.quantitySold} units sold
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-emerald-700">
                              PKR{" "}
                              {medicine.totalRevenue?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No sales data available.
                </p>
              )}
            </div>
          </section>

          {/* Inactive Products */}
          {inactiveData && (
            <section className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
              <h2 className="mb-6 text-xl font-bold text-slate-950">
                Inactive Medicines (No sales in 3+ months)
              </h2>

              {inactiveData.medicines && inactiveData.medicines.length > 0 ? (
                <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Medicine Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Last Sale</th>
                        <th className="px-4 py-3">Days Inactive</th>
                        <th className="px-4 py-3">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {inactiveData.medicines.map((medicine) => (
                        <tr key={medicine.medicineId}>
                          <td className="px-4 py-3 font-medium text-slate-950">
                            {medicine.medicineName}
                          </td>
                          <td className="px-4 py-3">{medicine.categoryName}</td>
                          <td className="px-4 py-3">
                            {medicine.lastSaleDate
                              ? new Date(
                                  medicine.lastSaleDate,
                                ).toLocaleDateString()
                              : "Never"}
                          </td>
                          <td className="px-4 py-3">
                            {medicine.daysSinceLastSale !== null
                              ? `${medicine.daysSinceLastSale} days`
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3">{medicine.totalSales}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  No inactive medicines found.
                </p>
              )}
            </section>
          )}

          {/* Navigation */}
          <section className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
            <h3 className="mb-4 text-lg font-bold text-slate-950">
              Quick Links
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/"
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50"
              >
                ← Back to Dashboard
              </Link>
              <Link
                href="/analytics"
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-sky-300 hover:bg-sky-50"
              >
                View Analytics
              </Link>
            </div>
          </section>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
