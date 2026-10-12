# Security

This is an early single-household self-hosted application, not a hardened multi-tenant service. Anyone holding ACCESS_TOKEN can read and modify this installation's records. Do not issue the same deployment to unrelated households.

Please do not post vulnerabilities with credentials or real pet logs in public issues. Once the GitHub repository is published, enable GitHub Private Vulnerability Reporting and use its Security > Report a vulnerability action. Until that private channel is enabled, do not submit sensitive details publicly; contact the repository owner privately through an already established channel. No security-response SLA is promised.

Passwords are used once to obtain PETKIT sessions. Sessions are encrypted with AES-GCM and are bound to the local household identity. Activity records and manual labels are NOT encrypted at rest by the application; protect Cloudflare access and backups. Never commit .dev.vars, session keys or database exports.

Rotate ACCESS_TOKEN to invalidate browser cookies and MCP bearer credentials. Losing PETKIT_SESSION_KEY makes stored sessions unreadable; disconnect/reconnect is required, so preserve the key in a password manager. Authentication must not trust caller-supplied Sites identity headers. Browser writes require exact Origin; MCP requires a bearer token. Use HTTPS for deployed sites.

PETKIT uses an unofficial protocol and MD5 password representation; MD5 here is an upstream requirement, not a password-storage recommendation. Never follow login redirects or log login bodies.
