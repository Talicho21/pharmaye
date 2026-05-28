"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readSessionCookie, setSessionCookie, SESSION_STORAGE_KEY } from "@/app/utils/session";

type AuthUser = {
  id: number;
  username: string;
  role: "admin" | "staff";
};

type LoginResponse = {
  token: string;
  user: AuthUser;
  message?: string;
  error?: string;
};

type Toast = {
  title: string;
  description: string;
  tone: "success" | "error" | "info";
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [nextPath, setNextPath] = useState("/");

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setNextPath(searchParams.get("next") || "/");

    try {
      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      const cookieToken = readSessionCookie();

      if (rawSession || cookieToken) {
        router.replace(searchParams.get("next") || "/");
      }
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [router]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoggingIn(true);
    setToast(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok || !data.token || !data.user) {
        throw new Error(data.error ?? data.message ?? "Login failed");
      }

      const session = { token: data.token, user: data.user };
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      setSessionCookie(data.token);
      router.replace(nextPath);
    } catch (error) {
      setToast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unable to authenticate.",
        tone: "error",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eef6ff,#f8fafc_40%,#e9eefb_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[85vh] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-sky-700">
            Pharmacy system
          </span>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Faster stock entry, cleaner analytics, and a simpler dashboard.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              Sign in to reach the dashboard. The session is now guarded by routing middleware, so the app opens here first.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Dedicated stock page", value: "/stock-entry" },
              { label: "Analytics page", value: "/analytics" },
              { label: "PostgreSQL auth", value: "Active" },
            ].map((item) => (
              <div key={item.label} className="rounded-4xl border border-white/80 bg-white/85 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{item.label}</div>
                <div className="mt-2 text-lg font-bold text-slate-950">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-4xl border border-white/80 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:p-8">
          <div className="mb-6 space-y-2">
            <h2 className="text-2xl font-bold text-slate-950">Sign in</h2>
            <p className="text-sm leading-6 text-slate-500">Use your pharmacy account to access the dashboard.</p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              <span>Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                placeholder="Enter username"
                autoComplete="username"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              <span>Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {toast ? (
            <div
              className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
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
        </section>
      </div>
    </main>
  );
}
