
<div align="center">
  <img src="./images/minicontrol.png" width="60%" alt="MINIcontrol" />
  <br />
  <img alt="GitHub" src="https://img.shields.io/github/license/EvoEsports/minicontrol?label=License" />
  <img alt="GitHub Tag" src="https://img.shields.io/github/v/tag/evoesports/minicontrol?label=Current%20Version" />
  <img alt="NodeJS" src="https://img.shields.io/badge/node.js-6DA55F?logo=node.js&logoColor=white" />
  <a href="https://discord.gg/evoesports"><img alt="Discord" src="https://img.shields.io/discord/384138149686935562?label=Discord&logo=discord&logoColor=fff" /></a>
  <a href="./documentation/index.md"><img alt="Docs" src="https://img.shields.io/badge/docs-Documentation-blue?logo=read-the-docs&logoColor=white" /></a>
</div>

# MINIcontrol — Trackmania Server Controller

> Lightweight, modular controller and plugin framework for Trackmania & TmForever servers.

MINIcontrol provides a pluggable runtime for server automation, UI (Manialinks), player and map management, and scriptable features via a stable plugin API.

Documentation: [Documentation index](./documentation/index.md) — the single source of truth for setup, configuration, and developer reference.

---

## Key features

- Plugin-based architecture with manifest/semantic versioning and deterministic resolver
- Built-in UI helpers: Manialinks, Widgets, Windows, List Windows and templates
- Player, Map, Command, and Settings managers — feature rich and extensible
- Migration support via Umzug / Sequelize (SQLite by default; Postgres/MySQL supported)
- Docker Compose example for easy server + controller deployment
- Developer-friendly with example plugin skeleton and comprehensive docs

---
## Requirements

- Node.js >= 21.5.0 (recommended) or Bun
- npm / Bun (for dev workflows)
- Optional: PostgreSQL / MySQL for production, but SQLite is used by default
- Git, and a Trackmania / TmForever server that supports XML-RPC

---
## Quick Start — Local (Node)

Clone the repository, install dependencies, copy the environment, run migrations and start:

```bash
git clone https://github.com/EvoEsports/minicontrol.git
cd minicontrol
npm install --production
cp .env.example .env  # or `Copy-Item .env.example .env` on PowerShell
npm start
```

For development with Bun and hot reload:

```bash
npm run dev
```

---
## Quick Start — Docker

There’s an example Compose file at `docker/compose.yml` with a Trackmania container and a `minicontrol` container.

Build the image and run with Docker Compose:

```bash
docker compose -f docker/compose.yml up -d --build
```

View logs:

```bash
docker compose -f docker/compose.yml logs -f minicontrol
```

Run migrations inside the container (if needed):

```bash
docker compose -f docker/compose.yml exec minicontrol npm run migrate:docker
```

---
## Environment & PLUGINS

Important environment variables live in `.env.example`. Highlights:

- `XMLRPC_HOST`, `XMLRPC_PORT`, `XMLRPC_USER`, `XMLRPC_PASS` — Trackmania XML-RPC credentials
- `DATABASE` — DB URL (`sqlite://userdata/local.sqlite`, or Postgres/MySQL)
- `ADMINS` — comma-separated admin logins
- `PLUGINS` — inclusive whitelist (comma-separated list) of plugin IDs. If empty, MINIcontrol auto-discovers and attempts to load all compatible plugins. Wildcards are supported (`kacky/*`).

Example (.env):

```env
XMLRPC_HOST=127.0.0.1
XMLRPC_PORT=2350
XMLRPC_USER=SuperAdmin
XMLRPC_PASS=SuperAdmin
DATABASE=sqlite://userdata/local.sqlite
ADMINS=MyLogin
# PLUGINS="admin,announces"
PLUGINS=
```

---
## Database & migrations

MINIcontrol uses Umzug + Sequelize. After configuring `DATABASE` in `.env` run:

```bash
npm run migrate
```

For Docker deployments, run the migration script inside the running `minicontrol` container using `npm run migrate:docker`.

Notes on production DBs:
- Use PostgreSQL or MySQL in production to avoid SQLite file lock limitations and to enable backups and scaling.

---
## Plugin system basics

Plugins live in `core/plugins` (built-in) and `userdata/plugins` (user-provided). Every plugin requires a manifest with `id`, `version`, and `requiresMinicontrolVersion`.

- `PLUGINS` (env) is a whitelist — list plugins to load. If omitted, discovered compatible plugins are loaded automatically.
- Wildcard patterns (e.g., `kacky/*`) are supported.
- When whitelisting, include required dependencies explicitly.

For plugin development and a minimal example, see: `documentation/devs/quickstart-plugin.md` and `userdata/plugins/example-plugin`.

---
## Migrations: XAseco / PyPlanet / Trakman

This project includes migration scripts that help import data from popular controllers. Use the migration scripts (examples below) and consult the migration docs for each source tool:

- XAseco: `tsx --env-file=.env xaseco.ts xaseco.sql`
- PyPlanet: `tsx --env-file=.env pyplanet.ts pyplanet.sql`
- Trakman: `tsx --env-file=.env trakman.ts`

Note: the migration tools can use an in-memory SQLite instance for conversion and may require you to remove `ALTER TABLE` commands and explicit transaction statements from your SQL dump. Check the migration script source for details and test on a local copy of your database first.

## Notes for migrating databases

Minicontrol migrate tool uses in-memory sqlite database to process the MySQL data.
This means not all MySQL features works, its adviced to remove transactions and creating indexes from the .sql dumpfile. With your favourite text editor, remove these lines, if exists:

```sql
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- keep everything between
-- and remove ending COMMIT:

COMMIT;

```

You also need to remove all `ALTER TABLE` instructions from the .sql dump

**Example:**

```sql
-- remove ALTER TABLE until semicolon ;
ALTER TABLE `rs_times`
  ADD PRIMARY KEY (`ID`),
  ADD KEY `playerID` (`playerID`,`challengeID`),
  ADD KEY `challengeID` (`challengeID`),
  ADD KEY `score` (`score`);
```

---
## Contributing & support

Want to help? Contributions are welcome — please open an issue first to discuss the changes before sending a pull request.

Support channels:
- Discord: https://discord.gg/evoesports — join `#minicontrol` for help and discussion
- Issues: https://github.com/EvoEsports/minicontrol/issues (bug reports and feature requests)

Testing your changes with Docker:

```bash
docker build -t minicontrol:test -f docker/Dockerfile .
```

## Security & production tips

- Do not commit `.env` files with secrets to the repository — use a secrets manager or environment-based config.
- Use PostgreSQL or MySQL in production for reliability and backups.
- Use a process manager (systemd, pm2, or Docker orchestration tools) for automatic restarts and log shipping.

---
## License

MINIcontrol is released under the license in `LICENSE`.


