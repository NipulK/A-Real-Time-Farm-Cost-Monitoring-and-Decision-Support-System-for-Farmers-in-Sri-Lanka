# Five-role regression results

Date: 1 November 2026, Asia/Colombo.

Fresh verification: 70 automated unit/render tests passed; 53 isolated SQLite-backed HTTP integration groups passed; TypeScript checks passed. Existing production build from the current source passed in the preceding implementation run; no application code changed in this verification pass. Fresh logins, authenticated snapshots and rendered dashboard HTTP requests passed for five saved demo accounts after restarting the local servers.

| Role | Verified coverage | Result |
| --- | --- | --- |
| Administrator | Organization approval/rejection/more-information, resubmission rules, account deactivation, cultivation validation, crop/reference policy, admin summary restrictions and audit export. | Passed within automated scope |
| Self-employed farmer | Registration/login by email/mobile, multiple lands/sketches, profile editing, saved Sinhala/English preference, funding, expenses, harvests, sales, payments, corrections, closure, KYS and cost-price exports. | Passed within automated scope |
| Organization owner | Application evidence and restricted pending state, approved member registration, same-organization assignments, organization totals, land allocation and denied administrator privilege escalation. | Passed within automated scope |
| Supervisor | Assigned-cultivation operations and attributed farmer expenses; denied budgets/funding/accounts/assignments/validation; immediate access revocation and private receipt isolation. | Passed within automated scope |
| Organization farmer | Own-expense-only snapshots and ledger, receipt isolation, header-only empty CSV, corrected totals, password/session revocation; denied operational writes, private land and financial summary/breakdown exports. | Passed within automated scope |

## Shared checks

Quantity/stock and payment-balance protection, concurrent stock updates, void/correction audit, stored-record restart persistence, upload validation, private downloads, malformed requests, request origins, input precision and password throttling passed. Profit, Loss, Break-even, Insufficient information, weighted selling prices, expense category contributions and remaining-stock recovery exports passed. English/Sinhala rendering tests passed. Cross-user and cross-organization access checks passed.

## Operational finding

Initial live smoke check found no running listener at localhost:3108 (connection refused). Restarted the saved local demo on 3108 and real local application on 3000 without changing their stored farm records. Rechecked the five synthetic logins and dashboard responses successfully. Keep server terminals running, or follow the demonstration guide's restart commands after a restart.

## Limits

No agent-controlled browser actions were attempted because of the recorded saved browser permission denial. Tests do not establish that every button was clicked in Chrome. New cost-price panels' visual/responsive acceptance, actual file-picker interactions, print-preview pagination, keyboard/focus behavior and physical-device checks remain browser/manual acceptance work. Earlier user-supplied KYS screenshots and Summary CSVs remain separate manual evidence. No fabricated participant evaluation or field-data findings. Real operational records were not used as disposable QA data.

## Integration groups executed

- Passed: Anonymous protected routes and bootstrap registration guard
- Passed: One-time system administrator setup
- Passed: Independent self-registration activates immediately with first land
- Passed: Independent login accepts normalized mobile and registered email
- Passed: Independent language preference persists, is account-scoped and denies other roles
- Passed: Missing sketch, invalid content and duplicate mobile/email are rejected
- Passed: Mobile-only independent account has no invented visible email
- Passed: Company application requires registration evidence and remains pending
- Passed: Pending organizations cannot operate or register members
- Passed: Multiple lands retain units, exact conversion, locations and private sketches
- Passed: Admin rejection blocks resubmission; more-information applications can resubmit
- Passed: Admin approval unlocks organization operations without re-registering
- Passed: Approved organization registers two farmers and one supervisor
- Passed: New organization farmer receives a header-only expense CSV before any costs
- Passed: Organization cultivation, farmer and supervisor assignments
- Passed: Supervisor attributes every organization expense to a valid assigned farmer
- Passed: Organization farmers receive only their own expense details
- Passed: Organization farmers cannot create, correct, approve, assign or upload
- Passed: Receipts and CSV exports cannot bypass farmer isolation
- Passed: Owner sees all organization records, farmer attributions and totals
- Passed: Independent farmer can record own costs without a supervisor or farmer attribution
- Passed: Different organizations cannot see or assign one another’s members or data
- Passed: Self-registration stores Sinhala preference without translating record data
- Passed: Language endpoint rejects organization owners, supervisors and organization farmers
- Passed: Authenticated pages load for all five roles; restricted farmer page hides member registration
- Passed: Independent farmer completes own funding, harvest, sale, payment, correction and closure
- Passed: Administrator maintains crop catalogue and reference-area policy
- Passed: Supervisor cannot manage funding, budgets, accounts, policies or assignments
- Passed: Independent and organization owners cannot grant administrator privileges or approve organizations
- Passed: Removing supervisor assignment revokes operational and receipt access immediately
- Passed: Organization farmer password change revokes old sessions and preserves own-expense access
- Passed: Removing farmer assignment prevents new attribution without hiding historical expenses
- Passed: Organization and member deactivation decisions immediately enforce access
- Passed: Harvest/sales/payment calculations, concurrent stock checks and partial payments
- Passed: Corrections retain attribution and farmer totals exclude voided costs
- Passed: Request origin, size, malformed JSON and numeric precision guards
- Passed: Password maintenance, session revocation and login throttling
- Passed: Land edits enforce ownership and allocated field area
- Passed: Closure/validation and audit exports retain prior financial protections
- Passed: Self-employed farmer edits own profile; updated identifiers work and duplicate/unsafe changes roll back
- Passed: Profile endpoint denies every other role and anonymous requests
- Passed: Persistence preserves membership, approvals, expenses, sketches and language after restart
- Passed: Pending applicant page remains separated from organization operations
- Passed: Dedicated administrator workspace and summary endpoint enforce administrator-only access
- Passed: Restricted farmer cultivation totals distinguish equal names and exclude voided and other-farmer expenses
- Passed: Exports reject unsupported and malformed formats for all five roles
- Passed: Approval revocation returns restricted portal data and pages for every organization role
- Passed: KYS Profit: SQLite snapshot, rendered result and CSV agree
- Passed: KYS Loss: SQLite snapshot, rendered result and CSV agree
- Passed: KYS Break-even: SQLite snapshot, rendered result and CSV agree
- Passed: KYS Insufficient information: SQLite snapshot, rendered result and CSV agree
- Passed: Cost-price analysis exports preserve scoped comparisons and deny restricted farmers
- Passed: Remaining-stock recovery exports reflect partial sales and exclude capital and payments
