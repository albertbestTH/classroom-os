# Staging email and password reset

The password-reset and email-change services create short-lived token records. In non-production they may return a one-time development token for local tests; production intentionally does not return it. No email provider is configured in this repository, so a hosted Staging deployment must not claim that an email was delivered.

Before teacher UAT, select one of:

1. a provider sandbox/mail-capture inbox with a staging-only sender;
2. an administrator-controlled reset procedure outside the public app; or
3. a documented manual token handoff in a protected deployment console.

Never add a public token-retrieval endpoint, log raw tokens, or expose reset links to browser users. Token records expire after the existing short lifetime and successful password changes revoke active sessions. Production email, bounce handling, invitation delivery, and support workflows remain open work.
