# Implementation Plan

Use this as a build guide, not as a claim that any feature is already complete. The practical exam permits different stacks and layouts. Record the actual choices in [README.md](../README.md).

## Selected stack for the Vercel-hosted exam demo

| Layer | Choice | Reason |
| --- | --- | --- |
| Language | TypeScript | Catches mismatched cart, payment, and receipt data while remaining browser-native after compilation. |
| Interface and routes | React and React Router | Keeps the customer checkout flow at `/` and a separate protected admin panel at `/admin`. |
| Build and local development | Vite with its `react-ts` template; npm | Produces a static site that Vercel can build and host. Use a supported Node.js version (22.12+ is one supported choice). |
| Styling | Custom CSS or CSS Modules; Tailwind only if the team finds it useful | Keeps the kiosk design specific to Verde Café without requiring another styling system. |
| Branding | Existing `branding/verde-cafe-logo.svg` and related assets | Reuse the project's Verde Café identity rather than making a new logo. |
| Small libraries | `lucide-react` for icons and Zod for API request validation | Improves touch-control clarity and rejects malformed input without a large UI framework. |
| Application state | React `useReducer` and pure calculation/validation functions | Keeps the seven-step flow, cart, payment, and reset logic in one place. |
| Product, stock, roles, and transaction data | Supabase Postgres | Stores the catalog, authorization roles, inventory, and completed receipt snapshots. |
| Admin sign-in and product images | Supabase Auth and Storage | Auth identifies admins; Storage holds WebP objects outside Postgres. |
| Backend | TypeScript Vercel Functions in the root `api/` directory | Uses the same language as React, deploys with the site, and holds the Supabase secret key server-side. |
| Client data access | `fetch` to same-origin `/api/*`; Supabase browser client for Auth | The browser uses a publishable key for sign-in but never receives the secret key or writes directly to privileged tables. |
| Payments | Cash validation plus simulated QR and Card controls | Real gateways and real payment credentials are outside the exam requirements. |
| Verification | Vitest for arithmetic/payment rules, plus the manual instructor tests in [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md) | Checks the calculations and the full touchscreen flow. |
| Hosting | Vercel frontend and API deployment from GitHub `main` | Builds on each merge; feature branches can get previews. |

Use TypeScript for both frontend and backend. PHP is not selected: on Vercel it needs a community runtime or a separate host, while Node.js/TypeScript functions are officially supported. Keep currency values in integer centavos. The server must reload product prices from Supabase, calculate the authoritative total, validate payment, and create a unique reference and transaction snapshot only after success. The browser may calculate a preview total, but must display the server's confirmed values on success and receipt. See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for file placement and request flow.

The Vite project should live at the repository root so Vercel can detect it. Expected commands are `npm install`, `npm run dev` for frontend-only work, `vercel dev` for local API integration, `npm run build`, and `npm test` once scripts exist. The production frontend build should output `dist`. Import the GitHub repository into Vercel after a successful local build and select `main` as the production branch. Configure an SPA fallback for direct `/admin` visits while preserving `/api` routes. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser, and `SUPABASE_URL` and `SUPABASE_SECRET_KEY` for the server, in ignored local env files and Vercel project settings. Never put a secret in a `VITE_` variable: Vite includes those values in client-side code.

Vercel's free Hobby plan is for non-commercial personal use. Supabase Free projects may pause after a period of low activity, so check and resume the database before the exam demonstration. This architecture remains a simulated-payment academic demo; a live commercial POS requires a separate production review.

References: [Vite getting started](https://vite.dev/guide/), [Vitest getting started](https://vitest.dev/guide/), [Vercel's Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite), [Vercel TypeScript Functions](https://vercel.com/docs/functions/runtimes/node-js), [Vercel local function development](https://vercel.com/docs/cli/dev), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), and [Vercel Hobby plan](https://vercel.com/docs/plans/hobby).

## Suggested minimum design

React manages the customer cart and checkout screens plus a separate admin panel. Supabase stores products, stock, admin roles, WebP image objects, and completed transactions. The backend is the authority for authorization, prices, totals, stock, payment validation, and saved receipt data. These additions are group-selected scope beyond the exam's minimum.

| Data | Minimum fields | Purpose |
| --- | --- | --- |
| Product | Stable ID, name, price in centavos, stock quantity, active flag, image path | Render at least six product cards and calculate totals. |
| Cart line | Product ID, quantity | Derive name, unit price, and subtotal from the selected product. |
| Checkout state | Current step, selected payment method, amount paid, validation message | Keep navigation and payment behavior predictable. |
| Completed transaction | Unique reference, completion date/time, snapshot of purchased lines, total, method, amount paid, change | Save in Supabase and drive both success and receipt so their values agree. |

Derived values should come from the cart: `line subtotal = price × quantity`, `total = sum(line subtotals)`, and, for successful Cash payment, `change = amount paid − total`. QR and Card simulations set `amount paid = total` and `change = 0`.

## State and navigation

```text
Item Selection -> Order Summary -> Payment Method
                    |                 |
                    +---- Back -------+ (preserve the order)
                                      |
                           Cash / QR / Card processing
                                      |
                              Payment Successful
                                      |
                                View Receipt
                                      |
                               New Transaction
                                      |
                                Item Selection
```

Cash validation failure stays in Cash processing. QR confirmation and Card processing only advance after their simulated completion action. The checkout API creates a completed transaction snapshot at that point. Use its returned data for success and receipt, rather than recalculating a possibly changed cart.

## Build sequence

1. **Setup:** scaffold React + TypeScript + Vite, React Router, and the root `api/` functions; document local commands and create a Supabase project.
2. **Database:** add migrations for products, stock, transactions, transaction items, admin roles, and Storage configuration; seed at least six products; secure table and bucket access.
3. **Selection:** load products through `/api/products`; render large product cards, images/placeholders, stock feedback, and an editable cart.
4. **Arithmetic and review:** derive preview subtotals and total; add the matching order review with Back and Continue.
5. **Payment choices:** show three touch-sized options and an amount due consistent with review.
6. **Checkout API and Cash:** validate requested quantities and current database prices/stock, reject invalid/insufficient Cash, calculate change, and atomically save successful transactions with stock deductions and idempotency.
7. **QR and Card:** implement the specified simulated controls, instructions, and Card processing state without handling real payment credentials.
8. **Completion and reset:** show the saved reference and receipt; return to an empty selection screen with prior customer data cleared.
9. **Admin and media:** add Supabase Auth login, server-checked admin role, product CRUD/archive and stock controls, browser PNG/JPEG-to-WebP conversion, validated upload to Storage, and customer image display. Follow [ADMIN_AND_MEDIA.md](ADMIN_AND_MEDIA.md).
10. **Verification and deployment:** run [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md), correct failures, build locally, and test customer, `/admin`, and `/api` routes on a Vercel preview.

These are work stages, not a request to create artificial commits. The actual commit history must reflect real development; see [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md).

## Decisions to record before coding

| Decision | Record the group's choice |
| --- | --- |
| Application type and stack | Selected: React + TypeScript + Vite, React Router, custom CSS, Vercel Functions, Supabase Auth/Postgres/Storage |
| Where products are defined | Supabase `products` table, created by migration and seed data |
| Whether completed transactions persist after reload | Yes, in Supabase; the current UI can still reset for a new customer |
| Transaction reference generation and uniqueness strategy | Backend-generated UUID/reference with a database unique constraint |
| Styling and React libraries | Custom CSS first; Tailwind and icons only if useful during implementation |
| Cash amount entry method and currency parsing | Pending |
| Quantity-one decrement behavior | Pending |
| Target kiosk dimensions and touch testing device | Pending |
| Group-selected enhancements | Admin panel, inventory, product images converted to WebP, Supabase persistence |

