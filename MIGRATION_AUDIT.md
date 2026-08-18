# Migration Audit — Feature & Business-Rule Inventory

Audit of the legacy system (`pharmacy-backend` Express + PostgreSQL, `pharmacy-frontend` Next.js 14)
performed before the Laravel 12 + Inertia + React migration. This is the source of truth for parity.

Legacy code is preserved under `.backup/` and at git tag `pre-laravel-migration`.

---

## 1. Legacy architecture

- **Backend:** Express 5 + `pg` (Supabase PostgreSQL), JWT auth (12 h TTL, Bearer header or
  `pharmacy_session_token` cookie), bcrypt passwords (with legacy plaintext fallback).
- **Frontend:** Next.js 14 App Router, React 18, TS, Tailwind v4, recharts, lucide-react.
  Client calls `/api/backend/*` which proxies to the Express API.
- **Single tenant.** No store/tenant concept anywhere.
- **Login identity is `username`** (case-insensitive), NOT email. Roles: `admin` | `staff`.

## 2. Database schema (runtime-effective, Postgres)

| Table | Columns | Notes |
|---|---|---|
| `users` | id, username (unique), password, role, created_at | |
| `categories` | id, category_name (unique, case-insensitive) | |
| `inventory` | id, name, category_id (nullable FK), batch_number (app-enforced unique), quantity, initial_batch_quantity, expiry_date, price_per_unit, unit | Flat "batch" table; `id` is used as `batch_id` in sales |
| `medicines` | id, name (unique), category_id, price, stock | Catalog stub upserted at sale time; `stock` never maintained |
| `sales` | id, user_id, medicine_id, batch_id, medicine_name, quantity_sold, unit_price, total_price, seller_name, receiver_name, sale_date, invoice_no, reference, customer_name, customer_tin, customer_sno, payment_method (cash/credit) | **One row per line item**; the same `invoice_no` string is repeated across rows of one cart |

Indexes: sales(sale_date, invoice_no, customer_tin, customer_sno, batch_id); expression indexes on
LOWER(inventory.name) and LOWER(inventory.batch_number).

## 3. API surface (Express)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/login | public | username+password → JWT `{id, username, role}` |
| POST | /api/auth/register | **public** (gap) | create user, role admin only if explicitly `"admin"` |
| GET | /api/auth/me | JWT | fresh user record |
| GET | /api/inventory | **public** (gap) | paginated list, search on name/batch, category filter, ordered `name ASC, expiry_date ASC` |
| GET | /api/inventory/search | **public** (gap) | LIKE search, limit 25 |
| POST | /api/inventory/stock-in | **public** (gap) | create batch; accepts field aliases; auto-creates category by name; rejects duplicate batch_number; sets initial_batch_quantity = quantity |
| POST | /api/inventory/sell | broken (handler requires `req.auth` but no middleware attached) | single-line sale |
| POST | /api/inventory/bulk-sell | JWT | multi-line sale (the flow the UI actually uses) |
| PUT | /api/inventory/:id | JWT | partial inline edit of a batch |
| DELETE | /api/inventory/delete/:id | admin | hard delete batch |
| GET/POST | /api/categories | **public** (gap) | list / create category |
| GET | /api/reports?range= | admin | totals + top-5 sellers for 24h/monthly/6months/yearly |
| GET | /api/reports/sales-log | admin | date-range + search + paginated ledger |
| GET | /api/reports/inactive | admin | items with no sale in N months (default 3) |
| DELETE | /api/reports/reset | admin | TRUNCATE sales |

## 4. sellMedicine / bulk-sell business rules (CRITICAL)

Single sale (`sellMedicine`) transaction flow:
1. `BEGIN`; `SELECT ... FROM inventory WHERE id = $batch_id FOR UPDATE` (row lock).
2. Fail if batch missing or `quantity < quantity_sold`.
3. `total_price = quantity_sold * inventory.price_per_unit` — **no tax, no discount**.
4. Upsert `medicines` by name (price only filled if null/0) to obtain `medicine_id`.
5. `UPDATE inventory SET quantity = quantity - $qty`.
6. Insert one `sales` row with client-supplied invoice/customer/payment fields.
7. `COMMIT`; any error → `ROLLBACK` → HTTP 400 with the error message.

Bulk sale (`bulkSaleMedicine`) — same per-line flow inside ONE transaction, plus:
- Accepts line-level overrides (price, medicine name, batch number, expiry, unit) and
  **writes those overrides back onto the inventory row** while decrementing.
- Same `invoice_no`, customer, seller/receiver, payment_method copied onto every line's sales row.
- Returns `{ total_items_processed, total_revenue, items[] }`.

Key facts for the new system:
- **No server-side FEFO/FIFO** — the cashier explicitly picks the batch (UI lists batches expiry-ASC).
  The new system introduces FEFO auto-selection with manual override (per the migration decisions).
- **Invoice numbers are generated client-side**: `INV-{3 letters from name}-{4 digits from TIN}`
  or `INV-{timestamp}` fallback (`app/utils/invoiceUtils.ts`). No server sequence or uniqueness.
- Defaults: seller "System"/"System Dispenser", receiver "General"/"General Customer", payment "cash".
- The receipt UI mentions 15% VAT helpers in the unused `PrintableInvoice`, but the live cart print
  path charges **no VAT** (grand total = sum of lines).

## 5. Analytics queries to convert (Postgres-specific syntax flagged)

1. Range overview: `SUM(total_price)`, `SUM(quantity_sold)` where `sale_date >= NOW() - INTERVAL '…'`
   (interval string interpolated). → MySQL/query-builder date math.
2. Top-5 sellers by quantity in range, name via `COALESCE(s.medicine_name, i.name, 'Purged Item')`.
3. Sales log: `::date` casts, `ILIKE`, `COUNT(*) OVER()` window total. → `whereDate`, `LIKE` on
   lowercased columns, separate count query or `COUNT() OVER()` (supported in MySQL 8).
4. Inactive stock: `EXTRACT(DAY FROM NOW() - MAX(sale_date))`, `INTERVAL 'N months'`,
   `ORDER BY … NULLS FIRST`. → `DATEDIFF`, `DATE_SUB`, explicit null-ordering expression.
5. Reset: `TRUNCATE … RESTART IDENTITY CASCADE` → guarded delete/truncate in MySQL.

## 6. Frontend screens & components

| Route | Purpose |
|---|---|
| `/` | Dashboard: KPI cards (items loaded, low stock ≤10, expired), quick links, searchable inventory table (10/page), edit modal (PUT), delete (admin) |
| `/login` | Branded split-panel login (username/password, remember-me, theme toggle) |
| `/sell-out` | POS: always-open `MultiItemOrderCart` |
| `/stock-entry` | Stock-in form: product fields, qty/price, existing-or-new category |
| `/analytics` | Admin: inventory value, out-of-stock count, lowest-qty bar chart, expiry pie (healthy / ≤6 mo / expired), top sellers with range pills |
| `/reports` | Admin: date-range + search ledger, CSV export, print |

Components: `AppShell` (blue sidebar, role-filtered nav — staff can't see Analytics/Reports),
`MultiItemOrderCart` (search → cart → receipt review → confirm; prints via popup HTML),
`PrintableInvoice` (A4 invoice, currently unused), `ProtectedRoute`, `Toast`.

Theme tokens (Tailwind v4 `@theme`): `--primary-blue:#1D5FAE`, `--grass-green:#4E9F3D`,
`--off-white:#F5F6F8`, `--dark-charcoal:#2E2E38`, `--border-gray:#DADFE6`, accents gold/red.
Font: Arial/Helvetica. Dark mode via `.dark` class + localStorage.

Role rules in UI: staff blocked from `/analytics`, `/reports` (redirects + hidden nav);
"admin-like" check also treats usernames containing "admin" as admin (legacy quirk, dropped).

## 7. Data-migration mapping (old → new)

| Old | New |
|---|---|
| `users.username` | `users.name`; email synthesized as `{username}@hawan.local` (no emails exist in legacy data — users must be informed, or reset on first login if bcrypt hashes don't validate) |
| `users.password` | `users.password` (bcrypt hashes carried over; plaintext rows forced to reset) |
| `categories.category_name` | `categories.name` |
| `inventory` rows | one `medicines` row per distinct name (unit, default_price from latest batch) + one `batches` row per inventory row (batch_number, quantity, initial_quantity → initial_quantity, expiry_date, price_per_unit → medicines.default_price; unit_cost unknown in legacy → 0) |
| `sales` rows (per line) | grouped by (invoice_no, sale_date proximity, customer) → one `sales` header + N `sale_items`; blank invoice_no rows become single-line sales with generated invoice numbers |
| — | everything assigned to the single seed store |

Reconciliation targets: row counts per table, `SUM(inventory.quantity)`,
`SUM(inventory.quantity * price_per_unit)` vs new inventory value, `SUM(sales.total_price)` vs
`SUM(sale_items.total_price)` and `SUM(sales.total_amount)`.

### Running the migration commands on this machine (WAMP)

Keeping `extension=pgsql` / `extension=pdo_pgsql` permanently enabled in WAMP's
`php.ini` crashes the PHP built-in web server (access violation on every request),
so they stay disabled. Load them on demand only for the one-off legacy commands:

```powershell
php -d extension=pdo_pgsql -d extension=pgsql artisan legacy:migrate
php -d extension=pdo_pgsql -d extension=pgsql artisan legacy:reconcile
```

Configure `LEGACY_DATABASE_URL` (or the `LEGACY_PG*` variables) in `.env` first.

## 8. Legacy gaps deliberately fixed in the new system

- Public stock-in / category-create / register / inventory-read endpoints → all auth-gated.
- Client-generated invoice numbers → server-generated per-store sequence.
- Bulk-sell overwriting inventory metadata during a sale → dropped (sales don't mutate catalog).
- No stock movement audit trail → `stock_movements` table.
- Single tenant → store-scoped multi-tenancy with global scope.
- No FEFO → FEFO auto-selection with manual batch override.
