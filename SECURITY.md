# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in CSC Billing Software, please **do not** open a public GitHub issue. Instead, please report it responsibly by emailing:

**security@example.com**

Please include:
- Description of the vulnerability
- Location in the code (file, line number)
- Steps to reproduce (if applicable)
- Potential impact
- Suggested fix (if you have one)

We will:
1. Acknowledge receipt within **48 hours**
2. Provide an estimated timeline for a fix
3. Keep you updated on progress
4. Credit you in the security advisory (unless you prefer anonymity)

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |
| 0.x     | ⚠️ Limited (only critical issues) |

## Security Updates

- Security fixes are released **as soon as possible** after verification
- Critical vulnerabilities get a patch release
- Security advisories are published on GitHub

## Security Considerations

### Cloud Operation
- This application is cloud-connected via Supabase
- **Data is synchronized with the Postgres backend**
- Uses Drizzle ORM for data layer operations

### Data Protection
- Supabase Postgres database stores all data securely in the cloud
- Utilize Row Level Security (RLS) on Supabase for access control
- PIN protection is optional for additional security

### Electron Security
- Context isolation is enabled
- Node integration is disabled
- Preload scripts restrict IPC to safe APIs only

### Dependency Security
- Dependencies are regularly audited
- Dependabot automatically alerts on vulnerabilities
- Security patches are applied promptly

## Responsible Disclosure Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1**: Initial response and triage
3. **Day 3-7**: Fix developed and tested
4. **Day 7-14**: Patch release (depending on severity)
5. **Day 14**: Public security advisory

## Additional Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Electron Security Best Practices](https://www.electronjs.org/docs/tutorial/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Questions?

If you have questions about security practices or vulnerability reporting, please email security@example.com

---

Last updated: 2026-03-19
