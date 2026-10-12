# Architecture

Vite/React serves the dashboard. `server.ts` authenticates requests, provides same-origin REST and `/mcp`, and serves protected static assets. A deployment represents one household. Authenticated requests use a server-owned identity; no user-selected ID is accepted.

`lib/petkit.ts` adapts the upstream PETKIT HTTP protocol. `lib/records.mjs` normalizes events without inventing cat identity or elimination type. `lib/service.ts` encrypts sessions and stores events through Drizzle/D1. `lib/sync-plan.mjs` validates Shanghai date boundaries and bounded continuation. `lib/behavior.mjs` analyzes each cat separately. `lib/mcp.mjs` handles the supported stateless JSON-RPC tool subset.

Sync processes one day per call. For a range, keep calling with `next_start_date` and the original exclusive end date. A recent successful past-day fetch can be reused for six hours. Empty upstream data is not proof of zero visits. T3/T4 use a calendar date; camera models use backward timestamps with a four-page cap per source and report partial coverage. Account leases serialize sync; updates preserve manual labels atomically.

The managed ChatGPT/Sites deployment is a separate private deployment, not included in this repository. Its project IDs, OAuth ownership, tokens, data and Git history are not redistributed. This self-hosted server implements bearer authorization, not an OAuth authorization server; use clients supporting static headers. Publishing to a ChatGPT directory is a separate process.
