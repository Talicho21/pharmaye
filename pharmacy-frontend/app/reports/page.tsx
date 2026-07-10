"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
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

const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";
const API_BASE = "/api/backend";

export default function ReportsPage() {
  const [reportRange, setReportRange] =
    useState<SalesReportData["range"]>("monthly");
  const [reportData, setReportData] = useState<SalesReportData | null>(null);
  const [salesLogData, setSalesLogData] = useState<SalesLogData | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [userRole, setUserRole] = useState<"admin" | "staff">("staff");
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() - 29);
    return defaultStart.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;
  const router = useRouter();

  const preventFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    setEndDate(event.target.value);
  };

  const refreshReports = useCallback(
    async ({ useFiltering = false }: { useFiltering?: boolean } = {}) => {
      if (useFiltering) {
        setIsFiltering(true);
      } else {
        setLoading(true);
      }

      try {
        if (!authToken) {
          return;
        }

        const [reportResponse, logResponse] = await Promise.all([
          fetch(
            `${API_BASE}/reports?range=${encodeURIComponent(reportRange)}`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          ),
          fetch(
            `${API_BASE}/reports/sales-log?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
            },
          ),
        ]);

        const [reportPayload, logPayload] = await Promise.all([
          reportResponse.json(),
          logResponse.json(),
        ]);

        setReportData(reportPayload as SalesReportData);
        setSalesLogData(logPayload as SalesLogData);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
        setReportData(null);
        setSalesLogData(null);
      } finally {
        if (useFiltering) {
          setIsFiltering(false);
        } else {
          setLoading(false);
        }
      }
    },
    [authToken, reportRange, startDate, endDate],
  );

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
            setUserRole("admin");
            window.localStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({ token: cookieToken, user: payload.user }),
            );
            setSessionCookie(cookieToken);
          } else {
            window.location.replace("/");
            return;
          }

          setSessionReady(true);
          return;
        }

        const parsed = JSON.parse(storedSession) as {
          token?: string;
          user?: { username?: string; role?: string };
        };
        if (parsed?.token && parsed?.user?.role === "admin") {
          setAuthToken(parsed.token);
          setUserRole("admin");
        }

        if (parsed?.user?.username) {
          setProfileName(parsed.user.username);
          setProfileEmail(`${parsed.user.username}@expresspharma.local`);
        }

        setSessionReady(true);
      } catch (error) {
        console.error("Session hydration failed:", error);
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

    const fetchData = async () => {
      if (!hasLoadedOnce) {
        await refreshReports();
        setHasLoadedOnce(true);
      } else {
        await refreshReports({ useFiltering: true });
      }
    };

    void fetchData();
  }, [refreshReports, router, sessionReady, userRole, hasLoadedOnce]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate]);

  const filteredRecords = useMemo(() => {
    const records = salesLogData?.records ?? [];
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return records;
    }

    return records.filter((record) =>
      [
        String(record.id),
        record.medicineName,
        record.category,
        record.sellerName,
        record.receiverName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [salesLogData, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPageRecords = filteredRecords.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / itemsPerPage),
  );

  const exportToExcel = () => {
    if (!filteredRecords.length) {
      return;
    }

    const headers = [
      "Date/Time",
      "Invoice ID",
      "Medicine Name",
      "Quantity Sold",
      "Total Revenue",
      "Served By",
    ];

    const csvRows = [headers.join(",")];
    filteredRecords.forEach((record) => {
      const row = [
        new Date(record.saleDate).toLocaleString("en-GB", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        `INV-${record.id}`,
        record.medicineName,
        String(record.quantitySold),
        record.totalPrice.toFixed(2),
        record.sellerName || record.receiverName || "N/A",
      ];
      csvRows.push(
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      );
    });

    const blob = new Blob([csvRows.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sales-history-${startDate}-to-${endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const ledgerElement = document.getElementById("printable-ledger-table");
    if (!ledgerElement) {
      return;
    }

    const printContent = ledgerElement.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `
      <html>
        <head>
          <title>Express Pharmaceutical Wholesale - Transaction Ledger</title>
          <style>
            body {
              font-family: sans-serif;
              padding: 20px;
              color: #333;
              margin: 0;
            }
            .no-print,
            .quick-links,
            .back-to-dashboard,
            footer {
              display: none !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 15px;
            }
            th,
            td {
              border-bottom: 1px solid #ddd !important;
              padding: 12px !important;
              text-align: left !important;
              font-size: 14px !important;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: 600 !important;
              color: #475569 !important;
              text-transform: uppercase !important;
            }
            thead {
              display: table-header-group;
            }
            tbody {
              display: table-row-group;
            }
          </style>
        </head>
        <body>
          <h2 style="margin-bottom: 5px;">Express Pharmaceutical Wholesale</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0;">Transaction History Ledger Report</p>
          <div id="printable-ledger-table">${printContent}</div>
        </body>
      </html>
    `;

    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleSignOut = () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("rememberMe");
    clearSessionCookie();
    window.location.href = "/";
  };

  if (!sessionReady || (loading && !hasLoadedOnce)) {
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
        userRole={userRole}
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
                  Transaction history ledger
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-tight tracking-tight text-sky-50/85">
                  Filter, print, and export sales activity logs in a dedicated
                  reporting view.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshReports()}
                className="inline-flex rounded-2xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:border-white/40 hover:bg-white/20"
              >
                Refresh
              </button>
            </div>
          </header>

          <section className="rounded-4xl border border-white/80 bg-slate-50/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.10)] backdrop-blur-md">
            <form
              onSubmit={preventFormSubmit}
              className="mb-6 grid gap-4 lg:grid-cols-[1fr_1fr_1.1fr] no-print"
            >
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Search logs
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by invoice, medicine, seller..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
              </div>
            </form>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between no-print">
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Ledger snapshot
                </p>
                <p className="text-sm text-slate-600">
                  Showing {filteredRecords.length} records from {startDate} to{" "}
                  {endDate}.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Print PDF
                </button>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="rounded-2xl border border-slate-300 bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Export to Excel
                </button>
              </div>
            </div>

            <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
              <div
                id="printable-ledger-table"
                className="min-w-[800px] overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-sm"
              >
                {isFiltering ? (
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Filtering ledger...
                  </div>
                ) : null}
                <table className="w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Date/Time</th>
                      <th className="px-4 py-4">Invoice ID</th>
                      <th className="px-4 py-4">Medicine Name</th>
                      <th className="px-4 py-4">Quantity Sold</th>
                      <th className="px-4 py-4">Total Revenue</th>
                      <th className="px-4 py-4">Served By</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y divide-slate-200 bg-white text-slate-700 ${
                      isFiltering
                        ? "opacity-50 pointer-events-none transition-opacity duration-200"
                        : ""
                    }`}
                  >
                    {currentPageRecords.length ? (
                      currentPageRecords.map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 py-4">
                            {new Date(record.saleDate).toLocaleString("en-GB", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-4">INV-{record.id}</td>
                          <td className="px-4 py-4 font-semibold text-slate-900">
                            {record.medicineName}
                          </td>
                          <td className="px-4 py-4">{record.quantitySold}</td>
                          <td className="px-4 py-4">
                            ETB {record.totalPrice.toFixed(2)}
                          </td>
                          <td className="px-4 py-4">
                            {record.sellerName || record.receiverName || "N/A"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          className="px-4 py-8 text-center text-sm text-slate-500"
                          colSpan={6}
                        >
                          No records match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={currentPage === 1}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

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
