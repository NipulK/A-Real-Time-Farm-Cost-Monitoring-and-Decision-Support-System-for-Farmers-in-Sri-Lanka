# Farmwise project instructions

Build and maintain the Farm Cost Monitoring and Decision Support System as a responsive website for phone, tablet and desktop. The user wants to continue developing in VS Code with Codex. Read `CODEX_HANDOFF.md`, `docs/REQUIREMENTS.md`, `docs/BACKLOG.md` and `docs/SCHEMA.md` before making changes. Keep status and blockers accurate.

## Boundaries
- Work in this project folder. The reference workspace `/Users/nipulkanishka/.codex/.chatgpt-projects/g-p-6aacf619534481918a3f84f6c35a9848` is entirely read-only. Never edit or remove its contents.
- Reference concept: `Farm_CM_DS_System_Concept.docx`; reference visual prototype: `farm-system-ui/dist`.
- No paid services or public deployment without explicit user authorization. Local implementation and tests are authorized. Do not repeat routine permission questions.
- Current backend is SQLite and real local password authentication, not Supabase. Never describe missing external integration as completed. Proposed target is PostgreSQL/Supabase after configuration and implementation.
- Do not fabricate farm records or verified/live prices. Blank accounts start with no farms. Test data belongs only in isolated test databases.

## Invariants
- Enforce ownership/assignments in server code and eventually PostgreSQL RLS, including downloads and exports. Supervisors cannot change ownership, assignments, funding, budgets or validation.
- Funding is not sales revenue. Customer payments are not additional sales revenue. Imputed costs are not cash costs. Forecasts are not actuals.
- One expense ledger owns costs; activities never add costs a second time.
- Validate stock by harvest/grade, payment balance, record dates and related cultivation. Use transactions.
- Keep immutable audit records; corrections void originals with reasons, never silently delete records.
- Personal calculations work in all districts. Benchmarks require approved crop/area policy, closed and validated records and sufficient independent owners. No example reference area is pre-approved.
- Historical import: only two authoritative candidate categorized workbooks, retain original labels/bounds/hash/cells. Missing is not zero. Eight reversed ranges are never guessed-corrected; Dambulla-labelled dates from 24 September 2026 have uncertain Keppetipola provenance. Prices remain unverified, not live or actual farm sales. Label midpoint explicitly. No reliable seasonal prediction claim.

## Checks and maintenance
Use Node 24+ (node:sqlite) and npm. Run `npm test`, `npm run typecheck`, and `npm run build` after relevant changes. Use separate temporary storage for tests. Record actual results and unverified gaps in `CODEX_HANDOFF.md`; do not check backlog items based solely on code presence. Preserve the Farmwise forest-green/lime design and accessible responsive behavior.

## Registration and land update (latest user requirements)
Read docs/REGISTRATION_AND_ACCESS.md. A base users.role=farmer is insufficient for authorization: profile.account_type distinguishes independent from organization_farmer. Organization farmers have read-only own-expense access and must never receive full snapshots, budgets, sale data, land documents or audit exports. Check approval per request. Independent self-registration activates immediately; organization registration stays pending until an administrator reviews it. Only approved organization owners register staff and assign same-organization supervisors/farmers. Every new organization expense requires a valid assigned farmer ID and supervisor/admin recording. Land sketches and registration evidence stay private. New lands require area/unit/location/sketch. Preserve legacy records; never guess farmer attribution or silently approve legacy growers.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
