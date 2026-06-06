"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/AppShell";
import { clearSessionCookie } from "@/app/utils/session";
import type { UserRole } from "@/app/utils/rolePermissions";

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
  expiryDate: string;
  pricePerUnit: string;
};

const initialFormState: StockFormState = {
  categoryId: "",
  categoryName: "",
  medicineName: "",
  batchNumber: "",
  quantity: "",
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
  const [form, setForm] = useState<StockFormState>(initialFormState);
  const [profileName, setProfileName] = useState("Guest user");
  const [profileEmail, setProfileEmail] = useState("guest@expresspharma.local");
  const [userRole, setUserRole] = useState<UserRole>("staff");

  const handleSignOut = () => {
    window.localStorage.removeItem("pharmacy_auth_session_v1");
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
          user?: { username?: string; role?: UserRole };
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
      <div className="flex flex-col gap-8 lg:flex-row">
        <section className="lg:w-md">
          <div className="rounded-4xl bg-linear-to-br from-[#0f172a] via-[#1d4ed8] to-[#0ea5e9] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-sky-100/80">
              Stock Entry
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight">
              Add a batch without crowding the dashboard
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-sky-50/85">
              Use this page for new inventory batches. Category is optional. If
              you type a new category, the backend will create it automatically.
            </p>
            <div className="mt-8 rounded-3xl border border-white/20 bg-white/10 p-4 text-sm font-semibold text-sky-50/90 backdrop-blur">
              Tip: select an existing category, or leave it blank and type a new
              one below.
            </div>
            <Link
              href="/"
              className="mt-8 inline-flex rounded-full border-2 border-emerald-500 bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </section>

        <section className="flex-1">
          <div className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8">
            <div className="mb-8 flex flex-col gap-2">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-sky-700">
                New Stock Batch
              </p>
              <h2 className="text-3xl font-black text-slate-900">
                Inventory intake form
              </h2>
              <p className="max-w-2xl text-sm font-medium text-slate-600">
                The category selector is optional. Use the new category text
                field when the medicine belongs to a category that is not
                already in the list.
              </p>
            </div>

            {message && (
              <div
                className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Medicine Name
                </span>
                <input
                  value={form.medicineName}
                  onChange={(event) =>
                    updateField("medicineName", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="e.g. Amoxicillin 500mg"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Batch Number
                </span>
                <input
                  value={form.batchNumber}
                  onChange={(event) =>
                    updateField("batchNumber", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Batch number"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Quantity
                </span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="0"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Expiry Date
                </span>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(event) =>
                    updateField("expiryDate", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Price Per Unit
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.pricePerUnit}
                  onChange={(event) =>
                    updateField("pricePerUnit", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="0.00"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  Existing Category (optional)
                </span>
                <select
                  value={form.categoryId}
                  onChange={(event) =>
                    updateField("categoryId", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  disabled={loadingCategories}
                >
                  <option value="">No category selected</option>
                  {sortedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  New Category (optional)
                </span>
                <input
                  value={form.categoryName}
                  onChange={(event) =>
                    updateField("categoryName", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-sky-400 focus:bg-white"
                  placeholder="Type a category name to create it"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="md:col-span-2 mt-2 rounded-2xl border-2 border-emerald-500 bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(16,185,129,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving stock..." : "Add Stock Batch"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
