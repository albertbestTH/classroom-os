# Staging UAT security checklist

- [ ] Synthetic UAT data only; no real student/teacher personal data
- [ ] HTTPS enabled; Web cookies are Secure in hosted `NODE_ENV=production`
- [ ] Bearer tokens, cookies, password hashes, reset tokens, and DATABASE_URL are absent from logs and reports
- [ ] Disabled accounts are denied and active sessions revoked
- [ ] Teacher queries are constrained to exact `TeachingAssignment` classroom/subject scope
- [ ] Cross-school IDs return safe errors without existence leakage
- [ ] Password reset tokens expire and are not returned by hosted Production behavior
- [ ] Development bootstrap and debug routes are not deployed publicly
- [ ] No directory listing or committed uploads; profile upload limitation is documented
- [ ] API errors do not include stack traces, SQL, connection strings, or hashes
- [ ] JSON mutation body limits and same-origin checks remain enabled for Web
- [ ] Mobile bearer auth does not depend on browser cookies or CORS
- [ ] Login rate-limit behavior and multi-instance limitation are documented
- [ ] Provider backups and restore drill are configured for Staging

This is a focused UAT review, not a formal penetration test or production certification.
