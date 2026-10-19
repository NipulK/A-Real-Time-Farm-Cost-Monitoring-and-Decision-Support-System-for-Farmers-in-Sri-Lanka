# Farmwise requirements and implementation plan

Reference: Farm_CM_DS_System_Concept.docx and farm-system-ui/dist, inspected read-only on 18 October 2026. The supplied prior price audit is a constraint, not proof of source verification.

## Phases
1. Record requirements, domain schema, and assumptions. Preserve prototype's forest green/lime Farmwise identity.
2. Build Next.js/React/TypeScript application with persistent local SQLite, password authentication, signed-in server sessions and cultivation-scoped authorization. No PostgreSQL server or Supabase credentials are present. Local accounts are real local accounts, not Supabase identities. No automatic demo sign-in or fabricated farm records.
3. Add farms/fields, crops/varieties, cultivations, owner assignments, operational entries, one cost ledger, receipts, funding, budgets, harvests, sales and partial payments. Validate relationships, inventory and permissions in transactions. Support correction by voiding records with an audit reason and adding replacements.
4. Import only candidate authoritative price workbooks with immutable provenance. Build dashboard, reporting/export and transparent decision support; validate financial and access invariants and responsive behavior.

## Roles, registration and access — updated user rules
- Independent farmers self-register without approval, using a required mobile and optional email plus password; either registered identifier supports sign-in. Registration requires a first land/sketch. They record their own expenses and manage their own records.
- Organization/company/grower/investor owners submit an application, verification details and first land/sketch. Status is pending until system administrator approval. Pending/rejected/needs-information applicants can manage only their application and lands. Approved owners register organization farmers and supervisors and see all organization records and individual/combined expense totals.
- Organization farmers are registered by their approved owner, receive a unique farmer ID and can only read their attributed expenses/receipts and own ledger export. They cannot enter/edit costs or access budgets, sales, other farmers, organization totals, land documents or audit exports.
- Supervisors belong to an approved organization and record activities/costs/harvests/sales/payments/receipts in assigned cultivations. Organization expenses require an active same-organization farmer assigned to that cultivation. Supervisors cannot change ownership, budgets, funding, assignments or validation.
- The administrator reviews organizations with an audited decision and feedback, manages accounts/policies and retains support access. Organizations cannot approve themselves. Public requests cannot select privileged roles or approval status.
- All reads, writes, exports and private downloads enforce the same scope on the server. Deactivation and non-approved organization status take effect immediately. Accounts/passwords and legacy farm records are preserved by additive migration; legacy growers require information/review, and old expenses are not automatically assigned to employees.
- Independent and organization owners can register multiple lands, each with its own name, area/unit, district/village, location description and required private outline sketch. Units: acres/hectares/perches. Images preview privately; PDF scans download. A simple hand-drawn outline is acceptable. See REGISTRATION_AND_ACCESS.md for the complete workflow.

## Accounting
- LKR, kg, acres for v1; area conversions explicitly displayed. All amounts stored as integer cents, quantities in decimal kg/acres.
- Activity details are nonfinancial. Cash and imputed costs are entered once in expenses, optionally linked to an activity. Costs never inferred a second time from quantities.
- Funding is capital inflow, never sales revenue. Sales revenue is quantity × agreed price; receipts of payment reduce receivables, never create revenue again.
- Economic profit = sales revenue − cash costs − imputed costs. Cash position = funding + payments − cash costs. Budget usage uses cash costs. Cost/kg uses saleable harvest, not forecast yield. No denominator yields insufficient data.
- Harvest total = saleable + loss; saleable stock cannot be oversold by grade/harvest. Payments cannot exceed sale balance. Void dependencies in reverse order, preserving immutable audit history.
- Forecast yield, scenario prices and remaining cost are user assumptions. Show projected results separately from actuals. Budget alert begins at 80% usage; not agronomic advice.

## Benchmarks and prices
- All districts allowed for personal calculations. No reference areas approved initially. Examples in the concept are not adopted as policy.
- Benchmarks require closed, administrator-validated cultivation in an explicitly approved crop/area, at least three independent cultivations and three owners. Median cost/kg, with sample count, scope and method. Historical price-list data never mixes with farm sale benchmarks.
- Market prices retain bilingual product labels, variant/origin in original label, date, lower/upper, LKR/kg per workbook notes (unit not source-verified), workbook hash/sheet/cell, claimed market and identity status. No grapes fabricated.
- Dambulla-labelled records from 24 September 2026 onward have uncertain identity (Keppetipola forms); exclude from charts unless explicitly viewing flagged data. Reversed bounds retained, excluded from calculations. Partial prices displayed without invented midpoint. All imported values initially unverified. No live-price or seasonal-prediction claim.

## Operational assumptions
Local single-host installation only; use on phone/tablet/desktop through a separately configured secure network endpoint. Loopback preview is only on this computer. No public deployment or paid services authorized. Account creation passwords minimum 12 characters; salted scrypt; opaque random sessions stored hashed, 7-day expiry, HttpOnly same-site cookie. Origin checking on writes. Local upload size limit 5 MB; PDFs/JPEG/PNG only, private downloads and attachment audit. Back up storage directory with application stopped.

## Harvest-gated unit cost and crop-price display (18 October 2026)
Hide actual unit production cost until positive saleable harvest exists. Show “Cost per kg so far” during an open season and “Final cost per kg” after closure. Keep forecasts explicitly separate. Show previous prices for the selected cultivation crop, retaining individual product variants and market series. Single usable observations must be visible points; unavailable/excluded history must have a clear reason and original-record evidence, never invented values.

## Profile and display naming — 19 October 2026
User chose **Self-employed farmer** for the visible independent-farmer category. Keep internal identifiers unchanged. Allow only that category to edit its own name/mobile/optional email/district/village, with normalized unique sign-in identifiers, fixed account/farmer IDs and permissions, transactional audit and separate password changes. Do not propagate profile location changes into land/cultivation metadata.
