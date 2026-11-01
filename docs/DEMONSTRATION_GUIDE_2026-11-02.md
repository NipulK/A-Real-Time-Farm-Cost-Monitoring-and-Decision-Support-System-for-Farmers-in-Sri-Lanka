# Farmwise supervisor demonstration

Prepared 1 November 2026 for 2 November 2026, Asia/Colombo.

## Objective achievement

1. Central agricultural database: partially achieved. Local SQLite stores linked users, organizations, lands, cultivations, expenses, harvests, sales and payments. National-scale deployment and planning effectiveness are unverified.
2. Cost–price gap and decision support: partially achieved. Costs, actual agreed sales and historical reference prices are available. Real-data research into causes of the gap remains.
3. Total cost and cost/kg algorithm: achieved within the tested prototype.
4. KYS classification: achieved within the tested prototype; Profit, Loss, Break-even and Insufficient information manually checked with screenshots and Summary CSV uploads.

Present this as a working local research prototype. Do not describe synthetic data as field research or historical prices as verified live quotations.

## Sites and accounts

- Real application: http://127.0.0.1:3000/ . Use your privately chosen real password. Real credentials were not reset or used for testing.
- Prepared synthetic demonstration: http://127.0.0.1:3108/ . Use this site for the walkthrough below.
- All five synthetic accounts use password: `Local-QA-only-2026!`

| Role | Email |
| --- | --- |
| Administrator | qa-admin@example.test |
| Self-employed farmer | qa-independent@example.test |
| Organization owner | qa-owner@example.test |
| Supervisor | qa-supervisor@example.test |
| Organization farmer | qa-farmer-a@example.test |

Accounts were checked through fresh HTTP login, authenticated data and rendered dashboard requests. These checks are not a fresh automated Chrome interaction pass.

Use Sign out between roles. Tabs in the same Chrome profile share login cookies; separate tabs do not create separate role sessions. For simultaneous administrator/owner demonstration, use a normal Chrome window and an Incognito window.

## Presentation order — approximately 15–20 minutes

1. Explain the problem: scattered cultivation expenses make unit cost and financial status difficult to understand. Describe four objectives above and distinguish implementation from national/field evidence.
2. Sign in as the self-employed farmer. Select English, show the dashboard, switch briefly to Sinhala, then return to English. Show Land records and the multiple-land/sketch feature. No real location or participant claim is needed for QA data.
3. Open Cultivations and select KYS QA Profit. Explain cash costs 8,000 plus imputed family labour 2,000 = economic cost 10,000. With 100 kg saleable harvest, cost/kg is 100. Agreed sales are 12,000, giving provisional profit 2,000. Investment funding 100,000 is not revenue.
4. Select KYS QA Loss: revenue 8,000 minus cost 10,000 = -2,000. Select KYS QA Break-even: 10,000 minus 10,000 = 0. Select KYS QA Insufficient information: missing expense/harvest/sale guidance, no KYS result or cost/kg. These existing examples do not need editing.
5. Show Previous prices for your crop. Explain that the chart represents historical reference ranges/midpoints, not today's verified prices or a guaranteed prediction. Show product/market controls and source observations.
6. In KYS QA Profit cultivation details, show Cost and selling price comparison: weighted selling price LKR 120/kg minus cost LKR 100/kg = LKR 20/kg. Show Seeds 80% / LKR 80 per kg and Labour 20% / LKR 20 per kg. Explain loss/unsold context and that cost contributions are descriptive, not proof of market-price causes. The same panel is available under Decision support and Reports; Expense breakdown CSV exports category rows. Select KYS QA Profit in Reports & exports. Show the statement: funding 100,000; cash costs 8,000; imputed costs 2,000; cost 10,000; sales 12,000; profit 2,000; payments 0; receivables 12,000; cash position 92,000. Download Summary CSV and open it. Ledger CSV and Print report can be shown after checking download/print preview; their manual acceptance was not completed in the prior four-case exercise.
7. Sign out and sign in as organization owner. Show organization totals, Organization & people, Register member, and farmer/supervisor categories. Open the form to explain fields; avoid creating unnecessary accounts during the presentation. Explain cultivation assignments. If entering a fresh expense live, first create a new active cultivation as owner and assign the supervisor and farmer; existing QA cultivation may be closed.
8. Sign out and sign in as supervisor. Show assigned cultivations and farmer-attributed expense records. Explain that ownership, budgets, funding and assignments belong to authorized management. For a prepared new active cultivation, record one expense against its assigned farmer ID; do not attempt changes to closed examples.
9. Sign out and sign in as organization farmer. Show only their own attributed expenses/receipts and read-only access. Explain that they cannot create expenses or see organization sales/budgets/other farmers' records.
10. Sign out and sign in as administrator. Show Dashboard, Organization approvals, Users & access, Organizations, Land registry, Cultivation validation, Historical price review and Audit history. Explain pending, approved, needs-information and rejected states. If no pending application exists, the empty queue is correct. A fresh application can be registered in the separate window before showing the review, welcome popup and access change.
11. Show SQLite in DB Browser: File > Open Database > select the demo database path below. Browse Data: users (do not display password hashes), organizations, lands, cultivations, entries and related attribution tables. Entry payloads store transaction details. Table names are visible in Database Structure. Do not edit or write database changes during the presentation.
12. Close with evidence: 57 automated tests passed in the latest full unit run; 51 integration groups passed again on 1 November. Four KYS display cases and Summary CSVs were reviewed from user-operated Chrome. State remaining field evaluation and deployment work accurately.

## Database paths and backup

Real database:
`/Users/nipulkanishka/Documents/Codex/2026-10-18/farm-cost-monitoring/outputs/farmwise/storage/farmwise.sqlite`

Real backup with private documents and checksum manifest:
`/Users/nipulkanishka/Documents/Codex/2026-10-18/farm-cost-monitoring/outputs/farmwise/backups/2026-11-01-before-demonstration-212830/`

Backup integrity and foreign keys passed. At backup time: 4 real users, 0 cultivations, 0 entries. Uploaded documents were copied. Real database was not seeded with synthetic accounts.

Persistent demonstration database:
`/Users/nipulkanishka/Documents/Codex/2026-10-18/farm-cost-monitoring/outputs/farmwise/backups/demo-ready-2026-11-02/farmwise.sqlite`

The demonstration copy includes private synthetic uploads. Keep the complete directory together. It was copied with SQLite's backup API and integrity checked.

## Restart tomorrow if necessary

Open two VS Code terminals. Do not run these commands again while the respective port is already serving Farmwise.

Terminal 1 — real system:
```sh
cd /Users/nipulkanishka/Documents/Codex/2026-10-18/farm-cost-monitoring/outputs/farmwise
npm run start -- --port 3000
```

Terminal 2 — prepared demonstration:
```sh
cd /Users/nipulkanishka/Documents/Codex/2026-10-18/farm-cost-monitoring/outputs/farmwise
FARMWISE_STORAGE=./backups/demo-ready-2026-11-02 npm run start -- --port 3108
```

Keep both terminals running. Open http://127.0.0.1:3108/ without asterisks. If the computer restarts, restart these servers. If a port is in use, use the existing server instead of launching duplicates. Avoid rebuilding, clearing storage or regenerating QA data immediately before the demonstration.
