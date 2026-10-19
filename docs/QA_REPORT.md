## Profile editor and role naming — 19 October 2026
Independent category now displays Self-employed farmer, as selected by user. Own-profile editor added with server-enforced role/field restrictions and unique contact validation. 30 tests, typecheck/build and 43 HTTP groups passed. Browser save/cancel, persistence, Sinhala, narrow layout and clean console verified with synthetic name/village changes. Contact changes/login tested via HTTP. See [QA_PROFILE_EDITING.md](QA_PROFILE_EDITING.md).

## Crop/unit-cost browser verification — 18 October 2026
Completed requested sequential browser checks and a 127-product chart sweep. Fixed missing-data crop option disappearing during exploration and two Sinhala display labels. Verified harvest-based costs, corrections, closure, crop/market matching, single-point and missing charts, narrow layout and role scope. Final 28 tests, typecheck/build, 41 HTTP groups and fresh clean console. Details: [QA_CROP_PRICES_AND_UNIT_COST.md](QA_CROP_PRICES_AND_UNIT_COST.md). Test data isolated; real records untouched.

## Crop history and unit-cost update — 18 October 2026
Implemented harvest-gated actual cost/kg, provisional/final labels, selected-crop history and missing/single-point chart handling. 27 automated tests, typecheck and build passed. Browser testing is deferred by user instruction, and no new HTTP run is claimed. Details: [QA_CROP_PRICES_AND_UNIT_COST.md](QA_CROP_PRICES_AND_UNIT_COST.md).

## Independent farmer Sinhala update — 18 October 2026
English/Sinhala choice implemented only for independent farmers, saved per account. Browser tested registration, page survey, financial forms, validation, switch/persistence, other-role exclusion and 390 px layout. Fixed date-locale hydration error and untranslated dynamic labels; fresh final console clean. Final 18 tests, typecheck/build and 41 HTTP groups passed. Evidence, boundaries and workflow: [QA_SINHALA_LANGUAGE.md](QA_SINHALA_LANGUAGE.md).

# Latest administrator browser QA

Sequential admin checks covered all top-level pages with five UI/data-display fixes. See QA_ADMINISTRATOR_WORKFLOW.md for submitted versus inspected forms, evidence and manual credential/print gaps. Final 16 automated tests and 38 integration groups pass; typecheck/build pass.

# Latest organization farmer browser workflow

Completed newly registered organization-farmer journey; fixed empty expense CSV headers. See QA_ORGANIZATION_FARMER_WORKFLOW.md for evidence and limits. Final 16 automated tests and 38 HTTP integration groups pass, along with typecheck/build.

# Latest supervisor browser workflow

Completed the sequential new-supervisor journey and fixed role-inappropriate land/setup controls and guidance. See QA_SUPERVISOR_WORKFLOW.md for evidence, calculations and remaining checks.

# Latest organization owner browser workflow

Completed the sequential new-organization journey and fixed two UI issues. See QA_ORGANIZATION_WORKFLOW.md for the step-by-step results, financial reconciliation and remaining checks.

# Latest browser workflow

Independent farmer tested sequentially from new registration through closed season and sign-in persistence. See QA_INDEPENDENT_WORKFLOW.md for current browser evidence, fixes and remaining manual checks.

# Farmwise QA report

Latest fresh role-by-role regression: **37 HTTP integration groups and 16 automated tests passed**, with TypeScript and production build passing. See QA_ROLE_REPORT.md for the role matrix, evidence and current-run limits; earlier browser results below were not repeated in this run.

Date: 18 October 2026 (Asia/Colombo). Scope: the local Next.js/SQLite application in this project folder. No paid services, public deployment, real farm test entries or external credentials were used. All account/workflow integration tests used a separate disposable database and private receipt directory.

## Results

| Check | Result |
|---|---|
| Production build | Passed, no remaining build warnings |
| TypeScript check | Passed |
| Automated domain/security/import/migration tests | 16 passed |
| HTTP integration groups against production server | 30 passed |
| Concurrent requests | Two competing sales against one harvest: one accepted, one rejected; no overselling |
| Persistence | Financial records, authenticated session and receipt survive application restart |
| Browser workflows | Sign-in, cultivation detail, activity, linked expense, invalid/valid sale, partial payment, historical flags, scenario recalculation, administration and navigation verified |
| Responsive registration update | 24 measurements across six changed views at 320, 390, 768 and 1440 px; no page-wide horizontal overflow after the decoration-positioning fix |
| Keyboard checks | Native dialog focus/cancel, mobile menu focus, Escape closing and background inertness verified; hidden mobile navigation removed from accessibility tree |
| Fresh browser console | No errors or warnings in clean final-build tab |
| Production dependency audit | npm audit --omit=dev: zero known vulnerabilities at time of check |
| Local administrator recovery | Hidden-password terminal recovery tested against disposable QA account; subsequent sign-in passed |

Detailed machine results: `qa-http-results.json` and `qa-responsive-results.json`. Screenshots: `qa-desktop.png`, `qa-tablet.png`, `qa-phone.png`. Screenshots contain clearly named synthetic QA records, not the user's farm data.

## Defects fixed during QA

1. Valid sign-ins were rejected because the framework's internal request URL differed from the browser host. Origin checks now compare the actual local Host (or explicit configured origin), with arbitrary hosts rejected in local mode.
2. SQLite returns rows with null prototypes, which the server/client boundary could not serialize. Database read helpers now return plain objects. Added an authenticated-page integration regression check.
3. Build workers could race during SQLite WAL initialization. Build-time databases now use memory; runtime connections set a busy timeout before WAL initialization.
4. Request-size checks trusted Content-Length. JSON and receipt routes now count received bytes, including chunked requests; malformed JSON produces a controlled validation response.
5. Account maintenance was absent. Added own-password changes, administrator resets, session revocation, and audited physical-host administrator recovery.
6. Farm, field, crop/variety and cultivation details could not be maintained. Added permission-checked edits, field-area allocation checks, date/history checks and validation reset when metadata changes.
7. Mobile offscreen navigation remained accessible to keyboard/screen-reader users. It is now hidden when closed; open menus make background content inert, focus the close control and support Escape.
8. Money formatting hid cents. Monetary displays now preserve up to two decimals; quantities and currency entries reject excessive precision rather than silently accepting it.
9. Harvest reconciliation allowed a one-gram tolerance inconsistency. Quantities use at most three decimal places and harvest components reconcile at integer gram precision.
10. Original source categories were not retained by price category refinement. Added sourceCategory and canonicalProduct alongside original labels and variants, and narrowed the spice rule to avoid treating sweet peppers as spices.
11. Audit data could theoretically be mutated by future application code. Added SQLite triggers rejecting audit updates and deletes.

## Financial and access coverage

The tests verify: capital is separate from revenue; payments are separate from sale value; imputed costs do not reduce cash; activities do not double-count expenses; stock is allocated by harvest/grade; partial payments cannot overpay; linked records cannot be voided out of order; corrections preserve original records and immutable audit events; closed cultivations lock operational records; supervisors cannot manage ownership, budgets, funding or validation; assignments/deactivation revoke access immediately; private receipts and CSV exports enforce the same cultivation scope; session cookies are HttpOnly/SameSite Strict; malformed, oversized and wrong-origin writes are rejected.

Cost benchmark regression tests create three independent, approved, closed and validated cultivations and verify the median. Farm-sale medians require three independent owners in the same crop/district/grade over 30 days; insufficient samples remain explicit. Individual contributing farms are not exposed to unrelated users.

Historical import regression tests confirm 1,950 observations, 297 partial ranges, eight reversed ranges, 362 uncertain-market records, original labels, categories, hashes/cells and unverified state. No grapes observations are invented.

## Limits and remaining external work

This is verified local application functionality, not a completed hosted production rollout. PostgreSQL/Supabase auth/database/storage adapters and executed RLS/RPC migrations are not implemented. A real project, external configuration and integration testing are needed. Email invitations/recovery, HTTPS, hosted mobile access, automated backups/restore drills, monitoring and production load testing remain deployment work. No public deployment was authorized.

Browser testing used the Codex in-app browser with viewport emulation. Physical devices, a full Chrome/Safari/Firefox matrix, comprehensive screen-reader testing and formal WCAG certification were not performed. Readability and keyboard improvements are not a claim of complete accessibility compliance.

No crop/area policy examples were adopted automatically. Source units/market identity, reversed price ranges and domain category mappings still require human source verification. The system deliberately gives no reliable seasonal forecast or best-day-to-sell promise.

## Registration and land update — final verification

The updated 30-group HTTP suite covers independent self-registration without approval; email and normalized mobile login; mobile-only accounts; duplicate identifier rejection; missing/invalid/oversized sketch rejection; company registration evidence; pending organization restrictions; rejection/feedback/resubmission/more-information/approval; member creation and IDs; same-organization supervisor/farmer assignments; mandatory expense attribution; organization-owner combined records; independent expense entry; cross-organization isolation; farmer-only snapshots, exports and private receipts; immediate restriction after membership/account/organization decisions; private sketch preview/download; land area/unit conversion and total linked-field area checks; prior accounting/closure/concurrency protections; and persistence after restart.

Two additional automated tests migrate an old schema, preserving passwords, account IDs and farm ownership, and verify that legacy growers enter needs_info rather than becoming approved automatically. Existing user data was backed up before implementation. Tests use disposable storage and never register QA users in the regular workspace.

Browser actions verified self-registering an independent farmer with an uploaded drawn outline, adding a second separate land, submitting an investor application into pending status, administrator approval with a note, organization per-farmer expense totals, selecting an assigned farmer ID in the supervisor expense form, and the attributed cost appearing in that farmer's read-only portal. Image previews were confirmed loaded with real image dimensions. The final clean browser tab reported no errors or warnings.

Responsive measurements in qa-registration-responsive.json cover independent registration, organization registration, pending application status, multiple lands with sketches, organization members/totals, and the farmer own-expense portal. All 24 measured page widths match their viewport widths. A real issue was found: an absolutely positioned decorative circle escaped its mobile registration container; correcting the containing-block position fixed the horizontal scroll. Large record tables scroll inside their containers.

Current evidence: qa-registration-form.png, qa-registration-phone.png, qa-registration-pending.png, qa-multiple-lands.png, qa-organization-people.png and qa-farmer-expenses-phone.png. All screenshots use synthetic QA records and a generated test outline, not real farm data.

New files and logic remain local: no SMS/email verification or messaging, cloud service, paid service or public deployment was enabled. Physical-device/full-browser-matrix/formal accessibility certification remains outside the checks performed here.
