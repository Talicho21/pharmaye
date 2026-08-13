"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Package, Calendar, Tag, DollarSign, Info } from "lucide-react";
import { AppShell } from "@/app/components/AppShell";
import { Toast } from "@/app/components/Toast";
import { clearSessionCookie } from "@/app/utils/session";

type CategoryItem = {
  id: number;
  category_name: string;
};

type StockFormState = {
  categoryId: string;
  categoryName: string;
  medicineName: string;
  batchNumber: string;
  quantity: string;
  unit: string;
  expiryDate: string;
  pricePerUnit: string;
};

const initialFormState: StockFormState = {
  categoryId: "",
  categoryName: "",
  medicineName: "",
  batchNumber: "",
  quantity: "",
  unit: "",
  expiryDate: "",
  pricePerUnit: "",
};

const API_BASE = "/api/backend";

export default function StockEntryPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [popupToast, setPopupToast] = useState<string | null>(null);
  const [form, setForm] = useState<StockFormState>(initialFormState);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [userRole, setUserRole] = useState<"admin" | "staff">("staff");

  const handleSignOut = () => {
    window.localStorage.removeItem("pharmacy_auth_session_v1");
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("rememberMe");
    clearSessionCookie();
    window.location.href = "/";
  };

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) =>
        left.category_name.localeCompare(right.category_name),
      ),
    [categories],
  );

  useEffect(() => {
    let isMounted = true;

    try {
      const storedSession = window.localStorage.getItem(
        "pharmacy_auth_session_v1",
      );
      if (storedSession) {
        const parsed = JSON.parse(storedSession) as {
          user?: { username?: string; role?: "admin" | "staff" };
        };
        if (parsed?.user?.username) {
          setProfileName(parsed.user.username);
          setProfileEmail(`${parsed.user.username}@expresspharma.local`);
        }
        if (parsed?.user?.role) {
          setUserRole(parsed.user.role);
        }
      }
    } catch {
      setProfileName("Guest user");
      setProfileEmail("guest@expresspharma.local");
    }

    const loadCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/categories`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as
          | CategoryItem[]
          | { message?: string };
        if (!isMounted) return;

        if (Array.isArray(payload)) {
          setCategories(payload);
        } else {
          setCategories([]);
        }
      } catch (_error) {
        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setLoadingCategories(false);
        }
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (field: keyof StockFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const medicineName = form.medicineName.trim();
    const batchNumber = form.batchNumber.trim();
    const quantity = Number.parseInt(form.quantity, 10);
    const unit = form.unit.trim();
    const expiryDate = form.expiryDate.trim();
    const pricePerUnit = Number.parseFloat(form.pricePerUnit);
    const categoryName = form.categoryName.trim();
    const categoryId = form.categoryId.trim();

    if (!medicineName || !batchNumber || !expiryDate) {
      setMessage({
        type: "error",
        text: "Medicine name, batch number, and expiry date are required.",
      });
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setMessage({
        type: "error",
        text: "Quantity must be a positive whole number.",
      });
      return;
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0) {
      setMessage({
        type: "error",
        text: "Price per unit must be a valid number.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/inventory/stock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: medicineName,
          medicine_name: medicineName,
          batch_number: batchNumber,
          quantity,
          unit,
          expiry_date: expiryDate,
          price_per_unit: pricePerUnit,
          category_id: categoryId ? Number(categoryId) : null,
          category_name: categoryName || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage({
          type: "error",
          text: payload.message || "Could not add stock right now.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "Stock batch added successfully.",
      });
      setPopupToast("Stock batch added successfully.");
      setForm(initialFormState);
      setCategories([]);
      setLoadingCategories(true);
      const reloadResponse = await fetch(`${API_BASE}/categories`, {
        cache: "no-store",
      });
      const reloadPayload = (await reloadResponse.json()) as CategoryItem[];
      setCategories(Array.isArray(reloadPayload) ? reloadPayload : []);
      setLoadingCategories(false);
    } catch (_error) {
      setMessage({
        type: "error",
        text: "Could not reach the stock service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      profileName={profileName}
      profileEmail={profileEmail}
      userRole={userRole}
      onSignOut={handleSignOut}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-2 sm:p-4">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-dark-charcoal sm:text-3xl">
              Inventory Intake & Batch Registration
            </h1>
            <p className="mt-1 text-sm text-dark-charcoal/70">
              Record new medicine batches, adjust stock levels, and assign categories.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="rounded-full bg-primary-blue/10 px-3 py-1 text-xs font-bold text-dark-charcoal">
              Stock Entry Mode
            </span>
            <Link
              href="/"
              className="rounded-lg border border-border-gray bg-off-white px-4 py-2 text-sm font-semibold text-dark-charcoal transition duration-150 hover:bg-border-gray hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Tip Banner */}
        <div className="flex items-start gap-3 rounded-lg border-l-4 border-primary-blue bg-off-white px-4 py-3 shadow-sm">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue" />
          <p className="text-sm font-medium text-dark-charcoal">
            <span className="font-bold text-dark-charcoal">Tip:</span> Select an existing category from the dropdown, or enter a new custom category name below.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="rounded-xl border border-border-gray bg-pure-white shadow-sm">
          <div className="border-b border-border-gray px-6 py-4">
            <h2 className="text-lg font-bold text-dark-charcoal">
              New Stock Batch Details
            </h2>
          </div>

          <div className="p-6">
            {message && (
              <div
                className={`mb-6 rounded-lg border px-4 py-3 text-sm font-semibold ${
                  message.type === "success"
                    ? "border-grass-green/20 bg-primary-blue/10 text-dark-charcoal"
                    : "border-danger/30 bg-red-50 text-accent-red"
                }`}
              >
                {message.text}
              </div>
            )}

            <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
              
              {/* Section 1: Product & Batch Identification */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-blue/80">
                  1. Product Identification
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="flex flex-col gap-2 md:col-span-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Medicine Name
                    </span>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <input
                        value={form.medicineName}
                        onChange={(event) =>
                          updateField("medicineName", event.target.value)
                        }
                        className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                        placeholder="e.g. Amoxicillin 500mg"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Batch Number
                    </span>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <input
                        value={form.batchNumber}
                        onChange={(event) =>
                          updateField("batchNumber", event.target.value)
                        }
                        className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                        placeholder="e.g. BATCH-2024-001"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Expiry Date
                    </span>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <input
                        type="date"
                        value={form.expiryDate}
                        onChange={(event) =>
                          updateField("expiryDate", event.target.value)
                        }
                        className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <hr className="border-border-gray" />

              {/* Section 2: Quantities & Pricing */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-blue/80">
                  2. Quantities & Pricing
                </h3>
                <div className="grid gap-6 md:grid-cols-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Quantity Added
                    </span>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(event) =>
                        updateField("quantity", event.target.value)
                      }
                      className="rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                      placeholder="e.g. 100"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Unit of Measure
                    </span>
                    <input
                      value={form.unit}
                      onChange={(event) => updateField("unit", event.target.value)}
                      className="rounded-lg border border-border-gray bg-off-white px-4 py-2.5 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                      placeholder="Boxes, Strips, Vials..."
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Price Per Unit (ETB)
                    </span>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <input
                        type="number"
                        step="0.01"
                        value={form.pricePerUnit}
                        onChange={(event) =>
                          updateField("pricePerUnit", event.target.value)
                        }
                        className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                        placeholder="e.g. 45.00"
                      />
                    </div>
                  </label>
                </div>
              </div>

              <hr className="border-border-gray" />

              {/* Section 3: Category Management */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-primary-blue/80">
                  3. Category Assignment
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="flex items-center justify-between text-sm font-semibold text-dark-charcoal">
                      <span>Select Existing Category</span>
                      {loadingCategories && (
                        <span className="text-xs text-primary-blue">Loading...</span>
                      )}
                    </span>
                    <div className="relative">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <select
                        value={form.categoryId}
                        onChange={(event) => {
                          updateField("categoryId", event.target.value);
                          updateField("categoryName", "");
                        }}
                        className="w-full appearance-none rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue"
                      >
                        <option value="">-- No existing category --</option>
                        {sortedCategories.map((category) => (
                          <option key={category.id} value={category.id.toString()}>
                            {category.category_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-dark-charcoal">
                      Or Create New Category
                    </span>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-blue/50" />
                      <input
                        value={form.categoryName}
                        onChange={(event) => {
                          updateField("categoryName", event.target.value);
                          updateField("categoryId", "");
                        }}
                        className="w-full rounded-lg border border-border-gray bg-off-white py-2.5 pl-10 pr-4 text-sm font-medium text-dark-charcoal outline-none transition focus:border-primary-blue focus:bg-pure-white focus:ring-1 focus:ring-primary-blue disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Type a new category name..."
                        disabled={form.categoryId !== ""}
                      />
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-4 flex items-center justify-end gap-4 rounded-xl bg-off-white p-4">
                <button
                  type="button"
                  onClick={() => {
                    setForm(initialFormState);
                    setMessage(null);
                  }}
                  className="rounded-lg border border-border-gray bg-pure-white px-5 py-2.5 text-sm font-semibold text-dark-charcoal transition hover:bg-border-gray focus:outline-none focus:ring-2 focus:ring-border-gray focus:ring-offset-2"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-grass-green px-8 py-2.5 text-sm font-bold text-pure-white shadow-sm transition hover:bg-primary-blue focus:outline-none focus:ring-2 focus:ring-grass-green focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Package className="h-5 w-5" />
                  {submitting ? "Processing..." : "Add Stock Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {popupToast && (
        <Toast message={popupToast} onClose={() => setPopupToast(null)} />
      )}
    </AppShell>
  );
}
