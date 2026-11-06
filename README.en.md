# Poopurr

<img src="docs/assets/banner.svg" alt="Poopurr — Small habits. Big love." width="100%" />

**[🐾 Try the live demo](https://poopurr-demo.bushy-slug-1458.chatgpt.site)** · [中文 README](README.md) · [Demo guide](docs/DEMO.md)

No sign-in required. Explore two fictional cats, switch date ranges, and edit sample labels. Synthetic data only; changes stay in the current page.

Self-hosted PETKIT litter-box history, per-cat behavior charts and read-only MCP tools. Early experimental release, MIT licensed, unofficial and not affiliated with PETKIT.

## Run locally

Node.js 22.13+ (Node 24 recommended):

```sh
git clone https://github.com/DevRoss/poopurr.git
cd poopurr
npm ci
npm run setup
npm run dev
```

Open http://localhost:8787. Read ACCESS_TOKEN from the generated local `.dev.vars`, sign in, then connect your PETKIT account in the dashboard. Never commit this file. Local development uses Wrangler and D1 without a Cloudflare login.

Each deployment represents one household. All holders of its access token share that household's data. Deploy separate instances for unrelated users.

For production, create a Cloudflare D1 database, replace the placeholder database ID in `wrangler.jsonc`, set PUBLIC_ORIGIN to your exact HTTPS origin, configure independent ACCESS_TOKEN and PETKIT_SESSION_KEY secrets with `wrangler secret put`, apply D1 migrations remotely, then run `npm run deploy`. Keep production secrets out of source and preserve the session encryption key. See the Chinese README for exact commands.

## Features and limits

- Up to 31 days of bounded date-range backfill, deduplication and retry.
- Hourly activity heatmaps, daily observed counts and visit-duration histograms.
- Device detection, manual labels and duration hypotheses remain separate. Duration cannot conclusively identify urine versus stool.
- Eight MCP tools at `/mcp`, using `Authorization: Bearer <ACCESS_TOKEN>` in clients supporting static headers. This server does not implement an OAuth authorization server.
- No physical device commands. Missing data is unknown, not confirmed zero visits.

T4 historical retrieval was tested in a private deployment. T3 and camera-model historical pagination still need hardware validation. The unofficial upstream API can change or expire sessions. Camera retrieval is bounded to four pages per source; each device/day stores at most 500 normalized visits, and queries return at most 5,000.

Passwords are not stored; sessions are AES-GCM encrypted. Activity records are not application-encrypted at rest. Protect the cloud account, keys and backups. Never send real credentials or private logs in issues.

## Development

`npm run check` runs type checks, synthetic tests (including workerd/D1), and the frontend build. `npx wrangler deploy --dry-run` checks the Worker bundle. See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [architecture](docs/ARCHITECTURE.md), [inference limits](docs/CLASSIFICATION.md) and [maintenance](docs/MAINTENANCE.md).

MIT. Upstream attribution: [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.txt).

[Daily fetch coverage](docs/COVERAGE.md): query responses identify missing or partial fetch evidence without treating missing records as zero visits.
