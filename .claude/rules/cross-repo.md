# Cross-Repository Work

When working on tasks that span multiple repos, load context from the target repo.

## Repo Locations

| Repo | Local | GitHub |
|------|-------|--------|
| **KackyGG** | `../KackyGG` | [kacky-code/KackyGG](https://github.com/kacky-code/KackyGG) |
| **kacky-infra-ansible** | `../kacky-infra-ansible` | [kacky-code/kacky-infra-ansible](https://github.com/kacky-code/kacky-infra-ansible) |
| **MiniControl** | `.` (this repo) | [EvoEsports/minicontrol](https://github.com/EvoEsports/minicontrol) |
| **Kacky MC plugins** | `userdata/plugins/kacky` (this repo) | [kacky-code/minicontrol-plugin-kacky](https://github.com/kacky-code/minicontrol-plugin-kacky) |

## Architecture Docs

The system-wide architecture (all repos, all servers, all data flows) lives in:
`../kacky-infra-ansible/docs/architecture.md`

When updating architecture, update that file — it is the single source of truth for system topology.

## Data Flow: MiniControl ↔ KackyGG

- `userdata/plugins/kacky/api.ts` — Redis Streams consumer (reads `stream:server`, `stream:player`, `stream:map`)
- `userdata/plugins/kacky/redis/index.ts` — publishes game events to Redis
- `userdata/plugins/kacky/web.api.ts` — REST client to KackyGG API

## When Working Across Repos

- **Backend API changes**: check `../KackyGG/src/KackyGG.Api/` for endpoint contracts, DTOs, stream subjects.
- **Redis Streams contract changes**: coordinate between backend (`../KackyGG/src/KackyGG.Api/Infrastructure/Streams/`) and this plugin (`userdata/plugins/kacky/api.ts`).
- **Deployment changes**: update `../kacky-infra-ansible/` templates and playbooks.
