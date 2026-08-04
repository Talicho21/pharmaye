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
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Printer,
  RotateCw,
  Search,
  FileText,
} from "lucide-react";

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
          <title>Hawan Drug Store - Transaction Ledger</title>
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
          <h2 style="margin-bottom: 5px;">Hawan Drug Store</h2>
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
      <div className="flex min-h-screen items-center justify-center bg-off-white">
        <div className="flex items-center gap-3 rounded-xl border border-border-gray bg-pure-white px-8 py-6 text-sm font-semibold text-dark-charcoal/70 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-grass-green" />
          Loading reports…
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
        {/* ── Page Header ── */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between no-print">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-dark-charcoal/70">
              Reports
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-dark-charcoal">
              Transaction History Ledger
            </h1>
            <p className="mt-1 text-sm text-dark-charcoal/70">
              Filter, print, and export sales activity logs.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshReports()}
              className="inline-flex items-center gap-2 rounded-lg bg-grass-green px-4 py-2 text-sm font-bold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
            >
              <RotateCw className="h-4 w-4" />
              Refresh Data
            </button>
            <button
              type="button"
              onClick={exportToExcel}
              className="inline-flex items-center gap-2 rounded-lg border border-border-gray bg-off-white px-4 py-2 text-sm font-semibold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-border-gray bg-off-white px-4 py-2 text-sm font-semibold text-dark-charcoal shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 active:translate-y-0"
            >
              <Printer className="h-4 w-4" />
              Print Report
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

        {/* ── Filter Toolbar ── */}
        <div className="mb-5 rounded-xl border border-border-gray bg-pure-white p-5 shadow-sm no-print">
          <form
            onSubmit={preventFormSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr]"
          >
            {/* Start Date */}
            <div>
              <label
                htmlFor="start-date"
                className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70"
              >
                Start Date
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-9 pr-3 text-sm text-dark-charcoal outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="end-date"
                className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70"
              >
                End Date
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-9 pr-3 text-sm text-dark-charcoal outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                />
              </div>
            </div>

            {/* Search */}
            <div>
              <label
                htmlFor="search-logs"
                className="mb-1.5 block text-xs font-black uppercase tracking-[0.22em] text-dark-charcoal/70"
              >
                Search Transaction / Invoice ID
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-charcoal/80" />
                <input
                  id="search-logs"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Invoice ID, medicine, seller…"
                  className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-9 pr-3 text-sm text-dark-charcoal placeholder:text-dark-charcoal/70 outline-none transition duration-150 focus:border-border-gray focus:ring-1 focus:ring-border-gray focus-visible:ring-2 focus-visible:ring-primary-blue"
                />
              </div>
            </div>
          </form>

          {/* Summary badge */}
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-off-white px-4 py-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-dark-charcoal/80" />
            <p className="text-xs font-semibold text-dark-charcoal">
              Showing{" "}
              <span className="font-black text-dark-charcoal">
                {filteredRecords.length}
              </span>{" "}
              record{filteredRecords.length !== 1 ? "s" : ""} from{" "}
              <span className="font-black text-dark-charcoal">{startDate}</span>
              {" "}to{" "}
              <span className="font-black text-dark-charcoal">{endDate}</span>
            </p>
          </div>
        </div>

        {/* ── Data Table Card ── */}
        <div className="rounded-xl border border-border-gray bg-pure-white shadow-sm">
          {/* Filtering indicator */}
          {isFiltering && (
            <div className="flex items-center gap-2 border-b border-border-gray bg-off-white/60 px-5 py-2.5 text-xs font-semibold text-dark-charcoal/70">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-grass-green" />
              Refreshing ledger…
            </div>
          )}

          {/* Scrollable table wrapper */}
          <div className="w-full overflow-x-auto">
            <div id="printable-ledger-table" className="min-w-[680px]">
              <table
                className={`w-full text-left text-sm transition-opacity duration-200 ${
                  isFiltering ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <thead>
                  <tr className="border-b border-border-gray bg-off-white">
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Date &amp; Time
                    </th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Invoice ID
                    </th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Medicine Name
                    </th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Qty Sold
                    </th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Total Price (ETB)
                    </th>
                    <th className="px-5 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-dark-charcoal">
                      Served By
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPageRecords.length ? (
                    currentPageRecords.map((record, idx) => (
                      <tr
                        key={record.id}
                        className={`border-b border-border-gray/50 transition duration-150 hover:bg-off-white/70 ${
                          idx % 2 === 0 ? "bg-pure-white" : "bg-off-white/30"
                        }`}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-dark-charcoal">
                          {new Date(record.saleDate).toLocaleString("en-GB", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5">
                          <span className="font-mono text-sm font-semibold text-dark-charcoal">
                            INV-{record.id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-dark-charcoal">
                          {record.medicineName}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-dark-charcoal">
                          {record.quantitySold}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-dark-charcoal">
                          ETB {record.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-5 py-3.5 text-dark-charcoal/70">
                          {record.sellerName || record.receiverName || "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <FileText className="h-10 w-10 text-border-gray" />
                          <p className="text-sm font-semibold text-dark-charcoal/70">
                            No transactions found within the selected date range.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination Footer ── */}
          <div className="flex items-center justify-between border-t border-border-gray px-5 py-3.5">
            <p className="text-sm font-semibold text-dark-charcoal/70">
              Page{" "}
              <span className="font-black text-dark-charcoal">{currentPage}</span>
              {" "}of{" "}
              <span className="font-black text-dark-charcoal">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-gray bg-off-white text-dark-charcoal transition duration-150 hover:bg-navy-border hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-off-white disabled:hover:text-dark-charcoal"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-gray bg-off-white text-dark-charcoal transition duration-150 hover:bg-navy-border hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-off-white disabled:hover:text-dark-charcoal"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
