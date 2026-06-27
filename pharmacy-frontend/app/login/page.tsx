"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Moon,
  Package,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  BarChart3,
  Leaf,
} from "lucide-react";
import {
  readSessionCookie,
  setSessionCookie,
  SESSION_STORAGE_KEY,
} from "@/app/utils/session";

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

const featureCards = [
  {
    icon: <ShieldCheck className="h-6 w-6" />,
    title: "Smart Inventory",
    description: "Real-time stock tracking",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Sales Management",
    description: "Fast billing and order processing",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Analytics & Reports",
    description: "Insights for better decisions",
  },
  {
    icon: <Package className="h-6 w-6" />,
    title: "Secure & Reliable",
    description: "Your data is safe with us",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [darkMode, setDarkMode] = useState(false);
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
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

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
      if (rememberMe) {
        window.localStorage.setItem("rememberMe", "true");
      }
      setSessionCookie(data.token);

      router.replace(nextPath);
    } catch (error) {
      setToast({
        title: "Login failed",
        description:
          error instanceof Error ? error.message : "Unable to authenticate.",
        tone: "error",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <main
      className={`relative h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-900 ${darkMode ? "bg-slate-950 text-slate-100" : ""}`}
    >
      <div className="relative mx-auto flex h-full max-w-400 flex-col px-3 py-3 sm:px-4 lg:px-5">
        <div className="grid h-full gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:gap-5">
          <section className="relative overflow-hidden rounded-[1.75rem] bg-emerald-950/95 p-5 text-white shadow-[0_30px_90px_rgba(8,78,68,0.22)] sm:p-6 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.25),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(236,253,245,0.16),transparent_25%)]" />
            <div className="absolute -right-16 top-12 h-72 w-72 rounded-[50%] bg-white/10 blur-3xl" />
            <div className="absolute left-0 top-0 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-200/10 text-emerald-200 shadow-[0_14px_40px_rgba(16,185,129,0.16)]">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">
                      Express<span className="text-emerald-300">Pharma</span>
                    </p>
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                      Pharmacy Management System
                    </p>
                  </div>
                </div>
                <div className="hidden rounded-3xl bg-white/10 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-200/80 sm:flex">
                  Trusted, fast, complete
                </div>
              </div>

              <div className="max-w-2xl space-y-3">
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Smarter Pharmacy. Better Care.
                </h1>
                <p className="max-w-xl text-sm leading-7 text-emerald-100/85 sm:text-base">
                  A complete solution to manage your inventory, sales,
                  analytics, and reports — all in one place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {featureCards.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm transition hover:border-emerald-200/30 hover:bg-white/15"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/10 text-emerald-200">
                      {feature.icon}
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative mx-auto flex w-full max-w-3xl flex-col justify-center rounded-[1.75rem] bg-white p-6 shadow-[0_25px_90px_rgba(15,23,42,0.16)] sm:p-8">
            <div
              className={`absolute right-6 top-6 flex items-center gap-3 rounded-full px-3 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-colors duration-200 ${darkMode ? "bg-slate-800/80 text-slate-200" : "bg-slate-100/80 text-slate-700"}`}
            >
              {darkMode ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className="text-sm"
              >
                {darkMode ? "Dark mode" : "Light mode"}
              </button>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-3 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100/20 text-emerald-700 shadow-[0_20px_60px_rgba(16,185,129,0.16)]">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-950">
                  Welcome back!
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Sign in to continue to your dashboard.
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Username
                </label>
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
                  <User className="h-5 w-5 text-slate-400" />
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter username"
                    autoComplete="username"
                    className="w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="w-full border-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 transition hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Remember me
                </label>
                <a
                  href="#"
                  className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex w-full items-center justify-center gap-3 rounded-3xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(16,185,129,0.22)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {toast ? (
              <div
                className={`mt-5 rounded-3xl border px-4 py-4 text-sm ${
                  toast.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : toast.tone === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                <p className="font-semibold">{toast.title}</p>
                <p className="mt-1">{toast.description}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
