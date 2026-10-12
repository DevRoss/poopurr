# Contributing

Start with README.md and docs/ARCHITECTURE.md. Report a concrete problem before large changes. Keep pull requests scoped to one behavior.

Run `npm ci`, `npm run check`, and `npx wrangler deploy --dry-run`. Never use real PETKIT credentials in CI. Fixtures must use synthetic IDs, timestamps and events. Report the model and region tested, without account IDs or raw logs.

Protocol changes need a regression test showing the captured *shape* of a sanitized response. Do not claim all devices work based on one model. Preserve attribution under THIRD_PARTY_NOTICES.txt.

Changes must preserve: no physical device actuation; unknown != zero; no cross-cat inference; inferred labels != confirmed elimination; manual corrections survive sync; failures retain history. Authentication, storage and migration changes require integration tests.

Use ordinary pull requests. Passing CI is necessary but does not replace review. Version breaking API/schema changes explicitly; never rewrite an applied migration. New dependencies must have a reason and compatible licenses.
