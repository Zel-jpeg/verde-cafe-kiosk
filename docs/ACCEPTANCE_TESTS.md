# Acceptance Tests and Evaluation Checklist

Use this file to rehearse and record the **actual** application evaluation. `Pending` is the starting state; change it only after checking the running app. Tests T01-T15 follow the instructor's sequence on exam pp. 7-8. C01-C26 mirrors every application Pass/Fail item on checklist p. 1. If your products or prices differ from the sample, compute equivalent expected totals using your real prices.

## Instructor transaction tests

| ID | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| T01 | Open the app; tap product cards. | App runs; at least six products have visible names and prices, large touch controls, and no typed product names. | **Pass:** local full stack showed eight priced, tappable cards. |
| T02 | Add sample Coffee × 2, Sandwich × 1, Soft Drink × 1. | Subtotals ₱90, ₱50, ₱35; total ₱175. | **Pass with seeded equivalents:** Barako Brew ×2 ₱90, Tuna Melt ₱135, Mango Cooler ₱85; total ₱310. |
| T03 | Increase sample Coffee from 2 to 3, then decrease to 2. | Coffee subtotal ₱135 and total ₱220, then original ₱175 restored; quantity never negative. | **Pass:** Barako ×3 subtotal ₱135, order total ₱355; decreased to ×2 and ₱310. |
| T04 | Remove Soft Drink from the ₱175 sample order. | It disappears and total becomes ₱140. | **Pass:** removed Mango Cooler; order total became ₱225. |
| T05 | Open Order Summary for the remaining order. | Coffee ₱90, Sandwich ₱50, total ₱140; quantities, unit prices, and subtotals match selection. | **Pass:** Barako ×2 ₱90 plus Tuna Melt ₱135; total ₱225. |
| T06 | Use Back from Order Summary. | Return to selection with the same editable order. | **Pass:** Back retained Barako ×2 and Tuna Melt ×1. |
| T07 | Continue to payment choices. | Large Cash, QR Payment, and Credit/Debit Card choices appear. | **Pass:** all three choices appeared in local browser. |
| T08 | For the ₱140 order, choose Cash and enter ₱100. | Clear insufficient-payment message; remain in payment; no success or receipt. | **Pass with seeded equivalent:** ₱100 against ₱225 showed ₱125 short and stayed on Cash. |
| T09 | For the same order, enter ₱200 and pay; also test exact ₱140 separately. | ₱60 change for ₱200; exact payment succeeds with ₱0 change. | **Pass with seeded equivalents:** ₱300 against ₱225 gave ₱75 change; exact ₱45 Barako sale gave ₱0 change. |
| T10 | Inspect successful Cash confirmation. | Amount, method, distinct reference, and View Receipt are visible. | **Pass:** Cash ₱225 confirmation showed VC-9BF03F6C315D466FA753C2F19D5D6F56 and View receipt. |
| T11 | Open Cash receipt. | Correct reference, items, quantities, unit prices or subtotals, ₱140 total, ₱200 paid, ₱60 change, Cash method. | **Pass with seeded equivalents:** Barako ×2 and Tuna Melt snapshots, total ₱225, paid ₱300, change ₱75, Cash. |
| T12 | Start a new order and complete QR simulation. | Amount, QR code/placeholder, scan instructions, and confirmation control appear; success and receipt say QR Payment; paid equals total and change is ₱0. | **Pass:** Chocolate Cookie ₱55; placeholder/instructions/confirmation, saved QR receipt ₱55 paid and ₱0 change. |
| T13 | Start another order and complete Card simulation. | Tap/insert/swipe instruction and processing state appear; success and receipt say Credit/Debit Card; paid equals total and change is ₱0. | **Pass:** Banana Loaf ₱75; processing state and Credit / Debit Card receipt, ₱75 paid and ₱0 change; no card fields. |
| T14 | Choose New Transaction from a receipt. | Item Selection returns; cart is empty, total is ₱0, and previous payment/receipt data is cleared. | **Pass:** after Cash and Card receipts, returned to eight-card catalog with empty order and ₱0 total. |
| T15 | Complete two different transactions. | Their references differ. | **Pass:** Cash, QR, Card and exact Cash receipts had distinct VC references. |

Also check blank, nonnumeric, negative, and below-total Cash inputs; no failed attempt may produce a successful transaction. These checks come from exam pp. 2-3 and 7. Inventory checks for the group's selected scope appear below.

## Application Pass/Fail checklist

Enter `Pass` or `Fail`, plus a screenshot, test run, or demonstration note. The initial `Pending` values are not passes.

| ID | Checklist requirement | Related test(s) | Status / evidence |
| --- | --- | --- | --- |
| C01 | Application successfully runs | T01 | **Pass:** local Vercel stack and live catalog. |
| C02 | Touchscreen-oriented UI is used | T01 | **Pass:** desktop and 390 px browser layouts inspected. |
| C03 | Large item buttons/cards are provided | T01 | **Pass:** whole product card is a tap target. |
| C04 | At least six products are available | T01 | **Pass:** eight seeded products visible. |
| C05 | Product prices are displayed | T01 | **Pass:** peso prices on each card. |
| C06 | Products can be selected by clicking/tapping | T01-T02 | **Pass:** Barako, Tuna and Mango added by card tap. |
| C07 | Quantity can be increased | T03 | **Pass:** Barako ×2 to ×3. |
| C08 | Quantity can be decreased | T03 | **Pass:** Barako ×3 to ×2. |
| C09 | An item can be removed | T04 | **Pass:** Mango removed. |
| C10 | Item subtotal is correct | T02-T05 | **Pass:** Barako ×2 = ₱90. |
| C11 | Total is calculated correctly | T02-T05 | **Pass:** ₱310, ₱355, ₱225 checked. |
| C12 | Order Summary is provided | T05 | **Pass:** reviewed remaining order. |
| C13 | User can go back and modify the order | T06 | **Pass:** cart retained on Back. |
| C14 | At least three payment methods are available | T07 | **Pass:** Cash, QR, Card shown. |
| C15 | Cash payment works | T09 | **Pass:** greater and exact Cash sales. |
| C16 | Insufficient Cash payment is rejected | T08 | **Pass:** ₱100 against ₱225 rejected. |
| C17 | Change is calculated correctly | T09 | **Pass:** ₱75 and ₱0 change. |
| C18 | QR payment can be simulated | T12 | **Pass:** QR simulation sale and receipt. |
| C19 | Card payment can be simulated | T13 | **Pass:** Card simulation sale and receipt. |
| C20 | Payment Successful screen is shown | T09-T10, T12-T13 | **Pass:** all three methods showed success. |
| C21 | A unique transaction reference is provided | T10, T15 | **Pass:** four UI transactions had distinct VC references. |
| C22 | View Receipt works | T11 | **Pass:** Cash and Card receipts opened. |
| C23 | Receipt contains correct transaction details | T11-T13 | **Pass:** item snapshots, total, paid, change checked. |
| C24 | Receipt displays the correct payment method | T11-T13 | **Pass:** Cash, QR, Credit / Debit Card checked. |
| C25 | New Transaction resets the application | T14 | **Pass:** cart empty and total ₱0. |
| C26 | Meaningful user feedback is provided | T01, T08-T10 | **Pass:** add, invalid Cash, processing, success messages. |

## Group-selected admin, stock, and image tests

These extend the instructor's 15 tests and 26 checklist rows; they are project requirements, not additional claims about the PDF checklist. Record Pass/Fail and evidence after testing the running app.

| ID | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| G01 | Visit `/` without signing in, then visit `/admin` without signing in. | Customer kiosk works; admin prompts for sign-in and shows no product controls. | **Pass:** both routes opened locally; `/admin` showed sign-in only. |
| G02 | Sign in as a non-admin or call an admin API without a valid admin token. | Admin read/write request is denied by the server; no product or image changes. | **Pass for unauthenticated request:** products GET and image POST returned 401; non-admin signed-in case remains unrun. |
| G03 | Sign in as an admin and add/edit/archive a product. | Valid name, positive price, nonnegative stock, and status save; the public catalog reflects changes after refresh; archived item cannot be purchased. | **Pending:** no Auth user or admin role existed during the run. |
| G04 | Set stock to one, try adding two, then buy the last unit. | Cart blocks or rejects quantity two; successful checkout reduces stock to zero; later attempts cannot buy it. | **Pass:** stock-one fixture rejected a second unit with “Only 1 available”; QR sale succeeded; fresh catalog showed Sold out and disabled card. Fixture was then archived. |
| G05 | Submit invalid or insufficient Cash for an in-stock order. | No completed transaction or stock deduction occurs. | **Pass:** blank, text, negative and ₱100/₱225 rejected in browser; rollback SQL verified failed payment leaves receipt/stock unchanged. |
| G06 | Send two concurrent checkouts for the same last unit and retry a successful request with its idempotency key. | At most one sale succeeds; stock never goes negative; retry does not create a second deduction or receipt. | **Pass:** `tests/live-race.mjs` against temporary stock-one fixture returned HTTP 200/409; same-key retry returned original VC receipt. Fixture ended archived at stock zero. |
| G07 | Upload one PNG and one JPEG from the admin form. | Both are converted locally before upload; stored objects and served files are WebP, at most 1 MiB, and customer cards show the images. | **Pending:** no admin account for UI upload; bucket settings verified as public, WebP-only, 1 MiB. |
| G08 | Try an unsupported/oversize file or a forged non-WebP upload to the admin endpoint. | Clear client validation and server rejection; no invalid Storage object or broken product image path. | **Pending:** server validation unit tests pass and unauthenticated image POST returned 401; authenticated upload cases unrun. |
| G09 | Change product name/price/image after a completed sale. | New catalog values appear, while the old receipt keeps its original item and amount snapshots. | **Pending:** rollback-only SQL reprice/rename proved snapshot stays Barako Brew at ₱45; admin UI and image replacement unrun. |
| G10 | Open deployed `/admin` directly and call `/api/products` on Vercel. | Admin route loads the React app and API remains a Function, with no SPA rewrite collision. | **Pending:** local Vercel dev returned HTML 200 for `/admin` and JSON 200 with eight products for `/api/products`; no deployment. |

## Run record

| Field | Actual value |
| --- | --- |
| Date / tester | October 6, 2026 / Codex local full-stack verification |
| App version or final commit SHA | Working tree, not committed; no final SHA |
| Device / viewport | Windows local Vercel server at 127.0.0.1:3000; desktop and 390 px browser checks |
| Product catalog used for arithmetic | Eight live seeded products; Barako ₱45, Tuna Melt ₱135, Mango Cooler ₱85 |
| Failed checks and fixes | Initial Vite env types and dependency audit findings fixed; no failed instructor case in final local run |
| Final retest result | Build, typecheck, 11 unit tests, 15 instructor cases, 26 checklist rows, G01/G04–G06 pass locally; G03/G07–G10 remain pending in whole or in part |

## Implementation verification run — October 6, 2026

The user provided ignored local Supabase environment values during this run. Both migrations and the eight-product seed were applied to that project. `supabase/tests/checkout_smoke.sql` completed inside its rollback transaction. Local Vercel Functions returned the live catalog and completed four browser transactions: two Cash, one simulated QR, and one simulated Card. Four references were distinct. A separate concurrent API race used a temporary stock-one item: one request succeeded, one received 409, and retrying the winner returned the same reference. The item was restocked to one for the browser stock-limit test, sold once, then archived at stock zero. A rollback-only catalog rename/reprice check confirmed an existing receipt item retained its original Barako name and ₱45 unit snapshot. Final project state: eight active products, seven completed test transactions, no Auth users or admin roles. No product had negative stock.

`npm test` passed 11 tests across four files, `npm run typecheck` and `npm run build` passed, and `npm audit --omit=dev` found zero production dependency vulnerabilities. The local browser run covered T01–T15 and C01–C26 with seeded equivalent prices. Blank, text, negative, and insufficient Cash were rejected. The remaining admin, PNG/JPEG upload, and deployed Vercel checks still require a privately created admin user or deployment. No actual deployment was performed. A Pass in this file refers to the local run and stated evidence only.

## Verde Coffee interface redesign smoke check — October 6, 2026

The 15 instructor cases and 26 checklist rows above were run before the visual redesign; they were not all rerun for this change. At desktop and 390 px widths, the sidebar navigated between `/` and `/admin`, categories filtered the menu, and the mobile drawer closed on Escape while returning focus to its trigger. A cart toast was visible after two seconds and absent after 4.5 seconds. Blank Cash and rejected admin sign-in displayed actionable dialogs, with no duplicate toast. An exact ₱45 Cash sale displayed a success dialog and opened a correct digital receipt. The configured project had ten completed transactions at the final read; the redesigned-flow sale is one of them. The admin archive confirmation and image-upload dialogs could not be exercised without an Auth admin user. Typecheck, 11 focused automated tests, and the production build passed after the redesign.

## Welcome, review editing, and receipt update — October 6, 2026

This is a focused follow-up check; T01–T15 and C01–C26 were not all rerun. The new welcome screen was visible before the menu with separate Dine In, Take Out, and Login as Admin choices. Dine In opened the menu. Barako Brew ₱45 plus Iced Latte ₱95 produced ₱140. In Review Order, increasing Barako to two produced a ₱90 line and ₱185 total; decreasing Iced Latte to zero removed it and produced a ₱90 total. The success screen and on-screen receipt showed Dine In. A live Cash payment of ₱100 saved a ₱90 sale and ₱10 change; a SQL read verified `transactions.order_type = 'dine_in'`, paid 10000 centavos, change 1000 centavos, and one saved item. The rollback-only checkout smoke SQL also passed with the new RPC signature and order-type assertion. The receipt showed its reference, date/time, order type, item, unit price, quantity, subtotal, zero discounts and additional tax, total, method, paid, and change. The Print Receipt button was exercised; the in-app browser did not expose native preview contents, so actual printed/PDF appearance remains a manual check. The same receipt component is used for screen and print-only markup and has an automated content test. At 390 px, Take Out reached the mobile menu, the sidebar expanded with navigation and categories, and a simulated QR checkout saved a ₱75 Banana Loaf receipt showing Take Out. Admin upload was not run without a private admin account.

`npm test` passed 13 tests in five files after this update. The new rollback-only SQL check also rejected reusing a checkout key with a changed order type. Supabase function privileges were checked: `anon` and `authenticated` cannot invoke checkout directly; `service_role` can. The project still has no private admin account, so admin image upload remains pending.

## Welcome, sidebar, imagery, and admin entry refinement — October 6, 2026

This was a focused UI regression check, not a rerun of T01–T15 or C01–C26. The source and served icon PNGs have transparent corner pixels (alpha 0), and the desktop and 390 px browser views showed a white full-page welcome screen with only the centered wordmark, no outer card, and clear Dine In, Take Out, and Login as Admin choices. The green sidebar showed a white wordmark with no opaque box; its Order Kiosk and Admin Studio links were absent. The four numbered progress steps were horizontally centered with their labels visible at both widths. Coffee and Food category selection filtered the matching products; selecting Food in the mobile drawer closed it and returned focus to its toggle. All eight seeded product photos loaded in the browser with descriptive alt text. The cart and Review Order showed item photos; adding Banana Loaf (₱75) and Barako Brew (₱45) produced ₱120, and increasing Barako on Review Order updated its line to ₱90 and the total to ₱165. Direct `/admin` navigation redirected to `/admin/login`, whose form rendered at desktop and 390 px. Clicking Login as Admin on the welcome page opened that route. A signed-in admin session and image-upload workflow were not exercised because no documented demo account is available.

`npm run typecheck` passed. `npm test` passed 13 tests in five files, including the receipt assertion updated for the transparent icon asset. `npm run build` passed. Browser payment and receipt completion were not rerun in this refinement; the related code paths were preserved and were previously checked as recorded above. Vercel deployment remains unrun.

## Documentation cleanup and order-type navigation — October 6, 2026

All eight project Markdown documents except `README.md` moved into `docs/`; local Markdown links resolved after the move. Three removed branding files were checked for byte-identical retained copies and no application references before deletion. The favicon link resolves to the retained transparent `public/branding/verde-logo-icon.png`. In the desktop browser, the Order type button appeared beside the centered four-step indicator. Barako Brew was added to a Dine In cart for ₱45; the button returned to the welcome screen, and choosing Take Out preserved the Barako item and ₱45 total. At 390 px, the button appeared above the still-centered steps without overlap. `npm run typecheck`, all 13 focused tests, and `npm run build` passed. Full payment completion, admin authentication, and the complete instructor checklist were not rerun for this cleanup and navigation update.
