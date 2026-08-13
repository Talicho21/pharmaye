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
  const [nextPath, setNextPath] = useState("/");
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

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
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 transition-colors duration-200 bg-gradient-to-br from-off-white to-pure-white"
    >
      <div className="w-full max-w-[1000px] overflow-hidden rounded-3xl shadow-xl">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Left Panel — Brand Showcase */}
          <section className="relative hidden flex-col justify-between bg-primary-blue p-10 lg:flex">
            <div className="relative z-10 space-y-12">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-grass-green/10 text-grass-green">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Hawan Drug Store</h1>
                  <span className="inline-block mt-1 rounded-full bg-pure-white/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-pure-white">
                    Trusted Pharmacy System
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h2 className="text-4xl font-black tracking-tight text-white">
                  Smarter Pharmacy.<br />Better Care.
                </h2>
                <p className="max-w-sm text-base leading-relaxed text-off-white">
                  A complete solution to manage your inventory, sales, analytics, and reports — all in one place.
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                {featureCards.map((feature) => (
                  <div
                    key={feature.title}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:bg-white/10 hover:border-grass-green/30"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-pure-white">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-grass-green">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-off-white">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Panel — Auth Form */}
          <section className="relative flex flex-col justify-center bg-pure-white p-8 sm:p-12 transition-colors duration-200">
            {/* Theme Toggler */}
            <button
              onClick={() => {
                const newTheme = theme === "light" ? "dark" : "light";
                setTheme(newTheme);
                localStorage.setItem("theme", newTheme);
                if (newTheme === "dark") {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              }}
              className="absolute right-6 top-6 rounded-full bg-off-white p-2.5 text-dark-charcoal transition hover:bg-border-gray"
              aria-label="Toggle dark mode"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            <div className="mx-auto w-full max-w-[360px] pt-4">
              {/* Mobile Header (Shows only on small screens) */}
              <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-grass-green/10 text-grass-green">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h1 className="text-xl font-bold text-dark-charcoal">
                  Hawan Drug Store
                </h1>
              </div>

              {/* Login Header */}
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-blue/10 text-primary-blue">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-dark-charcoal">
                  Welcome back!
                </h2>
                <p className="mt-2 text-sm text-dark-charcoal/70">
                  Sign in to access your pharmacy dashboard.
                </p>
              </div>

              {/* Auth Form */}
              <form className="space-y-5" onSubmit={handleLogin}>
                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Username
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-border-gray bg-pure-white px-4 py-3 transition-colors duration-150 focus-within:border-primary-blue focus-within:ring-2 focus-within:ring-primary-blue">
                    <User className="h-5 w-5 text-dark-charcoal/80" />
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Enter your username"
                      autoComplete="username"
                      className="w-full border-none bg-transparent text-sm text-dark-charcoal outline-none placeholder:text-dark-charcoal/70"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-dark-charcoal">
                    Password
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-border-gray bg-pure-white px-4 py-3 transition-colors duration-150 focus-within:border-primary-blue focus-within:ring-2 focus-within:ring-primary-blue">
                    <Lock className="h-5 w-5 text-dark-charcoal/80" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="w-full border-none bg-transparent text-sm text-dark-charcoal outline-none placeholder:text-dark-charcoal/70"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-dark-charcoal/80 transition-colors hover:text-dark-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Utility Row */}
                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-dark-charcoal">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="h-4 w-4 cursor-pointer rounded border-border-gray text-primary-blue focus:ring-primary-blue focus:ring-offset-0 bg-transparent"
                      style={{ accentColor: "#1D5FAE" }}
                    />
                    Remember me
                  </label>
                  <a
                    href="#"
                    className="text-sm font-bold text-grass-green hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue rounded"
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-grass-green px-5 py-3 text-sm font-bold text-pure-white shadow-sm transition duration-150 hover:-translate-y-0.5 hover:bg-grass-green/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:translate-y-0"
                >
                  {isLoggingIn ? "Signing in..." : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Toast Notification */}
              {toast && (
                <div
                  className={`mt-6 rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm ${
                    toast.tone === "success"
                      ? "border-accent-green-alt/20 bg-accent-green-alt/10 text-dark-charcoal"
                      : toast.tone === "error"
                        ? "border-accent-red/30 bg-accent-red/10 text-accent-red"
                        : "border-blue-200 bg-blue-50 text-blue-800"
                  }`}
                >
                  <p>{toast.title}</p>
                  <p className="mt-0.5 font-normal">{toast.description}</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
