# Admin price chart and dashboard refresh — 19 October 2026

Added an admin-only historical price visualisation above the original-record search/table. Product and market selectors control the chart independently of the original-record quality filters. Each original market/product-label series has its own line. Lines show explicitly labelled original-range midpoints in LKR/kg; faint vertical marks retain the original lower/upper bounds. Hover, tap, focus or Enter/Space on a point reveals its date, original label, claimed market, range and midpoint. No forecast or live-price claim is made.

Reused the existing price history selection and geometry rules. Missing/partial/reversed prices and uncertain-market identities are excluded. One observation is shown as a point without a trend line; entirely excluded histories explain the missing chart. Empty imports and imports without Carrot have regression coverage. The missing-bounds table filter now also includes partial ranges.

Refreshed the administrator dashboard with a forest-green overview banner, real active-account/attention counts, differentiated statistic icons, rounded panels, updated chart styling and recent-activity presentation. Links and permissions remain unchanged. The awaiting-validation tile now opens the relevant filter; page navigation resets scrolling to the top. Mobile chart scrolling has an explicit swipe hint; reduced-motion preferences are respected.

## Verification
- 35 automated tests pass, including three new chart-rendering regressions. Existing geometry tests cover all usable imported product/market combinations.
- TypeScript and production build pass.
- 44 isolated HTTP integration groups pass, preserving role restrictions and administrative summary behavior.
- Browser: inspected dashboard design; selected Cabbage and Guava, isolated Dambulla, checked separate market lines; selected a point and verified range/midpoint details; Red Cabbage showed one point/no line, Enter selected it; Gherkin showed an exclusion explanation/no invented chart; 390px layout retained page width with chart scrolling inside its own panel.
- Test installation uses disposable localhost:3107 storage; real users and operational data are unchanged. Screenshot previews contain QA accounts, while prices are the unchanged imported source observations.
