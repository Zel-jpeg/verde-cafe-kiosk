# Verde Coffee Kiosk

Verde Coffee Kiosk is a self-service cafe ordering application with a separate staff area for managing the menu and inventory. Customers choose Dine In or Take Out, browse product cards, review their order, complete a payment simulation, and receive a printable receipt. Staff can create, edit, archive, restore, and restock products, upload product images, and review customer feedback.

The application uses React, TypeScript and Vite for the interface, Vercel Functions for the API, and Supabase for authentication, database records and image storage. Prices are stored and calculated as integer centavos. QR and card payments are simulations; this project does not process real payments.

## Main features

- Responsive customer menu with category navigation, product photos, stock availability and an editable cart.
- Dine In / Take Out ordering, cash amount and change validation, simulated QR/card checkout, and printable receipt snapshots.
- Optional customer ratings and comments after a completed checkout.
- Protected admin product cards with category and All / Active / Archived filters. Archived products stay available to staff and leave the customer menu.
- A scrollable, keyboard-accessible product editor with save/cancel actions, archive confirmation and unsaved-change warnings.
- A dedicated Add product page, also available from the admin sidebar. Image-upload retries reuse the product already created.
- Browser-decoded raster images converted to verified WebP before upload, with previews, progress and replacement controls.

## Run the application locally

Use Node.js 22.12 or newer and npm. Install dependencies:

```powershell
npm install
```

Create `.env.local` in the project root with the four values from your Supabase project:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
```

Both URLs must refer to the same project. The browser uses the publishable key for authentication. The secret key is used only by server functions and must not be assigned to a `VITE_` variable. Environment files are Git ignored.

Start the complete local application, including its API:

```powershell
npx --yes --package=vercel@62.2.0 vercel dev --local --listen 127.0.0.1:3000
```

If the running server has inherited an old environment value, stop it and explicitly load `.env.local`. On this Windows workspace the verified command is:

```powershell
node --env-file=.env.local "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" exec --yes --package=vercel@62.2.0 -- vercel dev --local --listen 127.0.0.1:3000
```

Open **http://localhost:3000**. `npm run dev` serves the Vite frontend only; it does not run the Vercel API functions. `npm run preview` also serves only the static build.

## Test the admin area

Open **http://localhost:3000/admin/login** and use this demonstration account on the configured test project:

| Field | Value |
| --- | --- |
| Email | `verdeadmin@gmail.com` |
| Password | `VerdeAdmin321` |

1. Sign in and open Products. Verify the card grid and category/status filters.
2. Open Add product from the sidebar. Fill in the product name, description, category, price in pesos, inventory stock and active/archived status. Create the product with or without an image.
3. Return to Products, click the new card and edit its details. Cancel should preserve the saved record; dismissing unsaved changes should ask for confirmation.
4. Archive the test product, find it with the Archived filter, then restore it using the active checkbox in its editor.
5. Select an image and wait for its converted preview and output size before saving. A failed upload after creation should offer a retry for the same product ID, without creating another product.
6. Move between Products and Add product. The catalog, feedback pages, filters and verified session are kept in memory. Returning to Products should reuse the loaded data.
7. Review customer feedback once the feedback migration below has been applied.

This account is documented for demonstration/testing. New Supabase projects need their own Auth user and an `admin` entry in `public.user_roles`. The application has no public admin registration, and the server verifies the user's session and role on every protected API request.

## Admin loading and freshness

Admin routes share one session and data provider. Catalog requests are deduplicated, product images and the first feedback page are preloaded, and loaded feedback pages are cached. Changing admin pages does not repeat initial authorization or discard the visible catalog. The cache is cleared on sign-out, account changes or rejected authorization, and is never persisted as admin data in local storage.

Successful product saves update the cached catalog immediately and refresh it in the background. While the admin area is visible, it also checks the protected APIs every **30 seconds**, on window focus, on returning to a visible tab and when the connection comes back online. These checks keep the existing interface visible and publish changed data without a page reload. Updates made outside this browser can therefore take up to 30 seconds to appear. Refresh failures keep previously loaded data visible and provide a retry action. A full browser refresh verifies access again.

## Database setup and customer feedback

For a new Supabase project, apply the SQL files in this order:

1. `supabase/migrations/20261006103623_kiosk_schema.sql`
2. `supabase/migrations/20261006110306_harden_schema.sql`
3. `supabase/migrations/20261006121937_receipt_order_type.sql`
4. `supabase/migrations/20261007000000_order_feedback.sql`
5. `supabase/seed.sql` to add the sample menu.

For an existing project, apply only migrations that have not already been applied. The order-feedback migration creates `public.order_feedback`, links one review to a completed transaction, enforces rating/comment bounds, and restricts access to server APIs. It does not change existing receipts or product records.

**If the admin feedback panel says it is not set up yet:** the configured database is missing the feedback table. Open Supabase Dashboard → SQL Editor, run the existing `20261007000000_order_feedback.sql` migration, and choose **Retry feedback loading**. Until this migration is applied, customer feedback cannot be stored or reviewed. The catalog and product-management pages continue to work.

## Image handling

The file picker accepts `image/*`, but only raster files the current browser can actually decode are supported. JPEG, PNG, WebP, GIF, BMP and AVIF were verified in Chrome 154. Other browsers can differ. SVG is rejected; files that cannot be decoded, including unsupported HEIC, HEIF or TIFF inputs, prompt export as JPEG or PNG. Animated images use their first frame.

- Maximum source size: **10 MiB**.
- Maximum converted dimension: **1200 pixels**, preserving aspect ratio and orientation without upscaling.
- Maximum WebP upload: **1 MiB**, lowering quality and dimensions as needed while preserving transparency.
- Supabase's `product-images` Storage bucket receives the WebP file. The database stores only its generated `image_path`.
- The previous image is removed only after replacement upload and database update succeed. Failed replacements retain it.

## Routes and project structure

| Route | Purpose |
| --- | --- |
| `/` | Customer kiosk |
| `/admin/login` | Staff sign-in |
| `/admin` | Product catalog and customer feedback |
| `/admin/products/new` | Create a product |

| Folder | Contents |
| --- | --- |
| `src/features/` | Customer ordering screens |
| `src/admin/` | Admin layout, shared session/data cache, catalog, forms and image uploader |
| `src/components/` | Shared shell, branding, receipt and feedback components |
| `src/lib/` | API calls, browser Auth and image conversion |
| `api/` and `server/` | Vercel endpoints, authorization and server helpers |
| `shared/` | Product/receipt types and integer-centavo calculations |
| `supabase/` | Database migrations, seed and SQL checks |
| `tests/` | Automated validation, API, cache, receipt and conversion checks |
| `public/` | Branding and default product photos |
| `docs/` | Requirements, acceptance records and supporting project notes |

## Checks and troubleshooting

```powershell
npm run typecheck
npm test
npm run build
```

If login reports **Invalid API key**, confirm that the served browser key belongs to the configured Supabase project, restart the full local server using the current `.env.local`, and hard-refresh with Ctrl + Shift + R. A valid password alone does not resolve a stale browser key.

If an API reports unavailable or returns HTML, use the full Vercel server at port 3000 rather than the frontend-only Vite/preview URL. If the account has no admin access, check its server-managed `user_roles` entry in the intended Supabase project.

For Vercel hosting, use the Vite project preset, build command `npm run build`, output directory `dist`, and all four environment variables. `vercel.json` includes direct-navigation rewrites for the admin routes; `/api/*` remains served by Functions. Database setup is separate from a Vercel deployment.
