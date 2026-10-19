# Farmwise

Farm Cost Monitoring and Decision Support System. Open this folder in VS Code, then use the Codex sidebar. Start with `CODEX_HANDOFF.md` and `AGENTS.md`.

## Run locally

Requires Node.js 24+ and npm. In the VS Code terminal opened in this folder:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000 and create the first administrator. Under Administration, create farmer/grower/supervisor accounts; create farms, fields and cultivations, then assign supervisors. There is no sample account or password. Historical price data is imported reference material, clearly marked unverified.

```sh
npm test
npm run typecheck
npm run build
npm start
```

SQLite and private receipts live under `storage/`, ignored by Git. `FARMWISE_STORAGE` can override the path. Back up the complete directory with the application stopped. Never commit database files, receipts, credentials or `.env.local`. Local administrators can reset user passwords; physical-host administrator recovery is documented below.

The development/start scripts bind only to loopback. Mobile-responsive layout does not make this computer accessible from a phone automatically. Secure network hosting and HTTPS remain separate work. For HTTPS deployments only, `FARMWISE_HTTPS=true` enables Secure session cookies; do not expose local HTTP auth publicly.

Supabase/PostgreSQL, email, cloud storage and public deployment are not connected. See the requirements, schema and backlog for details. No paid service has been provisioned.

## QA and account recovery

See `docs/QA_REPORT.md` for verified workflows and remaining limitations. The suite uses isolated storage:

```sh
npm test
npm run typecheck
npm run build
npm run qa:http
```

The integration test command starts its own production server on loopback port 3107 and uses a disposable database. Stop any earlier QA server on that port first; it never uses your regular `storage/` directory.

Administrators can reset other local account passwords in Administration; every user can change their own password there. If the only administrator forgets their password, run this on the host computer in the project terminal:

```sh
npm run recover-admin -- your-admin-email
```

The helper prompts twice for a hidden new password, revokes that account's sessions and records recovery in the audit log. It requires local filesystem access and targets only active administrator accounts. Do not put passwords in terminal commands or project files.

## Registration and multiple lands
The sign-in page now offers independent farmer self-registration and organization/grower/investor applications. Independent registration activates immediately; organization operations require administrator approval in **Organization & people**. Register the first land/sketch during signup and add more under **Land records**. Approved owners register and assign farmers/supervisors; organization farmers only see their own expenses. Full instructions and migration behavior: [Registration and access](docs/REGISTRATION_AND_ACCESS.md). Phone numbers are registered identifiers; SMS/email verification and messaging are not connected.
