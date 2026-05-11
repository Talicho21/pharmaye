"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 Tooltip,
 ResponsiveContainer,
 CartesianGrid,
} from "recharts";
import {
 MultiItemOrderCart,
 type CartItem,
} from "@/app/components/MultiItemOrderCart";

type InventoryItem = {
 id: number;
 name: string;
 category_id?: number | null;
 category_name?: string | null;
 batch_number: string;
 quantity: number;
 expiry_date: string;
 price_per_unit: number;
 initial_batch_quantity?: number;
 initial_quantity?: number;
};

type CategoryItem = {
 id: number;
 category_name: string;
};

type CategoryAnalyticsPoint = {
 category: string;
 totalQuantity: number;
 medicineCount: number;
 totalValue: number;
};

type ReportRange = "24h" | "monthly" | "6months" | "yearly";

type TopSellingMedicine = {
 medicineName: string;
 quantitySold: number;
 totalRevenue: number;
};

type SalesReportData = {
 range: ReportRange;
 totalRevenue: number;
 totalItemsSold: number;
 topSellingMedicines: TopSellingMedicine[];
};

type SalesLogRecord = {
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
};

type SalesLogData = {
 startDate: string;
 endDate: string;
 totalRecords: number;
 records: SalesLogRecord[];
};

type InactiveMedicineRecord = {
 medicineId: number;
 medicineName: string;
 categoryName: string;
 lastSaleDate: string | null;
 daysSinceLastSale: number | null;
 totalSales: number;
 totalQuantitySold: number;
};

type InactiveCategoryRecord = {
 categoryId: number;
 categoryName: string;
 medicineCount: number;
 lastSaleDate: string | null;
 daysSinceLastSale: number | null;
 totalSales: number;
 totalQuantitySold: number;
};

type InactivityReportData = {
 thresholdMonths: number;
 medicines: InactiveMedicineRecord[];
 categories: InactiveCategoryRecord[];
};

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

type RowStatusStyles = {
 isLowStock: boolean;
 isExpired: boolean;
 isNearExpiry: boolean;
 stockBadgeClass: string;
 stockWarningClass: string;
 stockWarningText: string;
 expiryTextClass: string;
 expiryWarningClass: string;
 expiryWarningText: string;
 expiryIcon: string;
};

export const getStatusStyles = (
 stock: number,
 expiryDate: string,
 initialBatchQuantity?: number,
): RowStatusStyles => {
 const today = new Date();
 const now = new Date(
 today.getFullYear(),
 today.getMonth(),
 today.getDate(),
 0,
 0,
 0,
 0,
 );

 const expiryRaw = new Date(expiryDate);
 const expiry = new Date(
 expiryRaw.getFullYear(),
 expiryRaw.getMonth(),
 expiryRaw.getDate(),
 0,
 0,
 0,
 0,
 );

 const sixMonthsFromNow = new Date(
 now.getFullYear(),
 now.getMonth() + 6,
 now.getDate(),
 0,
 0,
 0,
 0,
 );

 const hasInitialBatch =
 typeof initialBatchQuantity === "number" &&
 Number.isFinite(initialBatchQuantity) &&
 initialBatchQuantity > 0;

 const lowStockThreshold = hasInitialBatch
 ? Math.max(5, Math.ceil(initialBatchQuantity * 0.2))
 : 5;

 const isOutOfStock = stock <= 0;
 const isLowStock = !isOutOfStock && stock < lowStockThreshold;
 const isExpired = now > expiry;
 const isNearExpiry = !isExpired && expiry <= sixMonthsFromNow;

 if (isOutOfStock) {
 return {
 isLowStock: false,
 isExpired,
 isNearExpiry,
 stockBadgeClass:
 "inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-100 px-3 py-1 text-xs font-black text-red-700 shadow-none",
 stockWarningClass: "mt-1 text-[10px] font-black text-red-700",
 stockWarningText: "Out of Stock: Restocking required before dispensing.",
 expiryTextClass: isExpired
 ? "text-sm font-black text-red-700"
 : isNearExpiry
 ? "text-sm font-black text-amber-700"
 : "text-sm font-bold text-blue-700",
 expiryWarningClass: isExpired
 ? "mt-1 text-[10px] font-black text-red-700"
 : isNearExpiry
 ? "mt-1 text-[10px] font-black text-amber-700"
 : "mt-1 text-[10px] font-bold text-blue-700",
 expiryWarningText: isExpired
 ? "EXPIRED: Discard immediately and remove from shelves."
 : isNearExpiry
 ? "Notice: Product expires in less than 6 months."
 : "Healthy: Expiry is more than 6 months away.",
 expiryIcon: isExpired ? "🚩" : isNearExpiry ? "⚠️" : "✅",
 };
 }

 return {
 isLowStock,
 isExpired,
 isNearExpiry,
 stockBadgeClass: isLowStock
 ? "inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 shadow-none"
 : "inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 shadow-none",
 stockWarningClass: isLowStock
 ? "mt-1 text-[10px] font-black text-amber-700"
 : "mt-1 text-[10px] font-bold text-emerald-700",
 stockWarningText: isLowStock
 ? "Low Stock Warning: Please restock soon to avoid service interruption."
 : "Stock level healthy.",
 expiryTextClass: isExpired
 ? "text-sm font-black text-red-700"
 : isNearExpiry
 ? "text-sm font-black text-amber-700"
 : "text-sm font-bold text-blue-700",
 expiryWarningClass: isExpired
 ? "mt-1 text-[10px] font-black text-red-700"
 : isNearExpiry
 ? "mt-1 text-[10px] font-black text-amber-700"
 : "mt-1 text-[10px] font-bold text-blue-700",
 expiryWarningText: isExpired
 ? "EXPIRED: Discard immediately and remove from shelves."
 : isNearExpiry
 ? "Notice: Product expires in less than 6 months."
 : "Healthy: Expiry is more than 6 months away.",
 expiryIcon: isExpired ? "🚩" : isNearExpiry ? "⚠️" : "✅",
 };
};

type ToastType = "success" | "error";

type ToastMessage = {
 id: number;
 title: string;
 description: string;
 type: ToastType;
};

const CATEGORY_ANALYTICS_METRICS = {
 totalQuantity: {
 label: "Total Units",
 color: "#eab308",
 formatValue: (value: number) => `${Math.round(value)} units`,
 },
 medicineCount: {
 label: "Medicine Count",
 color: "#dc2626",
 formatValue: (value: number) => `${Math.round(value)} medicines`,
 },
 totalValue: {
 label: "Total Stock Value",
 color: "#16a34a",
 formatValue: (value: number) => `ETB ${value.toFixed(2)}`,
 },
} as const;

type CategoryMetricKey = keyof typeof CATEGORY_ANALYTICS_METRICS;
type CategoryAnalyticsViewKey =
 | CategoryMetricKey
 | "medicineCountAndStockValue"
 | "allMetricsCombined";

const REPORT_RANGE_OPTIONS: Array<{ value: ReportRange; label: string }> = [
 { value: "24h", label: "Last 24 Hours" },
 { value: "monthly", label: "Monthly" },
 { value: "6months", label: "6 Months" },
 { value: "yearly", label: "Yearly" },
];

type SalesLogRowsPerPageOption = number | "all";

const SALES_LOG_ROWS_PER_PAGE_OPTIONS: SalesLogRowsPerPageOption[] = [
 10,
 20,
 50,
 100,
 250,
 500,
 1000,
 "all",
];

const INACTIVE_THRESHOLD_MONTHS = 3;
const SESSION_STORAGE_KEY = "pharmacy_auth_session_v1";

export default function PharmacyDashboard() {
 const todayDate = new Date();
 const defaultSalesLogEndDate = todayDate.toISOString().split("T")[0];
 const startDateBase = new Date(todayDate);
 startDateBase.setDate(startDateBase.getDate() - 6);
 const defaultSalesLogStartDate = startDateBase.toISOString().split("T")[0];

 const [inventory, setInventory] = useState<InventoryItem[]>([]);
 const [categories, setCategories] = useState<CategoryItem[]>([]);
 const [selectedCategoryMetric, setSelectedCategoryMetric] =
 useState<CategoryAnalyticsViewKey>("allMetricsCombined");
 const [selectedReportRange, setSelectedReportRange] =
 useState<ReportRange>("24h");
 const [reportData, setReportData] = useState<SalesReportData | null>(null);
 const [isLoadingReport, setIsLoadingReport] = useState(false);
 const [salesLogData, setSalesLogData] = useState<SalesLogData | null>(null);
 const [isLoadingSalesLog, setIsLoadingSalesLog] = useState(false);
 const [inactiveHistoryData, setInactiveHistoryData] =
 useState<InactivityReportData | null>(null);
 const [isLoadingInactiveHistory, setIsLoadingInactiveHistory] =
 useState(false);
 const [salesLogStartDate, setSalesLogStartDate] = useState(
 defaultSalesLogStartDate,
 );
 const [salesLogEndDate, setSalesLogEndDate] = useState(
 defaultSalesLogEndDate,
 );
 const [searchTerm, setSearchTerm] = useState("");
 const [categoryFilter, setCategoryFilter] = useState("all");
 const [categorySearchTerm, setCategorySearchTerm] = useState("");
 const [isDarkMode, setIsDarkMode] = useState(false);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [formData, setFormData] = useState({
 categoryId: "",
 medId: "",
 name: "",
 batch: "",
 qty: "",
 expiry: "",
 price: "",
 });
 const [authToken, setAuthToken] = useState<string | null>(null);
 const [loggedInUser, setLoggedInUser] = useState<AuthUser | null>(null);
 const [username, setUsername] = useState("");
 const [password, setPassword] = useState("");
 const [showPassword, setShowPassword] = useState(false);
 const [loginAttemptsLeft, setLoginAttemptsLeft] = useState(3);
 const [loginLockUntil, setLoginLockUntil] = useState<number | null>(null);
 const [currentTime, setCurrentTime] = useState(() => Date.now());
 const [loginErrorMessage, setLoginErrorMessage] = useState("");
 const [toasts, setToasts] = useState<ToastMessage[]>([]);
 const [sellModalItem, setSellModalItem] = useState<InventoryItem | null>(
 null,
 );
 const [deleteModalItem, setDeleteModalItem] = useState<InventoryItem | null>(
 null,
 );
 const [activeActionMenuId, setActiveActionMenuId] = useState<number | null>(
 null,
 );
 const [sellQtyInput, setSellQtyInput] = useState("1");
 const [sellDateInput, setSellDateInput] = useState(
 new Date().toISOString().split("T")[0],
 );
 const [sellerNameInput, setSellerNameInput] = useState("");
 const [receiverNameInput, setReceiverNameInput] = useState("");

 // ========== NEW: Multi-Item Order (Bulk Sale) State ==========
 const [isGeneralSaleOpen, setIsGeneralSaleOpen] = useState(false);
 const [isProcessingBulkSale, setIsProcessingBulkSale] = useState(false);
 const [bulkSaleSellerName, setBulkSaleSellerName] = useState("");
 const [bulkSaleReceiverName, setBulkSaleReceiverName] = useState("");
 // ========== END: Multi-Item Order State ===========
 const toastIdRef = useRef(0);
 const salesLogScrollRef = useRef<HTMLDivElement | null>(null);
 const [salesLogRowsPerPage, setSalesLogRowsPerPage] =
 useState<SalesLogRowsPerPageOption>(10);
 const [salesLogPage, setSalesLogPage] = useState(1);
 const [salesLogHasScrolled, setSalesLogHasScrolled] = useState(false);

 const isLoggedIn = Boolean(authToken && loggedInUser);
 const isAdmin = loggedInUser?.role === "admin";

 // --- Core Functions ---

 const fetchJsonWithFallback = async <T,>(
 primaryUrl: string,
 fallbackUrl: string,
 init?: RequestInit,
 ): Promise<T> => {
 const requestUrls = [primaryUrl, fallbackUrl];
 let lastError: Error | null = null;

 for (const requestUrl of requestUrls) {
 try {
 const response = await fetch(requestUrl, {
 ...init,
 cache: "no-store",
 });
 if (!response.ok) {
 lastError = new Error(
 `Request failed with status ${response.status}`,
 );
 continue;
 }

 const payload = (await response.json()) as T;
 return payload;
 } catch (error) {
 lastError =
 error instanceof Error ? error : new Error("Failed to fetch data");
 }
 }

 throw lastError || new Error("Failed to fetch data");
 };

 const getAuthHeaders = (): Headers => {
 const headers = new Headers();

 if (authToken) {
 headers.set("Authorization", `Bearer ${authToken}`);
 }

 return headers;
 };

 const fetchData = async () => {
 try {
 const res = await fetch("http://localhost:5000/api/inventory");
 if (!res.ok) throw new Error("Failed to fetch");
 const data = await res.json();
 setInventory(data);
 } catch (err) {
 console.error("Fetch error:", err);
 }
 };

 const fetchCategories = async () => {
 try {
 const res = await fetch("/api/categories");
 if (!res.ok) {
 setCategories([]);
 return;
 }
 const data = await res.json();
 setCategories(data);
 } catch (err) {
 setCategories([]);
 }
 };

 const fetchReportData = async (range: ReportRange) => {
 if (!isAdmin) {
 setReportData(null);
 return;
 }

 setIsLoadingReport(true);
 try {
 const query = `range=${encodeURIComponent(range)}`;
 const data = await fetchJsonWithFallback<SalesReportData>(
 `/api/reports?${query}`,
 `http://localhost:5000/api/reports?${query}`,
 {
 headers: getAuthHeaders(),
 },
 );
 setReportData(data);
 } catch (err) {
 console.error("Report fetch error:", err);
 showToast(
 "Report unavailable",
 "Unable to load sales report data right now.",
 "error",
 );
 } finally {
 setIsLoadingReport(false);
 }
 };

 const fetchSalesLogData = async (startDate: string, endDate: string) => {
 if (!isAdmin) {
 setSalesLogData(null);
 return;
 }

 setIsLoadingSalesLog(true);
 try {
 const query = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
 const data = await fetchJsonWithFallback<SalesLogData>(
 `/api/reports/sales-log?${query}`,
 `http://localhost:5000/api/reports/sales-log?${query}`,
 {
 headers: getAuthHeaders(),
 },
 );
 setSalesLogData(data);
 } catch (err) {
 console.error("Sales log fetch error:", err);
 setSalesLogData(null);
 showToast(
 "Sales log unavailable",
 "Unable to load detailed sales records right now.",
 "error",
 );
 } finally {
 setIsLoadingSalesLog(false);
 }
 };

 const fetchInactiveHistoryData = async () => {
 if (!isAdmin) {
 setInactiveHistoryData(null);
 return;
 }

 setIsLoadingInactiveHistory(true);
 try {
 const query = `thresholdMonths=${encodeURIComponent(String(INACTIVE_THRESHOLD_MONTHS))}`;
 const data = await fetchJsonWithFallback<InactivityReportData>(
 `/api/reports/inactive?${query}`,
 `http://localhost:5000/api/reports/inactive?${query}`,
 {
 headers: getAuthHeaders(),
 },
 );
 setInactiveHistoryData(data);
 } catch (err) {
 console.error("Inactive history fetch error:", err);
 setInactiveHistoryData(null);
 // Silent fail - don't show error toast
 } finally {
 setIsLoadingInactiveHistory(false);
 }
 };

 // NOTE: Do not auto-restore a saved session on first load.
 // This ensures opening the site (e.g. clicking the localhost link)
 // always directs users to the login UI instead of silently showing
 // the dashboard when a previous session exists.
 useEffect(() => {
 // Clear any saved session on initial load so the login page is shown.
 try {
 window.localStorage.removeItem(SESSION_STORAGE_KEY);
 } catch (_e) {
 // ignore
 }
 }, []);

 useEffect(() => {
 if (authToken && loggedInUser) {
 window.localStorage.setItem(
 SESSION_STORAGE_KEY,
 JSON.stringify({ token: authToken, user: loggedInUser }),
 );
 return;
 }

 window.localStorage.removeItem(SESSION_STORAGE_KEY);
 }, [authToken, loggedInUser]);

 useEffect(() => {
 if (isLoggedIn) {
 fetchData();
 fetchCategories();
 }
 }, [isLoggedIn]);

 useEffect(() => {
 if (isLoggedIn && isAdmin) {
 fetchReportData(selectedReportRange);
 return;
 }

 setReportData(null);
 }, [selectedReportRange, isLoggedIn, isAdmin]);

 useEffect(() => {
 if (isLoggedIn && isAdmin && salesLogStartDate && salesLogEndDate) {
 fetchSalesLogData(salesLogStartDate, salesLogEndDate);
 return;
 }

 setSalesLogData(null);
 }, [salesLogStartDate, salesLogEndDate, isLoggedIn, isAdmin]);

 useEffect(() => {
 if (isLoggedIn && isAdmin) {
 fetchInactiveHistoryData();
 return;
 }

 setInactiveHistoryData(null);
 }, [isLoggedIn, isAdmin]);

 useEffect(() => {
 const totalRecords = salesLogData?.records?.length ?? 0;
 const rowsPerPageForPagination =
 salesLogRowsPerPage === "all"
 ? Math.max(1, totalRecords)
 : salesLogRowsPerPage;
 const totalPages = Math.max(
 1,
 Math.ceil(totalRecords / rowsPerPageForPagination),
 );
 setSalesLogPage((previousPage) => Math.min(previousPage, totalPages));
 }, [salesLogData, salesLogRowsPerPage]);

 useEffect(() => {
 setSalesLogPage(1);
 }, [salesLogStartDate, salesLogEndDate, salesLogRowsPerPage]);

 useEffect(() => {
 const scrollContainer = salesLogScrollRef.current;
 if (!scrollContainer) return;

 const onScroll = () => {
 setSalesLogHasScrolled(scrollContainer.scrollTop > 0);
 };

 onScroll();
 scrollContainer.addEventListener("scroll", onScroll, { passive: true });

 return () => {
 scrollContainer.removeEventListener("scroll", onScroll);
 };
 }, [salesLogData, salesLogRowsPerPage, salesLogPage, isLoadingSalesLog]);

 useEffect(() => {
 if (!loginLockUntil) return;

 const timer = window.setInterval(() => {
 setCurrentTime(Date.now());
 }, 1000);

 return () => {
 window.clearInterval(timer);
 };
 }, [loginLockUntil]);

 const showToast = (title: string, description: string, type: ToastType) => {
 toastIdRef.current += 1;
 const id = toastIdRef.current;
 setToasts((prev) => [...prev, { id, title, description, type }]);
 setTimeout(() => {
 setToasts((prev) => prev.filter((toast) => toast.id !== id));
 }, 3200);
 };

 const handleLogin = async () => {
 if (loginLockUntil && Date.now() < loginLockUntil) {
 setLoginErrorMessage(
 `Locked for ${Math.max(1, loginLockRemainingSeconds)} seconds. Please try again.`,
 );
 showToast(
 "Login locked",
 "Too many attempts. Please try again in 30 seconds.",
 "error",
 );
 return;
 }

 const safeUsername = username.trim();

 if (!safeUsername || !password) {
 setLoginErrorMessage("Username and password are required.");
 showToast(
 "Missing credentials",
 "Please enter both username and password.",
 "error",
 );
 return;
 }

 let response: Response;
 let payload: LoginResponse | { message?: string };

 try {
 response = await fetch("/api/auth/login", {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 username: safeUsername,
 password,
 }),
 });

 payload = (await response.json()) as LoginResponse | { message?: string };
 } catch (_error) {
 setLoginErrorMessage("Unable to login right now. Please try again.");
 showToast(
 "Login failed",
 "Unable to reach the server. Please try again.",
 "error",
 );
 return;
 }

 if (!response.ok) {
 setLoginAttemptsLeft((previousAttempts) => {
 const nextAttempts = previousAttempts - 1;

 if (nextAttempts <= 0) {
 setLoginLockUntil(Date.now() + 30000);
 setCurrentTime(Date.now());
 setLoginErrorMessage(
 "Incorrect password please try again. Too many attempts. Please try again in 30 seconds.",
 );
 showToast(
 "Incorrect password",
 "Incorrect password please try again. Too many attempts. Please try again in 30 seconds.",
 "error",
 );
 return 3;
 }

 const message =
 (payload as { message?: string })?.message ||
 "Incorrect username or password please try again.";

 setLoginErrorMessage(message);

 showToast("Login failed", message, "error");

 return nextAttempts;
 });
 return;
 }

 const typedPayload = payload as LoginResponse;
 const role = typedPayload.user?.role;
 if (!typedPayload?.token || !typedPayload?.user || !role) {
 setLoginErrorMessage("Login response is invalid.");
 showToast("Login failed", "Unexpected login response payload.", "error");
 return;
 }

 setAuthToken(typedPayload.token);
 setLoggedInUser(typedPayload.user);
 setLoginAttemptsLeft(3);
 setLoginLockUntil(null);
 setLoginErrorMessage("");
 setUsername("");
 setPassword("");
 setShowPassword(false);
 showToast(
 "Login successful",
 `Welcome back, ${typedPayload.user.username}.`,
 "success",
 );
 };

 const handleLogout = () => {
 window.localStorage.removeItem(SESSION_STORAGE_KEY);
 setAuthToken(null);
 setLoggedInUser(null);
 setPassword("");
 setUsername("");
 setLoginErrorMessage("");
 setActiveActionMenuId(null);
 setDeleteModalItem(null);
 setSellModalItem(null);
 };

 const handleRefresh = async () => {
 setIsRefreshing(true);

 const refreshTasks: Array<Promise<void>> = [fetchData(), fetchCategories()];

 if (isAdmin) {
 refreshTasks.push(fetchReportData(selectedReportRange));
 refreshTasks.push(fetchSalesLogData(salesLogStartDate, salesLogEndDate));
 refreshTasks.push(fetchInactiveHistoryData());
 }

 await Promise.all(refreshTasks);
 setIsRefreshing(false);
 showToast(
 "Inventory refreshed",
 isAdmin
 ? "Latest stock and report data loaded."
 : "Latest stock data loaded.",
 "success",
 );
 };

 const handleRowsPerPageChange = (value: string) => {
 if (value === "all") {
 setSalesLogRowsPerPage("all");
 return;
 }

 const parsedValue = Number(value);

 if (!Number.isFinite(parsedValue)) {
 setSalesLogRowsPerPage(10);
 return;
 }

 const clampedValue = Math.max(10, Math.min(1000, Math.floor(parsedValue)));
 setSalesLogRowsPerPage(clampedValue);
 };

 const handleExportReport = () => {
 if (!isAdmin) {
 showToast("Forbidden", "Staff users cannot export reports.", "error");
 return;
 }

 try {
 const allSalesRecords = salesLogData?.records ?? [];

 if (allSalesRecords.length === 0) {
 showToast(
 "No records to export",
 "There are no detailed sales records in the selected date range.",
 "error",
 );
 return;
 }

 const escapeHtml = (value: unknown) =>
 String(value ?? "")
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/\"/g, "&quot;")
 .replace(/'/g, "&#39;");

 const rows = allSalesRecords
 .map(
 (record) => `
 <tr>
 <td>${record.id}</td>
 <td>${record.batchId}</td>
 <td>${escapeHtml(new Date(record.saleDate).toLocaleString("en-GB"))}</td>
 <td>${escapeHtml(record.medicineName)}</td>
 <td>${escapeHtml(record.category)}</td>
 <td style="text-align:right;">${record.quantitySold}</td>
 <td style="text-align:right;">ETB ${Number(record.unitPrice || 0).toFixed(2)}</td>
 <td style="text-align:right;">ETB ${Number(record.totalPrice || 0).toFixed(2)}</td>
 <td>${escapeHtml(record.sellerName)}</td>
 <td>${escapeHtml(record.receiverName)}</td>
 </tr>`,
 )
 .join("");

 const reportTitle = "Detailed Sales Log";
 const generatedAt = new Date().toLocaleString("en-GB");

 const htmlContent = `
 <!doctype html>
 <html>
 <head>
 <meta charset="utf-8" />
 <title>${reportTitle}</title>
 <style>
 body { font-family: Inter, Arial, sans-serif; margin: 24px; color: #0f172a; }
 h1 { margin: 0 0 6px 0; font-size: 24px; }
 p { margin: 0 0 16px 0; font-size: 12px; color: #475569; }
 table { width: 100%; border-collapse: collapse; font-size: 12px; }
 th, td { border: 1px solid #0f172a; padding: 8px; vertical-align: top; }
 th { background: #f8fafc; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
 @media print {
 @page { size: A4 landscape; margin: 12mm; }
 body { margin: 0; }
 }
 </style>
 </head>
 <body>
 <h1>${reportTitle}</h1>
 <p>Range: ${escapeHtml(salesLogStartDate)} to ${escapeHtml(salesLogEndDate)} • Total records: ${allSalesRecords.length} • Generated: ${escapeHtml(generatedAt)}</p>
 <table>
 <thead>
 <tr>
 <th>Sale ID</th>
 <th>Batch ID</th>
 <th>Date & Time</th>
 <th>Medicine</th>
 <th>Category</th>
 <th>Qty</th>
 <th>Unit Price</th>
 <th>Total</th>
 <th>Seller</th>
 <th>Receiver</th>
 </tr>
 </thead>
 <tbody>
 ${rows}
 </tbody>
 </table>
 </body>
 </html>
 `;

 const printWindow = window.open("", "_blank", "width=1200,height=900");

 if (!printWindow) {
 showToast(
 "Export blocked",
 "Please allow pop-ups to export and print the full report.",
 "error",
 );
 return;
 }

 printWindow.document.open();
 printWindow.document.write(htmlContent);
 printWindow.document.close();

 const triggerPrint = () => {
 printWindow.focus();
 printWindow.print();
 };

 if (printWindow.document.readyState === "complete") {
 triggerPrint();
 } else {
 printWindow.onload = triggerPrint;
 }
 } catch (error) {
 console.error("Export error:", error);
 showToast(
 "Export failed",
 "Unable to generate the report. Please try again.",
 "error",
 );
 }
 };

 const handleDelete = async (item: InventoryItem) => {
 if (!isAdmin || !authToken) {
 showToast("Forbidden", "Staff users cannot delete stock items.", "error");
 return;
 }

 try {
 const res = await fetch(
 `http://localhost:5000/api/inventory/delete/${item.id}`,
 {
 method: "DELETE",
 headers: {
 Authorization: `Bearer ${authToken}`,
 },
 },
 );

 if (res.ok) {
 await fetchData();
 setDeleteModalItem(null);
 setActiveActionMenuId(null);
 showToast(
 "Item deleted",
 `${item.name} batch ${item.batch_number} was removed successfully.`,
 "success",
 );
 } else {
 const contentType = res.headers.get("content-type") || "";
 let errorMessage = "Unable to delete this item right now.";

 if (contentType.includes("application/json")) {
 const errData = await res.json();
 errorMessage = errData.message || errData.error || errorMessage;
 } else {
 const text = await res.text();
 errorMessage = text?.trim() || errorMessage;
 }

 showToast("Delete failed", errorMessage, "error");
 }
 } catch (_err) {
 console.error("Delete error:", _err);
 showToast(
 "Connection issue",
 "Unable to reach the server. Please try again.",
 "error",
 );
 }
 };

 const handleSell = async (
 item: InventoryItem,
 quantityToSell: number,
 dateSold: string,
 sellerName: string,
 receiverName: string,
 ) => {
 if (item.quantity <= 0) {
 showToast("Stock unavailable", `${item.name} is out of stock.`, "error");
 return;
 }

 if (!Number.isInteger(quantityToSell) || quantityToSell <= 0) {
 showToast("Invalid quantity", "Enter a valid whole number.", "error");
 return;
 }

 if (quantityToSell > item.quantity) {
 showToast(
 "Quantity too high",
 `Only ${item.quantity} available.`,
 "error",
 );
 return;
 }

 try {
 const res = await fetch("http://localhost:5000/api/inventory/sell", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 batch_id: item.id,
 quantity_sold: quantityToSell,
 date_sold: dateSold,
 seller_name: sellerName.trim(),
 receiver_name: receiverName.trim(),
 }),
 });

 if (res.ok) {
 await fetchData();
 setSellModalItem(null);
 setSellQtyInput("1");
 setSellerNameInput("");
 setReceiverNameInput("");
 showToast(
 "Sale recorded",
 `Sold ${quantityToSell} units of ${item.name}.`,
 "success",
 );
 } else {
 const errData = await res.json();
 showToast("Sale failed", errData.message || "Server error.", "error");
 }
 } catch (_err) {
 showToast("Connection issue", "Server unreachable.", "error");
 }
 };

 // ========== NEW: Bulk Sale Handler ==========
 /**
 * Handle Multi-Item Order (Wholesale)
 * Called when user clicks "Process Sale" in the cart modal
 * Sends MULTIPLE items to backend in ONE transaction
 */
 const handleBulkSaleSubmit = async (
 cartItems: CartItem[],
 customerName: string,
 tinNumber: string,
 sellerName?: string,
 customerSNo?: string,
 paymentMethod?: "cash" | "credit",
 ) => {
 // ========== INPUT VALIDATION ==========
 if (!cartItems || cartItems.length === 0) {
 showToast(
 "Empty Cart",
 "Please add at least one item to the order.",
 "error",
 );
 return;
 }

 const safeSellerName = sellerName?.trim() || "";
 const safeReceiverName = customerName.trim();

 // ========== TRANSFORM CART INTO API FORMAT ==========
 const items = cartItems.map((item) => ({
 medicine_id: item.medicineId,
 batch_number: item.batchNumber,
 medicine_name: item.medicineName,
 quantity: item.quantity,
 price_per_unit: item.pricePerUnit,
 }));

 // ========== BUILD PAYLOAD ==========
 const payload = {
 items: items,
 seller_name: safeSellerName,
 receiver_name: safeReceiverName,
 customer_name: customerName,
 tin_number: tinNumber,
 customer_sno: customerSNo || null,
 payment_method: paymentMethod || "cash",
 };

 // ========== SEND TO BACKEND ==========
 setIsProcessingBulkSale(true);

 try {
 const response = await fetch(
 "http://localhost:5000/api/inventory/bulk-sell",
 {
 method: "POST",
 headers: {
 "Content-Type": "application/json",
 Authorization: `Bearer ${authToken}`,
 },
 body: JSON.stringify(payload),
 },
 );

 const result = await response.json();

 // ========== ERROR HANDLING ==========
 if (!response.ok) {
 showToast(
 "Order Processing Failed ❌",
 result.message ||
 "Could not process bulk sale. Please check your order and try again.",
 "error",
 );
 console.error("Bulk sale error response:", {
 status: response.status,
 message: result.message,
 error: result.error,
 });
 return;
 }

 // ========== SUCCESS HANDLING ==========
 const {
 data: { total_items_processed, total_revenue, items: processedItems },
 } = result;

 const itemsSummary = processedItems
 .slice(0, 3)
 .map(
 (item: any) =>
 `${item.medicine_name} (${item.quantity_deducted || item.quantity_sold} units)`,
 )
 .join(", ");

 const summary =
 processedItems.length > 3
 ? `${itemsSummary}, +${processedItems.length - 3} more`
 : itemsSummary;

 showToast(
 "✅ Order Processed Successfully!",
 `${total_items_processed} items | ${summary} | Total: ETB ${total_revenue}`,
 "success",
 );

 // ========== UPDATE UI ==========
 setIsGeneralSaleOpen(false);
 setBulkSaleSellerName("");

 // ✅ REFRESH INVENTORY
 await fetchData();
 } catch (error) {
 showToast(
 "🌐 Network Error",
 "Failed to submit order. Please check your connection and try again.",
 "error",
 );
 console.error("Bulk sale network error:", error);
 } finally {
 setIsProcessingBulkSale(false);
 }
 };
 // ========== END: Bulk Sale Handler ==========

 const handleAddStock = async (e: React.FormEvent) => {
 e.preventDefault();

 if (!formData.categoryId) {
 showToast(
 "Category required",
 "Please choose a medicine category.",
 "error",
 );
 return;
 }

 try {
 const res = await fetch("http://localhost:5000/api/inventory/stock-in", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 category_id: Number(formData.categoryId),
 medicine_id: formData.medId,
 medicine_name: formData.name,
 batch_number: formData.batch,
 quantity: formData.qty,
 expiry_date: formData.expiry,
 price_per_unit: formData.price,
 }),
 });

 if (res.ok) {
 setFormData({
 categoryId: "",
 medId: "",
 name: "",
 batch: "",
 qty: "",
 expiry: "",
 price: "",
 });
 setCategorySearchTerm("");
 fetchData();
 showToast("Stock Updated", "New batch added successfully.", "success");
 } else {
 const contentType = res.headers.get("content-type") || "";
 let errorMessage = "Could not add stock.";

 if (contentType.includes("application/json")) {
 const errData = await res.json();
 errorMessage = errData.message || errData.error || errorMessage;
 } else {
 const text = await res.text();
 errorMessage = text?.trim() || errorMessage;
 }

 showToast("Stock add failed", errorMessage, "error");
 }
 } catch (_err) {
 showToast("Error", "Could not add stock.", "error");
 }
 };

 const startSellInput = (item: InventoryItem) => {
 const status = getStatusStyles(
 item.quantity,
 item.expiry_date,
 item.initial_batch_quantity ?? item.initial_quantity,
 );

 if (item.quantity <= 0 || status.isExpired) {
 if (status.isExpired) {
 showToast(
 "Sale blocked",
 "Expired medicine cannot be sold. Remove from shelves immediately.",
 "error",
 );
 }
 return;
 }

 setSellModalItem(item);
 setSellQtyInput("1");
 setSellDateInput(new Date().toISOString().split("T")[0]);
 };

 const categoryAnalyticsData = useMemo(() => {
 const categoryMap = new Map<string, CategoryAnalyticsPoint>();

 inventory.forEach((item) => {
 const categoryName = item.category_name?.trim() || "Uncategorized";
 const categoryKey = String(item.category_id ?? categoryName);

 if (!categoryMap.has(categoryKey)) {
 categoryMap.set(categoryKey, {
 category: categoryName,
 totalQuantity: 0,
 medicineCount: 0,
 totalValue: 0,
 });
 }

 const point = categoryMap.get(categoryKey);
 if (!point) return;

 const quantity = Number(item.quantity) || 0;
 const pricePerUnit = Number(item.price_per_unit) || 0;

 point.totalQuantity += quantity;
 point.medicineCount += 1;
 point.totalValue += quantity * pricePerUnit;
 });

 const categorySortMetric: CategoryMetricKey =
 selectedCategoryMetric === "medicineCountAndStockValue" ||
 selectedCategoryMetric === "allMetricsCombined"
 ? "totalValue"
 : selectedCategoryMetric;

 return Array.from(categoryMap.values()).sort(
 (a, b) => b[categorySortMetric] - a[categorySortMetric],
 );
 }, [inventory, selectedCategoryMetric]);

 const loginLockRemainingSeconds = loginLockUntil
 ? Math.max(0, Math.ceil((loginLockUntil - currentTime) / 1000))
 : 0;
 const isLoginLocked = loginLockRemainingSeconds > 0;

 // --- Conditional Rendering for Login ---

 if (!isLoggedIn) {
 return (
 <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-black">
 <div
 className="absolute inset-0 bg-cover bg-center bg-no-repeat"
 style={{ backgroundImage: "url('/image.png')" }}
 />
 <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_30%),linear-gradient(135deg,rgba(2,6,23,0.82),rgba(15,23,42,0.72),rgba(8,47,73,0.76))]" />
 <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
 <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />

 <div className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/30 bg-white/92 p-8 shadow-[0_30px_90px_-30px_rgba(15,23,42,0.85)] backdrop-blur-xl transition-all duration-200 sm:p-10">
 <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-900/80 bg-slate-100/90 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-700 shadow-[3px_3px_0_0_#0f172a]">
 <span aria-hidden="true">🔐</span>
 Secure Role Login
 </div>

 <div className="mb-6">
 <h1 className="inline-block bg-black bg-clip-text text-4xl leading-tight font-black text-transparent sm:text-[2.6rem]">
 Express Pharmaceutical Wholesale
 </h1>
 {/* <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-600">
 Secure access for Admin and Staff workflows in one dashboard.
 </p> */}
 </div>
 <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
 Username
 </label>
 <div className="relative mb-5">
 <input
 type="text"
 value={username}
 placeholder="Enter username"
 disabled={isLoginLocked}
 className="w-full rounded-lg border border-transparent bg-slate-100 p-4 text-black outline-none transition-all duration-200 hover:border-blue-300 hover:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
 onChange={(e) => setUsername(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleLogin()}
 />
 </div>
 <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-slate-600">
 Password
 </label>
 <div className="relative mb-5">
 <input
 type={showPassword ? "text" : "password"}
 value={password}
 placeholder="Enter password"
 disabled={isLoginLocked}
 className="w-full rounded-lg border border-transparent bg-slate-100 p-4 pr-14 text-black outline-none transition-all duration-200 hover:border-blue-300 hover:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"
 onChange={(e) => setPassword(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && handleLogin()}
 />
 <button
 type="button"
 aria-label={showPassword ? "Hide password" : "Show password"}
 onClick={() => setShowPassword((previous) => !previous)}
 disabled={isLoginLocked}
 className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-all duration-200 hover:-translate-y-[52%] hover:border-slate-300 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
 >
 {showPassword ? (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 className="h-5 w-5"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M3 3l18 18M10.584 10.587A2 2 0 0013.41 13.41M9.88 5.09A9.77 9.77 0 0112 4.8c4.465 0 8.268 2.943 9.542 7.059a.999.999 0 010 .282 11.05 11.05 0 01-4.132 5.923M6.228 6.228A11.03 11.03 0 002.458 11.86a1 1 0 000 .282A11.04 11.04 0 007.5 18.118"
 />
 </svg>
 ) : (
 <svg
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 24 24"
 fill="none"
 stroke="currentColor"
 strokeWidth="2"
 className="h-5 w-5"
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M2.458 12C3.732 7.884 7.535 4.94 12 4.94S20.268 7.884 21.542 12c-1.274 4.116-5.077 7.06-9.542 7.06S3.732 16.116 2.458 12z"
 />
 <circle cx="12" cy="12" r="3" />
 </svg>
 )}
 </button>
 </div>

 {loginErrorMessage && (
 <p
 className={`-mt-1 mb-4 text-sm font-bold ${
 isLoginLocked ? "text-amber-600" : "text-rose-600"
 }`}
 >
 {loginErrorMessage}
 </p>
 )}

 <button
 onClick={handleLogin}
 disabled={isLoginLocked}
 className="w-full rounded-lg bg-black py-4 text-lg font-black text-white shadow-none transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
 >
 {isLoginLocked
 ? `Try again in ${loginLockRemainingSeconds}s`
 : "Access Dashboard"}
 </button>

 {isLoginLocked && (
 <p className="mt-4 text-center text-xs font-semibold text-slate-600">
 Access temporarily locked. Please try again in{" "}
 {loginLockRemainingSeconds} seconds.
 </p>
 )}
 </div>
 </div>
 );
 }

 // --- Main Dashboard UI ---

 const pageTheme = isDarkMode
 ? "bg-slate-950 text-slate-100"
 : "bg-white text-black";
 const cardTheme = isDarkMode
 ? "bg-slate-900 border-slate-700"
 : "bg-white border-slate-300";
 const titleTheme = isDarkMode ? "text-slate-50" : "text-black";
 const mutedTheme = isDarkMode ? "text-slate-300" : "text-slate-600";
 const searchTheme = isDarkMode
 ? "bg-slate-800/70 text-slate-100"
 : "bg-white text-black";
 const quickImportFieldClass =
 "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none shadow-none transition-all duration-200 hover:border-slate-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200";

 const normalizedSearchTerm = searchTerm.trim().toLowerCase();
 const filteredCategories = categories.filter((category) =>
 category.category_name
 .toLowerCase()
 .includes(categorySearchTerm.trim().toLowerCase()),
 );

 const filteredInventory = inventory.filter((item) => {
 const matchesCategory =
 categoryFilter === "all" ||
 String(item.category_id ?? "") === categoryFilter;

 if (!normalizedSearchTerm) return matchesCategory;

 const medicineName = item.name.toLowerCase();
 const medicineId = String(item.id).toLowerCase();

 const matchesSearch =
 medicineName.includes(normalizedSearchTerm) ||
 medicineId.includes(normalizedSearchTerm);

 return matchesCategory && matchesSearch;
 });

 const currentCategoryMetric =
 selectedCategoryMetric === "medicineCountAndStockValue" ||
 selectedCategoryMetric === "allMetricsCombined"
 ? CATEGORY_ANALYTICS_METRICS.medicineCount
 : CATEGORY_ANALYTICS_METRICS[selectedCategoryMetric];

 const maxSoldQty =
 reportData?.topSellingMedicines.reduce(
 (max, item) => Math.max(max, item.quantitySold),
 0,
 ) || 1;

 const detailedSalesRecords = salesLogData?.records || [];
 const detailedSalesQuantity = detailedSalesRecords.reduce(
 (sum, record) => sum + Number(record.quantitySold || 0),
 0,
 );
 const detailedSalesValue = detailedSalesRecords.reduce(
 (sum, record) => sum + Number(record.totalPrice || 0),
 0,
 );
 const totalSalesLogRecords = detailedSalesRecords.length;
 const salesLogRowsPerPageForPagination =
 salesLogRowsPerPage === "all"
 ? Math.max(1, totalSalesLogRecords)
 : salesLogRowsPerPage;
 const totalSalesLogPages = Math.max(
 1,
 Math.ceil(totalSalesLogRecords / salesLogRowsPerPageForPagination),
 );
 const salesLogStartIndex =
 (salesLogPage - 1) * salesLogRowsPerPageForPagination;
 const salesLogEndIndex = Math.min(
 salesLogStartIndex + salesLogRowsPerPageForPagination,
 totalSalesLogRecords,
 );
 const paginatedSalesRecords = detailedSalesRecords.slice(
 salesLogStartIndex,
 salesLogEndIndex,
 );
 const visibleSalesLogStart =
 totalSalesLogRecords === 0 ? 0 : salesLogStartIndex + 1;
 const visibleSalesLogEnd = totalSalesLogRecords === 0 ? 0 : salesLogEndIndex;
 const inactiveMedicineRecords = inactiveHistoryData?.medicines || [];
 const inactiveCategoryRecords = inactiveHistoryData?.categories || [];

 return (
 <div
 className={`min-h-screen font-sans print:bg-white print:p-0 ${pageTheme}`}
 >
 {/* Toast Notifications */}
 <div className="fixed top-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3 print:hidden">
 {toasts.map((toast) => (
 <div
 key={toast.id}
 className={`rounded-lg border p-4 shadow-none backdrop-blur-sm ${
 toast.type === "error"
 ? "border-red-200 bg-red-50 text-red-900"
 : "border-emerald-200 bg-emerald-50 text-emerald-900"
 }`}
 >
 <p className="text-sm font-black uppercase tracking-wide">
 {toast.title}
 </p>
 <p className="mt-1 text-sm font-medium">{toast.description}</p>
 </div>
 ))}
 </div>

 {/* Sale Modal */}
 {sellModalItem && (
 <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
 <div
 className={`w-full max-w-sm rounded-lg border p-6 shadow-none ${cardTheme}`}
 >
 <form
 onSubmit={(e) => {
 e.preventDefault();
 handleSell(
 sellModalItem,
 Number(sellQtyInput),
 sellDateInput,
 sellerNameInput,
 receiverNameInput,
 );
 }}
 >
 <h3 className={`text-lg font-black ${titleTheme}`}>
 Confirm Sale
 </h3>
 <p className={`mt-1 text-xs font-medium ${mutedTheme}`}>
 {sellModalItem.name} • Available: {sellModalItem.quantity} units
 </p>
 <div className="mt-4 space-y-3">
 <div>
 <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
 Quantity
 </label>
 <input
 type="number"
 min={1}
 max={sellModalItem.quantity}
 value={sellQtyInput}
 onChange={(e) => setSellQtyInput(e.target.value)}
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-black outline-none"
 required
 />
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
 Seller Name
 </label>
 <input
 type="text"
 value={sellerNameInput}
 onChange={(e) => setSellerNameInput(e.target.value)}
 placeholder="Enter seller name"
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-black outline-none"
 required
 />
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
 Receiver Name
 </label>
 <input
 type="text"
 value={receiverNameInput}
 onChange={(e) => setReceiverNameInput(e.target.value)}
 placeholder="Enter receiver name"
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-black outline-none"
 required
 />
 </div>
 <div>
 <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-600">
 Transaction Date
 </label>
 <input
 type="text"
 value={new Date(sellDateInput).toLocaleDateString("en-GB")}
 readOnly
 className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 outline-none"
 />
 </div>
 <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center shadow-none">
 <p className="text-lg font-black text-blue-700">
 ETB{" "}
 {(
 Number(sellQtyInput) * sellModalItem.price_per_unit
 ).toFixed(2)}
 </p>
 </div>
 </div>
 <div className="mt-5 flex justify-end gap-2">
 <button
 type="button"
 onClick={() => {
 setSellModalItem(null);
 setSellerNameInput("");
 setReceiverNameInput("");
 }}
 className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="rounded-lg border border-blue-700 bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-none"
 >
 Confirm Sale
 </button>
 </div>
 </form>
 </div>
 </div>
 )}

 {/* Delete Modal */}
 {isAdmin && deleteModalItem && (
 <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-4 print:hidden">
 <div
 className={`w-full max-w-sm rounded-lg border p-6 shadow-none ${cardTheme}`}
 >
 <h3 className={`text-lg font-black ${titleTheme}`}>Delete Item</h3>
 <p className={`mt-2 text-sm ${mutedTheme}`}>
 Permanently delete{" "}
 <span className="font-black">{deleteModalItem.name}</span>?
 </p>
 <div className="mt-5 flex justify-end gap-2">
 <button
 onClick={() => setDeleteModalItem(null)}
 className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700"
 >
 Cancel
 </button>
 <button
 onClick={() => handleDelete(deleteModalItem)}
 className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white"
 >
 Delete
 </button>
 </div>
 </div>
 </div>
 )}

 <div className="flex min-h-screen flex-col gap-6 p-4 lg:flex-row lg:p-8 print:p-0">
 <aside className="w-full lg:w-80 print:hidden">
 <div
 className={`sticky top-8 rounded-lg border border-white/40 p-5 shadow-[0_24px_80px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl ${cardTheme}`}
 >
 <div className="rounded-lg bg-white p-5 text-slate-800 shadow-none">
 <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-600">
 Pharmacy Dashboard
 </p>
 <h2 className="mt-2 text-2xl font-black leading-tight">
 Express Pharmaceutical Wholesale
 </h2>
 <p className="mt-2 text-sm font-medium text-slate-600">
 Managing wholesale pharmacy stock with quick access controls.
 </p>
 </div>

 <div className="mt-5 rounded-lg border border-slate-300 bg-white p-4 shadow-none">
 <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">
 Signed in as
 </p>
 <div className="mt-2 flex items-center justify-between gap-3">
 <div>
 <p className="text-base font-black text-black">
 {loggedInUser?.username || "User"}
 </p>
 <p className="text-sm font-medium text-slate-600">
 {isAdmin ? "Administrator access" : "Staff access"}
 </p>
 </div>
 <span
 className={`inline-flex rounded-lg border px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[2px_2px_0_0_#0f172a] ${
 isAdmin
 ? "border-blue-300 bg-blue-100 text-blue-700"
 : "border-slate-300 bg-slate-200 text-slate-700"
 }`}
 >
 {isAdmin ? "ADMIN" : "STAFF"}
 </span>
 </div>
 </div>

 <nav className="mt-5 space-y-2">
 <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-600">
 Quick navigation
 </p>
 <a
 href="#dashboard"
 className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
 >
 Dashboard
 <span aria-hidden="true">↗</span>
 </a>
 <a
 href="#sales-report"
 className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
 >
 Reports
 <span aria-hidden="true">↗</span>
 </a>
 <a
 href="#quick-import"
 className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
 >
 Quick Import
 <span aria-hidden="true">↗</span>
 </a>
 <a
 href="#live-inventory"
 className="flex items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-300 hover:bg-white"
 >
 Live Inventory
 <span aria-hidden="true">↗</span>
 </a>
 </nav>

 <div className="mt-5 space-y-3">
 <button
 type="button"
 onClick={() => setIsDarkMode((prev) => !prev)}
 className="w-full rounded-lg border border-slate-300 bg-black px-4 py-3 text-sm font-black text-black transition-all duration-200 "
 >
 {isDarkMode ? "Switch to Light" : "Switch to Dark"}
 </button>
 <button
 type="button"
 onClick={handleLogout}
 className="w-full rounded-lg border border-rose-200 bg-black px-4 py-3 text-sm font-black text-black transition-all duration-200 hover:text-rose-600 "
 >
 Logout
 </button>
 </div>
 </div>
 </aside>

 <main id="dashboard" className="min-w-0 flex-1 space-y-8">
 <header className="flex justify-between items-end mb-10 gap-4 print:hidden">
 <div>
 <h1
 className={`inline-block text-2xl font-black tracking-tight transition-all duration-200   ${titleTheme}`}
 >
 Express Pharmaceutical Wholesale
 </h1>
 <p className={`font-medium ${mutedTheme}`}>
 Managing Wholesale Pharmacy Stock
 </p>
 </div>
 <div className="flex items-center gap-2">
 {isLoggedIn && (
 <button
 onClick={() => setIsGeneralSaleOpen(true)}
 className="rounded-lg bg-black px-4 py-3 text-sm font-black text-white shadow-none transition-all duration-200 "
 >
 🛒 Sell Out Items
 </button>
 )}
 <button
 type="button"
 onClick={handleRefresh}
 className="rounded-lg bg-black px-4 py-3 text-sm font-black text-white shadow-[0_12px_30px_-12px_rgba(37,99,235,0.8)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70"
 disabled={isRefreshing}
 >
 {isRefreshing ? "Refreshing..." : "Refresh"}
 </button>
 </div>
 </header>

 {isAdmin && (
 <section
 id="sales-report"
 className="mb-10 border-t border-t-slate-300 pt-8 print:mb-0 print:border-0 print:pt-0"
 >
 <div
 className={`rounded-lg border border-slate-300/70 p-6 transition-all duration-200 ${cardTheme}`}
 >
 <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
 <h2 className={`text-2xl font-black ${titleTheme}`}>
 Reports Overview
 </h2>
 <button
 type="button"
 onClick={handleExportReport}
 className="rounded-lg border border-slate-900 bg-white px-4 py-2 text-sm font-black text-black shadow-none transition-all duration-200 "
 >
 Export to PDF / Print
 </button>
 </div>

 <div className="mb-4 flex flex-wrap gap-2">
 {REPORT_RANGE_OPTIONS.map((rangeOption) => {
 const isActive = selectedReportRange === rangeOption.value;
 return (
 <button
 key={rangeOption.value}
 type="button"
 onClick={() =>
 setSelectedReportRange(rangeOption.value)
 }
 className={`rounded-lg border px-4 py-2 text-sm font-black shadow-none transition-all duration-200 ${
 isActive
 ? "border-slate-900 bg-black text-white"
 : "border-slate-300 bg-white text-slate-700"
 }`}
 >
 {rangeOption.label}
 </button>
 );
 })}
 </div>

 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div className="rounded-lg border border-cyan-200 bg-linear-to-br from-cyan-50 to-white p-4 shadow-none transition-all duration-200 ">
 <p className="text-xs font-black uppercase text-cyan-700">
 Total Revenue
 </p>
 <p className="mt-1 text-2xl font-black text-black">
 ETB {Number(reportData?.totalRevenue || 0).toFixed(2)}
 </p>
 </div>
 <div className="rounded-lg border border-violet-200 bg-linear-to-br from-violet-50 to-white p-4 shadow-none transition-all duration-200 ">
 <p className="text-xs font-black uppercase text-violet-700">
 Total Items Sold
 </p>
 <p className="mt-1 text-2xl font-black text-black">
 {Math.round(Number(reportData?.totalItemsSold || 0))}
 </p>
 </div>
 <div className="rounded-lg border border-slate-300 bg-linear-to-br from-slate-50 to-white p-4 shadow-none transition-all duration-200 ">
 <p className="text-xs font-black uppercase text-slate-600">
 Report Window
 </p>
 <p className="mt-1 text-xl font-black text-black">
 {
 REPORT_RANGE_OPTIONS.find(
 (option) => option.value === selectedReportRange,
 )?.label
 }
 </p>
 </div>
 </div>

 <div className="mt-6 rounded-lg border border-slate-300 bg-white p-4 shadow-none transition-all duration-200 ">
 <h3 className="text-lg font-black text-black">
 Top Selling Medicines
 </h3>

 {isLoadingReport ? (
 <p className="mt-3 text-sm font-bold text-slate-600">
 Loading report data...
 </p>
 ) : (reportData?.topSellingMedicines?.length || 0) === 0 ? (
 <p className="mt-3 text-sm font-bold text-slate-600">
 No sales found for this period.
 </p>
 ) : (
 <div className="mt-4 space-y-3">
 {reportData?.topSellingMedicines.map(
 (medicine, index) => (
 <div key={medicine.medicineName}>
 <div className="mb-1 flex items-center justify-between text-xs font-black text-slate-700">
 <span>
 <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">
 {index + 1}
 </span>
 {medicine.medicineName}
 </span>
 <span>
 {medicine.quantitySold} sold • ETB{" "}
 {medicine.totalRevenue.toFixed(2)}
 </span>
 </div>
 <div className="h-4 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
 <div
 className="h-full bg-black"
 style={{
 width: `${Math.max(8, (medicine.quantitySold / maxSoldQty) * 100)}%`,
 }}
 />
 </div>
 </div>
 ),
 )}
 </div>
 )}
 </div>

 <div className="mt-6 rounded-lg border border-slate-300 bg-white p-4 shadow-none transition-all duration-200 ">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <h3 className="text-lg font-black text-black">
 Detailed Sales Log
 </h3>
 <div className="flex flex-wrap items-center gap-2">
 <label className="text-xs font-black uppercase text-slate-600">
 From
 </label>
 <input
 type="date"
 value={salesLogStartDate}
 onChange={(e) => setSalesLogStartDate(e.target.value)}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
 />
 <label className="text-xs font-black uppercase text-slate-600">
 To
 </label>
 <input
 type="date"
 value={salesLogEndDate}
 onChange={(e) => setSalesLogEndDate(e.target.value)}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none"
 />
 </div>
 </div>

 <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
 <div className="rounded-lg border border-slate-300 bg-white p-3">
 <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">
 Transactions
 </p>
 <p className="mt-1 text-xl font-black text-black">
 {salesLogData?.totalRecords ?? 0}
 </p>
 </div>
 <div className="rounded-lg border border-slate-300 bg-white p-3">
 <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">
 Units Sold
 </p>
 <p className="mt-1 text-xl font-black text-black">
 {Math.round(detailedSalesQuantity)}
 </p>
 </div>
 <div className="rounded-lg border border-slate-300 bg-white p-3">
 <p className="text-[11px] font-black uppercase tracking-wide text-slate-600">
 Sales Value
 </p>
 <p className="mt-1 text-xl font-black text-black">
 ETB {detailedSalesValue.toFixed(2)}
 </p>
 </div>
 </div>

 <div
 ref={salesLogScrollRef}
 className="mt-4 max-h-125 overflow-auto rounded-lg border border-slate-900 bg-white shadow-[4px_4px_0_0_#0f172a] transition-all duration-200 [6px_6px_0_0_#0f172a]"
 >
 <table className="w-full min-w-280 text-left">
 <thead
 className={`sticky top-0 z-20 bg-white text-[11px] font-black uppercase tracking-wider text-slate-700 transition-shadow ${
 salesLogHasScrolled
 ? "shadow-[0_4px_0_0_#0f172a]"
 : ""
 }`}
 >
 <tr>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Sale ID
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Batch ID
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Date & Time
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Medicine
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Category
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3 text-right">
 Qty
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3 text-right">
 Unit Price
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3 text-right">
 Total
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Seller
 </th>
 <th className="border-b-2 border-slate-900 bg-white px-4 py-3">
 Receiver
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-200">
 {isLoadingSalesLog ? (
 <tr>
 <td
 colSpan={10}
 className="px-4 py-6 text-center text-sm font-bold text-slate-600"
 >
 Loading detailed sales records...
 </td>
 </tr>
 ) : detailedSalesRecords.length === 0 ? (
 <tr>
 <td
 colSpan={10}
 className="px-4 py-6 text-center text-sm font-bold text-slate-600"
 >
 No sales records found for the selected date
 range.
 </td>
 </tr>
 ) : (
 paginatedSalesRecords.map((record) => (
 <tr key={`${record.id}-${record.saleDate}`}>
 <td className="px-4 py-3 text-sm font-bold text-slate-700">
 {record.id}
 </td>
 <td className="px-4 py-3 text-sm font-bold text-slate-700">
 {record.batchId}
 </td>
 <td className="px-4 py-3 text-sm font-semibold text-slate-700">
 {new Date(record.saleDate).toLocaleString(
 "en-GB",
 )}
 </td>
 <td className="px-4 py-3 text-sm font-bold text-black">
 {record.medicineName}
 </td>
 <td className="px-4 py-3 text-sm font-semibold text-slate-700">
 {record.category}
 </td>
 <td className="px-4 py-3 text-right text-sm font-black text-black">
 {record.quantitySold}
 </td>
 <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
 ETB {Number(record.unitPrice || 0).toFixed(2)}
 </td>
 <td className="px-4 py-3 text-right text-sm font-black text-black">
 ETB {Number(record.totalPrice || 0).toFixed(2)}
 </td>
 <td className="px-4 py-3 text-sm font-semibold text-slate-700">
 {record.sellerName}
 </td>
 <td className="px-4 py-3 text-sm font-semibold text-slate-700">
 {record.receiverName}
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 <div className="mt-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
 <p className="text-sm font-black text-slate-700">
 Showing {visibleSalesLogStart}-{visibleSalesLogEnd} of{" "}
 {totalSalesLogRecords} records
 </p>

 <div className="flex flex-wrap items-center gap-2">
 <label className="text-xs font-black uppercase tracking-wide text-slate-600">
 Rows per page
 </label>
 <select
 value={salesLogRowsPerPage}
 onChange={(e) =>
 handleRowsPerPageChange(e.target.value)
 }
 className="rounded-lg border border-slate-900 bg-white px-3 py-2 text-sm font-black text-black shadow-[3px_3px_0_0_#0f172a] outline-none"
 >
 {SALES_LOG_ROWS_PER_PAGE_OPTIONS.map((optionValue) => (
 <option key={optionValue} value={optionValue}>
 {optionValue === "all" ? "All" : optionValue}
 </option>
 ))}
 </select>

 <button
 type="button"
 onClick={() =>
 setSalesLogPage((previousPage) =>
 Math.max(1, previousPage - 1),
 )
 }
 disabled={salesLogPage <= 1}
 className="rounded-lg border border-slate-900 bg-slate-100 px-4 py-2 text-sm font-black text-black shadow-[4px_4px_0_0_#0f172a] transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
 >
 Previous
 </button>

 <span className="rounded-lg border border-slate-900 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-[3px_3px_0_0_#0f172a]">
 Page {Math.min(salesLogPage, totalSalesLogPages)} of{" "}
 {totalSalesLogPages}
 </span>

 <button
 type="button"
 onClick={() =>
 setSalesLogPage((previousPage) =>
 Math.min(totalSalesLogPages, previousPage + 1),
 )
 }
 disabled={salesLogPage >= totalSalesLogPages}
 className="rounded-lg border border-slate-900 bg-slate-100 px-4 py-2 text-sm font-black text-black shadow-[4px_4px_0_0_#0f172a] transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
 >
 Next
 </button>
 </div>
 </div>

 <div className="mt-8 rounded-lg border border-amber-200 bg-linear-to-br from-amber-50 to-white p-5 shadow-none print:hidden">
 <div className="flex flex-wrap items-end justify-between gap-3">
 <div>
 <h3 className={`text-lg font-black ${titleTheme}`}>
 Inactive Sales History
 </h3>
 <p
 className={`mt-1 text-xs font-semibold ${mutedTheme}`}
 >
 Medicines and categories with no sales for 3 months or
 more.
 </p>
 </div>
 <span className="rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700 shadow-[3px_3px_0_0_#78350f]">
 3+ months
 </span>
 </div>

 {isLoadingInactiveHistory ? (
 <div className="mt-5 rounded-lg border border-amber-200 bg-white p-4 text-sm font-bold text-slate-600 shadow-none">
 Loading inactivity history...
 </div>
 ) : !inactiveHistoryData ? (
 <div className="mt-5 rounded-lg border border-amber-200 bg-white p-4 text-sm font-bold text-slate-600 shadow-none">
 Unable to load inactivity history right now.
 </div>
 ) : (
 <div className="mt-5 grid gap-4 xl:grid-cols-2">
 <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-none">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
 <h4 className="text-sm font-black text-black">
 Inactive Medicines
 </h4>
 <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
 {inactiveMedicineRecords.length} records
 </span>
 </div>

 {inactiveMedicineRecords.length === 0 ? (
 <p className="text-sm font-semibold text-slate-600">
 No medicines are inactive for the selected
 threshold.
 </p>
 ) : (
 <div className="max-h-72 overflow-auto rounded-lg border border-slate-300">
 <table className="min-w-full text-left text-xs">
 <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-slate-600">
 <tr>
 <th className="px-3 py-2">Medicine</th>
 <th className="px-3 py-2">Category</th>
 <th className="px-3 py-2">Last Sale</th>
 <th className="px-3 py-2 text-right">
 Days
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {inactiveMedicineRecords.map((record) => (
 <tr key={record.medicineId}>
 <td className="px-3 py-2 font-bold text-black">
 {record.medicineName}
 </td>
 <td className="px-3 py-2 font-semibold text-slate-700">
 {record.categoryName}
 </td>
 <td className="px-3 py-2 font-semibold text-slate-700">
 {record.lastSaleDate
 ? new Date(
 record.lastSaleDate,
 ).toLocaleDateString("en-GB")
 : "Never sold"}
 </td>
 <td className="px-3 py-2 text-right font-black text-amber-700">
 {record.daysSinceLastSale === null
 ? "—"
 : `${record.daysSinceLastSale}d`}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>

 <div className="rounded-lg border border-amber-200 bg-white p-4 shadow-none">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
 <h4 className="text-sm font-black text-black">
 Inactive Categories
 </h4>
 <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
 {inactiveCategoryRecords.length} records
 </span>
 </div>

 {inactiveCategoryRecords.length === 0 ? (
 <p className="text-sm font-semibold text-slate-600">
 No categories are inactive for the selected
 threshold.
 </p>
 ) : (
 <div className="max-h-72 overflow-auto rounded-lg border border-slate-300">
 <table className="min-w-full text-left text-xs">
 <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-slate-600">
 <tr>
 <th className="px-3 py-2">Category</th>
 <th className="px-3 py-2 text-right">
 Medicines
 </th>
 <th className="px-3 py-2">Last Sale</th>
 <th className="px-3 py-2 text-right">
 Days
 </th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {inactiveCategoryRecords.map((record) => (
 <tr key={record.categoryId}>
 <td className="px-3 py-2 font-bold text-black">
 {record.categoryName}
 </td>
 <td className="px-3 py-2 text-right font-black text-slate-700">
 {record.medicineCount}
 </td>
 <td className="px-3 py-2 font-semibold text-slate-700">
 {record.lastSaleDate
 ? new Date(
 record.lastSaleDate,
 ).toLocaleDateString("en-GB")
 : "Never sold"}
 </td>
 <td className="px-3 py-2 text-right font-black text-amber-700">
 {record.daysSinceLastSale === null
 ? "—"
 : `${record.daysSinceLastSale}d`}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 </section>
 )}

 <div
 className={`mb-10 grid grid-cols-1 gap-8 print:hidden ${
 isAdmin ? "xl:grid-cols-4" : "mx-auto max-w-5xl"
 }`}
 >
 {isAdmin && (
 <div
 className={`xl:col-span-3 h-96 rounded-lg border p-8 shadow-none transition-all duration-200 ${cardTheme}`}
 >
 <div className="mb-6 flex items-center justify-between gap-3">
 <div>
 <h2 className={`text-xl font-bold ${titleTheme}`}>
 Stock Analytics by Category
 </h2>
 <p className={`mt-1 text-xs font-semibold ${mutedTheme}`}>
 Real-time distribution of inventory across categories.
 </p>
 </div>
 <select
 value={selectedCategoryMetric}
 onChange={(e) =>
 setSelectedCategoryMetric(
 e.target.value as CategoryAnalyticsViewKey,
 )
 }
 className={`rounded-lg border border-slate-900 px-4 py-2 text-xs font-black shadow-[4px_4px_0_0_#0f172a] outline-none transition-all duration-200 [6px_6px_0_0_#0f172a] ${searchTheme}`}
 >
 <option value="allMetricsCombined">
 Total Units + Medicine Count + Total Stock Value
 </option>
 <option value="medicineCountAndStockValue">
 Medicine Count + Total Stock Value
 </option>
 {(
 Object.entries(CATEGORY_ANALYTICS_METRICS) as Array<
 [
 CategoryMetricKey,
 (typeof CATEGORY_ANALYTICS_METRICS)[CategoryMetricKey],
 ]
 >
 ).map(([metricKey, metric]) => (
 <option key={metricKey} value={metricKey}>
 {metric.label}
 </option>
 ))}
 </select>
 </div>
 <ResponsiveContainer width="100%" height="80%">
 {selectedCategoryMetric === "allMetricsCombined" ? (
 <BarChart data={categoryAnalyticsData}>
 <CartesianGrid
 strokeDasharray="3 3"
 vertical={false}
 stroke="#f1f5f9"
 />
 <XAxis
 dataKey="category"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 />
 <YAxis
 yAxisId="count"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 tickFormatter={(value) =>
 `${Math.round(Number(value))}`
 }
 />
 <YAxis
 yAxisId="value"
 orientation="right"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 tickFormatter={(value) =>
 `ETB ${Number(value).toFixed(0)}`
 }
 />
 <Tooltip
 cursor={{ fill: "#f8fafc" }}
 contentStyle={{ borderRadius: "15px", border: "none" }}
 formatter={(value, name) => {
 if (name === "Total Stock Value") {
 return [
 `ETB ${Number(value ?? 0).toFixed(2)}`,
 name,
 ];
 }

 if (name === "Medicine Count") {
 return [
 `${Math.round(Number(value ?? 0))} medicines`,
 name,
 ];
 }

 return [
 `${Math.round(Number(value ?? 0))} units`,
 name,
 ];
 }}
 />
 <Bar
 yAxisId="count"
 dataKey="totalQuantity"
 name="Total Units"
 fill={CATEGORY_ANALYTICS_METRICS.totalQuantity.color}
 radius={[6, 6, 0, 0]}
 barSize={20}
 />
 <Bar
 yAxisId="count"
 dataKey="medicineCount"
 name="Medicine Count"
 fill={CATEGORY_ANALYTICS_METRICS.medicineCount.color}
 radius={[6, 6, 0, 0]}
 barSize={20}
 />
 <Bar
 yAxisId="value"
 dataKey="totalValue"
 name="Total Stock Value"
 fill={CATEGORY_ANALYTICS_METRICS.totalValue.color}
 radius={[6, 6, 0, 0]}
 barSize={20}
 />
 </BarChart>
 ) : selectedCategoryMetric ===
 "medicineCountAndStockValue" ? (
 <BarChart data={categoryAnalyticsData}>
 <CartesianGrid
 strokeDasharray="3 3"
 vertical={false}
 stroke="#f1f5f9"
 />
 <XAxis
 dataKey="category"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 />
 <YAxis
 yAxisId="count"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 tickFormatter={(value) =>
 `${Math.round(Number(value))}`
 }
 />
 <YAxis
 yAxisId="value"
 orientation="right"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 tickFormatter={(value) =>
 `ETB ${Number(value).toFixed(0)}`
 }
 />
 <Tooltip
 cursor={{ fill: "#f8fafc" }}
 contentStyle={{ borderRadius: "15px", border: "none" }}
 formatter={(value, name) => {
 if (name === "Medicine Count") {
 return [
 `${Math.round(Number(value ?? 0))} medicines`,
 name,
 ];
 }

 return [`ETB ${Number(value ?? 0).toFixed(2)}`, name];
 }}
 />
 <Bar
 yAxisId="count"
 dataKey="medicineCount"
 name="Medicine Count"
 fill={CATEGORY_ANALYTICS_METRICS.medicineCount.color}
 radius={[6, 6, 0, 0]}
 barSize={24}
 />
 <Bar
 yAxisId="value"
 dataKey="totalValue"
 name="Total Stock Value"
 fill={CATEGORY_ANALYTICS_METRICS.totalValue.color}
 radius={[6, 6, 0, 0]}
 barSize={24}
 />
 </BarChart>
 ) : (
 <BarChart data={categoryAnalyticsData}>
 <CartesianGrid
 strokeDasharray="3 3"
 vertical={false}
 stroke="#f1f5f9"
 />
 <XAxis
 dataKey="category"
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 />
 <YAxis
 axisLine={false}
 tickLine={false}
 tick={{ fill: "#94a3b8", fontSize: 12 }}
 tickFormatter={(value) =>
 selectedCategoryMetric === "totalValue"
 ? `ETB ${Number(value).toFixed(0)}`
 : `${Math.round(Number(value))}`
 }
 />
 <Tooltip
 cursor={{ fill: "#f8fafc" }}
 contentStyle={{ borderRadius: "15px", border: "none" }}
 formatter={(value) =>
 currentCategoryMetric.formatValue(Number(value ?? 0))
 }
 />
 <Bar
 dataKey={selectedCategoryMetric}
 fill={currentCategoryMetric.color}
 radius={[6, 6, 0, 0]}
 barSize={40}
 />
 </BarChart>
 )}
 </ResponsiveContainer>
 </div>
 )}

 <div
 id="quick-import"
 className={`rounded-lg border border-white/25 bg-linear-to-br from-cyan-600 via-blue-600 to-indigo-700 p-8 text-white shadow-none transition-all duration-200 ${
 isAdmin ? "" : "mx-auto w-full max-w-4xl"
 }`}
 >
 <div className="mb-6">
 <h2 className="text-3xl font-black tracking-tight">
 Quick Import
 </h2>
 <p className="mt-1 text-sm font-medium text-blue-100/90">
 Add new stock batches with complete product details.
 </p>
 </div>
 <form
 onSubmit={handleAddStock}
 className={`gap-3 ${isAdmin ? "flex flex-col" : "grid grid-cols-1 md:grid-cols-2"}`}
 >
 <input
 type="text"
 placeholder="Search Category"
 className={quickImportFieldClass}
 value={categorySearchTerm}
 onChange={(e) => setCategorySearchTerm(e.target.value)}
 />
 <select
 value={formData.categoryId}
 onChange={(e) =>
 setFormData({ ...formData, categoryId: e.target.value })
 }
 className={`${quickImportFieldClass} font-bold text-black`}
 required
 >
 <option value="" className="text-slate-600">
 Select Category
 </option>
 {filteredCategories.map((category) => (
 <option
 key={category.id}
 value={category.id}
 className="text-black"
 >
 {category.category_name}
 </option>
 ))}
 </select>
 <input
 type="number"
 placeholder="Med ID"
 className={quickImportFieldClass}
 value={formData.medId}
 onChange={(e) =>
 setFormData({ ...formData, medId: e.target.value })
 }
 required
 />
 <input
 type="text"
 placeholder="Medicine Name"
 className={quickImportFieldClass}
 value={formData.name}
 onChange={(e) =>
 setFormData({ ...formData, name: e.target.value })
 }
 required
 />
 <input
 type="text"
 placeholder="Batch #"
 className={quickImportFieldClass}
 value={formData.batch}
 onChange={(e) =>
 setFormData({ ...formData, batch: e.target.value })
 }
 required
 />
 <input
 type="number"
 placeholder="Qty"
 className={quickImportFieldClass}
 value={formData.qty}
 onChange={(e) =>
 setFormData({ ...formData, qty: e.target.value })
 }
 required
 />
 <input
 type="number"
 step="0.01"
 placeholder="Price per Unit"
 className={quickImportFieldClass}
 value={formData.price}
 onChange={(e) =>
 setFormData({ ...formData, price: e.target.value })
 }
 required
 />
 <input
 type="date"
 className={quickImportFieldClass}
 value={formData.expiry}
 onChange={(e) =>
 setFormData({ ...formData, expiry: e.target.value })
 }
 required
 />
 <button
 type="submit"
 className={`mt-1 rounded-lg border border-slate-900 bg-white py-4 font-black text-blue-700 shadow-[4px_4px_0_0_#0f172a] transition-all duration-200 hover:bg-cyan-50 [6px_6px_0_0_#0f172a] active:scale-[0.99] ${
 isAdmin ? "" : "md:col-span-2"
 }`}
 >
 Update Stock
 </button>
 </form>
 </div>
 </div>

 <div
 id="live-inventory"
 className={`rounded-lg shadow-none border overflow-hidden transition-all duration-200 print:hidden ${cardTheme}`}
 >
 <div
 className={`p-8 border-b flex justify-between items-center ${isDarkMode ? "border-slate-700" : "border-slate-50"}`}
 >
 <h2 className={`text-xl font-bold ${titleTheme}`}>
 Live Inventory
 </h2>
 <div className="flex items-center gap-3">
 <div className="relative w-80">
 <input
 type="text"
 placeholder="Search by name or ID..."
 value={searchTerm}
 className={`px-6 py-3 pr-12 rounded-full w-full outline-none text-sm border border-slate-900 shadow-none ${searchTheme}`}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 {searchTerm && (
 <button
 type="button"
 aria-label="Clear search"
 onClick={() => setSearchTerm("")}
 className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border border-slate-900 bg-white text-black text-sm font-black shadow-none"
 >
 ×
 </button>
 )}
 </div>
 <select
 value={categoryFilter}
 onChange={(e) => setCategoryFilter(e.target.value)}
 className={`px-4 py-3 rounded-full outline-none text-sm border border-slate-900 bg-white text-black shadow-none ${searchTheme}`}
 >
 <option value="all" className="text-black">
 All Categories
 </option>
 {categories.map((category) => (
 <option
 key={category.id}
 value={String(category.id)}
 className="text-black"
 >
 {category.category_name}
 </option>
 ))}
 </select>
 </div>
 </div>
 <table className="w-full text-left">
 <thead
 className={`text-[10px] uppercase tracking-widest font-black ${isDarkMode ? "bg-slate-700 text-slate-300" : "bg-white text-slate-400"}`}
 >
 <tr>
 <th className="px-8 py-4">Medicine Info</th>
 <th className="px-8 py-4">Batch Details</th>
 <th className="px-8 py-4">Price / Unit</th>
 <th className="px-8 py-4">Stock Status</th>
 <th className="px-8 py-4">Expiration</th>
 <th className="px-8 py-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody
 className={
 isDarkMode
 ? "divide-y divide-slate-700"
 : "divide-y divide-slate-50"
 }
 >
 {filteredInventory.length === 0 ? (
 <tr>
 <td
 colSpan={6}
 className={`px-8 py-10 text-center text-sm font-bold ${mutedTheme}`}
 >
 No matching medicines found
 </td>
 </tr>
 ) : (
 filteredInventory.map((item) => {
 const rowStatus = getStatusStyles(
 item.quantity,
 item.expiry_date,
 item.initial_batch_quantity ?? item.initial_quantity,
 );
 const expiryDate = new Date(item.expiry_date);
 const isSellDisabled =
 rowStatus.isExpired || item.quantity <= 0;
 return (
 <tr
 key={item.id}
 className={`group transition-all ${isDarkMode ? "hover:bg-slate-700/40" : "hover:bg-white/50"}`}
 >
 <td className={`px-8 py-6 font-bold ${titleTheme}`}>
 <div className="flex flex-col gap-2">
 <span>{item.name}</span>
 <span className="inline-flex w-fit rounded-lg border border-slate-900 bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-black shadow-none">
 {item.category_name || "Uncategorized"}
 </span>
 </div>
 </td>
 <td className="px-8 py-6 font-mono text-xs text-slate-400">
 {item.batch_number}
 </td>
 <td className="px-8 py-6 text-sm font-black text-blue-700">
 ETB {Number(item.price_per_unit || 0).toFixed(2)}
 </td>
 <td className="px-8 py-6">
 <div className={rowStatus.stockBadgeClass}>
 {rowStatus.isLowStock && (
 <span aria-hidden="true">⚠️</span>
 )}
 {item.quantity} UNITS
 </div>
 <p className={rowStatus.stockWarningClass}>
 {rowStatus.stockWarningText}
 </p>
 </td>
 <td className="px-8 py-6">
 <p className={rowStatus.expiryTextClass}>
 {expiryDate.toLocaleDateString("en-GB")}
 </p>
 <p className={rowStatus.expiryWarningClass}>
 <span aria-hidden="true" className="mr-1">
 {rowStatus.expiryIcon}
 </span>
 {rowStatus.expiryWarningText}
 </p>
 </td>
 <td className="px-8 py-6 text-right">
 <div className="flex justify-end items-center gap-2">
 {isAdmin && activeActionMenuId === item.id && (
 <button
 onClick={() => {
 setDeleteModalItem(item);
 setActiveActionMenuId(null);
 }}
 className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200"
 >
 Delete
 </button>
 )}

 {isAdmin && (
 <button
 onClick={() =>
 setActiveActionMenuId((prev) =>
 prev === item.id ? null : item.id,
 )
 }
 className="h-8 w-8 rounded-lg border border-slate-300 bg-white text-slate-600 text-lg leading-none font-black"
 aria-label="Open actions menu"
 >
 ⋯
 </button>
 )}
 </div>
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>

 {/* ========== MULTI-ITEM ORDER MODAL ========== */}
 <MultiItemOrderCart
 isOpen={isGeneralSaleOpen}
 onClose={() => setIsGeneralSaleOpen(false)}
 onSubmit={handleBulkSaleSubmit}
 isProcessing={isProcessingBulkSale}
 />
 {/* ========== END MODAL ========== */}
 </main>
 </div>
 </div>
 );
}
