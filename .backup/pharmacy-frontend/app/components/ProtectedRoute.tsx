"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/app/utils/rolePermissions";
import { canAccessRoute, isAdminLikeUser } from "@/app/utils/rolePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  routePath: string;
}

/**
 * ProtectedRoute Component
 * Wraps page content and redirects unauthorized users
 * Shows loading state while checking authentication
 */
export function ProtectedRoute({
  children,
  requiredRole,
  routePath,
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // Get stored session
        const sessionStorage = localStorage.getItem("pharmacy_auth_session_v1");
        if (!sessionStorage) {
          router.push("/");
          return;
        }

        const session = JSON.parse(sessionStorage) as {
          user?: { role?: UserRole | string; username?: string };
        };
        const userRole = session?.user?.role;
        const username = session?.user?.username;
        const effectiveRole = isAdminLikeUser(userRole, username)
          ? "admin"
          : userRole;

        if (!effectiveRole) {
          router.push("/");
          return;
        }

        // Check if user has access to this route
        const hasAccess = canAccessRoute(routePath, effectiveRole, username);

        if (!hasAccess) {
          // Redirect staff users back to dashboard
          router.push("/");
          return;
        }

        // Check specific role requirement if provided
        if (requiredRole && effectiveRole !== requiredRole) {
          router.push("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Authorization check failed:", error);
        router.push("/");
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthorization();
  }, [router, requiredRole, routePath]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-slate-500 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          Verifying access permissions...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/50">
        <div className="rounded-4xl border border-white/80 bg-white/90 px-8 py-10 text-sm font-semibold text-slate-500 shadow-[0_25px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return children;
}
