# Login and registration visual refresh — 19 October 2026

Modernized the shared RegistrationAuth screens with the Farmwise forest-green/lime palette, a decorative land illustration, benefit labels, rounded form cards, clearer inputs and upload controls, and numbered account/organization/land sections. Account fields, names, required flags, native labels, autocomplete attributes, password limits, upload accept rules, submission routes and payload structures are unchanged. Changing between login/registration modes scrolls to the form's top; changing language preserves values in the current form.

Individual self-registration still activates immediately, with optional email, required mobile and first-land/sketch details. Individual farmers retain English/Sinhala selection and the selected language is sent in the existing registration account payload. All new visible copy has Sinhala dictionary entries. Organization forms remain English, require administrator approval, and keep type-dependent registration-number/evidence requirements. Initial administrator setup retains its one-time setup flow and existing password rule. There is no new invitation, email, SMS or cloud integration.

## Verification
- 40 automated tests, TypeScript checks and production build pass.
- 44 isolated HTTP integration groups pass, including independent activation, phone/email login, language storage and role restrictions, missing/invalid upload rejection, organization registration/review/resubmission/approval, and one-time admin setup protections.
- Browser: modern login and both registration layouts inspected; individual optional email and minimum 12-character password retained; required sketch input retained; typed farmer name preserved while switching to Sinhala; company registration number/evidence required, grower equivalents optional; organization page exposes no language selector; approval submission button retained.
- Login, organization form and individual English/Sinhala form fit a 390px viewport without page overflow. Mode changes return to the top. No new account/password was entered or submitted during UI inspection. Browser console clean.
- Screenshots: login-modern.png, registration-individual-modern-en.png, registration-individual-modern-si.png, registration-organization-modern.png. UI work used isolated localhost:3107 records, with no real database changes.
