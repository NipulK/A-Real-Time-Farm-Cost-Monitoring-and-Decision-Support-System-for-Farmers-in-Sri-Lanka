# Temporary local demonstration passwords

Enabled 1 November 2026 at the user's request for the viva. Local mode accepts four/five ASCII digits, including leading zeros, or existing 12–256 character passwords. Three/six-digit short passwords and short alphabetic/mixed passwords are rejected. All roles use the same server-side policy for registration, member creation, administrator creation, changes and resets. Password hashes remain salted scrypt; session revocation, role authorization and login throttling are retained.

Runtime configuration: FARMWISE_DEMO_PASSWORDS=true in the ignored .env.local. Password guidance appears beside creation/change/reset inputs, translated for independent farmers; no global banner is shown. Form constraints and inline hints use the server-provided mode; a client request cannot enable it. Existing account passwords are not automatically changed. Awaiting the user's chosen numeric password before resetting the five synthetic demonstration accounts. Real passwords are unchanged.

To return to normal mode after the viva:
1. While demo mode is still enabled, change numeric account passwords to 12+ character passwords, especially the administrator.
2. Set FARMWISE_DEMO_PASSWORDS=false (or remove it) in .env.local.
3. Restart both local servers. Normal mode rejects new numeric passwords and blocks login with four/five-digit passwords; previously active sessions are not automatically revoked solely by changing this setting. Use password changes/resets to revoke sessions.
4. Local recovery command npm run recover-admin retains the strong-password requirement if administrator access must be recovered.

Demo mode is disabled when FARMWISE_HTTPS=true or a non-loopback/non-HTTP FARMWISE_ORIGIN is configured. No hosting was added. The current startup commands bind to 127.0.0.1.

Verification: 73 automated tests, successful TypeScript/production build and 54 isolated integration groups in each of normal and demo mode. Integration tests use separate disposable databases and restore existing QA users' original long passwords after temporary PIN checks. New synthetic PIN accounts exist only in disposable test storage, not the real or persistent demo databases. Browser visual acceptance is not claimed because the saved browser permission denial remains.
