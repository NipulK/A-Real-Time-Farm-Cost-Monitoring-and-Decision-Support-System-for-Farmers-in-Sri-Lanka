# Delivery backlog

## Verified local implementation
- [x] First-run setup, sign-in/out, local account creation/activation, password change/reset and cultivation-scoped access
- [x] Farms/fields, crop/variety catalogue, editable metadata, cultivation lifecycle and assignments
- [x] Activities/material/labour and single-source cash/imputed expense ledger with private receipts
- [x] Funding/budgets, harvest grades/losses, stock protection, sales and partial payments
- [x] Dashboard, financial statements, CSV exports and audited void/replacement corrections
- [x] Historical price candidate import with original values, categories, canonical crop labels and provenance flags
- [x] User-controlled scenarios, break-even, budget alerts, eligible cost and farm-sale median benchmarks
- [x] Automated tests, production build, HTTP integration, representative browser workflows and responsive checks

Evidence and limitations: docs/QA_REPORT.md. Checked items mean local implementation validated within that report's scope, not exhaustive production certification.

## Verified registration and land update
- [x] Independent self-registration and registered mobile/email sign-in
- [x] Organization application, administrator approval/rejection/more-info and resubmission
- [x] Owner-registered farmer/supervisor accounts, IDs and same-organization assignments
- [x] Farmer-specific expense attribution, read-only portal and scoped receipt/export access
- [x] Multiple lands with area/unit conversion, location and private sketch upload/preview
- [x] Additive legacy migration and isolation tests; browser registration/approval/land workflows

## Latest interface updates
- [x] Self-employed farmer naming and own-profile editor (five editable fields), role restrictions, contact-login validation and English/Sinhala browser checks. See QA_PROFILE_EDITING.md.
- [x] Independent-only English/Sinhala selection with saved account preference (browser verified; see QA_SINHALA_LANGUAGE.md).
- [x] Harvest-gated actual cost/kg, provisional/final labels and selected-crop historical prices; automated/rendered checks passed.
- [x] Browser QA of cost/kg and price-chart changes, including 127 product selections; corrected disappearing missing-data crop option. See QA_CROP_PRICES_AND_UNIT_COST.md.

## External integration and release work — not completed
- [ ] Provision PostgreSQL/Supabase and implement identity/database/private-storage adapters; execute tested normalized schema, RLS and transactional RPCs. Current SCHEMA.md is a specification, not an enabled migration.
- [ ] Configure email invitation/reset delivery; migrate local accounts with invitations, not local password hashes.
- [ ] Run real PostgreSQL isolation/concurrency tests and data migration/reconciliation/restore tests.
- [ ] Confirm crop/area policy and source verification governance. Review historical market identity, units, reversed ranges and mappings before marking any records verified.
- [ ] Authorize and configure HTTPS hosting, private-network or public audience, backups, monitoring and operational recovery. No deployment or paid-service authorization currently exists.
- [ ] Physical phone/tablet tests, full browser matrix, comprehensive accessibility review, production load testing and user acceptance.

## Optional extensions
Offline entry/conflict resolution, multi-currency/units, purchasing/usage inventory allocation, payroll and seasonal models only after suitable data collection. Archive/retention and accounting expansion need explicit business rules; current closed seasons retain auditable history.
