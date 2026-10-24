# Changelog

## Unreleased
- Override Miniflare's Undici dependency to 7.30.1 to address newly disclosed advisories; remove the override once Wrangler ships a patched version.
- Upgrade React and React DOM together to 19.3.0, including matching types and a rendering compatibility test.
- Update Drizzle to 0.45.4, GitHub Actions to v7, and compatible development tools; retain TypeScript 5 and Node 22 types pending a separate migration.
- Apply the prepared development-tool security fixes, Miniflare 5 test adapter, dependency audit gate and grouped React updates.

## 0.3.0 — 2026-10-12 — initial public source edition
- Portable Cloudflare Workers + D1 deployment, independent browser authentication and bearer-authenticated MCP.
- Chinese dashboard: date-range backfill, per-cat charts, uncertainty-aware duration inference and persistent manual labels.
- Synthetic regression and runtime tests, CI, dependency updates and contribution/security documentation.
- Clean export excludes private deployment identity, database, credentials and original Git history.

## Earlier private prototype
- Added bounded historical sync and multi-cat behavior analysis.
- Corrected Worker redirect handling and HTML/JSON login error handling.
