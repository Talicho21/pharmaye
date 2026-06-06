# Role-Based Dashboard System - Implementation Guide

## Overview

A complete role-based access control system has been implemented for your Pharmacy Management System with two user roles:

- **Admin**: Full access to all features including analytics and reports
- **Staff**: Limited access to dashboard, stock entry, and sales (no analytics/reports)

## Files Created/Modified

### New Files Created:

1. **`app/utils/rolePermissions.ts`** - Role permission definitions and utilities
2. **`app/components/ProtectedRoute.tsx`** - Route protection wrapper component
3. **`app/reports/page.tsx`** - Admin-only reports page
4. **`app/sell-out/page.tsx`** - Dedicated sales/sell-out page (both roles)

### Files Modified:

1. **`app/components/AppShell.tsx`** - Updated with role-based navigation
2. **`app/page.tsx`** - Updated dashboard with role-based UI
3. **`app/analytics/page.tsx`** - Added route protection for admin only
4. **`app/stock-entry/page.tsx`** - Added role information display

## Features Implementation

### 1. Role Permission System

**File**: `app/utils/rolePermissions.ts`

```typescript
// Key exports:
- getRolePermissions(role: UserRole): RolePermissions
- canAccessRoute(role: UserRole, route: string): boolean
- isAdminOnlyRoute(route: string): boolean
```

**Permission Matrix**:

| Feature               | Admin | Staff |
| --------------------- | ----- | ----- |
| Dashboard             | ✅    | ✅    |
| Stock Entry           | ✅    | ✅    |
| Sell Out              | ✅    | ✅    |
| Analytics             | ✅    | ❌    |
| Reports               | ✅    | ❌    |
| View Inventory Stats  | ✅    | ❌    |
| View Low Stock Alerts | ✅    | ❌    |
| View Expired Reports  | ✅    | ❌    |
| View Sales Charts     | ✅    | ❌    |

### 2. Route Protection

**File**: `app/components/ProtectedRoute.tsx`

Client-side route protection component that:

- Verifies user authentication
- Checks role permissions
- Redirects unauthorized users to dashboard
- Shows loading state during verification

**Usage**:

```tsx
<ProtectedRoute requiredRole="admin" routePath="/analytics">
  <AnalyticsPage />
</ProtectedRoute>
```

### 3. Navigation (AppShell)

**File**: `app/components/AppShell.tsx`

Updated with:

- **Admin Navigation**: Dashboard → Stock Entry → Sell Out → Analytics → Reports
- **Staff Navigation**: Dashboard → Stock Entry → Sell Out
- **Role Badge**: Shows "Administrator" or "Staff Member" in profile section
- Dynamic menu filtering based on user role

### 4. Dashboard Updates

**File**: `app/page.tsx`

**Admin Dashboard**:

- All action tiles visible (Sell Out, Stock Entry, Analytics link)
- Inventory statistics cards visible (Items loaded, Low stock, Expired)
- Admin-only metrics displayed
- Session card shows full role info

**Staff Dashboard**:

- Only Sell Out and Stock Entry tiles visible
- Analytics tile hidden
- Inventory statistics cards hidden
- Session card shows "Staff Member" designation

### 5. Analytics Page Protection

**File**: `app/analytics/page.tsx`

- Wrapped with `ProtectedRoute` component
- Admin-only access
- Staff redirected to dashboard if URL is manually entered
- AppShell receives `userRole="admin"` prop

### 6. Reports Page (New)

**File**: `app/reports/page.tsx`

Admin-only page with:

- Sales Summary (Revenue, Items Sold)
- Top Selling Medicines
- Inactive Products Report (3+ months no sales)
- Date range selector for report filtering
- Quick navigation links
- Protected with `ProtectedRoute` component

### 7. Sell Out Page (New)

**File**: `app/sell-out/page.tsx`

Available to both roles:

- Dedicated sales transaction page
- Multi-item cart interface
- Customer details entry
- Inventory status display
- Real-time inventory refresh
- Both Admin and Staff can process sales

### 8. Stock Entry Updates

**File**: `app/stock-entry/page.tsx`

Updated with:

- User role extraction from session
- Role display in profile section
- AppShell receives userRole prop

## Route Access Control

### Protected Routes (Admin Only)

| Route        | Protection        | Redirect        |
| ------------ | ----------------- | --------------- |
| `/analytics` | ✅ ProtectedRoute | `/` (Dashboard) |
| `/reports`   | ✅ ProtectedRoute | `/` (Dashboard) |

### Accessible to Both Roles

| Route           | Protection            |
| --------------- | --------------------- |
| `/` (Dashboard) | ✅ Session check only |
| `/stock-entry`  | ✅ Session check only |
| `/sell-out`     | ✅ Session check only |

## Authentication Flow

1. **User Logs In**
   - Username/password verified against backend
   - JWT token returned with user object including role
   - Session stored in localStorage

2. **User Navigates**
   - AppShell filters navigation based on role
   - ProtectedRoute validates role for admin-only pages
   - Staff attempting manual URL access → redirected to dashboard

3. **Session Persistence**
   - User data with role stored in session
   - Token maintained in localStorage and cookies
   - Role used for all permission checks

## User Type Scenarios

### Admin User Scenario

```
1. Login as admin
2. Dashboard shows:
   - All action tiles (Sell Out, Stock Entry, Analytics)
   - Inventory statistics (Items, Low Stock, Expired)
   - Analytics link available in nav
   - Reports link available in nav
3. Can access:
   - /analytics → Full charts and sales analysis
   - /reports → Revenue and activity reports
   - All sales/stock management features
4. Sidebar shows all menu items
```

### Staff User Scenario

```
1. Login as staff
2. Dashboard shows:
   - Only Sell Out and Stock Entry tiles
   - No inventory statistics
   - Analytics link hidden from nav
   - Reports link hidden from nav
3. Cannot access:
   - /analytics → Redirected to dashboard
   - /reports → Redirected to dashboard
4. Can only access:
   - Stock Entry
   - Sell Out (Sales processing)
5. Sidebar shows limited menu: Dashboard, Stock Entry, Sell Out
```

## Implementation Checklist

- ✅ Role permission system created
- ✅ Client-side route protection implemented
- ✅ Role-based navigation in AppShell
- ✅ Dashboard UI filtering by role
- ✅ Admin-only analytics page
- ✅ Admin-only reports page
- ✅ Dedicated sell-out page
- ✅ Stock entry role display
- ✅ Session role persistence
- ✅ Redirect handling for unauthorized access

## Testing Guide

### Test Admin Access

1. Login with admin credentials
2. Verify all menu items appear
3. Click Analytics → Should load page
4. Click Reports → Should load page
5. View dashboard stats cards

### Test Staff Access

1. Login with staff credentials
2. Verify limited menu items
3. Try manual URL access to `/analytics` → Should redirect to `/`
4. Try manual URL access to `/reports` → Should redirect to `/`
5. Verify no stats cards on dashboard
6. Verify no Analytics tile on dashboard

### Test Role-Based UI

1. Login as admin → See all tiles and cards
2. Logout and login as staff → See limited tiles
3. Check navigation menus differ by role
4. Verify profile section shows correct role designation

## Backend Integration

No backend changes required. The system uses:

- Existing authentication API
- User object returned from `/auth/me` endpoint
- User role field from database (must include `role: "admin" | "staff"`)

## Security Notes

- All role checking happens client-side using stored session data
- Production deployment should add server-side role verification
- Session token should have expiration (recommend 7 days)
- Consider adding role to JWT payload for double validation
- Backend APIs should verify role for admin-only endpoints

## Customization

### Add New Admin-Only Route

1. Update `rolePermissions.ts`:

```typescript
const routeMap: Record<string, keyof RolePermissions> = {
  "/new-admin-page": "canAccessAnalytics", // or create new permission
};
```

2. Wrap page with `ProtectedRoute`:

```tsx
<ProtectedRoute requiredRole="admin" routePath="/new-admin-page">
  <PageContent />
</ProtectedRoute>
```

### Modify Permissions

Edit `getRolePermissions()` function in `rolePermissions.ts` to change what each role can access.

### Update Navigation

Edit menu item arrays in `AppShell.tsx`:

```typescript
const adminNavItems: NavItem[] = [
  /* items */
];
const staffNavItems: NavItem[] = [
  /* items */
];
```

## Troubleshooting

### Staff seeing admin-only features

- Clear browser localStorage: `localStorage.clear()`
- Logout and login again
- Check user role in dev console: `JSON.parse(localStorage.getItem('pharmacy_auth_session_v1')).user.role`

### ProtectedRoute not working

- Ensure session is stored correctly in localStorage
- Check browser console for redirect errors
- Verify role value in session matches role in permission system

### Navigation not updating

- Ensure AppShell receives userRole prop
- Check that user is logged in (session exists)
- Verify role is extracted correctly from session

## Production Deployment

1. **Verify Backend JWT Includes Role**
   - Ensure JWT token contains user role
   - Return role in `/auth/me` endpoint

2. **Add Server-Side Validation**
   - Protect API endpoints with role checks
   - Verify role before returning sensitive data

3. **Monitor Unauthorized Access**
   - Log redirect events
   - Alert on repeated unauthorized access attempts

4. **Session Security**
   - Use HTTPS only
   - Set secure cookie flags
   - Implement token refresh/expiration

## Next Steps

1. ✅ Implementation complete - all files created and updated
2. Test the system with both admin and staff accounts
3. Deploy to production with server-side role verification
4. Monitor user access patterns
5. Adjust permissions based on business needs
