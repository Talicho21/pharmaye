# Role-Based Dashboard - Quick Reference

## Summary of Changes

Complete role-based access control system implemented with 4 new files and 4 updated files.

## New Files

### 1. `app/utils/rolePermissions.ts`

**Purpose**: Role permission definitions  
**Key Functions**:

- `getRolePermissions(role)` - Returns permissions for a role
- `canAccessRoute(role, route)` - Checks if role can access route
- `isAdminOnlyRoute(route)` - Checks if route is admin-only

**Key Permissions**:

- Admin: Full access (all features enabled)
- Staff: Limited access (no analytics, reports, or stats)

---

### 2. `app/components/ProtectedRoute.tsx`

**Purpose**: Client-side route protection wrapper  
**Features**:

- Validates user authentication
- Checks role permissions
- Shows loading state during verification
- Redirects unauthorized users to "/"

**Props**:

```tsx
{
  children: ReactNode;
  requiredRole?: "admin" | "staff";
  routePath: string; // e.g., "/analytics"
}
```

---

### 3. `app/reports/page.tsx` (NEW)

**Purpose**: Admin-only reports page  
**Features**:

- Sales Summary (Revenue, Items Sold)
- Top Selling Medicines
- Inactive Products Report
- Protected with ProtectedRoute
- Date range filters

---

### 4. `app/sell-out/page.tsx` (NEW)

**Purpose**: Dedicated sales transaction page  
**Features**:

- Multi-item sales cart
- Customer details collection
- Inventory status display
- Both Admin and Staff can access

---

## Modified Files

### 1. `app/components/AppShell.tsx`

**Changes**:

- Added `userRole` prop (type: UserRole)
- Created separate nav item arrays for admin/staff
- Added `getRolePermissions` import
- Dynamic navigation based on role
- Updated profile section with role designation ("Administrator" vs "Staff Member")
- Changed profileEmail display to role name

**New Props**:

```tsx
userRole?: UserRole; // "admin" | "staff"
```

---

### 2. `app/page.tsx` (Dashboard)

**Changes**:

- Added `getRolePermissions` import
- Pass `userRole={user.role}` to AppShell
- Conditionally render Analytics tile for admin only
- Conditionally render admin inventory stats cards
- Updated session card to show role designation

**Admin Only UI**:

- Analytics action tile
- 3 inventory metric cards (Items loaded, Low stock, Expired)

**Staff Sees**:

- Only Sell Out and Stock Entry tiles
- No inventory stats

---

### 3. `app/analytics/page.tsx`

**Changes**:

- Added `ProtectedRoute` import
- Wrapped entire page with `<ProtectedRoute requiredRole="admin" routePath="/analytics">`
- Pass `userRole="admin"` to AppShell
- Staff users are redirected to "/" when accessing this page

---

### 4. `app/stock-entry/page.tsx`

**Changes**:

- Added `UserRole` type import
- Added `userRole` state variable (default: "staff")
- Extract user role from localStorage session
- Pass `userRole={userRole}` to AppShell
- Profile section displays role designation

---

## Navigation Structure

### Admin Navigation (5 items)

1. Dashboard
2. Stock Entry
3. Sell Out
4. Analytics
5. Reports

### Staff Navigation (3 items)

1. Dashboard
2. Stock Entry
3. Sell Out

---

## Route Protection Matrix

| Route          | Admin | Staff | Method                    |
| -------------- | ----- | ----- | ------------------------- |
| `/`            | ✅    | ✅    | Session check             |
| `/stock-entry` | ✅    | ✅    | Session check             |
| `/sell-out`    | ✅    | ✅    | Session check             |
| `/analytics`   | ✅    | ❌    | ProtectedRoute → Redirect |
| `/reports`     | ✅    | ❌    | ProtectedRoute → Redirect |

---

## Dashboard UI Visibility

### Admin Dashboard Shows:

- Sell Out tile ✅
- Stock Entry tile ✅
- Analytics tile ✅
- Session card with full info ✅
- 3 Inventory Stats Cards:
  - Items loaded
  - Low stock
  - Expired medicines
- Current inventory table ✅

### Staff Dashboard Shows:

- Sell Out tile ✅
- Stock Entry tile ✅
- Analytics tile ❌ (hidden)
- Session card (shows "Staff Member") ✅
- Inventory Stats Cards ❌ (hidden)
- Current inventory table ❌ (hidden)

---

## Permission Definitions

### ADMIN Permissions (All enabled)

```javascript
{
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
}
```

### STAFF Permissions (Limited)

```javascript
{
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
}
```

---

## Session Storage Format

Stored in `localStorage` key: `pharmacy_auth_session_v1`

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin_user",
    "role": "admin"
  }
}
```

**Required Fields**:

- `token`: JWT authentication token
- `user.role`: Must be "admin" or "staff"

---

## Redirect Behavior

**When Staff Tries to Access Admin Route**:

1. Load component with ProtectedRoute wrapper
2. Component checks localStorage for session
3. Extracts user role from session
4. ProtectedRoute validates role
5. Shows "You do not have permission to access this page"
6. Internally redirects to "/" after 1 second

---

## Testing Checklist

### Admin Account

- [ ] Can see all menu items
- [ ] Can access Analytics page
- [ ] Can access Reports page
- [ ] Dashboard shows 3 stats cards
- [ ] Dashboard shows Analytics tile
- [ ] Session card shows "Administrator"

### Staff Account

- [ ] Menu shows only 3 items
- [ ] Cannot access /analytics (redirects)
- [ ] Cannot access /reports (redirects)
- [ ] Dashboard hides stats cards
- [ ] Dashboard hides Analytics tile
- [ ] Session card shows "Staff Member"

---

## Code Integration Points

### Where Role is Used

1. **AppShell** - Filters navigation menu
2. **ProtectedRoute** - Validates admin-only routes
3. **Dashboard (page.tsx)** - Hides/shows UI elements
4. **Analytics** - Enforces admin-only access
5. **Reports** - Enforces admin-only access
6. **Sell Out** - Both roles can access

### Where Role is Extracted

1. **page.tsx** - From user object after login
2. **stock-entry/page.tsx** - From localStorage session
3. **analytics/page.tsx** - From localStorage session
4. **reports/page.tsx** - From localStorage session
5. **sell-out/page.tsx** - From localStorage session

---

## API Requirements

Backend must return user object with role:

```json
{
  "user": {
    "id": 1,
    "username": "staff_user",
    "role": "staff"
  }
}
```

**Endpoints**:

- `POST /api/auth/login` - Login, return user + token
- `GET /api/auth/me` - Get current user info with role

---

## Browser Storage

- **localStorage** key: `pharmacy_auth_session_v1` (Full session)
- **Cookies** key: `pharmacy_session_token` (Token only)

---

## TypeScript Types

### UserRole

```typescript
type UserRole = "admin" | "staff";
```

### RolePermissions

```typescript
interface RolePermissions {
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
```

---

## Troubleshooting

**Issue**: Staff seeing admin features
**Solution**:

- Logout and login again
- Clear localStorage: `localStorage.clear()`
- Check console: `JSON.parse(localStorage.getItem('pharmacy_auth_session_v1')).user.role`

**Issue**: Route protection not working
**Solution**:

- Ensure ProtectedRoute wrapper is in place
- Check browser DevTools → Network → Verify session token
- Check that role in localStorage matches expected format

**Issue**: Navigation not showing correct items
**Solution**:

- Verify AppShell receives userRole prop
- Check that role is extracted correctly from session
- Hard refresh browser (Ctrl+Shift+R)

---

## Production Checklist

- [ ] Backend JWT includes user role
- [ ] Backend validates role on protected endpoints
- [ ] Implement server-side role verification
- [ ] HTTPS enabled for all routes
- [ ] Secure cookie flags set
- [ ] Token expiration implemented
- [ ] Audit logging for admin actions
- [ ] Rate limiting on auth endpoints
