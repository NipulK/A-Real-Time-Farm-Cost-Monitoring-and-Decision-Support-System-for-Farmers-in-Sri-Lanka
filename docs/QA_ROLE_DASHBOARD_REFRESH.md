# Organization, supervisor and organization-farmer dashboard refresh — 19 October 2026

## Changes
Organization owners and supervisors retain the operational workspace with role-specific overview banners, scope-aware counts, rounded panels, clearer statistic cards and responsive layouts. Owner shortcuts lead to the existing organization member and cultivation pages; supervisor shortcuts lead to assigned cultivations and the existing farmer-attributed expense form. Non-admin operational account pages are now named Account settings instead of Administration. Existing security forms and server permissions are unchanged. Self-employed farmers and the dedicated administrator workspace retain their own layouts.

Owner summaries count active farmers/supervisors in their own organization. Cultivation counts follow the current scope. Supervisor summaries count only assigned cultivations, farmer assignments in that scope and nonvoided expense records. The expense shortcut is disabled without active cultivations. Funding/budget permissions and financial calculations are unchanged.

Organization farmers keep their restricted read-only portal. Added a personal overview banner, current expense counts, category cost bars, clearer total cards, local search across their existing own-expense list and a manual authenticated refresh. No other-farmer data or operational writing actions are introduced. Voided entries remain visible in the ledger but excluded from summaries and category bars. Pending/rejected organization operational restrictions remain enforced. Password maintenance remains the existing separate action.

## Verification
- 38 automated tests passed, including role-specific shortcut gating, scoped supervisor counts, void exclusion, read-only farmer controls and approval gating.
- TypeScript checks and production build passed.
- 44 isolated HTTP integration groups passed, preserving ownership/assignment checks, restricted farmer responses, private receipt/export access and administrative approval rules.
- Browser owner: correct 1 cultivation / 2 active farmers / 1 active supervisor; team shortcut opens member registration; modern overview and Account settings label inspected.
- Browser supervisor: correct 1 assigned cultivation / 2 assigned farmers / 3 current expense records; shortcut opens expense form; selecting assigned cultivation exposes only its assigned farmers; cancellation works. 390px page width remained 390px.
- Browser organization farmer: current cash LKR 1,000 + imputed LKR 500 = LKR 1,500, 2 current records; category bars exclude voids; search for family labour returns only own LKR 500 entry; refresh preserves query; unmatched query shows feedback. Mobile layout checked and amount wrapping corrected with single-column totals at phone widths. Branding/stat contrast corrected.
- No real records or role permissions were changed. Browser previews use isolated QA records at localhost:3107. Same-origin demonstration tabs share whichever QA role is currently signed in.
