# Testing & Validation

## Test Tooling

| Scope | Framework | Command |
|-------|-----------|---------|
| Unit tests | — | `npm run test` (if configured) |
| Dev server | tsx | `npm run dev` |
| Migrations | umzug | `npm run migrate` |

## Plugin Validation

- After modifying a plugin, verify it loads without errors via `npm run dev`
- Check `manifest.json` is valid: has `id`, `version`, `requiresMinicontrolVersion`
- Verify Redis Streams consumer/producer changes against the KackyGG backend stream contract

## Delivery Evidence

- Which plugins/files were added/updated.
- How failure was observed before implementation (if TDD applicable).
- Commands run to validate the change works.

## Exceptions

Non-behavior changes (docs, comments, manifest metadata only) are exempt from testing.
