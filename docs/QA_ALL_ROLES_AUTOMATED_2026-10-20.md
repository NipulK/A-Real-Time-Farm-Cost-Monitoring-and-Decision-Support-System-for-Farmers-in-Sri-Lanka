# Five-role automated QA — 20 October 2026

## Result

Completed the automated and code-review pass for administrator, self-employed farmer, organization owner, supervisor and organization farmer. **41 automated tests and 47 isolated HTTP integration groups passed. TypeScript checks and the production build passed.** This is not a completed browser acceptance pass.

Commands executed after the final code change:

```sh
npm test
npm run typecheck
npm run build
QA_PORT=3108 npm run qa:http
```

The HTTP runner used a temporary SQLite installation and synthetic accounts. It exercised the production build, including a restart/persistence check. The real application database was not changed. The successful run stopped its temporary server and cleaned its temporary storage.

## Issues fixed

1. **Organization farmer cultivation count:** the dashboard tried to count cultivation IDs that the private expense response intentionally omits. It now receives a safe aggregate count. Regression checks distinguish different cultivations with equal names, exclude other farmers’ expenses and voided costs, and confirm private identifiers stay omitted.
2. **Approval revoked while a workspace is open:** refreshed restricted portal data could be rendered as a full workspace and fail. The workspace now reloads into the restricted portal when its response becomes restricted. Backend restricted data, page loading, denied exports and restored approval were verified; the live browser refresh transition remains pending.
3. **Unsupported export formats:** unknown export kinds fell through to ledger generation and malformed kinds could fail while constructing the download response. The endpoint now accepts only summary, ledger or audit and returns a controlled 400 response otherwise. All five roles were checked.
4. **Registered land editing:** the farm edit shortcut compared unrelated farm and land IDs and opened a legacy editor that rejects registered lands. The server now supplies a registered-land association flag, and the shortcut opens Land records with the existing translated “Edit land” label. The association and land ownership/area protections passed integration checks; clicking the shortcut remains a browser check.

## Automated role coverage

| Role | Verified through tests, HTTP requests and rendered HTML |
| --- | --- |
| Administrator | One-time setup, dedicated dashboard and summary access, organization approval/rejection/more-information/resubmission, member and organization deactivation, crop/reference-area policy, validation and audit exports, unauthorized role denial. |
| Self-employed farmer | Immediate registration, required sketch, multiple land records and conversions, mobile/email sign-in, stored Sinhala/English preference, own profile edits, duplicate/unsafe input rollback, expenses, funding, harvest, sales, payments, corrections, closure, unit cost and crop history rendering. |
| Organization owner | Pending restrictions, approval unlock, farmer/supervisor registration, assignments, organization totals and attributed expenses, land changes, cross-organization isolation, denial of administrator privileges. |
| Supervisor | Assigned cultivation access, valid farmer attribution, receipt access, expense corrections, harvest/sales/payment constraints, denial of funding/budget/account/policy/assignment management, immediate assignment revocation. |
| Organization farmer | Own expenses only, correct cultivation counts, void exclusions, own receipt/CSV access, empty CSV, password/session behavior, denial of writes and other farmers’ records. |

Shared checks cover protected routes, malformed/oversized requests, request origin, financial precision, stock and payment bounds, append-only audit history, persistence after restart, password hashing/session revocation/throttling, data separation, and role-specific rendered headings without password properties in snapshots.

Price/chart tests cover available and missing histories, excluded source observations, finite chart coordinates, single and flat observations, market/variant separation and English/Sinhala copy. They do not replace visual browser inspection.

## Browser checks still remaining

The full five-role browser retest remains unfinished. No new browser checks were performed in this pass because browser access had been blocked; the user requested this automated alternative.

- **Administrator:** click every menu and chart control; submit approval/rejection/more-information, activation, catalogue and area-policy forms; inspect validation, audit display and actual file downloads.
- **Self-employed farmer:** click through registration/login, land/sketch and cultivation forms, the corrected Edit land shortcut, expenses/receipts, funding, harvest, sales/payments, corrections, closure and profile edits. Check actual language switching and persistence in English/Sinhala, layout, cost-per-kg visibility and price chart interactions.
- **Organization owner:** exercise approval transitions, member registration and management, assignment forms, land/cultivation management, funding/reports and role-appropriate expense controls.
- **Supervisor:** use assigned-farmer selectors and expense/activity/receipt/harvest/sales/payment forms; verify removed assignments and approval revocation while the page is open.
- **Organization farmer:** inspect own-expense search/filters, corrected cultivation count, refresh, receipt and CSV downloads, and absence of editing or other farmers’ records.
- **All roles:** desktop/tablet/mobile layout, keyboard/focus, dialog open/cancel/submit behavior, inline errors, loading and stale-session transitions, chart visuals/tooltips, print/export delivery and actual upload controls. Password change/reset browser submission requires user handoff; backend checks passed.

No claim is made that every browser button, visual state or form interaction has passed. These are the remaining acceptance checks before marking the complete browser QA task finished.
