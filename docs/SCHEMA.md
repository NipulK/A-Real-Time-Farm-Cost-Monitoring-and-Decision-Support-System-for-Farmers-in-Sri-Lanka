# Database schema and production migration specification

The active local schema is created in `lib/db.ts`. SQLite foreign keys and immediate transactions are enabled. Amounts are integer LKR cents; business validation and scope enforcement live in `lib/service.ts`.

| Table | Purpose and relationships |
|---|---|
| users | UUID, name, unique normalized email, salted scrypt password, farmer/grower/supervisor/admin role, active flag |
| sessions | SHA256 of opaque cookie token, user FK, expiry |
| farms | Owner user FK, name, district |
| fields | Farm FK, name, positive acres |
| crops | Name and suggested varieties JSON; six initial crops |
| cultivations | Owner user, field, crop FKs; variety, season dates, acres, cash budget cents, forecast kg, lifecycle, admin validation |
| assignments | Composite cultivation/supervisor key |
| entries | Cultivation and author FKs; kind, actual date, validated JSON payload, created time, void flag |
| receipts | Expense entry FK, private file path, MIME, size and author |
| areas | Unique crop/district and explicit approval flag |
| audit | Actor FK, optional cultivation scope, event/target, original and resulting JSON, timestamp |
| login_attempts | Local failed-login throttling per email |

Entry payloads:
- activity: description, category, quantity, unit, notes. No financial amount.
- expense: description, category, amount cents, cash/imputed basis, optional activity FK (validated by service).
- investment: description, investor, amount cents.
- harvest: description, grade, total/saleable/loss kg.
- sale: harvest FK (validated by service), buyer, kg, agreed price cents/kg.
- payment: sale FK (validated by service), amount cents, method/reference.

Historical price observations are an immutable imported JSON snapshot (`data/prices.json`); `data/price-import-audit.json` records workbook hashes and import counts. A separate products file includes products without observations. This is not a mutable verified-price database.

## Target PostgreSQL/Supabase design — not implemented
Normalize entry payloads into typed child tables with numeric checks, FK-linked activities/harvests/sales and composite cultivation keys. Use UUID profile IDs from Supabase auth.users; eliminate local session/password tables after invitation migration. Retain integer cents and explicit quantities. Create historical_products, historical_price_sources and historical_price_observations with immutable original fields and separately audited verification events.

Enable RLS on every business table. Central SECURITY DEFINER read/manage predicates must use auth.uid(), restricted search_path and explicit owner/assignment/admin checks; do not allow clients to write profiles.role or cultivations.owner_id. Use owner/admin transactions for assignment and financial settings. Supervisor reads/writes operational tables only through their active assignments. Public benchmark views expose aggregate values only after eligibility and independent-owner thresholds. Never expose contributing owners or private records.

Post sales/payments/voids through transactional RPCs locking harvest/sale rows to prevent concurrency violations. Add audit triggers with old/new values and auth.uid(). Deny client update/delete on audit; deny physical deletion of business entries. Validate closure/reopening acreage, status transitions, and cross-cultivation relations in DB constraints/RPCs. Use a private receipt bucket with scoped storage policies and short-lived signed downloads. Import and approval RPCs must retain original price values. Exercise these policies with multiple real authenticated users against a provisioned instance before calling the integration complete.

## Local QA additions
Audit update/delete triggers enforce append-only application history. Row helpers return plain objects for server/client serialization. Production builds use memory databases, and runtime connections apply busy timeouts before WAL initialization. Account password changes/reset/recovery revoke prior sessions and append audit events. Price JSON additionally retains sourceCategory and canonicalProduct beside original variants and labels. See QA_REPORT.md for verification evidence.

## Additive registration schema (implemented locally)
- organizations: immutable owner link/public ID, business/contact/responsible-person details, pending/approved/rejected/needs_info status, review note/reviewer/time.
- profiles: user FK, public farmer/supervisor/owner ID, account_type, organization FK, unique normalized mobile, district/village/internal reference.
- lands: owner and optional organization FKs, public ID, name/location/district/village, original area/unit and converted acres. farm_lands connects lands to the existing farm/field hierarchy.
- documents: private sketch/verification metadata and filesystem reference, linked to owner/organization/land. Image preview and downloads use the same authorization.
- farmer_assignments: same-organization farmer/cultivation membership. expense_farmers: immutable entry-to-farmer attribution retained through void corrections.
The SQLite migration is additive. It preserves existing table columns and old INSERT compatibility, passwords and records; legacy grower profiles enter needs_info. Tests create an old-schema database and verify preservation. PostgreSQL/Supabase remains unimplemented.

## Independent language preference (18 October 2026)
`user_preferences(user_id PRIMARY KEY REFERENCES users(id), language CHECK(language IN ('en','si')) DEFAULT 'en')` is an additive table. Missing preference rows resolve to English; only independently classified accounts can write their own row. Organization-member base `farmer` role alone does not grant access. Existing eight-column profile inserts remain compatible. Preference changes are audited.
