# Verde Café Kiosk: Architecture and File Structure

This is the agreed implementation target, not a claim that these files already exist. [REQUIREMENTS.md](REQUIREMENTS.md) distinguishes exam requirements from the group's additional admin, inventory, and image scope.

## Stack and routes

- **Frontend:** React, TypeScript, and Vite. Use custom CSS or CSS Modules; Tailwind is optional. React Router serves the public customer kiosk at `/` and the protected admin experience at `/admin`.
- **Backend:** TypeScript Vercel Functions under root `api/`. Keep privileged helpers under `server/`. PHP/Laravel is not selected for this Vercel deployment.
- **Data:** Supabase Postgres stores products, stock, roles, transactions, and receipt item snapshots. Supabase Storage stores product WebP files; Postgres stores their object paths. Supabase Auth signs in admins.
- **Client access:** The browser uses a Supabase publishable key for Auth only, and same-origin `/api` routes for product, checkout, admin, and upload operations. The Supabase secret key remains server-side.
- **Validation and tests:** Zod for API input, integer-centavo money, Vitest for business rules, and manual checks in [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md). `lucide-react` may supply icons.

## Target repository layout

```text
verde-cafe-kiosk/
├─ api/
│  ├─ products.ts                 # GET active customer catalog
│  ├─ checkout.ts                 # POST authoritative, atomic checkout
│  └─ admin/
│     ├─ products.ts             # admin list/create/update/archive
│     └─ images.ts               # admin WebP upload/replace
├─ server/
│  ├─ supabase.ts                 # server-only secret-key client
│  ├─ adminAuth.ts                # access token and role verification
│  ├─ checkout.ts                 # validation and atomic DB operation
│  └─ imageValidation.ts          # MIME, signature, and size checks
├─ public/
│  └─ branding/                   # approved deployable logo assets
├─ shared/
│  ├─ types.ts                    # browser-safe API and product types
│  └─ money.ts                    # integer-centavo calculations
├─ src/
│  ├─ app/
│  │  ├─ App.tsx                  # customer/admin route definitions
│  │  └─ kioskReducer.ts         # customer cart, steps, and reset
│  ├─ admin/
│  │  ├─ LoginPage.tsx
│  │  ├─ ProductsPage.tsx
│  │  ├─ ProductForm.tsx
│  │  └─ ImageField.tsx
│  ├─ components/                 # shared touch controls
│  ├─ features/
│  │  ├─ catalog/
│  │  ├─ cart/
│  │  ├─ review/
│  │  ├─ payment/
│  │  └─ receipt/
│  ├─ lib/
│  │  ├─ api.ts                   # typed same-origin requests
│  │  ├─ supabaseAuth.ts          # browser Auth client, public key
│  │  └─ convertToWebp.ts         # PNG/JPEG to bounded WebP Blob
│  ├─ styles/
│  │  ├─ tokens.css
│  │  └─ global.css
│  └─ main.tsx
├─ supabase/
│  ├─ migrations/
│  │  ├─ 0001_kiosk.sql           # products and transaction schema
│  │  └─ 0002_admin_media.sql     # roles, storage, and permissions
│  └─ seed.sql                    # six or more demonstration products
├─ tests/                         # money, checkout, auth/media rules
├─ branding/                      # existing source logo assets
├─ .env.example                   # variable names only
├─ .gitignore
├─ vercel.json                     # SPA fallback preserving /api
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
└─ docs/
   ├─ REQUIREMENTS.md
   ├─ ADMIN_AND_MEDIA.md
   ├─ IMPLEMENTATION_PLAN.md
   ├─ IMPLEMENTATION_PROMPT.md
   ├─ PROJECT_STRUCTURE.md
   ├─ ACCEPTANCE_TESTS.md
   ├─ DEVELOPMENT_PROCESS.md
   └─ AI_USAGE_LOG.md
```

Use `shared/` only for browser-safe types and pure functions. `server/` must never be imported into `src/`. The existing `branding/` assets remain source files; copy chosen assets to `public/branding/` when building the frontend. Route file names may be adjusted to Vercel's supported routing conventions during implementation.

## Customer and admin request flow

1. React calls `GET /api/products`. The server returns active products with current price, stock state, and a display URL derived from the saved Storage path. No secret key is sent to the browser.
2. The customer edits a cart. React calculates a preview in integer centavos and preserves it on Back; it prevents selecting more than displayed stock.
3. React posts product IDs, quantities, simulated payment method, Cash amount when needed, and an idempotency key to `/api/checkout`.
4. The server validates input, reloads prices and stock, rejects empty or invalid orders and insufficient Cash, then atomically saves the transaction and item snapshots and decrements stock. Concurrent sales cannot oversell; retries cannot deduct stock twice.
5. The server returns the saved reference, timestamp, items, total, paid amount, change, and method. Success and receipt render these saved values; New Transaction clears customer state.
6. An admin signs in with Supabase Auth. Each admin request sends an access token. The server verifies the token and an admin role from server-managed data before any product or image mutation.
7. For an image, the browser accepts PNG/JPEG, converts it to a bounded WebP Blob, and submits only that Blob. The server verifies WebP content and writes it to Storage; the product stores its object path after successful upload.

Do not trust browser-submitted prices, totals, role claims, filenames, or MIME labels. Never collect real card details or live e-wallet credentials for simulated payment.

## Supabase resources

| Resource | Important columns or policy | Purpose |
| --- | --- | --- |
| `products` | `id`, `name`, `price_centavos`, `stock_quantity`, `image_path`, `category`, `active`, timestamps | Current catalog and stock. |
| `transactions` | `id`, unique `reference`, unique idempotency key, method, total/paid/change centavos, `created_at` | Completed payment record. |
| `transaction_items` | Transaction/product IDs, name and price snapshots, quantity, subtotal | Historical receipts remain correct after edits. |
| `user_roles` | Auth user ID and admin role, server-managed | Admin authorization source. |
| Storage `product-images` | Public read; WebP-only and 1 MiB object limit; admin-only write via server | Product artwork. |

Enforce positive prices, nonnegative stock, valid quantities, and nonnegative totals/change at the database layer. Enable RLS and appropriate grants. Use a Postgres function/transaction with row locking or conditional stock updates for all-or-nothing checkout, including idempotency behavior. Do not make a product update and stock deduction as separate best-effort API calls.

## Environment and deployment

Client variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Server variables: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. Put actual values in ignored local env files and Vercel project settings; `.env.example` contains placeholders only. No `VITE_` variable may contain a secret. Restrict the secret-key client to server code and verify admin roles before privileged actions.

Vercel builds Vite to `dist` and serves `/api` functions from this repository. Configure the SPA fallback so direct `/admin` visits load the app while `/api/*` remains routed to Functions. Validate this on a Vercel preview. Run `npm run build`, automated tests, and the manual acceptance plan before the instructor demo. Supabase Free may pause after inactivity, so check project availability before demonstration.

References: [Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite), [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [Vercel TypeScript Functions](https://vercel.com/docs/functions/runtimes/node-js), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase Auth](https://supabase.com/docs/guides/auth), [Supabase Storage](https://supabase.com/docs/guides/storage/quickstart), and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
