# IT415 POS Kiosk Requirements

This is a working specification derived from the local `pdf/IT415_Practical_Exam.pdf` and `pdf/IT415-Acceptance-Checklist.docx.pdf`. If these notes conflict with either PDF, use the PDFs. The local `pdf/IT415-Sample-UI.pdf` provides examples, not a mandatory visual design. These PDFs are not needed for the application build.

## Scope and transaction flow

Build a touchscreen-oriented self-service POS kiosk for a small campus outlet. A customer must be able to tap products, change the order, review it, choose a payment method, complete a transaction, view a digital receipt, and start fresh. The required sequence is:

1. **Item Selection:** tap products and adjust quantities.
2. **Order / Payment Summary:** review the complete order and return to edit it.
3. **Payment Method:** choose Cash, QR Payment, or Credit/Debit Card.
4. **Payment Processing:** validate and complete the chosen payment.
5. **Payment Successful:** show confirmation and a transaction/reference number.
6. **Receipt:** show the completed transaction.
7. **New Transaction:** clear prior customer data and return to Item Selection.

Screens may be combined when this sequence and all behavior remain clear. See exam p. 1.

## Functional requirements

| ID | Requirement | Source |
| --- | --- | --- |
| FR-01 | The application starts and runs for the instructor. | Checklist p. 1 |
| FR-02 | Use a kiosk-like touch interface with large controls, readable text, clear labels, spacing, simple navigation, and minimal typing. | Exam pp. 1, 5 |
| FR-03 | Show at least six tappable products; each displays a name and price. Product names must not require typing. | Exam p. 2 |
| FR-04 | Tapping a product adds/selects it. The current cart visibly shows product name, unit price, quantity, and item subtotal. | Exam p. 2 |
| FR-05 | Provide controls to increase and decrease quantity and to remove an item. Quantity must never be negative. | Exam p. 2 |
| FR-06 | Recalculate each item subtotal as `unit price × quantity`, and total as the sum of subtotals, whenever the cart changes. | Exam p. 2 |
| FR-07 | Show an Order Summary before payment with all products, quantities, unit prices, subtotals, and total; it must match Item Selection. | Exam p. 2 |
| FR-08 | Back navigation from Order Summary preserves items and quantities for editing. | Exam p. 2 |
| FR-09 | Offer at least three large payment choices: Cash, QR Payment, and Credit/Debit Card. | Exam p. 3 |
| FR-10 | Cash shows amount due and amount-paid input and calculates `change = amount paid − total`. Accept exact payment with zero change. | Exam p. 3 |
| FR-11 | Reject Cash amounts below the total, blank or invalid amounts, and negative amounts. Remain in payment and show a clear reason; do not create a success screen or receipt. | Exam pp. 3, 7-8 |
| FR-12 | QR shows the amount, a QR code or clearly labelled placeholder, scan instructions, and a confirmation control. A simulation is acceptable. | Exam p. 3 |
| FR-13 | Card shows the amount, tap/insert/swipe instructions, a Process Payment control, and a short processing state. A simulation is acceptable. | Exam p. 3 |
| FR-14 | Payment amount and receipt total match the confirmed order. For QR and Card simulations, amount paid equals total and change is ₱0.00. | Exam p. 3 |
| FR-15 | After successful payment, show transaction amount, amount paid, payment method, unique transaction/reference number, and View Receipt. | Exam p. 4 |
| FR-16 | Every completed transaction gets a distinct reference; unrelated completed transactions must not share one. | Exam p. 4 |
| FR-17 | View Receipt opens a readable digital receipt with reference, date, purchased items, quantities, unit prices or subtotals, total, payment method, amount paid, and change. | Exam p. 4 |
| FR-18 | New Transaction from the receipt clears the cart, total, payment values, and previous receipt and returns to Item Selection. | Exam p. 4 |
| FR-19 | Give meaningful success and error feedback, including product addition, invalid quantity or payment, and completed transaction. | Exam p. 5 |

The acceptance checklist splits some of these into separate Pass/Fail rows. [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md) preserves all 26 application checks individually.

## Group-selected customer and admin requirements

The exam treats product management, images, inventory, and login as optional enhancements. The group has now selected them as part of **this project's implementation scope**. They add to, rather than replace, FR-01 through FR-19. [ADMIN_AND_MEDIA.md](ADMIN_AND_MEDIA.md) gives the detailed behavior and security rules.

| ID | Project requirement |
| --- | --- |
| FR-20 | Provide two user experiences: a public Customer kiosk that requires no login, and a protected Admin panel. |
| FR-21 | Admins sign in through Supabase Auth. Every admin API operation verifies the signed-in user and an admin role on the server; hiding the panel in React is not authorization. |
| FR-22 | The Admin panel can add, edit, and archive products and set each product's name, price, stock quantity, active status, and image. Preserve historical receipt data when a product changes. |
| FR-23 | Customer selection cannot exceed available stock. A successful checkout decreases stock exactly once; rejected or incomplete payments do not. Concurrent checkouts must not oversell the last unit. |
| FR-24 | Admin image input accepts PNG or JPEG. Before upload, resize/encode it to WebP; reject conversion failure, unsupported input, or an output above the configured limit with clear feedback. |
| FR-25 | Save WebP image files in a Supabase Storage `product-images` bucket. Store only the image's object path and related metadata in Postgres, not the image bytes. Public customer screens can display product images; only authorized admins can upload/replace them. |
| FR-26 | Changes to products, prices, stock, active status, and images appear in the customer catalog after refresh/reload. Out-of-stock or archived products cannot be purchased. |

## Product data and example arithmetic

At least six products are required. The following products and prices are **examples only**; other choices are allowed (exam p. 2).

| Example product | Unit price |
| --- | ---: |
| Coffee | ₱45.00 |
| Sandwich | ₱50.00 |
| Soft Drink | ₱35.00 |
| Cookies | ₱25.00 |
| Bottled Water | ₱20.00 |
| Chocolate | ₱25.00 |

The exam's sample order is Coffee × 2 = ₱90.00, Sandwich × 1 = ₱50.00, and Soft Drink × 1 = ₱35.00, for **₱175.00 total**. If the customer pays ₱200.00 Cash, change is **₱25.00**. These numbers are test fixtures only when the implementation uses those prices.

## Validation and transaction invariants

- A product's cart quantity is a whole number greater than zero; removing the item makes it absent from the cart. A decrease control may remove a one-quantity item or stop at one, provided removal is possible and no negative value appears.
- Do not allow payment completion for an empty order. This guard supports a coherent flow, although the PDF does not prescribe its exact message or control state.
- Calculate money reliably, preferably using integer centavos or a decimal type instead of binary floating-point arithmetic.
- A failed or incomplete payment must not create a completed transaction, receipt, or inventory deduction.
- The checkout API must reload current prices and stock from Supabase; browser-submitted prices or totals are never authoritative. Validate and save the transaction, its item snapshots, and stock changes atomically.
- Keep the confirmed order unchanged during payment and on the receipt. If edits are allowed after reaching payment, return to review and refresh the amount due before completing payment.
- Generate the transaction reference when completion succeeds, not for a rejected attempt. A timestamp, sequence, or random reference is allowed if completed transactions remain distinct.
- Reset all customer-specific cart, payment, success, and receipt state for the next transaction.

## UI reference map

The local sample UI PDF shows: product grid and cart (p. 1), order review (p. 2), payment choices (p. 3), Cash keypad (p. 4), success (p. 5), digital receipt (p. 6), insufficient Cash feedback (p. 7), QR simulation (p. 8), Card simulation (p. 9), and cleared new order (p. 10). It demonstrates large tap targets, a visible step indicator, totals, and concise feedback. Exact colors, layout, product artwork, keypad, quick Cash buttons, and print control are not mandated by the exam.

## Technology and optional scope

The exam allows web, desktop, PWA, mobile, or local kiosk applications and any suitable language, framework, UI library, architecture, and AI development tool (exam p. 1). Product data may be hard-coded, stored in JSON/local storage, or kept in a database; a database is **not mandatory** unless separately required by the instructor (exam p. 6). Explain the chosen approach in the final README.

The exam lists categories, images, search, inventory, transaction history, printing, discounts, login, reports, themes, full-screen mode, product management, persistence, and a real QR generator as optional examples. This group has selected images, inventory, admin login, product management, and Supabase persistence, as specified above. Other enhancements remain optional and must not replace the core kiosk behavior. Physical printing and real payment gateway integration remain optional (exam pp. 3-4); the project uses simulated QR and Card payments.

