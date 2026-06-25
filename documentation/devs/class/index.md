[Back to Concept](../concept.md)

# Core classes (index)

This page lists the main core classes and modules in MINIcontrol and links to the complete reference documentation for each.

- [Server](./server.md) — Low-level API for communicating with the game server and handling callbacks (GBX transport wrapper).
- [MapManager](./maps.md) — Manage maps, map states and map-related operations.
- [PlayerManager](./playermanager.md) — Manage player state, lookups, and events.
- [UIManager](./uimanager.md) — UI helper and Manialink management utilities.
- [CommandManager](./chatcmd.md) — Chat commands registration and handling.
- [SettingsManager](./settingsmanager.md) — Configuration manager for plugin and server settings.
 - [Database](./database.md) — Database connection, migrations, models and sync helpers.
 - [BillManager](./billmanager.md) — Billing and economy helper (if enabled).
 - [Menu](./menu.md) — In-memory menu registry used by widgets and plugins.
 - [Plugins](./plugins.md) — Plugin base class, loader, resolver and manifest details.
 - [GBX Client](./gbx.md) — The GBXRemote / XML-RPC transport client.
 - [Utils](./utils.md) — Utility and helper functions used across the codebase.
 - [Log](./log.md) — Logging wrapper and console output helpers.
 - [Sentry](./sentry.md) — Error reporting and Sentry integration.
 - [MiniControl (tmc)](./minicontrol.md) — The global runtime API with plugin lifecycle, command helpers and server access.

If you don't find the class you're looking for, search the `core/` folder or ask on the project repo.