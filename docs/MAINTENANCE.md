# Maintenance policy

Weekly: review open issues/PRs, failed CI, upstream PETKIT protocol changes, dependency advisories and the compatibility matrix. Prioritize broken synchronization and authentication/data-loss defects over new features. Reproduce with synthetic fixtures; prepare a narrow fix with tests. No blanket auto-merge or unreviewed production deployment.

Before release: `npm ci && npm run check`, Worker dry-run, source privacy scan, license review, changelog and deployment smoke check. Review schema migration/rollback implications. Tag only after CI passes on the exact commit. Document which models were actually tested. Never include private fixtures in release artifacts.

GitHub configuration after creation: enable Issues, private vulnerability reporting, Dependabot alerts, and a protected main branch requiring CI. Do not require a nonexistent second reviewer on a solo-maintainer repository. Set repository description/topics accurately; avoid PETKIT affiliation claims.

Version 0.x is experimental. Use patch versions for compatible fixes, minor versions for behavior/API changes and migration notes. Keep access keys separate from session encryption keys. Back up D1 and encryption keys before stateful upgrades. This policy is a workflow, not a promise of 24/7 response.
