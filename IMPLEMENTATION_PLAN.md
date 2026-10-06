# Implementation Plan

Use this as a build guide, not as a claim that any feature is already complete. The practical exam permits different stacks and layouts. Record the actual choices in [README.md](README.md).

## Suggested minimum design

A small local web app with product data in a file and transaction state in memory can satisfy the required flow without a database or payment gateway. A different stack is equally valid. Use one source of truth for cart quantities, totals, payment details, and the completed transaction.

| Data | Minimum fields | Purpose |
| --- | --- | --- |
| Product | Stable ID, name, price in centavos | Render at least six product cards and calculate totals. |
| Cart line | Product ID, quantity | Derive name, unit price, and subtotal from the selected product. |
| Checkout state | Current step, selected payment method, amount paid, validation message | Keep navigation and payment behavior predictable. |
| Completed transaction | Unique reference, completion date/time, snapshot of purchased lines, total, method, amount paid, change | Drive both success and receipt so their values agree. |

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

Cash validation failure stays in Cash processing. QR confirmation and Card processing only advance after their simulated completion action. Create a completed transaction snapshot at that point. Use its data for success and receipt, rather than recalculating a possibly changed cart.

## Build sequence

1. **Setup:** choose the stack, create a runnable app, add six or more products, and document the run command.
2. **Selection:** render large product cards and an editable cart with add, increment, decrement, and remove controls.
3. **Arithmetic and review:** derive subtotals and total; add the matching order review with Back and Continue.
4. **Payment choices:** show three touch-sized options and an amount due consistent with review.
5. **Cash:** validate amount input, handle exact and insufficient payment, calculate change, and show feedback.
6. **QR and Card:** implement the specified simulated controls, instructions, and Card processing state.
7. **Completion:** create a unique reference and transaction snapshot, then show success and receipt.
8. **Reset:** return to an empty selection screen with prior customer information cleared.
9. **Verification and polish:** run [ACCEPTANCE_TESTS.md](ACCEPTANCE_TESTS.md), correct failures, and verify the kiosk on the target screen size.

These are work stages, not a request to create artificial commits. The actual commit history must reflect real development; see [DEVELOPMENT_PROCESS.md](DEVELOPMENT_PROCESS.md).

## Decisions to record before coding

| Decision | Record the group's choice |
| --- | --- |
| Application type and stack | Pending |
| Where products are defined | Pending |
| Whether completed transactions persist after reload | Pending; persistence is not required by the exam |
| Transaction reference generation and uniqueness strategy | Pending |
| Cash amount entry method and currency parsing | Pending |
| Quantity-one decrement behavior | Pending |
| Target kiosk dimensions and touch testing device | Pending |
| Optional features, if any | Pending |

