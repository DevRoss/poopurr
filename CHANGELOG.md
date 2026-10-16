# Changelog

## Unreleased
- Update Vite, esbuild, Wrangler and its compatible Worker types to remove known development-tool dependency advisories.
- Adapt synthetic runtime tests to Wrangler’s bundled Miniflare 5 and fail CI on high-severity dependency audit findings.

## 0.3.0 — 2026-10-12 — initial public source edition
- Portable Cloudflare Workers + D1 deployment, independent browser authentication and bearer-authenticated MCP.
- Chinese dashboard: date-range backfill, per-cat charts, uncertainty-aware duration inference and persistent manual labels.
- Synthetic regression and runtime tests, CI, dependency updates and contribution/security documentation.
- Clean export excludes private deployment identity, database, credentials and original Git history.

## Earlier private prototype
- Added bounded historical sync and multi-cat behavior analysis.
- Corrected Worker redirect handling and HTML/JSON login error handling.
