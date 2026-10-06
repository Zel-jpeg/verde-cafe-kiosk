# Acceptance Tests and Evaluation Checklist

Use this file to rehearse and record the **actual** application evaluation. `Pending` is the starting state; change it only after checking the running app. Tests T01-T15 follow the instructor's sequence on exam pp. 7-8. C01-C26 mirrors every application Pass/Fail item on checklist p. 1. If your products or prices differ from the sample, compute equivalent expected totals using your real prices.

## Instructor transaction tests

| ID | Action | Expected result | Result / evidence |
| --- | --- | --- | --- |
| T01 | Open the app; tap product cards. | App runs; at least six products have visible names and prices, large touch controls, and no typed product names. | Pending |
| T02 | Add sample Coffee × 2, Sandwich × 1, Soft Drink × 1. | Subtotals ₱90, ₱50, ₱35; total ₱175. | Pending |
| T03 | Increase sample Coffee from 2 to 3, then decrease to 2. | Coffee subtotal ₱135 and total ₱220, then original ₱175 restored; quantity never negative. | Pending |
| T04 | Remove Soft Drink from the ₱175 sample order. | It disappears and total becomes ₱140. | Pending |
| T05 | Open Order Summary for the remaining order. | Coffee ₱90, Sandwich ₱50, total ₱140; quantities, unit prices, and subtotals match selection. | Pending |
| T06 | Use Back from Order Summary. | Return to selection with the same editable order. | Pending |
| T07 | Continue to payment choices. | Large Cash, QR Payment, and Credit/Debit Card choices appear. | Pending |
| T08 | For the ₱140 order, choose Cash and enter ₱100. | Clear insufficient-payment message; remain in payment; no success or receipt. | Pending |
| T09 | For the same order, enter ₱200 and pay; also test exact ₱140 separately. | ₱60 change for ₱200; exact payment succeeds with ₱0 change. | Pending |
| T10 | Inspect successful Cash confirmation. | Amount, method, distinct reference, and View Receipt are visible. | Pending |
| T11 | Open Cash receipt. | Correct reference, items, quantities, unit prices or subtotals, ₱140 total, ₱200 paid, ₱60 change, Cash method. | Pending |
| T12 | Start a new order and complete QR simulation. | Amount, QR code/placeholder, scan instructions, and confirmation control appear; success and receipt say QR Payment; paid equals total and change is ₱0. | Pending |
| T13 | Start another order and complete Card simulation. | Tap/insert/swipe instruction and processing state appear; success and receipt say Credit/Debit Card; paid equals total and change is ₱0. | Pending |
| T14 | Choose New Transaction from a receipt. | Item Selection returns; cart is empty, total is ₱0, and previous payment/receipt data is cleared. | Pending |
| T15 | Complete two different transactions. | Their references differ. | Pending |

Also check blank, nonnumeric, negative, and below-total Cash inputs; no failed attempt may produce a successful transaction. If inventory is included, test its stock limit and verify rejected payments do not reduce stock. These checks come from exam pp. 2-3 and 7.

## Application Pass/Fail checklist

Enter `Pass` or `Fail`, plus a screenshot, test run, or demonstration note. The initial `Pending` values are not passes.

| ID | Checklist requirement | Related test(s) | Status / evidence |
| --- | --- | --- | --- |
| C01 | Application successfully runs | T01 | Pending |
| C02 | Touchscreen-oriented UI is used | T01 | Pending |
| C03 | Large item buttons/cards are provided | T01 | Pending |
| C04 | At least six products are available | T01 | Pending |
| C05 | Product prices are displayed | T01 | Pending |
| C06 | Products can be selected by clicking/tapping | T01-T02 | Pending |
| C07 | Quantity can be increased | T03 | Pending |
| C08 | Quantity can be decreased | T03 | Pending |
| C09 | An item can be removed | T04 | Pending |
| C10 | Item subtotal is correct | T02-T05 | Pending |
| C11 | Total is calculated correctly | T02-T05 | Pending |
| C12 | Order Summary is provided | T05 | Pending |
| C13 | User can go back and modify the order | T06 | Pending |
| C14 | At least three payment methods are available | T07 | Pending |
| C15 | Cash payment works | T09 | Pending |
| C16 | Insufficient Cash payment is rejected | T08 | Pending |
| C17 | Change is calculated correctly | T09 | Pending |
| C18 | QR payment can be simulated | T12 | Pending |
| C19 | Card payment can be simulated | T13 | Pending |
| C20 | Payment Successful screen is shown | T09-T10, T12-T13 | Pending |
| C21 | A unique transaction reference is provided | T10, T15 | Pending |
| C22 | View Receipt works | T11 | Pending |
| C23 | Receipt contains correct transaction details | T11-T13 | Pending |
| C24 | Receipt displays the correct payment method | T11-T13 | Pending |
| C25 | New Transaction resets the application | T14 | Pending |
| C26 | Meaningful user feedback is provided | T01, T08-T10 | Pending |

## Run record

| Field | Actual value |
| --- | --- |
| Date / tester | Pending |
| App version or final commit SHA | Pending |
| Device / viewport | Pending |
| Product catalog used for arithmetic | Pending |
| Failed checks and fixes | Pending |
| Final retest result | Pending |

