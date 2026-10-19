# Self-employed farmer profile editing — 19 October 2026

The user selected **Self-employed farmer** as the visible category name (third naming option). Visible registration and account labels now use that name; existing database account_type=`independent` and base role=`farmer` remain unchanged. Organization farmers remain a separate category.

## Implemented

Only a self-employed farmer can open **My profile & settings → Edit profile** and change their own name, mobile number, optional email, district and village. Farmer ID, account category, permissions, organization link, language preference and password cannot be changed through this form/API. Password changes remain in Account security.

The server authenticates each update and checks account_type, uses a strict field allowlist and derives the target from the session. It normalizes phone/email, enforces required fields, checks contact uniqueness excluding the current account, and writes users/profile changes plus before/after audit in a transaction. Blank email retains mobile-only sign-in using the existing private placeholder convention. Updated email/mobile identifiers work with the same password; previous changed identifiers stop working. Existing sessions retain their user ID. Email/SMS verification remains unimplemented.

Profile district/village edits do not change existing land locations, cultivation ownership, validation or expenses. Owner display names on land cards naturally reflect the updated account name.

The form includes save/cancel, validation errors, duplicate handling and English/Sinhala copy. Other categories receive neither this editor nor API permission.

## Verification

- 30 automated tests passed, including category-specific profile rendering and Sinhala display.
- Typecheck and production build passed.
- 43 HTTP integration groups passed. New coverage includes own profile updates; normalized identifiers; sign-in using new mobile/email; rejection of old identifiers; clearing optional email while preserving mobile login; duplicate rejection/rollback; malformed/invalid fields; forbidden role/user ID/organization/public ID/password/language properties; anonymous/origin checks; denial for admin, owner, supervisor and both organization farmers; fixed IDs, language and actual land metadata; audit retention.
- Initial QA assertion included the joined land owner display name in “unchanged land data.” Corrected that assertion to require the new owner name while comparing actual land fields unchanged. No application defect was involved.
- Browser: opened the five-field editor, checked cancel restores saved data, saved synthetic name/village edits, observed updated sidebar/profile, reloaded and confirmed persistence, inspected Sinhala editor, measured 390 px viewport with 390 px document width and no overflow, and verified a clean console. Contact identifiers were left unchanged in browser; their actual change/login workflow was covered by HTTP tests.

Evidence: qa-profile-editor.png, qa-profile-browser.json and qa-http-results.json. All synthetic records were confined to disposable QA storage. Owned QA servers/storage were cleaned; real installation and its dev server were preserved. Physical-device/other-engine tests and browser contact-credential changes were not performed.
