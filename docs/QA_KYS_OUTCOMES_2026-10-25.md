# KYS outcome verification — 25 October 2026

## Scope and result

The requested Chrome pass was attempted with a dedicated Chrome session against the isolated localhost:3108 installation. Opening the site was denied by a saved browser permission or managed policy. No alternate browser, origin, raw protocol or indirect browser execution was used to bypass that denial. **No KYS outcome was verified through an actual Chrome interaction in this pass.**

A code review found the existing system calculated economic profit/loss but did not implement an explicit four-state Know Your Status classification. Added the missing domain classification and a scoped KYS panel to Overview, cultivation detail, Decision support and Reports. The snapshot and financial-summary CSV expose the same per-cultivation classification. Organization farmers retain their restricted own-expense-only response and do not receive financial KYS data.

Final verification: **57 automated tests passed; 51 HTTP integration groups passed; TypeScript checks and production build passed.** The four new HTTP groups compare SQLite-backed snapshots, rendered page status attributes and financial-summary exports. Tests use isolated temporary storage and synthetic records. The real application database was not changed. The successful final runner stopped its server and removed its temporary storage.

## Rules

- Require a live expense record, positive recorded saleable harvest and a live sale record for each cultivation before assigning Profit, Loss or Break-even.
- Missing evidence gives Insufficient information and identifies the expense, saleable-harvest or sale records needed. Empty records never imply break-even; missing expenses never imply profit.
- Economic cost includes cash and imputed expenses. Revenue is the sum of agreed sale quantity multiplied by price, rounded to cents per sale as in the existing ledger.
- Funding, customer payments, forecast yields and activity descriptions do not establish profit or replace missing sales. Voided records do not establish completeness or affect totals.
- Profit: revenue exceeds economic cost; Loss: revenue is below economic cost; Break-even: revenue equals economic cost in integer cents.
- Open cultivations explicitly show that the result is provisional. Closed cultivations state that results depend on recorded data. No outcome guarantees profitability or predicts market prices.
- Each cultivation is classified separately, including when names coincide. The overview profit/loss card withholds an overall classification amount if any selected cultivation lacks the required records.
- UI labels and explanations include Sinhala translations; saved record names remain unchanged.

## Database-backed cases

All figures below are LKR. The complete cases use cash cost 8,000 plus imputed cost 2,000, 110 kg total harvest, 100 kg saleable harvest and 10 kg loss. Additional investment funding of 100,000 must not alter the outcome.

| Case | Cost | Revenue | Financial result | Status | Verification |
| --- | ---: | ---: | ---: | --- | --- |
| Profit | 10,000 | 12,000 | 2,000 | profit | Snapshot, rendered HTML and CSV passed |
| Loss | 10,000 | 8,000 | -2,000 | loss | Snapshot, rendered HTML and CSV passed |
| Break-even | 10,000 | 10,000 | 0 | break_even | Snapshot, rendered HTML and CSV passed |
| Insufficient information | No expense/harvest/sale records | No sales | Withheld | insufficient_information | Snapshot, rendered HTML and CSV passed |

Unit cost in the complete cases is LKR 100/kg. Every new case is also checked in its initial empty state and after harvest but before the sale. Cross-organization summary exports do not reveal these independent-farmer cases.

Automated regressions additionally cover expense-only, missing-sales, missing-expense, zero-saleable-output, voided expenses/sales, replacement sales, payment/funding/activity separation, cent rounding and one-cent profit/loss boundaries. Rendered tests cover all labels/explanations, same-name cultivation isolation, Sinhala text, closed/open wording and absence of NaN/Infinity.

## Commands

```sh
npm test
npm run typecheck
npm run build
QA_PORT=3108 npm run qa:http
```

After refining only the rounding test inputs, npm test was rerun: all 57 passed. No product code changed after the successful typecheck/build/integration run.

## Remaining browser acceptance

Once the saved site-access denial is resolved, verify all four synthetic cases in Chrome: select the cultivation, inspect KYS label and supporting amounts, navigate between Overview/cultivation detail/Decision support/Reports, reload and confirm persistence. Add missing expenses/harvest/sales via forms and inspect status changes. Check void/replacement transitions, Sinhala, mobile appearance and actual summary CSV delivery. This browser work is not marked complete by the automated results above.

## Manual Chrome acceptance completed — 28–29 October 2026

The user operated Chrome on the isolated localhost:3108 installation. Screenshots supplied in chat confirmed Profit (revenue LKR 12,000, cost LKR 10,000, result LKR 2,000), Loss (8,000, 10,000, -2,000), Break-even (10,000, 10,000, 0), and Insufficient information with all three missing-record prompts. Complete open cases displayed provisional wording, 100 kg saleable harvest and LKR 100/kg. The incomplete case withheld the KYS result and cost/kg.

The Profit Reports & exports screenshots also matched funding LKR 100,000, cash costs 8,000, imputed costs 2,000, payments 0, receivables 12,000 and cash position 92,000. Uploaded Summary CSV files (7), (8), (9) and (10) were read and checked: all four statuses and expected totals matched; the incomplete row listed expenses, saleable_harvest and sales with blank cost/kg. Its raw profit total remains 0, distinguished from break-even by insufficient_information status. The Loss export neutralizes the leading minus with an apostrophe through existing CSV safety handling.

These are user-operated browser checks with screenshot/file review, not agent-controlled Chrome interaction or a general usability study. Ledger CSV and print-preview acceptance remain outside this completed four-outcome check.
