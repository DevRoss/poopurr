# Interactive demo

[Open the public demo](https://poopurr-demo.bushy-slug-1458.chatgpt.site)

The demo is a browser-only React application. All records are deterministic synthetic fixtures for two fictional cats, 麻薯 (Mochi) and 吐司 (Toast), covering September 13–October 12, 2026. Dates remain fixed so the example stays reproducible.

## Run and build

```sh
npm ci
npm run demo
# or build a portable static site:
npm run build:demo
```

Deploy `dist/demo/` to any static host. The build uses relative asset paths and does not need Cloudflare Workers, D1, authentication, a PETKIT account, or API secrets.

## What works

- 7 / 14 / 30 day views and cat filtering for the summary and records.
- Both-cat comparison charts using the production `web/behavior-panel.tsx` component.
- Manual classification changes recalculate statistics and inference through the production `lib/behavior.mjs` implementation.
- Export the displayed (up to 20) records as CSV, clearly marked as synthetic data.
- Reset restores the fixtures. Refresh also discards edits; nothing is persisted or transmitted.

The demo does not simulate a successful PETKIT connection or synchronization. Production history and credentials are never loaded. Device labels in the fixtures are explicitly described as simulated. The README banner is an illustration, not a screenshot.
