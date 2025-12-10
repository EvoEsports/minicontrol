# Install MINIcontrol

This guide walks through installing and running MINIcontrol using either a native Node/Bun environment or Docker. It covers prerequisites, environment configuration, database migrations, and running the controller in development or production.

## Prerequisites

- Node.js >= 21.5.0 (recommended) and npm, or Bun. The runtime uses `tsx` for TypeScript execution.
- Git (for cloning the repository)
- A supported database. By default MINIcontrol uses SQLite (no external DB server required), but PostgreSQL and MySQL are supported.
- Docker & Docker Compose (optional — recommended for production or reproducible deployments)

## Quick Start (Node / Bun)

1. Clone the repository (see above) and change into the folder.
2. Install dependencies:

```bash
npm install
```

3. Copy the example environment file and configure it.  PowerShell (Windows) and Bash examples are shown.

PowerShell (Windows):

```powershell
Copy-Item .env.example .env
```

Bash (Linux, macOS):

```bash
cp .env.example .env
# Edit .env to set your XMLRPC host/user/password and database config
```

Important entries in `.env` (basic):

| Variable | Default | Description |
|---|---|---|
| XMLRPC_HOST | "127.0.0.1" | Hostname or IP of the Trackmania server (or container name in Docker) |
| XMLRPC_PORT | 5000 | RPC port for your server |
| XMLRPC_USER | "SuperAdmin" | Superadmin login (from the server config) |
| XMLRPC_PASS | "SuperAdmin" | Password for the RPC account |
| DATABASE | `sqlite://userdata/local.sqlite` | DB connection string: sqlite, postgres or mysql URL |
| ADMINS | (empty) | Comma-separated logins with admin permissions in MINIcontrol |
| PLUGINS | (empty) | Inclusive whitelist of plugin IDs to load; use `""` to allow auto-discovery |
| DEBUG | false | Basic debugging flags for the runtime |
| ANSILEVEL | 1 | Log color level: 0 none, 1 4-bit, 2 24-bit |

4. Start the controller

```bash
npm start
```

For development with Bun (fast startup & hot reload), use:

```bash
npm run dev
```


## Quick TL;DR — One-liner setup

```bash
git clone https://github.com/EvoEsports/minicontrol.git && cd minicontrol && npm install && cp .env.example .env && npm start
```

PowerShell (Windows):

```powershell
git clone https://github.com/EvoEsports/minicontrol.git; Set-Location ./minicontrol; npm install; Copy-Item .env.example .env; npm start
```

Note: `start:bun` script is available if you prefer to run Bun directly.


```bash
# Use Bun to install and run with the example env
bun install
bun --env-file .env ./core/minicontrol.ts
```

---
## Commands cheat-sheet

| Command | Purpose |
|---|---|
| npm install | Install dependencies |
| npm run dev | Run with Bun in dev/watch mode (hot reload) |
| npm start | Start production controller (uses tsx) |
| npm run migrate | Run local migrations (requires env configured) |
| npm run migrate:docker | Run migrations inside the Docker container |
| docker compose -f docker/compose.yml up -d --build | Build and start the Docker environment |
| docker compose -f docker/compose.yml logs -f minicontrol | Follow controller logs |


## Docker (recommended for production / easy setup)

MINIcontrol includes an example Docker Compose in `docker/compose.yml`. It demonstrates how to run a Trackmania server (TmForever) and the controller in separate containers.

1. Build the Docker image (from repo root):

```bash
# Build the minicontrol image
docker build -t minicontrol:latest -f docker/Dockerfile .
```

2. Or use docker compose to build & run:

```bash
# from repo root
docker compose -f docker/compose.yml up -d --build
```

3. The example compose file sets `XMLRPC_HOST: trackmania` so the controller can communicate with the local Trackmania container. It also mounts `userdata` to persist configuration and plugin files across container restarts.

4. To view logs:

```bash
docker compose -f docker/compose.yml logs -f minicontrol
```

5. To run migrations inside the Docker environment:

```bash
# Run migrations inside the running container
docker compose -f docker/compose.yml exec minicontrol npm run migrate:docker
```

Tip: Make sure you configure `XMLRPC_USER` and `XMLRPC_PASS` in the compose environment or the `.env` file so MiniControl can authenticate with the server.

## Database & migrations

MINIcontrol uses Umzug and Sequelize for schema management. By default, the controller uses SQLite, but you can switch to Postgres or MySQL by setting the `DATABASE` environment variable to a proper DB URL.

Local migration (recommended after `.env` configuration):

```bash
npm run migrate
```

In Docker:

```bash
docker compose -f docker/compose.yml exec minicontrol npm run migrate:docker
```

Notes:
- Migrations are applied automatically on startup, but running the scripts manually can help during CI and debugging.
- For production, prefer a dedicated PostgreSQL / MySQL instance to avoid SQLite file locking and to allow backups.
## Plugin management & `PLUGINS` variable

By default MINIcontrol discovers plugins under `core/plugins/` and `userdata/plugins/`.

`PLUGINS` is an **inclusive (whitelist)** environment variable: if provided it will only load the listed plugin IDs and their explicitly listed dependencies. If `PLUGINS` is not set or is empty, the controller will attempt to discover and load all compatible plugins.

Examples:

```env
PLUGINS="admin,announces"
```

Use wildcards for nested plugins:

```env
PLUGINS="kacky,kacky/*,widgets/records"
```

Important: When using `PLUGINS` explicitly, include required dependencies in the list (e.g., include `database` if your plugin depends on it); otherwise the resolver will mark the plugin as missing dependencies.

Examples combining dependencies and wildcards:

```env
PLUGINS="database,kacky,kacky/*,widgets/records"
```

Setting an empty value has the same effect as not setting `PLUGINS` at all (all compatible plugins will be loaded):

```env
PLUGINS=""
```

## Managing the controller

- Start: `npm start` or `docker compose -f docker/compose.yml up -d`
- Stop: `Ctrl+C` (local) or `docker compose -f docker/compose.yml down` (Docker)
- Restart (Docker): `docker compose -f docker/compose.yml restart`

Use a process manager (systemd, pm2, or Docker) in production for monitoring and restarts.

Admin CLI commands in-game (as SuperAdmin):
- `//plugins` — show plugin manager UI
- `//plugin load <id>` — load a plugin
- `//plugin unload <id>` — unload a plugin
- `//plugin reload <id>` — reload a plugin

---
## Verifying your installation

1. Ensure the `XMLRPC_HOST` / port / credentials match your dedicated server.
2. Verify that the controller is able to connect and authenticate:

```bash
# Run the controller and watch logs for successful connection and 'Connected to Trackmania Dedicated server.' message
npm start
```

3. Confirm your plugins are loaded: check the `//plugins` command in-game or `tmc.discoverPlugins()` in dev console.

If all else fails, check logs (`docker logs` or console output), and open an issue with reproduction steps.

For additional details and examples see:

- [Dev: Quickstart plugin](../devs/quickstart-plugin.md)
- [Developer docs and class references](../devs/class/index.md)

---
## Example .env (minimal)

Copy `.env.example` and fill values you need. Minimal example for local testing using SQLite:

```env
XMLRPC_HOST=127.0.0.1
XMLRPC_PORT=2350
XMLRPC_USER=SuperAdmin
XMLRPC_PASS=your_password_here
DATABASE=sqlite://userdata/local.sqlite
ADMINS=MyLogin
# Optional: PLUGINS="admin,announces"
PLUGINS=
```

> Tip: On Windows use PowerShell `Copy-Item .env.example .env` instead of `cp`

---
## Troubleshooting (expanded)

- Cannot connect / authentication errors: verify `XMLRPC_*` credentials, service names in Docker (`XMLRPC_HOST`), and ensure the server accepts XML-RPC connections for your version.
- Plugins not loaded: check `PLUGINS` whitelist, plugin `manifest.json` and semver compatibility with `requiresMinicontrolVersion`.
- DB migration failures: confirm `DATABASE` URL and run migrations manually (`npm run migrate` or `docker exec` into container to run `npm run migrate:docker`).
- `SendDisplayManialinkPage` or Manialink issues: check `uimanager` logs for template parsing errors and confirm your server version matches the UI API.
- For permission errors in-game, ensure `ADMINS` covers the login you are using.

If the issue persists, please provide logs (console or `docker logs`) and a copy of your `.env` with secrets removed.

---
## Production hints & security

- Do not commit `.env` or secrets to the repository.
- Use a managed DB (Postgres / MySQL) for production and configure backups.
- Use TLS / reverse proxies for HTTP frontends if exposing a UI or webhooks.
- Use a process manager (systemd/pm2) or Docker orchestrator to ensure restarts and log collection.

---
## Getting help & reporting issues

- Join our [Discord server](https://discord.gg/evoesports) for real-time help and developer discussion.
- Open a bug report or feature request on GitHub: https://github.com/EvoEsports/minicontrol/issues
- Read the developer docs under `documentation/devs/` for plugin development guidance and API references.

---
### Feedback & contributions

If you’d like to contribute improvements (docs, tests, or code), please open an issue before sending a PR — we’ll gladly help you align with the project’s goals.

---
