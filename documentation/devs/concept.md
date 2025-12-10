# MINIcontrol for developers

The core concept of MINIcontrol is to provide a modern, modular, easy-to-use server controller for all current Trackmania games.

The idea for this project came to reaby due to looking into hosting servers for TMNF/UF and [XAseco](https://xaseco.org) - the most popular and feature-rich server controller - really shows its age these days.

XAseco 1.16 relies on PHP 5.6, which has now been end-of-life for several years, and while there have been community attempts to port XAseco to modern versions of PHP like PHP7.4 and PHP8, these versions lack support for several available plugins, which would have to be ported manually.
Modern alternatives exist, like [Trakman](https://github.com/lythx/trakman), but for reaby's needs it proved not to be as modular as he would have liked. So he started working on MINIcontrol - the one tool for all Trackmania games. Soon after realizing its potential, we at Evo Esports took the project under our wing and provided reaby with additional development support for MINIcontrol.

One key idea of MINIcontrol is to make plugins compatible across all games with one single code-base.
While this would normally not be a small feat, thankfully the XML-RPC API of the Dedicated Servers for the Trackmania games haven't changed much over the years, meaning with a few adapters built-in it is very possible to build a plugin system running the same code for all these games.

Furthermode, this isn't reaby's or our first attempt to build a server controller, combined we have worked on several controller projects in the past (MLEPP, Expansion, Expansion², EvoSC, etc), and have learnt a lot of lessons from those.

## Core

The core of the controller itself doesn't do much, it provides a framework for plugin developers to work with.

### Overview of the folder structure

* 📂 **minicontrol**
  * 📁 **core**  - core contains all built-in classes and also plugins MINIcontrol ships with
    * 📄 minicontrol.ts - entry for controller
    * 📄 billmanager.ts - [BillManager class](./class/billmanager.md)
    * 📄 commandmanager.ts - [CommandManager class](./class/chatcmd.md)
    * 📄 mapmanager.ts - [MapManager class](./class/maps.md)
    * 📄 playermanager.ts - [PlayerManager class](./class/playermanager.md)
    * 📄 settingsmanager.ts - [SettingsManager class](./class/settingsmanager.md)
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
  * 📁 **documentation**  - this folder
  * 📁 **docker** - Dockerfile and example Docker Compose
  * 📁 **userdata** - contains all user data, e.g. the db migrations and schemas, the .sqlite file and user-installed plugins
  * 📄 .env - environmental variables for config

## Trackmania Mini Control - the `tmc` global variable

 `tmc` is available for everywhere and should be always used to interact with the dedicated server, plugins, database and such.

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

Note: Use the provided manager classes to access runtime data instead of relying on plugin internals where possible; this improves maintainability and reduces risk of breaking changes.

#### Quick reference table

| Variable | Type | Short description | Example |
|---|---|---|---|
| `tmc.server` | Server | Main server call wrapper; use `call`, `send`, `multicall` | `await tmc.server.call('GetCurrentMapInfo')` |
| `tmc.players` | PlayerManager | Player cache & lookups | `await tmc.players.getPlayer(login)` |
| `tmc.ui` | UiManager | Display UI, add actions, clipboard | `tmc.ui.setClipboard(login, text)` |
| `tmc.maps` | MapManager | Maplist helpers and map info | `tmc.maps.currentMap` |
| `tmc.chatCmd` | CommandManager | Add/remove commands | `tmc.addCommand('/hello', cb)` |
| `tmc.settings` | SettingsManager | Persistent settings and colors | `tmc.settings.set('tmf.hud.round_scores', true)` |
| `tmc.plugins` | { [key: string]: Plugin } | Loaded plugin instances | `tmc.plugins['example']` |
| `tmc.admins` | string[] | List of admin logins | `tmc.admins.includes(login)` |
| `tmc.game` | object | Dedicated server game info (`Name`) | `if (tmc.game.Name === 'TmForever')` |
| `tmc.storage` | any | Runtime shared key-value store | `tmc.storage['minicontrol.foo'] = 'bar'` |


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
