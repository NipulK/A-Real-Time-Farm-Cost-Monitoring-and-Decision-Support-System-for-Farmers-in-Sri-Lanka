# Individual farmer dashboard refresh — 19 October 2026

Added app/independent-overview.tsx for the independent account category only: translated overview banner, active cultivation count, registered land count, cultivation/expense counts in the selected scope and shortcuts to existing expense, cultivation and land workflows. Current expense counts exclude voids. Expense creation is disabled without active cultivations. Restyled the individual workspace with the same rounded panels, statistic cards and green/lime palette used by the other dashboards. Narrow-phone financial cards use a single column for readable currency values. No ledger, calculation, role access or database schema changes.

All new application copy uses the existing English/Sinhala provider and dictionary. Farmer names, records, IDs, source price labels, data values and calculation formulas are preserved. Existing language selection and preference persistence remain unchanged. Existing navigation, profile editor, cultivation/land setup, funding, activities, expenses/receipts, harvests/sales/payments, historical prices, decisions and reports remain available.

## Verification
- 40 automated tests pass, including two new tests for translated overview controls, preserved farmer identity, scoped/void-excluded counts, active-cultivation gating and exclusion of organization accounts.
- TypeScript checks and production build pass.
- 44 isolated HTTP integration groups pass, covering existing independent registration, language persistence/role restrictions, financial workflows, profile/login changes and access protections.
- Browser: new land/cultivation shortcuts work; closed-season expense shortcut is disabled. Reopened only the disposable QA season using its existing plan form; the active expense shortcut opens the personal expense form with no organization-farmer attribution selector. Cancelled without recording an expense.
- English/Sinhala switching and reload persistence verified in both directions. Both 390px layouts stay at 390px page width. Sinhala overview and new buttons inspected visually.
- Visited all ten non-overview farmer navigation pages, inspected existing cultivation controls, opened/cancelled profile editing, and returned to overview. Browser console clean.
- Evidence: individual-dashboard-modern-en.png and individual-dashboard-modern-si.png use disposable test records. Real localhost:3000 records were unchanged.
