# Objective 2 cost and selling price analysis

Implemented 1 November 2026. Local SQLite deployment retained; no hosting or schema migration.

## Behavior

Cultivation detail, Decision support and Reports now show a per-cultivation comparison. Production cost per saleable kg = live cash plus imputed expenses / recorded saleable harvest. Weighted average agreed selling price = live agreed sales revenue / quantity sold. Difference = average selling price minus production cost/kg. Amounts use integer cents for underlying ledger calculations; per-unit ratios keep precision until display. Sales revenue retains existing per-transaction cent rounding.

Missing expenses or positive saleable harvest withhold production cost/kg and the difference. Missing sold quantity withholds average selling price and difference. An explicit recorded zero expense can establish a zero unit cost; absent expenses cannot. Funding, payments, activities, forecasts and voided records do not change this analysis. Existing KYS and accounting rules remain unchanged.

Expense tables show recorded categories, cash/imputed split, total, share of total economic cost and cost contribution per saleable kg. Unknown category labels are retained. Harvest context shows total, saleable, lost, sold and unsold kg plus loss percentage. Partial sales receive explicit guidance because positive price difference is not whole-season profit. Each cultivation stays separate, including identical names and different crops.

Summary CSV adds comparison, total harvest, loss percentage, partial-sales and provisional/closed basis columns. Expense breakdown CSV exports category detail and retains headers when no rows exist. Existing Summary/Ledger CSV formats retain existing columns, amounts, CSV formula neutralization and authorization. New columns use stable English identifiers in both display languages. Independent farmer UI supports English/Sinhala; organization roles remain English. Organization farmers never receive the panel or financial breakdown exports. Other exports remain scoped through the existing snapshot permissions.

These are descriptive recorded-data contributions, not causal findings about why a market pays a particular price. Historical market lists remain separate and unverified.

## Verification

- 66 automated unit/render tests passed (9 new cases). Covers positive/negative/zero gaps, quantity-weighted multiple sales, partial sales with whole-season loss, missing data, zero costs/output, void/replacement, funding/payment separation, category reconciliation, fractional quantities, same-name isolation and English/Sinhala rendering.
- 52 isolated SQLite-backed HTTP integration groups passed. New group checks summary figures and cost breakdown rows, header-only empty export, blank incomplete ratios, organization-farmer 403 and cross-organization isolation. Existing five-role tests passed.
- TypeScript checks and production build passed; git diff whitespace check passed.
- For complete QA Profit: LKR 120/kg selling price, 100/kg cost, +20/kg difference; Seeds contributes 80% and 80/kg, Labour 20% and 20/kg. Loss: -20/kg; Break-even: 0/kg.
- No new agent-controlled Chrome/visual/physical-phone/print-preview acceptance claimed: saved browser access denial remains in effect. Responsive and print styles implemented, component output verified through rendering tests. Existing user screenshots apply to the previous KYS feature, not this new panel.

## Open locally

Refresh http://127.0.0.1:3108/ . Sign in with the existing QA independent account, select KYS QA Profit under Cultivations, Decision support or Reports. Reports also has Expense breakdown CSV. Saved demo database and real database were preserved; production processes restarted with the successful build.

## Decision support completion pass — 1 November 2026

Added remaining-stock cost recovery to the same panels and Summary CSV. Additional revenue = max(recorded cost - agreed sales revenue, 0), withheld without recorded expenses and positive saleable output. Required remaining-stock average price = additional revenue / remaining stock, rounded upward to a whole cent; withheld with no remaining stock. Covered-cost and exhausted-stock explanations distinguish economic sales coverage from cash collection. Assumptions explicitly exclude future expenses/losses and do not promise a market price.

Scenario controls now require a single selected cultivation rather than mixing costs/yields across cultivation scopes. Negative, nonfinite and unsafe-overflow inputs withhold scenario results, including extremely small yield denominators. English/Sinhala copy included.

Verification: 70 unit/render tests passed, 53 isolated HTTP groups passed, TypeScript and production build passed. New integration checks create partial sales, compare remaining-revenue/price exports and verify sale corrections update both. Example: cost LKR100, sale revenue25, remaining2kg gives LKR75 still needed at LKR37.50/kg; voiding that sale gives LKR100 across3kg at LKR33.34/kg rounded up. No real records altered. Visual browser and field-user acceptance remain unverified; causal research cannot be replaced by these software features.
