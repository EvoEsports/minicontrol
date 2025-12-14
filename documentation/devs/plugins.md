[Back to Concept](concept.md)

# Plugins

## Table of contents

- [Plugin manifest.json (0.12+)](#plugin-manifestjson-012)
  - [Basic Structure](#basic-structure)
  - [Manifest Schema](#manifest-schema)
  - [Required Fields](#required-fields)
  - [Optional Fields](#optional-fields)
- [Dependency Management](#dependency-management)
  - [Declaring Dependencies](#declaring-dependencies)
  - [Semver Range Examples](#semver-range-examples)
  - [Dependency Resolution Algorithm](#dependency-resolution-algorithm)
  - [Load Order Example](#load-order-example)
  - [Fallback Resolution](#fallback-resolution)
- [Game Compatibility](#game-compatibility)
- [MINIcontrol Version Compatibility](#minicontrol-version-compatibility)
- [Plugin Discovery and the PLUGINS Environment Variable](#plugin-discovery-and-the-plugins-environment-variable)
- [Creating a New Plugin with Manifest](#creating-a-new-plugin-with-manifest)
  - [Create Plugin Directory Structure](#1-create-plugin-directory-structure)
  - [Write Your manifest.json](#2-write-your-manifestjson)
  - [Implement Your Plugin](#3-implement-your-plugin)
  - [Test Plugin Loading](#4-test-plugin-loading)
  - [Verify in Runtime](#5-verify-in-runtime)
- [Troubleshooting](#troubleshooting)
  - [Plugin Not Loading](#plugin-not-loading)
  - [Dependency Resolution Failures](#dependency-resolution-failures)
  - [Game Compatibility Issues](#game-compatibility-issues)
  - [Version Range Debugging](#version-range-debugging)
- [Helper methods introduced in 0.12](#helper-methods-introduced-in-012)
  - [addListener](#addlistener-server-event-listeners)
  - [removeListener](#removelistener-manual-listener-removal)
  - [addCommand](#addcommand-chat-commands)
  - [addSetting](#addsetting-plugin-settings)
  - [removeSetting](#removesetting-manual-setting-removal)
  - [addColor](#addcolor-color-settings)
  - [removeColor](#removecolor-manual-color-removal)
  - [destroy](#destroy-automatic-cleanup)
- [Chat commands](#chat-commands)
- [Listeners](#listeners)
- [Interacting with the dedicated server](#interacting-with-the-dedicated-server)
- [Sending chat messages](#sending-chat-messages)
- [Write to stdout / log file](#write-to-stdout--log-file)

## Plugin manifest.json (0.12+)

Starting with MINIcontrol 0.12, every plugin **must** include a `manifest.json` file in its root directory. The manifest system enables:

- **Semantic versioning** with automatic compatibility checking
- **Dependency management** with deterministic resolution
- **Game compatibility** declarations (TmForever, Trackmania 2020, etc.)
- **Topological loading** ensuring dependencies load before dependents

### Basic Structure

Every plugin must have a `manifest.json` at its root:

```
core/plugins/myplugin/
  ├── manifest.json
  └── index.ts
```

### Manifest Schema

```json
{
  "id": "myplugin",
  "name": "My Plugin",
  "description": "Optional description of what the plugin does",
  "authors": "Your Name",
  "date": "2025-12-10",
  "version": "1.0.0",
  "requiresMinicontrolVersion": "^0.12.0",
  "requiresGame": "Trackmania",
  "depends": [
    { "id": "database", "range": "^1.0.0" },
    { "id": "menu", "range": ">=1.2.0 <2.0.0", "optional": false }
  ]
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plugin identifier (use folder path for nested plugins, e.g., `widgets/records`) |
| `name` | string | Human-readable plugin name |
| `version` | string | Plugin version following [semantic versioning](https://semver.org) (e.g., `1.2.3`) |
| `requiresMinicontrolVersion` | string | Semver range of compatible MINIcontrol versions (e.g., `^0.12.0`) |
| `date` | string | ISO date (YYYY-MM-DD) or datetime when the plugin was last updated |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `description` | string | Brief description of the plugin's functionality |
| `authors` | string | Plugin author(s) name(s) |
| `requiresGame` | string \| null | Target game: `"Trackmania"`, `"Maniplanet"`, `"TmForever"`, or `null` for any |
| `depends` | array | List of plugin dependencies (see Dependency Management below) |

## Dependency Management

### Declaring Dependencies

Dependencies are specified in the `depends` array. Each dependency must include:

```json
{
  "id": "database",
  "range": "^1.0.0",
  "optional": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Plugin ID of the dependency |
| `range` | string | Yes | Semver range specifying compatible versions |
| `optional` | boolean | No | If `true`, plugin loads even if dependency is missing (default: `false`) |

### Semver Range Examples

MINIcontrol uses standard [semantic versioning](https://semver.org) ranges:

| Range | Matches | Description |
|-------|---------|-------------|
| `^1.0.0` | `>=1.0.0 <2.0.0` | Compatible with 1.x (caret range) |
| `~1.2.3` | `>=1.2.3 <1.3.0` | Compatible with 1.2.x (tilde range) |
| `>=1.0.0 <2.0.0` | 1.0.0 to 1.9.9 | Explicit range |
| `*` | any version | Any version (use sparingly!) |
| `1.2.3` | exactly 1.2.3 | Exact version match |

**Best practice:** Use caret ranges (`^1.0.0`) for most dependencies to allow backward-compatible updates.

### Dependency Resolution Algorithm

MINIcontrol uses a sophisticated resolver to compute the optimal plugin load order:

1. **Discovery**: Scans `core/plugins` and `userdata/plugins` for all available plugins
2. **Validation**: Validates each `manifest.json` against the schema
3. **Compatibility Check**: Filters out plugins incompatible with the current game or MINIcontrol version
4. **Version Selection**: For each required plugin, picks the highest compatible version
5. **Dependency Graph**: Builds a directed acyclic graph (DAG) of dependencies
6. **Topological Sort**: Orders plugins so dependencies always load before dependents
7. **Cycle Detection**: Fails fast if circular dependencies are detected

### Load Order Example

Given these manifests:

**records/manifest.json:**
```json
{
  "id": "records",
  "version": "1.0.0",
  "depends": [
    { "id": "database", "range": "^1.0.0" }
  ]
}
```

**widgets/records/manifest.json:**
```json
{
  "id": "widgets/records",
  "version": "1.0.0",
  "depends": [
    { "id": "records", "range": "^1.0.0" },
    { "id": "widgets", "range": "^1.0.0" }
  ]
}
```

The resolver will load in this order:
1. `database` (no dependencies)
2. `records` (depends on database)
3. `widgets` (no dependencies)
4. `widgets/records` (depends on records and widgets)

### Fallback Resolution

If the strict resolver fails (due to version conflicts or missing dependencies), MINIcontrol falls back to a more lenient algorithm:

1. Attempts to load plugins in discovery order
2. Skips plugins with unmet dependencies
3. Logs warnings for each skipped plugin
4. Continues loading remaining plugins

This fallback ensures the server starts even with dependency issues, though some plugins may not load.

## Game Compatibility

The `requiresGame` field declares which Trackmania title(s) your plugin supports:

```json
{
  "requiresGame": "TmForever"
}
```

**Valid values:**
- `"TmForever"` - TrackMania Forever / Nations / United
- `"Trackmania"` - Trackmania 2020 / Trackmania²
- `"Maniplanet"` - ManiaPlanet titles
- `null` - Works with any game (default if field is omitted)

**How it works:**
- During discovery, MINIcontrol checks the current game against each plugin's `requiresGame`
- Incompatible plugins are automatically excluded from the load list
- This prevents runtime errors from game-specific API calls

**Example - TmForever-only plugin:**
```json
{
  "id": "tmnf/dedimania",
  "requiresGame": "TmForever",
  "requiresMinicontrolVersion": "^0.12.0"
}
```

## MINIcontrol Version Compatibility

The `requiresMinicontrolVersion` field ensures your plugin only loads on compatible controller versions:

```json
{
  "requiresMinicontrolVersion": "^0.12.0"
}
```

**Common patterns:**
- `^0.12.0` - Compatible with 0.12.x (recommended for new plugins)
- `>=0.11.0 <1.0.0` - Works with 0.11+ but not yet tested with 1.0
- `*` - Any version (risky! Only use if truly compatible with any version)

**How it's checked:**
- MINIcontrol compares its own version against the range
- Incompatible plugins are excluded during discovery
- Prevents crashes from API changes between versions

## Plugin Discovery and the PLUGINS Environment Variable

By default, MINIcontrol discovers and attempts to load all compatible plugins from:
- `core/plugins/` (built-in plugins)
- `userdata/plugins/` (custom/third-party plugins)

### Restricting Plugin Loading

Set the `PLUGINS` environment variable to control which plugins load:

```env
# Load only specific plugins
PLUGINS="database,records,menu,admin"

# Use wildcards for nested plugins
PLUGINS="kacky,kacky/*,widgets/records,admin"

# Leave empty to auto-load all compatible plugins
PLUGINS=""
```

**Wildcard patterns:**
- `kacky/*` matches `kacky/foo`, `kacky/bar/baz`, etc.
- `widgets/*` matches any plugin under `widgets/`
- `*` matches everything (same as empty)

**Important:** When using `PLUGINS` as a whitelist, you must explicitly include dependencies:

```env
# ❌ Wrong - widgets/records won't load (missing dependencies)
PLUGINS="widgets/records"

# ✅ Correct - includes all dependencies
PLUGINS="database,records,widgets,widgets/records"
```

## Creating a New Plugin with Manifest

### 1. Create Plugin Directory Structure

```
userdata/plugins/myplugin/
  ├── manifest.json
  └── index.ts
```

### 2. Write Your manifest.json

```json
{
  "id": "myplugin",
  "name": "My Plugin",
  "description": "Does something useful",
  "authors": "Your Name",
  "date": "2025-12-10",
  "version": "1.0.0",
  "requiresMinicontrolVersion": "^0.12.0",
  "requiresGame": null,
  "depends": []
}
```

### 3. Implement Your Plugin

```ts
import Plugin from '@core/plugins';

export default class MyPlugin extends Plugin {
    async onLoad() {
        this.addListener("TMC.PlayerConnect", this.onConnect, this);
        this.addCommand("/mycommand", this.handleCommand, "My command");
    }

    async onConnect(player: any) {
        tmc.chat(`Welcome ${player.nickname}!`, player.login);
    }

    async handleCommand(login: string, args: string[]) {
        tmc.chat("Command executed!", login);
    }
}
```

### 4. Test Plugin Loading

```bash
# Check if plugin is discovered
tsx plugins.ts list

# Verify load order
tsx plugins.ts order

# Start MINIcontrol
npm start
```

### 5. Verify in Runtime

Use admin commands to manage your plugin:
```
//plugins              # Plugin manager
//plugin list          # See all loaded plugins
//plugin reload myplugin  # Reload after changes
//plugin unload myplugin  # Unload plugin
//plugin load myplugin    # Load plugin
```

## Troubleshooting

### Plugin Not Loading

**Check manifest validation:**
```bash
tsx plugins.ts list
```

Common issues:
- Missing required fields (`id`, `name`, `version`, etc.)
- Invalid semver in `version` or `requiresMinicontrolVersion`
- Invalid date format (use YYYY-MM-DD)
- Circular dependencies in `depends` array

### Dependency Resolution Failures

**View resolver output:**
```bash
tsx plugins.ts order
```

**Console logs show:**
- "Plugin X missing dependency Y" - Add Y to your environment or its manifest
- "Version conflict" - Adjust semver ranges to be more permissive
- "Circular dependency detected" - Refactor plugin architecture to remove cycles

### Game Compatibility Issues

If plugin doesn't load on TmForever but works on TM2020:
- Check `requiresGame` in manifest
- Verify API calls are game-agnostic or conditionally executed
- Use `tmc.game.Name` to detect current game and branch logic

### Version Range Debugging

Test semver ranges in Node.js REPL:
```js
const semver = require('semver');
semver.satisfies('1.2.3', '^1.0.0');  // true
semver.satisfies('2.0.0', '^1.0.0');  // false
```
## Helper methods introduced in 0.12

MINIcontrol 0.12+ provides convenient helper methods in the base `Plugin` class that automatically track registrations for proper cleanup when your plugin is unloaded. Using these helpers ensures your plugin doesn't leak memory or leave dangling references.

### addListener() - Server Event Listeners

Register server callbacks with automatic cleanup tracking. Use this instead of `tmc.server.addListener()` directly.

```ts
// In your plugin's onLoad() method:
this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
this.addListener("Trackmania.BeginMap", this.onBeginMap, this);
```

**Benefits:**
- Automatically tracked for cleanup when plugin unloads
- No need to manually call `removeListener()` in `onUnload()`
- Prevents memory leaks from forgotten listener removals

### removeListener() - Manual Listener Removal

Explicitly remove a tracked listener before plugin unload (optional, as `destroy()` handles this automatically).

```ts
this.removeListener("TMC.PlayerConnect", this.onPlayerConnect);
```

### addCommand() - Chat Commands

Register chat commands with automatic cleanup. Replaces direct `tmc.addCommand()` calls.

```ts
this.addCommand("/mycommand", this.handleCommand, "Command description");
this.addCommand("//admincommand", this.handleAdminCommand, "Admin command");
```

**Features:**
- Automatically binds callback to plugin instance (no need for `.bind(this)`)
- Tracked for cleanup on plugin unload
- Third parameter is the help text shown in `/help`

### addSetting() - Plugin Settings

Register plugin settings with automatic cleanup and optional change callbacks.

```ts
// Simple setting
this.addSetting("myplugin.enabled", true, null, "Enable my plugin feature");

// Setting with change callback
this.addSetting("myplugin.maxPlayers", 100, this.onMaxPlayersChanged, "Maximum players");

// In your plugin:
async onMaxPlayersChanged(newValue: number, oldValue: number, key: string) {
    tmc.cli(`Setting ${key} changed from ${oldValue} to ${newValue}`);
}
```

**Parameters:**
- `name`: Setting key (use `pluginname.settingname` convention)
- `defaultValue`: Default value (any type)
- `callback`: Optional callback when setting changes (automatically bound to plugin instance)
- `description`: Human-readable description

### removeSetting() - Manual Setting Removal

Explicitly unregister a setting (optional, handled by `destroy()`).

```ts
this.removeSetting("myplugin.enabled");
```
# UI Components (Manialink custom tags)

Components let you register handlers that expand custom tags into Manialink markup and optional page script.

- Handlers implement the `ComponentFunction` signature: `(attrs, inner, obj) => { replacement, script? } | Promise<...>`
- Obj hold all values from the manialink itself: like: `obj.colors`,`obj.data`, `obj.actions`
- Custom components should always start with capital letter.

Example handler (Mybutton):

```ts
// plugin code
this.addComponent("Mybutton", async (attrs, inner, obj) => {
  const replacement = `<frame pos="..."><label text="${attrs.label || inner}" /></frame>`;
  const script = `// ManiaScript for mouse events or animations`;
  return { replacement, script };
});
```

Notes:
- Handlers are registered with `tmc.ui.registerComponentHandler` (plugins should use `plugin.addComponent`).
- Tag names are matched case-insensitively.
- Returned `script` fragments are concatenated into the final page script. Be careful to avoid duplicate global symbol names.
- For syntax highlighting of embedded scripts/templates in VS Code: prefer a tagged template (e.g. `html`\`...\``) or install an extension like `es6-string-html`. For ManiaScript you can also use a comment hint (e.g. `/* ManiaScript */`) before the template and use an extension that supports language injection.


### addColor() - Color Settings

Register theme color settings with automatic cleanup.

```ts
// Simple color
this.addColor("myplugin.highlight", "f07", null, "Highlight color");

// Color with change callback
this.addColor("myplugin.background", "123", this.onColorChanged, "Background color");

async onColorChanged(newValue: string, oldValue: string, key: string) {
    // Update UI with new color
    await this.refreshWidgets();
}
```

**Benefits:**
- Colors are automatically available in templates via `tmc.settings.colors`
- Respects user's theme customization
- Can be changed via admin settings interface

### removeColor() - Manual Color Removal

Explicitly unregister a color setting.

```ts
this.removeColor("myplugin.highlight");
```

### destroy() - Automatic Cleanup

Called automatically when plugin is unloaded. You typically don't call this directly, but it's important to understand what it does:

**Cleanup actions:**
1. Removes all tracked server listeners
2. Unregisters all chat commands
3. Unregisters all settings
4. Unregisters all color settings
5. Destroys any Manialink instances
6. Nulls out plugin fields to allow garbage collection

**Important:** If you override `onUnload()`, you don't need to manually clean up resources registered via helper methods — `destroy()` handles this automatically.

### Migration from old pattern

**Before (0.11 and earlier):**
```ts
async onLoad() {
    tmc.server.addListener("TMC.PlayerConnect", this.onConnect, this);
    tmc.addCommand("/mycommand", this.handleCmd.bind(this), "Help");
    tmc.settings.register("myplugin.enabled", true, this.onEnabledChanged.bind(this), "Enable");
}

async onUnload() {
    // Easy to forget these!
    tmc.server.removeListener("TMC.PlayerConnect", this.onConnect);
    tmc.removeCommand("/mycommand");
    tmc.settings.unregister("myplugin.enabled");
}
```

**After (0.12+):**
```ts
async onLoad() {
    this.addListener("TMC.PlayerConnect", this.onConnect, this);
    this.addCommand("/mycommand", this.handleCmd, "Help");
    this.addSetting("myplugin.enabled", true, this.onEnabledChanged, "Enable");
}

async onUnload() {
    // Nothing needed! Cleanup is automatic via destroy()
}
```

### Best Practices

1. **Use helpers consistently**: Always prefer `this.addListener()`, `this.addCommand()`, etc. over direct `tmc.*` calls
2. **Let destroy() handle cleanup**: Don't manually remove registered items in `onUnload()` unless you have a specific reason
3. **Name settings properly**: Use `pluginname.settingname` convention to avoid conflicts
4. **Bind callbacks automatically**: Helper methods handle binding, so avoid `.bind(this)` in your calls
5. **Test unload/reload**: Use `//plugin reload <name>` to verify your plugin cleans up properly

## Chat commands

```ts
this.addCommand("/mycommand", this.myCommand, "description");
```

## Listeners

To make plugins work across all generations of Trackmania games, we took some creative liberties to make our lives easier.

* Callbacks starting with: `TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.`.
* All script callbacks will be redirected as events.

Also note that there's a few `TMC.events` that should be used instead of the native dedicated server callbacks.
These are writen as adapters so they'll provide the right info from each game in the same way,
even if the game's underlying data differs.

```ts
// async onPlayerConnect(player: Player) {}
this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this)

// async onPlayerDisconnect(player: Player) {}
this.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this)

// async onPlayerCheckpoint(login:string, racetime:int, checkpointinrace:int) {}
this.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);

// async onPlayerFinish(login:string, time:int) {}
this.addListener("TMC.PlayerFinish", this.finish, this);

// async onPlayerGiveup(login:string) {}
this.addListener("TMC.PlayerGiveup", this.giveup, this);

//  onVoteCancel(data: VoteStruct) {}
this.addListener("TMC.Vote.Cancel", this.voteCancel, this);

//  onVoteDeny(data: VoteStruct) {}
this.addListener("TMC.Vote.Deny", this.voteDeny, this);

//  onVotePass(data: VoteStruct) {}
this.addListener("TMC.Vote.Pass", this.votePass, this);

// generic ones use this callbacks
this.addListener("Trackmania.*", this.callback, this);
```

## Interacting with the dedicated server

To interact with the dedicated server, you usually subscribe to Dedicated Server callbacks and act upon them.
You have 3 options in MINIcontrol:

```ts
// Execute an XML-RPC API call and receive the server response
const answer = await tmc.server.call("method", ...params);
// Execute an XML-RPC API call but ignore the server response
tmc.server.send("method", ...params);
// Execute an XML-RPC API multicall, containing several XML-RPC API methods
const answers:any[] = await tmc.server.multicall([
    ["method", ...params],
    ["method2", ...params],
    ["method3", ...params]
    ]);
```

You can also override methods if needed...

```ts
tmc.server.addOverride("method", this.myOverride.bind(this));
```

In case you need to call the original GBX method, use

```ts
async myOverride(data: any) {
    await tmc.server.gbx.call("method", ...params);
}
```

## Sending chat messages

Sending public and private chat messages.

```ts
// For sending chat messages, await is not needed.
tmc.chat(`Hello World!`);

// To send chat messages to specific players, provide a (comma-separated list or array of) login(s) as second parameter
tmc.chat(`Hello World!`, "login")
tmc.chat(`Hello World!`, "login1, login2, ...")
tmc.chat(`Hello World!`, ["login1", "login2"])
```

## Write to stdout / log file

```ts
// To log a message to stdout/log file, TM colors will be parsed to ansi sequences
tmc.cli("trackmania color coded string");
// To log a debug message, shows only when debug is enabled in `.env`
tmc.debug("trackmania color coded string");
```