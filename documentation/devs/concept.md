# MINIcontrol for developers

MINIcontrol is a modern, modular server controller designed to work across the various Trackmania titles. It provides a lightweight framework and a consistent plugin API so server operators and developers can manage servers, build features, and author plugins with minimal friction.

The project began as a response to the limitations of older server controllers. [XAseco](https://xaseco.org) — long the most widely used controller — is built on legacy PHP versions, and attempts to port it to newer PHP runtimes often break compatibility with existing plugins. While alternatives such as [Trakman](https://github.com/lythx/trakman) exist, they did not fully meet the modularity and plugin-compatibility goals we wanted.

To address these issues, reaby started MINIcontrol to deliver a future-proof controller with a single codebase able to support multiple Trackmania games. Evo Esports later adopted the project and contributed development resources to accelerate development and broaden the feature set.

One of MINIcontrol's core principles is cross-game plugin compatibility: plugins should work across multiple Trackmania titles with the same code. This is achievable because the Dedicated Server's XML-RPC API has remained relatively stable, and the controller provides small adapters to normalize differences between games.

This isn't our first server controller project — we have worked on several prior controllers (MLEPP, Expansion, Expansion², EvoSC, and others) — and we've learned many lessons that shaped MINIcontrol's architecture and design.

## Core

The core of MINIcontrol is intentionally compact and focused: it provides the essential runtime services and a stable foundation that plugin authors rely on. The core handles low-level tasks such as connecting to the dedicated server (GBX/XML-RPC), normalizing events across Trackmania titles, managing a small set of first-class managers (maps, players, UI, settings, bills), and providing a safe plugin lifecycle and loader for installing, resolving, and loading plugins.

Key responsibilities of the core include:

- Server connection and transport: A GBX client that wraps XML-RPC interactions and normalizes server method names for different game families.
- Event normalization: Converts different server callbacks and modescripts into unified `TMC.*` events for plugin authors.
- Plugin lifecycle, discovery and resolution: Scans standard plugin directories, validates `manifest.json`, resolves dependency graphs using semver ranges, and loads plugins in deterministic order.
- Built-in managers: Lightweight managers provide common services (players, maps, UI, settings, billing, and more) that plugins use to avoid reimplementing core functionality.
- Logging and telemetry: Centralized logging, optional Sentry integration, and consistent debug/logging utilities.
 - Database manager: Handles DB connection, migrations (Umzug + Sequelize) and exposes models under `core/schemas/*`. Registers standard models such as `players` and `map` and keeps runtime sync between server state and the DB.

The core intentionally avoids implementing high-level features directly — instead it exposes a simple, opinionated API and helpers (like `addListener`, `addCommand`, `addSetting`) so plugins can register functionality cleanly and the runtime can manage resources and lifecycle events safely.

This approach keeps the core small and maintainable while enabling a rich ecosystem of plugins that implement features on top of the same stable API.

### Overview of the folder structure

* 📂 **minicontrol**
  * 📁 **core**  - core contains all built-in classes and also plugins MINIcontrol ships with
    * 📄 minicontrol.ts - entry for controller
    * 📄 billmanager.ts - [BillManager class](./class/billmanager.md)
    * 📄 commandmanager.ts - [CommandManager class](./class/chatcmd.md)
    * 📄 mapmanager.ts - [MapManager class](./class/maps.md)
    * 📄 playermanager.ts - [PlayerManager class](./class/playermanager.md)
    * 📄 settingsmanager.ts - [SettingsManager class](./class/settingsmanager.md)
    * 📄 database.ts - [Database manager](./class/database.md)
    * 📄 server.ts - [Server class](./class/server.md)
    * 📄 menu.ts - [Menu class](./class/menu.md)
    * 📄 uimanager.ts - [UIManager class](./class/uimanager.md)
    * 📄 plugins/ - [Plugins guide](./plugins.md)
    * 📄 gbx/ - [GBX client](./class/gbx.md)
    * 📄 log.ts - [Logger](./class/log.md)
    * 📄 sentry.ts - [Sentry integration](./class/sentry.md)
    * 📄 utils.ts - [Utilities & helpers](./class/utils.md)
    * 📄 quickstart-plugin.md - [Plugin Quickstart](./quickstart-plugin.md)
    * 📄 class/index.md - [All core class docs](./class/index.md)
    * 📄 schemas/ - Sequelize models (e.g., `map.model.ts`, `players.model.ts`) and migration hooks
  * 📁 **documentation**  - this folder
  * 📁 **docker** - Dockerfile and example Docker Compose
  * 📁 **userdata** - contains all user data, e.g. the db migrations and schemas, the .sqlite file and user-installed plugins
  * 📄 .env - environmental variables for config

## Trackmania Mini Control - the `tmc` global variable

 `tmc` is available for everywhere and should be always used to interact with the dedicated server, plugins, database and such.

### Quick reference table

| Variable | Type | Short description | Example |
|---|---|---|---|
| `tmc.server` | Server | Main server call wrapper; use `call`, `send`, `multicall` | `await tmc.server.call('GetCurrentMapInfo')` |
| `tmc.players` | PlayerManager | Player cache & lookups | `await tmc.players.getPlayer(login)` |
| `tmc.ui` | UiManager | Display UI, add actions, clipboard | `tmc.ui.setClipboard(login, text)` |
| `tmc.maps` | MapManager | Maplist helpers and map info | `tmc.maps.currentMap` |
| `tmc.chatCmd` | CommandManager | Add/remove commands | `tmc.addCommand('/hello', cb)` |
| `tmc.settings` | SettingsManager | Persistent settings and colors | `tmc.settings.set('tmf.hud.round_scores', true)` |
| `tmc.database` | Database | DB connection + models (Sequelize). Use `tmc.database.sequelize` or `tmc.database.addModels([...])` | `await tmc.database.syncPlayers()` |
| `tmc.plugins` | { [key: string]: Plugin } | Loaded plugin instances | `tmc.plugins['example']` |
| `tmc.admins` | string[] | List of admin logins | `tmc.admins.includes(login)` |
| `tmc.game` | object | Dedicated server game info (`Name`) | `if (tmc.game.Name === 'TmForever')` |
| `tmc.storage` | any | Runtime shared key-value store | `tmc.storage['minicontrol.foo'] = 'bar'` |

---

### Public variables

Below are the `tmc` global variables available everywhere in plugins and core code. Each entry includes a short description and a cross-link to the relevant class or documentation.

- `tmc.admins` — string[] | List of admin logins maintained by `SettingsManager`.
  - Example: `if (tmc.admins.includes(login)) { /* allow admin action */ }`
  - See: [SettingsManager class](./class/settingsmanager.md)

- `tmc.version` — string | The controller runtime version (from package.json / version.json).
  - Example: `tmc.cli(`MINIcontrol ${tmc.version}`)`

- `tmc.startTime` — number | Controller start timestamp (ms since epoch) useful for uptime calculation.
  - Example: `const upSeconds = Math.floor((Date.now()-tmc.startTime)/1000);`

- `tmc.server` — Server | All server calls (XMLRPC) and event listener helper.
  - Example: `await tmc.server.call('GetCurrentMapInfo');`
  - See: [Server class](./class/server.md)

- `tmc.players` — PlayerManager | Player helpers, caches and utilities.
  - Example: `const players = tmc.players.getAll(); const player = await tmc.players.getPlayer(login);`
  - See: [PlayerManager class](./class/playermanager.md)

- `tmc.ui` — UiManager | UI helpers for displaying manialinks, widgets and windows.
  - Example: `await tmc.ui.displayManialink(widget); tmc.ui.setClipboard(login, text);`
  - See: [UiManager class](./class/uimanager.md)

- `tmc.chatCmd` — CommandManager | Chat command registration and execution.
  - Example: `tmc.addCommand('/hello', (login) => tmc.chat('Hi', login));`
  - See: [CommandManager class](./class/chatcmd.md)

- `tmc.maps` — MapManager | Map list helpers with `get()`, `getMap(uid)`, `currentMap` and `nextMap` properties.
  - Example: `const mp = tmc.maps.getMap(uid); const current = tmc.maps.currentMap;`
  - See: [MapManager class](./class/maps.md)

- `tmc.plugins` — { [key: string]: Plugin } | Dictionary of loaded plugin instances keyed by ID. Prefer using public APIs over calling plugin internals directly.
  - Example: `if (tmc.plugins['example']) { await tmc.plugins['example'].someMethod(); }`
  - See: [Plugin base & loader](./plugins.md)

- `tmc.game` — object | Runtime game info obtained from the dedicated server, e.g. `tmc.game.Name`.
  - Example: `if (tmc.game.Name === 'TmForever') { /* tmf specific */ }`

- `tmc.mapsPath` — string | Absolute path to the dedicated server's map directory for file operations.
  - Example: `tmc.cli(`Maps folder: ${tmc.mapsPath}`)`

- `tmc.storage` — { [key: string]: any } | A small global key-value store that persists only in runtime memory and is shared across plugins.
  - Example: `tmc.storage['minicontrol.someKey'] = 'value'; const v = tmc.storage['minicontrol.someKey'];`

- `tmc.database` — Database | Sequelize instance, models and sync helpers. Plugins can register models via `tmc.database.addModels([...])`.
  - Example: `await tmc.database.syncPlayers()`

Note: Use the provided manager classes to access runtime data instead of relying on plugin internals where possible; this improves maintainability and reduces risk of breaking changes.



### Public methods

```ts
interface MiniControl {
  // Get player by login
  async getPlayer(login: string): Promise<Player>;

  // Command helpers (wrapping CommandManager)
  addCommand(command: string, callback: CallableCommand, help?: string): void;
  removeCommand(command: string): void;

  // Plugin lifecycle helpers
  findPlugin(name: string): string | null;
  discoverPlugins(): Promise<{ id: string; path: string; manifest?: any; compatible?: boolean; loaded?: boolean }[]>;
  listPlugins(): Promise<{ id: string; path: string; manifest?: any; compatible?: boolean; loaded?: boolean }[]>;
  installPlugin(fromPath: string): Promise<string>;
  removePlugin(id: string): Promise<void>;
  loadPlugin(name: string): Promise<void>;
  unloadPlugin(name: string): Promise<void>;

  // Logging / debugging / chat
  cli(object: any): void;
  debug(object: any): void;
  chat(text: string, login?: undefined | string | string[]): void;
}
```

## Database manager

The Database manager centralizes runtime database access and migration handling. Key points:

- Initialization is optional and only runs when `DATABASE` is set in `.env`. During `tmc.database.init()` it connects, runs migrations, and registers models.
- Built-in models are in `core/schemas/*` (e.g. `map.model.ts`, `players.model.ts`). Plugins should register additional Sequelize models using `tmc.database.addModels([MyModel])`.
- Migrations: the controller runs Umzug migrations from three locations:
  - `./core/migrations/*.ts` — core migrations
  - `./userdata/migrations/*.ts` — user-level migrations
  - `./userdata/plugins/**/migrations/*.ts` — plugin-provided migrations
- The database manager emits event-driven sync and registers listeners for `TMC.PlayerConnect`, `TMC.PlayerDisconnect`, and `Trackmania.EndMap` to persist runtime data to DB.
- Runtime commands added by the Database manager include `/active` and `/topactive`.

Plugin author recommendations:

- Prefer using model classes from `core/schemas/*` for common tables (players, maps) to maintain compatibility.
- When registering models from a plugin, call `tmc.database.addModels([MyModel])` during `onLoad()` so models are discovered and used by the running Sequelize instance.
- Avoid direct raw SQL unless required; prefer model APIs for queries, transactions and updates.

Notes & troubleshooting:

- Supported DB drivers: `sqlite`, `mysql`, `postgres` as parsed from `DATABASE` env prefix.
- Migrations are run at startup and will cause the process to exit on failure — test migrations locally before deploying.
- If you need to add long-running imports or heavy parse work (like GBX parsing for map vehicles), do it lazily or in a background async task to avoid blocking startup.
