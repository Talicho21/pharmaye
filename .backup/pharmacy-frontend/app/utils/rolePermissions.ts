/**
 * Role-Based Access Control Utilities
 * Defines permissions and access levels for each user role
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

export const isAdminLikeUser = (role?: string, username?: string): boolean => {
  const normalizedRole = (role ?? "").trim().toLowerCase();
  const normalizedUsername = (username ?? "").trim().toLowerCase();

  return normalizedRole === "admin" || normalizedUsername.includes("admin");
};

export const getEffectiveRole = (role?: string, username?: string): UserRole =>
  isAdminLikeUser(role, username) ? "admin" : "staff";

/**
 * Get permissions for a given role
 */
export const getRolePermissions = (role?: string, username?: string): RolePermissions => {
  const effectiveRole = getEffectiveRole(role, username);

  if (effectiveRole === "admin") {
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

  // Staff permissions
  return {
    canAccessDashboard: true,
    canAccessStockEntry: true,
    canAccessSellOut: true,
    canAccessAnalytics: false,
    canAccessReports: false,
    canViewInventoryStatistics: false,
    canViewLowStockAlerts: false,
    canViewExpiredMedicineReports: false,
    canViewSalesCharts: false,
    canViewAdminCards: false,
  };
};

/**
 * Check if a user can access a specific route
 */
export const canAccessRoute = (
  route: string,
  role?: string,
  username?: string,
): boolean => {
  const permissions = getRolePermissions(role, username);

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
    return true; // Allow unknown routes by default
  }

  return permissions[permission];
};

/**
 * Get admin-only status of a route
 */
export const isAdminOnlyRoute = (route: string): boolean => {
  const adminOnlyRoutes = ["/analytics", "/reports"];
  return adminOnlyRoutes.includes(route);
};
