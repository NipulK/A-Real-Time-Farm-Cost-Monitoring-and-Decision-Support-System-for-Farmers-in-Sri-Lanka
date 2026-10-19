# Dedicated administrator workspace — 19 October 2026

Administrators now enter a separate workspace. Other roles retain their existing workspaces. The administrator landing page contains real counts and distribution charts for users, organization application statuses, land records and cultivation validation work. It does not display the farmer financial dashboard or a general Add record control.

## Pages
- Dashboard: user categories, active/inactive accounts, pending/approved/needs-information/rejected organizations, land and cultivation counts, attention queue and recent audit activity. Chart labels link to filtered records.
- Organization approvals: search and filter applications; review evidence and save an approval, rejection or request for information with a required note.
- Users & access: search contacts and categories, activate/deactivate accounts, reset passwords, add administrators. Own account cannot be deactivated.
- Organizations: directory, responsible owners, contacts, status, staff/land/cultivation counts and review links.
- Land registry: owner, organization, area/unit, location and private sketch links.
- Cultivation validation: review records and export an individual ledger; validate only closed cultivations or revoke validation.
- Crops & reference areas: create/edit crop varieties and manage crop/district benchmark approval policy.
- Historical price review: original ranges and source provenance, including reversed ranges and uncertain markets. Read-only and explicitly unverified.
- Audit history: search latest 300 accessible immutable events, inspect before/after values and export the available events.
- My account: current administrator details and password change.

## Refresh and access
Summary data refreshes every 15 seconds while the tab is visible, on focus and after administrative writes. A manual Refresh button and last-updated time are displayed. This is polling, not a websocket or external live-price feed. Empty installations show zero counts. Existing organization status names are retained; no artificial Cancelled status was introduced. Rejected applications and inactive accounts are distinct.

The /api/admin endpoint requires an active authenticated administrator and returns no-store responses. Existing mutation, upload, document and export authorization remains in force. New password forms retain the existing 12–256 character rule.

## Verification
32 automated tests passed, TypeScript checks passed and production build passed. 44 isolated HTTP integration groups passed, including unauthenticated/non-admin denial of /api/admin, actual count reconciliation, dedicated admin HTML and count changes after activation updates.

Browser testing used disposable localhost:3107 storage, never the real database: dashboard chart links; needs-information review and changed status counts; user search/deactivation; organization directory; land records; cultivation inspection/validation; crop creation; reference policy form; reversed-price filtering; audit search; account security form opening/cancellation; and 390px mobile navigation/overflow. Password entry/reset submission was covered by existing HTTP tests rather than browser automation.

Automatic refresh was additionally verified after another authenticated session restored an inactive QA user: the dashboard changed to 11 active / 0 inactive without pressing Refresh. Final browser console had no warnings/errors. Screenshot admin-dashboard-preview.png shows disposable QA records, not real installation records.
