# MiniControl (with Kacky Plugin Suite)

MiniControl is a lightweight Trackmania/TmForever server controller with a modular plugin system. This repo is the **EvoEsports upstream** — the Kacky-specific plugins live in `userdata/plugins/kacky/`.

## Related Repositories

| Repo | GitHub | Purpose |
|------|--------|---------|
| **KackyGG** | [kacky-code/KackyGG](https://github.com/kacky-code/KackyGG) | Backend API the plugins talk to |
| **kacky-infra-ansible** | [kacky-code/kacky-infra-ansible](https://github.com/kacky-code/kacky-infra-ansible) | Deploys MiniControl to game servers |
| **MiniControl upstream** | [EvoEsports/minicontrol](https://github.com/EvoEsports/minicontrol) | This repo |

## Quick Commands

```bash
npm run dev          # Start with tsx (development)
npm run start        # Production start
npm run start:bun    # Bun runtime
npm run migrate      # Run DB migrations
```

## Core Architecture

- Plugin framework: `core/` — managers for maps, players, commands, UI, settings
- Data: Sequelize ORM with SQLite/MySQL/PostgreSQL support
- Transport: XML-RPC to TM Dedicated Server

## Kacky Plugin Suite (`userdata/plugins/kacky/`)

The Kacky plugins bridge MiniControl to the KackyGG backend via Redis Streams and REST.

### Key Files

| File | Purpose |
|------|---------|
| `index.ts` | Main bootstrap — initializes API, registers sync hooks, subscribes to Redis events |
| `api.ts` | Redis Streams consumer — reads `stream:server`, `stream:player`, `stream:map`, processes messages, ACKs |
| `redis/index.ts` | Redis publisher — sends game events (`kacky.AdminSay`, `kacky.SetPlayerLimit`) to Redis |
| `web.api.ts` | REST client to KackyGG API — player modifiers, favorites, server registration |
| `admin/index.ts` | Moderation commands (`ban`, `mute`, `vip`, `warn`, `addstreamer`) via REST |

### Sub-plugins

HUD widgets, analytics, records, servers, voting, AFK handling, chat, Discord integration, 3D display, loading screen, hunt event, favorite maps, streamer widget.

### Data Flow

```
Game Server (TM) → MiniControl → Redis Streams → KackyGG API → PostgreSQL
                                                → Discord Bot → Discord
MiniControl ← Redis Streams ← KackyGG API (replies: rank info, state updates)
MiniControl → REST → KackyGG API (modifiers, favorites, server registration)
```

## Conventions

- Each plugin: folder with `manifest.json` + `index.ts`, extends `Plugin`
- Declare dependencies: `declare module "@core/plugins"` for type safety
- Redis Streams: consumer groups per topic, `XREADGROUP` with block, explicit ACK
- REST client: `web.api.ts` wraps all backend HTTP calls
