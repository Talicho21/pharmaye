# Role-Based Dashboard - Code Implementation Details

## File-by-File Implementation

This document shows the exact code structure and key modifications for each file.

---

## NEW FILE: `app/utils/rolePermissions.ts`

```typescript
/**
 * Role-Based Access Control Utilities
 */

export type UserRole = "admin" | "staff";

export interface RolePermissions {
  canAccessDashboard: boolean;
  canAccessStockEntry: boolean;
  canAccessSellOut: boolean;
  canAccessAnalytics: boolean;
  canAccessReports: boolean;
  canViewInventoryStatistics: boolean;
  canViewLowStockAlerts: boolean;
  canViewExpiredMedicineReports: boolean;
  canViewSalesCharts: boolean;
  canViewAdminCards: boolean;
}

/**
 * ADMIN: Full access to all features
 * STAFF: Limited access - no analytics/reports/stats
 */
export const getRolePermissions = (role: UserRole): RolePermissions => {
  if (role === "admin") {
    return {
      canAccessDashboard: true,
      canAccessStockEntry: true,
      canAccessSellOut: true,
      canAccessAnalytics: true,
      canAccessReports: true,
      canViewInventoryStatistics: true,
      canViewLowStockAlerts: true,
      canViewExpiredMedicineReports: true,
      canViewSalesCharts: true,
      canViewAdminCards: true,
    };
  }

  // Staff: Limited permissions
  return {
    canAccessDashboard: true,
    canAccessStockEntry: true,
    canAccessSellOut: true,
    canAccessAnalytics: false, // ❌ Blocked
    canAccessReports: false, // ❌ Blocked
    canViewInventoryStatistics: false, // ❌ Blocked
    canViewLowStockAlerts: false, // ❌ Blocked
    canViewExpiredMedicineReports: false, // ❌ Blocked
    canViewSalesCharts: false, // ❌ Blocked
    canViewAdminCards: false, // ❌ Blocked
  };
};

/**
 * Check if user can access specific route
 */
export const canAccessRoute = (role: UserRole, route: string): boolean => {
  const permissions = getRolePermissions(role);

  const routeMap: Record<string, keyof RolePermissions> = {
    "/": "canAccessDashboard",
    "/dashboard": "canAccessDashboard",
    "/stock-entry": "canAccessStockEntry",
    "/sell-out": "canAccessSellOut",
    "/analytics": "canAccessAnalytics",
    "/reports": "canAccessReports",
  };

  const permission = routeMap[route];
  if (!permission) {
    return true; // Allow unknown routes
  }

  return permissions[permission];
};

/**
 * Get admin-only status of route
 */
export const isAdminOnlyRoute = (route: string): boolean => {
  const adminOnlyRoutes = ["/analytics", "/reports"];
  return adminOnlyRoutes.includes(route);
};
```

**Usage in other components**:

```typescript
import {
  getRolePermissions,
  canAccessRoute,
} from "@/app/utils/rolePermissions";

// Get permissions for current user
const permissions = getRolePermissions(user.role); // "admin" or "staff"

// Check specific permission
if (permissions.canViewInventoryStatistics) {
  // Show stats cards
}

// Check route access
if (canAccessRoute(user.role, "/analytics")) {
  // User can access this route
}
```

---

## NEW FILE: `app/components/ProtectedRoute.tsx`

```typescript
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@/app/utils/rolePermissions";
import { canAccessRoute } from "@/app/utils/rolePermissions";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;        // Only "admin" required
  routePath: string;              // e.g., "/analytics"
}

/**
 * ProtectedRoute Component
 *
 * Wraps admin-only pages and enforces role-based access
 * - Checks if user is authenticated
 * - Verifies user role has access to route
 * - Redirects unauthorized users to "/"
 * - Shows loading state during verification
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
          router.push("/login");
          return;
        }

        const session = JSON.parse(sessionStorage) as {
          user?: { role: UserRole };
        };
        const userRole = session?.user?.role;

        if (!userRole) {
          router.push("/login");
          return;
        }

        // Check if user has access to this route
        const hasAccess = canAccessRoute(userRole, routePath);

        if (!hasAccess) {
          // Redirect staff users back to dashboard
          router.push("/");
          return;
        }

        // Check specific role requirement if provided
        if (requiredRole && userRole !== requiredRole) {
          router.push("/");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Authorization check failed:", error);
        router.push("/login");
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
```

**Usage Example** (in analytics page):

```tsx
export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredRole="admin" routePath="/analytics">
      <AppShell ... >
        <div>Analytics Content</div>
      </AppShell>
    </ProtectedRoute>
  );
}
```

---

## MODIFIED FILE: `app/components/AppShell.tsx`

**Key Changes**:

### 1. Add imports and type updates

```typescript
import type { UserRole } from "@/app/utils/rolePermissions";
import { getRolePermissions } from "@/app/utils/rolePermissions";

type AppShellProps = {
  children: ReactNode;
  profileName: string;
  profileEmail: string;
  userRole?: UserRole; // NEW: role-based navigation
  onSignOut?: () => void;
  navItems?: NavItem[];
};
```

### 2. Define navigation by role

```typescript
// Admin gets all menu items
const adminNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", description: "Overview and quick actions" },
  {
    href: "/stock-entry",
    label: "Stock Entry",
    description: "Add incoming batches",
  },
  { href: "/sell-out", label: "Sell Out", description: "Process sales" },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Charts and insights",
  },
  { href: "/reports", label: "Reports", description: "Detailed analytics" },
];

// Staff gets limited menu items
const staffNavItems: NavItem[] = [
  { href: "/", label: "Dashboard", description: "Overview and quick actions" },
  {
    href: "/stock-entry",
    label: "Stock Entry",
    description: "Add incoming batches",
  },
  { href: "/sell-out", label: "Sell Out", description: "Process sales" },
];

const getDefaultNavItems = (role?: UserRole): NavItem[] => {
  if (role === "admin") {
    return adminNavItems;
  }
  return staffNavItems;
};
```

### 3. Update component function

```typescript
export function AppShell({
  children,
  profileName,
  profileEmail,
  userRole = "staff",              // Default to staff if not provided
  onSignOut,
  navItems,
}: AppShellProps) {
  const pathname = usePathname();
  const permissions = getRolePermissions(userRole);
  const effectiveNavItems = navItems || getDefaultNavItems(userRole);

  // Use effectiveNavItems instead of navItems in render
  return (
    <div className="...">
      <nav className="mt-6 space-y-2">
        {effectiveNavItems.map((item) => {
          // ... render nav items
        })}
      </nav>

      {/* Profile section with role badge */}
      <div className="mt-auto rounded-3xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
          Profile
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-[0_10px_30px_rgba(16,185,129,0.22)]">
            {profileName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-950">{profileName}</p>
            {/* Display role instead of email */}
            <p className="text-xs font-medium text-slate-500">
              {userRole === "admin" ? "Administrator" : "Staff Member"}
            </p>
          </div>
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}
```

---

## MODIFIED FILE: `app/page.tsx` (Dashboard)

**Key Changes**:

### 1. Import role utilities

```typescript
import { getRolePermissions } from "@/app/utils/rolePermissions";
```

### 2. Pass userRole to AppShell

```typescript
return (
  <AppShell
    profileName={user.username}
    profileEmail={`${user.username}@expresspharma.local`}
    userRole={user.role}              // NEW: Pass user role
    onSignOut={handleLogout}
  >
```

### 3. Conditionally render Analytics tile (admin only)

```typescript
<section className="grid gap-4 md:grid-cols-3">
  {/* Always show these tiles */}
  <button onClick={() => setIsSellOutOpen(true)}>
    {/* Sell Out tile */}
  </button>

  <Link href="/stock-entry">
    {/* Stock Entry tile */}
  </Link>

  {/* Only show Analytics for admin */}
  {user.role === "admin" ? (
    <Link href="/analytics" className="...">
      <div className="...">Analytics</div>
      <div className="...">View charts and reports</div>
    </Link>
  ) : null}

  <div className="...">
    {/* Session card */}
  </div>
</section>
```

### 4. Conditionally render inventory stats (admin only)

```typescript
{user.role === "admin" ? (
  <section className="grid gap-4 sm:grid-cols-3">
    {[
      { label: "Items loaded", value: inventory.length },
      { label: "Low stock", value: lowStockCount },
      { label: "Expired", value: expiredCount },
    ].map((item) => (
      <div key={item.label} className={metricCardClassName}>
        <div className="...">
          <span className={titleLineClassName}>{item.label}</span>
        </div>
        <div className="mt-3 text-3xl font-black text-slate-950">
          {item.value}
        </div>
      </div>
    ))}
  </section>
) : null}
```

---

## MODIFIED FILE: `app/analytics/page.tsx`

**Key Changes**:

### 1. Add ProtectedRoute import

```typescript
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
```

### 2. Wrap entire page with ProtectedRoute

```typescript
export default function AnalyticsPage() {
  // ... component logic

  return (
    <ProtectedRoute requiredRole="admin" routePath="/analytics">
      <AppShell
        profileName={profileName}
        profileEmail={profileEmail}
        userRole="admin"              // Always admin here
        onSignOut={handleSignOut}
      >
        <div className="flex flex-col gap-8">
          {/* Analytics content */}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
```

---

## MODIFIED FILE: `app/stock-entry/page.tsx`

**Key Changes**:

### 1. Import UserRole type

```typescript
import type { UserRole } from "@/app/utils/rolePermissions";
```

### 2. Add userRole state

```typescript
const [userRole, setUserRole] = useState<UserRole>("staff");
```

### 3. Extract role from session

```typescript
useEffect(() => {
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
        setUserRole(parsed.user.role); // Extract role
      }
    }
  } catch {
    setProfileName("Guest user");
  }
}, []);
```

### 4. Pass userRole to AppShell

```typescript
return (
  <AppShell
    profileName={profileName}
    profileEmail={profileEmail}
    userRole={userRole}               // NEW: Pass extracted role
    onSignOut={handleSignOut}
  >
```

---

## NEW FILE: `app/reports/page.tsx`

**Structure**:

- Protected with `<ProtectedRoute requiredRole="admin" routePath="/reports">`
- Shows sales summary cards
- Displays top selling medicines
- Shows inactive products report (3+ months no sales)
- Only accessible to admin

**Key Sections**:

```typescript
export default function ReportsPage() {
  return (
    <ProtectedRoute requiredRole="admin" routePath="/reports">
      <AppShell userRole="admin" ...>
        <header>Reports & Analytics</header>

        {/* Sales Summary Section */}
        <div>Total Revenue: PKR {reportData.totalRevenue}</div>
        <div>Items Sold: {reportData.totalItemsSold}</div>

        {/* Top Selling Medicines */}
        <div>
          {reportData.topSellingMedicines.map(medicine => (
            <div key={medicine.medicineName}>
              {medicine.medicineName}: {medicine.quantitySold} units
            </div>
          ))}
        </div>

        {/* Inactive Products Table */}
        <table>
          <tbody>
            {inactiveData.medicines.map(medicine => (
              <tr key={medicine.medicineId}>
                <td>{medicine.medicineName}</td>
                <td>{medicine.lastSaleDate}</td>
                <td>{medicine.daysSinceLastSale} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AppShell>
    </ProtectedRoute>
  );
}
```

---

## NEW FILE: `app/sell-out/page.tsx`

**Structure**:

- Accessible to both Admin and Staff
- Dedicated sales transaction page
- Always shows MultiItemOrderCart
- Shows inventory status
- Both roles can process sales

**Key Sections**:

```typescript
export default function SellOutPage() {
  // Load user and inventory
  // Handle sales submission

  return (
    <AppShell
      userRole={user.role}  // Both admin and staff
      ...
    >
      <header>Process Sales Transactions</header>

      {/* Always visible MultiItemOrderCart */}
      <MultiItemOrderCart
        isOpen={true}
        onSubmit={handleSellOutSubmit}
      />

      {/* Inventory Status */}
      <section>
        <h3>Current Inventory Status</h3>
        <table>
          {/* Show available medicines */}
        </table>
      </section>
    </AppShell>
  );
}
```

---

## Summary of Changes by Role

### Admin User Flow:

```
1. Login → user.role = "admin"
2. Dashboard → AppShell gets userRole="admin"
3. Navigation shows all 5 items (Analytics + Reports visible)
4. Dashboard displays all cards and tiles
5. Can click Analytics → ProtectedRoute passes (required role matches)
6. Can click Reports → ProtectedRoute passes (required role matches)
```

### Staff User Flow:

```
1. Login → user.role = "staff"
2. Dashboard → AppShell gets userRole="staff"
3. Navigation shows 3 items (Analytics + Reports hidden)
4. Dashboard hides admin-only cards and tiles
5. Manual access to /analytics → ProtectedRoute redirects to /
6. Manual access to /reports → ProtectedRoute redirects to /
```

---

## TypeScript Compilation

All files use strict TypeScript with:

- Type-safe imports
- Proper interface definitions
- User role type as discriminated union: `"admin" | "staff"`
- No any types

---

## Verification Commands

Check implementation status:

```bash
# Verify files exist
ls -la app/utils/rolePermissions.ts
ls -la app/components/ProtectedRoute.tsx
ls -la app/reports/page.tsx
ls -la app/sell-out/page.tsx

# Build and check for TypeScript errors
npm run build

# Type check specific files
npx tsc --noEmit app/utils/rolePermissions.ts
```
