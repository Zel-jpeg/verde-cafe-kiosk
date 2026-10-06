# Verde Coffee Kiosk

A touchscreen self-service POS for the IT415 practical exam. The public customer kiosk is at `/`; staff sign in on the dedicated `/admin/login` page before opening the protected menu and inventory panel at `/admin`. QR and card payments are **simulations**. Do not enter or collect real card or e-wallet credentials.

## Stack and project layout

- React 19, TypeScript, Vite, React Router, custom CSS
- TypeScript Vercel Functions in `api/`; privileged helpers in `server/`
- Supabase Auth for admin sign-in, Postgres for products/stock/receipt snapshots, Storage for WebP images
- Shared integer-centavo functions and API types in `shared/`
- SQL migration and seed in `supabase/`; focused Vitest checks in `tests/`

The browser uses the Supabase publishable key for Auth only. It calls same-origin `/api/*` for catalog, checkout, and admin operations. Server functions hold the secret key. Admin API calls validate the access token with Supabase Auth and query the server-managed `user_roles` table. Checkout invokes one Postgres function that locks stock rows, reads current prices, saves immutable item snapshots, and deducts stock atomically. Its idempotency key returns the original receipt for an identical retry. Product images live in the `product-images` Storage bucket; product rows contain only paths.

## Requirements and local setup

Use Node.js 22.12+ and npm. The following commands were run successfully for this source in the working environment: `npm install`, `npm test`, and `npm run build` (see verification notes below). The default `npm run dev` serves only the Vite frontend; full checkout and admin API calls need `vercel dev` or deployment on Vercel.

1. Create a Supabase project. In the SQL Editor, run `supabase/migrations/20261006103623_kiosk_schema.sql`, `supabase/migrations/20261006110306_harden_schema.sql`, then `supabase/migrations/20261006121937_receipt_order_type.sql`, in that order, followed by `supabase/seed.sql`. The migrations create inventory and receipt tables, the atomic checkout function, hardened RLS/grants, a public-read WebP-only Storage bucket, and the saved Dine In / Take Out order type. The seed adds eight demo products and is safe to rerun. These migrations and seed were applied to the configured project.
2. In Supabase Auth settings, disable public signups for this project. Create the first admin account privately from **Authentication → Users** (or send a private invitation). Copy that user's Auth UUID. In the SQL Editor, assign the role with:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('THE_AUTH_USER_UUID', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```

   Do this in the dashboard or another trusted server context. The kiosk has no public admin registration. Do not put roles in user metadata.
3. Copy `.env.example` to `.env.local` and replace every placeholder. These four variables are required:

   | Variable | Used by | Value |
   | --- | --- | --- |
   | `VITE_SUPABASE_URL` | Browser Auth | Supabase project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser Auth | Publishable key (`sb_publishable_…`) |
   | `SUPABASE_URL` | Vercel Functions | Same project URL |
   | `SUPABASE_SECRET_KEY` | Vercel Functions | Secret key (`sb_secret_…`), server only |

   `.env`, `.env.local`, `.env.*` are Git ignored except `.env.example`. Never set the secret key in a `VITE_` variable. Configure these same four variables in Vercel project settings. During verification, the user supplied values in ignored `.env`; they were copied to ignored `.env.local` for local development. The committed `.env.example` contains placeholders only. No real key appears in source or Git.
4. Install packages with `npm install`. For the complete local app, install/use the Vercel CLI and run `npx vercel dev --local` from the repository root, then open its reported local URL (normally `http://localhost:3000`). The `--local` option runs without first linking a Vercel project. In this Windows workspace the verified command was `node --env-file=.env.local 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' exec --yes --package=vercel@62.2.0 -- vercel dev --local --listen 127.0.0.1:3000`. Confirm `/api/products`, `/`, and `/admin/login` from that URL. `npm run dev` at Vite's local URL is useful for frontend styling but does not start the Functions.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite frontend development server |
| `npx vercel dev --local` | Frontend plus local Vercel Functions without a project link |
| `npm run build` | Type check and production Vite build into `dist/` |
| `npm run preview` | Preview the static production build |
| `npm test` | Focused Vitest suite |
| `npm run typecheck` | TypeScript project checks |

## Customer and admin use

Customers first choose Dine In or Take Out on the welcome screen; Login as Admin is a separate link below these choices. They then choose menu cards, adjust or remove cart lines on the menu and Review Order page, and select Cash, QR Payment, or Credit / Debit Card. Cash accepts a nonnegative peso amount with up to two decimals and requires at least the server's current total. QR and card are clearly labelled simulations. A successful checkout returns the saved reference, order type, payment values, and digital receipt. Print Receipt on the success or receipt screen calls the browser print flow. The print stylesheet isolates the receipt at a narrow paper width; select a receipt printer or PDF destination in the browser. New Transaction clears customer state and returns to the welcome choices. A refresh loads current catalog and stock after choosing an order type.

Before completing payment, the Order type button beside the progress indicator returns to the Dine In / Take Out choices while preserving the cart. After payment, use New Transaction to start over. The browser tab uses the transparent Verde icon as its favicon.

The welcome page uses only the supplied transparent wordmark on white. The green sidebar renders that wordmark in white with its transparency intact and has category-specific Lucide icons that filter and scroll to menu items. The supplied icon file `branding/verde-logo-icon.png` and its served copy `public/branding/verde-logo-icon.png` now have genuine transparent backgrounds (alpha 0 at their corners). The mascot remains in the menu hero, away from the sidebar. On smaller screens, the menu button opens a keyboard-accessible drawer. Cart updates use four-second dismissible toasts. Cash validation, payment results, sign-in errors, product save results, image errors, and archive confirmation use dialogs with explicit actions. The eight seeded items use distinct optimized local photos in `public/products/` until an admin uploads a replacement, and their names map to descriptive alt text. Catalog images also appear in the cart, review, and admin list.

Admins sign in at `/admin/login` with a privately created account and admin role. Direct `/admin` visits without a verified role redirect there. No demo username or password is stored in the project. To create a local admin, follow step 2 above; to reset an existing account, use Supabase Dashboard Authentication → Users to send a recovery or change its password privately. They can add, edit, archive, and restock products. The image picker accepts PNG/JPEG up to 10 MiB, decodes and resizes without upscaling to at most 1200 px, and encodes WebP near quality 0.82, lowering quality or dimensions as needed to reach 1 MiB. It previews the converted result. The server checks role, MIME, RIFF/WEBP signature, size, and generated path before upload. It updates the product only after upload; if the row update fails, it removes the new object. Old images are removed after the replacement is saved. If old-object cleanup fails, the product still points to a working new image and the server logs the orphan path.

## Vercel deployment

Import this repository into Vercel as a Vite project, with root directory `/`, build command `npm run build`, and output directory `dist`. Add all four environment variables to the relevant Vercel environments. `vercel.json` rewrites direct `/admin` and `/admin/login` navigation to the SPA HTML; `/api/*` remains handled by Functions. Apply the Supabase migration and seed first, create the admin user/role, then test a Vercel preview at `/`, `/admin/login`, `/admin`, and `/api/products` before an exam demo. No deployment or push was performed by this implementation.

## Verification status

The source build, typecheck, and 13 focused automated tests pass. Those tests cover integer-centavo arithmetic/parsing, checkout request validation and RPC/error wiring, token/role authorization logic, server WebP checks, and saved receipt markup. `npm audit --omit=dev` reported zero production dependency vulnerabilities. The rollback-only `supabase/tests/checkout_smoke.sql` passed in the configured project, verifying saved Cash values, idempotent retry, rejected insufficient Cash, and rejected unavailable stock. `tests/live-race.mjs` exercised two simultaneous clients against a temporary stock-one product: one sale succeeded, one conflicted, and the successful key returned the original receipt on retry. The product remains archived at stock zero after verification. To repeat this race test, create an active temporary product with stock one and run `node tests/live-race.mjs PRODUCT_UUID PRICE_CENTAVOS` while the local Vercel server is running. The local full-stack browser run passed all 15 instructor cases and 26 checklist rows with equivalent seeded prices. See [ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md) for row-level evidence and remaining group cases. The configured project had ten completed transactions at the final redesign check; some are test sales. Admin CRUD and PNG/JPEG upload need a privately created Auth admin user; Vercel deployment remains unrun.

The later Verde Coffee interface redesign was smoke-tested in the local browser at desktop and 390 px widths. The sidebar switched between `/` and `/admin`, category selection filtered products, the mobile drawer closed with Escape and returned focus to its trigger, a cart toast remained visible at two seconds and disappeared by 4.5 seconds, Cash validation and failed sign-in used dialogs, and a successful exact-Cash dialog opened the saved receipt without a duplicate toast. Admin archive and image-upload dialogs remain unverified with a real admin session because the project still has no Auth user or admin role. The full 15/26 acceptance rehearsal above predates this visual redesign and was not repeated in full.

The welcome, order editing, and receipt update was checked separately on October 6. At desktop width, Dine In led to the menu; Barako ₱45 plus Iced Latte ₱95 totaled ₱140; increasing Barako to two updated the total to ₱185; decrementing Iced Latte to zero removed it and changed the total to ₱90. A live Cash checkout for ₱100 saved a Dine In transaction with ₱10 change, confirmed by a SQL read of the saved row. At 390 px, Take Out led to the menu, and a simulated QR sale produced a Take Out receipt for Banana Loaf at ₱75. The on-screen receipts showed reference, date/time, order type, item snapshots, subtotal, zero discounts and additional tax, total, method, paid amount, and Cash change. The same `ReceiptPaper` component is mounted inside the print-only container and is covered by a markup test. The Print Receipt button was clicked, but the in-app browser's native print preview did not expose its contents to automation, so physical/PDF print appearance remains a manual check. The collapsible mobile sidebar was inspected. Admin image uploads remain unverified without a private admin account.

## Latest UI verification

The October 6 welcome/sidebar/image refinement passed `npm run typecheck`, 13 Vitest tests, and `npm run build`. Browser checks at desktop and 390 px confirmed the full-white welcome page, dedicated admin login and direct-route redirect, white transparent sidebar wordmark, centered four-step progress, category filtering, and eight loaded photos with descriptive alt text. A two-item cart and Review Order quantity change updated ₱120 to ₱165. See the latest section of [ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md) for the exact scope. No admin account credentials are documented, so authenticated admin CRUD and image upload remain to be verified with a privately created admin.

## Project references

Supporting Markdown is organized under `docs/`; `README.md` stays at the repository root.

- [REQUIREMENTS.md](docs/REQUIREMENTS.md): exam flow and functional requirements
- [ADMIN_AND_MEDIA.md](docs/ADMIN_AND_MEDIA.md): selected admin, stock, and image scope
- [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md): architecture guide
- [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md): sequence and design notes
- [ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md): real run record and remaining live checks
- Local exam PDFs are reference files under ignored `pdf/`. The sample UI PDF and five adjacent images informed the layout; they are not shipped as app assets.
- [DEVELOPMENT_PROCESS.md](docs/DEVELOPMENT_PROCESS.md) and [AI_USAGE_LOG.md](docs/AI_USAGE_LOG.md) remain evidence templates and should record only actual group work.
- [IMPLEMENTATION_PROMPT.md](docs/IMPLEMENTATION_PROMPT.md): archived build prompt for reference.
