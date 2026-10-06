# Customer, Admin, Inventory, and Product Images

This document records group-selected scope beyond the exam minimum. It complements [REQUIREMENTS.md](REQUIREMENTS.md) and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md). The roles are **customer** and **admin**; this does not mean there are only two individual accounts.

## Roles and screens

| Role | Access | Main actions |
| --- | --- | --- |
| Customer | Public kiosk; no sign-in | View active products and images, add quantities within stock, review, complete simulated payment, view receipt, reset. |
| Admin | Supabase Auth sign-in plus server-verified admin role | View product list, create/edit/archive products, set price and stock, upload/replace product images, sign out. |

Use `/` for the customer kiosk and `/admin` for the admin panel. React route protection improves navigation, but every `/api/admin/*` endpoint must independently verify the Supabase access token and look up the user's admin role. Create admin accounts by invitation or through the Supabase dashboard; do not expose public admin self-registration. Keep the role in a server-managed `user_roles` table or another non-user-editable authorization source, never in client-editable user metadata. Admin sessions must expire/sign out correctly, and failed access returns an authorization error.

## Product management and stock

Admin fields: product name, price in PHP/centavos, nonnegative integer `stock_quantity`, active/archived state, optional category/description, and optional product image. The panel must show validation and save results. A product with historical transactions should be archived (made inactive) rather than hard-deleted so old receipts remain understandable.

The customer catalog shows active items with their current stock state. Disable or reject selection beyond available stock and show clear feedback. Cart quantity is the customer's selected amount; `stock_quantity` is the admin-managed inventory count. They are different values.

Checkout must fetch current product rows from the database, recheck stock, and compute totals from server-stored integer-centavo prices. On a successful Cash, QR, or Card simulation, an atomic database operation saves the transaction and item snapshots and reduces stock once. Invalid payment, insufficient Cash, failed database write, or a concurrent sale of the last unit must leave stock unchanged and must not produce a success receipt. A request/idempotency key should prevent duplicate stock deductions if the client retries a completed checkout.

## Image pipeline

**Store the file in Supabase Storage, not as a binary column in Postgres.** Supabase recommends file storage outside the database for media; the `products` row stores `image_path` (and optional width/height metadata). Use a public-read `product-images` bucket so kiosk cards can display images. Upload, replacement, and deletion must pass through admin-authorized server endpoints. Configure the bucket to allow only `image/webp` and a maximum object size of **1 MiB**; verify access rules and bucket configuration during setup.

1. The Admin form accepts a local `image/png` or `image/jpeg` file. Reject other formats, unreadable files, and an input over **10 MiB** before conversion.
2. Decode the file in the browser, preserve its orientation, and scale proportionally so the longest side is at most **1200 px**. Do not upscale a smaller image.
3. Draw it to a canvas and export with `canvas.toBlob(..., 'image/webp', 0.82)`. If needed, lower quality or dimensions to meet the output limit. Check that the resulting Blob exists, has `type === 'image/webp'`, and is at most **1 MiB**. Browsers may fall back to PNG when a requested format is unavailable, so never assume the call produced WebP.
4. Preview the converted WebP and its size. Upload **only** this WebP Blob through an authenticated admin API request using a generated `.webp` object path and `contentType: 'image/webp'`.
5. The server rechecks the admin role, byte size, MIME type, WebP file signature, and safe object path before uploading to Supabase Storage. Do not rely only on a filename or browser-side checks.
6. Save the returned object path to the product row only after the upload succeeds. On replacement, update the product first, then remove the old unreferenced object; handle partial failures without leaving a broken image path.

Image conversion and its limits are project design choices, not exam-mandated numbers. If conversion cannot produce a valid WebP, stop the save and show a useful error. A product may use a placeholder when no image is provided.

## Supabase data and access plan

| Resource | Needed fields / rule |
| --- | --- |
| `products` | `id`, `name`, `price_centavos`, `stock_quantity`, `image_path`, `category`, `active`, timestamps; price and stock constraints. |
| `transactions` | Unique reference, payment method, total/paid/change centavos, created time, optional idempotency key. |
| `transaction_items` | Transaction ID and snapshots of product name, quantity, unit price, and subtotal. |
| `user_roles` | Supabase Auth user ID and `admin` role, writable only by trusted server/setup operations. |
| Storage bucket `product-images` | Public read for product cards; `image/webp` and 1 MiB object limit; admin-only writes through the server. |

Enable RLS and use least-privilege grants on exposed tables. The customer reaches data through public read/checkout API routes, not by receiving a database secret. The admin browser uses the Supabase URL and **publishable** key for Auth; these are public values. The **secret** key exists only in server environment variables and may bypass RLS, so server code must enforce the admin check before privileged reads or writes. Never put the secret key in a `VITE_` variable or commit it to Git.

## Sources for implementation

- [Supabase Storage quickstart](https://supabase.com/docs/guides/storage/quickstart) recommends storing media files outside the database.
- [Supabase buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) describes public reads and bucket MIME/size limits; [Storage access control](https://supabase.com/docs/guides/storage/security/access-control) covers write rules.
- [Supabase Auth](https://supabase.com/docs/guides/auth), [RBAC](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac), and [API keys](https://supabase.com/docs/guides/getting-started/api-keys) cover sign-in, authorization, and server secrets.
- [Canvas `toBlob`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) documents WebP encoding and fallback behavior.

