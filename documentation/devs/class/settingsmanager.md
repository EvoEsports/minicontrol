[Back to Concept](../concept.md)

# SettingsManager (Settings & Colors)

The `SettingsManager` handles persistent settings and theme colors for the controller and the plugins. It provides registration helpers for settings and colors, persistence support, callbacks on change, and admin list management.

## Table of contents

- [Overview](#overview)
- [Data files & persistence](#data-files--persistence)
- [Default settings & colors](#default-settings--colors)
- [API & usage](#api--usage)
- [Events emitted](#events-emitted)
- [Examples](#examples)
- [Best practices & notes](#best-practices--notes)

---

## Overview

`SettingsManager` centralizes configuration across core and plugins:
- Store and read settings (`tmc.settings.get()` / `tmc.settings.set()`)
- Register settings with default values and callbacks that run on update
- Manage colors (theme palette), register color settings and callbacks
- Persist settings and colors to JSON files per server
- Manage list of admin logins and persist them

It is usually accessible through `tmc.settings` at runtime and plugin authors should register settings and colors with the manager — the plugin base class provides `addSetting()` and `addColor()` shortcuts which track registrations for cleanup.

## Data files & persistence

By default, `SettingsManager` stores data under `userdata` with filenames suffixed by the server login. The file names are computed at runtime using `import.meta.dirnamename` and `tmc.server.login`:
- `settings_<serverlogin>.json`
- `colors_<serverlogin>.json`
- `admins_<serverlogin>.json`

Files are created when they don't exist. `SettingsManager.load()` reads defaults and persisted entries at startup. Changes are saved by calling `save()` (called during `set`/`setColor`/`addAdmin`/`removeAdmin`).

If the files are unreadable or can't be written a fatal error occurs (controller prints a message and exits).

## Default settings & colors

The manager keeps two sets of defaults:
- `_defaultSettings`: base default values registered by code
- `_defaultColors`: default color palette (hex 3 or 6-digit strings, e.g. `fff`)

Colors can be overridden by environment variables: `COLOR_<NAME>` will set a specific color at startup. The manager also computes lighter/darker variants for `button_bg` and `window_bg` automatically (uses `modLightness` helper).

## API & usage

Common usage from plugins and core:

```ts
// Register a setting
tmc.settings.register('myplugin.enableFeature', true, async (newVal, oldVal) => {
  // called when setting changes
}, 'Toggle my plugin feature');

// Read a setting
const enabled = tmc.settings.get('myplugin.enableFeature');

// Reset a setting to default
await tmc.settings.reset('myplugin.enableFeature');

// Register a color setting
tmc.settings.registerColor('myplugin.header', 'f07', async (newVal) => {
  // called when color changed
}, 'Header color for my plugin');

// Get color
const header = tmc.settings.getColor('myplugin.header');

// Set color
await tmc.settings.setColor('myplugin.header', '0f0');

// Add/remove admin
tmc.settings.addAdmin('playerLogin');
tmc.settings.removeAdmin('playerLogin');
```

Important methods & behavior:
- `register(key, default, callback, description)` — register a setting with optional callback (async) and description
- `unregister(key)` — remove a setting from defaults and live settings
- `get(key)` / `getDefault(key)` — read live or default value
- `set(key, value)` — update a setting and call callback if it changed (persist)
- `reset(key)` — reset setting to default and call callback
- `registerColor(key, default, callback, description)` — register color value
- `getColor(key)` / `setColor(key, value)` / `resetColor(key)` — color equivalents
- `addAdmin(login)` / `removeAdmin(login)` — manage runtime admin list; master admins (ADMINS env) can’t be removed

### Callback semantics

- Callbacks are executed asynchronously after we persist the change and before emitting the `TMC.SettingsChanged` or `TMC.ColorsChanged` events.
- If new value equals previous value, the manager does not call callbacks.

## Events emitted

SettingsManager emits events on the server bus so other parts of the system can react:
- `TMC.SettingsChanged` — when any setting is modified
- `TMC.ColorsChanged` — when a color is changed
- `TMC.AdminsChanged` — when admin list changes

These events are emitted after the manager persists changes and calls any associated change callbacks.

## Examples

### Register a setting (with callback)

```ts
tmc.settings.register('myplugin.enabled', true, async (n, o, _k) => {
  if (n) {
    // enable plugin feature
  } else {
    // disable plugin feature
  }
}, 'Enable or disable my plugin');
```

### Toggle a color value

```ts
// register
tmc.settings.registerColor('myplugin.header', 'f07', async (n) => {
  // apply header color change to all UIs or widgets
});

// set later
await tmc.settings.setColor('myplugin.header', '0f0');
```

### Admin management

```ts
tmc.settings.addAdmin('login1');
tmc.settings.removeAdmin('login1');
```

## Best practices & notes

- Register settings and colors during `onLoad` of your plugin and avoid registering inside a frequently executed code path.
- Use `this.addSetting()` and `this.addColor()` (plugin base helpers) instead of `tmc.settings.register()` — those track changes and remove settings automatically on plugin unload.
- Use `reset()` when you want to revert a setting to default from the UI.
- If you want to override colors globally for a running controller, use environment variables `COLOR_<NAME>` or change via the UI which calls `setColor()`.
- The manager preserves default settings and only writes non-default keys to `settings.json` to keep files compact.

## Troubleshooting

- If settings don't persist: confirm the controller can write into `userdata` folder and the `settings_<login>.json` file exists with correct permissions.
- If callbacks do not fire: verify your callback is set in `register()` and you call `set()` with a changed value (the manager ignores identical values).
- If `addAdmin()` or `removeAdmin()` fails: confirm the login is not a master admin (can't remove) and that `masterAdmins` are set via `ADMINS` env.
