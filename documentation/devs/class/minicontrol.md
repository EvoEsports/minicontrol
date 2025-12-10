[Back to Concept](../concept.md)

# MiniControl (tmc) - global API

This page documents the public methods exposed by the `tmc` global object (MiniControl instance). Plugins can use these helpers to interact with the server and runtime.

## Public methods

Use the `tmc` instance to call server methods, manage plugins, register chat commands, and interact with system components.

| Method | Signature | Description | Example |
|---|---|---|---|
| `getPlayer` | `async getPlayer(login: string): Promise<Player>` | Fetch or return cached player object | `const player = await tmc.getPlayer(login);` |
| `addCommand` | `addCommand(command: string, callback: CallableCommand, help?: string): void` | Convenience wrapper to register chat commands | `tmc.addCommand('/hello', async (login, args) => tmc.chat('hi', login));` |
| `removeCommand` | `removeCommand(command: string): void` | Removes a command previously registered (by its trigger) | `tmc.removeCommand('/hello');` |
| `findPlugin` | `findPlugin(id: string): string | null` | Return plugin path for discovered plugin id | `const path = tmc.findPlugin('example');` |
| `discoverPlugins` | `async discoverPlugins(): Promise<discovery[]>` | Return list of discovered plugins on disk (manifests + metadata) | `const list = await tmc.discoverPlugins();` |
| `installPlugin` | `async installPlugin(fromPath: string): Promise<string>` | Copy a plugin folder into `userdata/plugins` (must include manifest) | `const dst = await tmc.installPlugin('/tmp/plugin');` |
| `removePlugin` | `async removePlugin(id: string): Promise<void>` | Remove installed plugin folder (must not be loaded) | `await tmc.removePlugin('plugin-id');` |
| `loadPlugin` | `async loadPlugin(name: string): Promise<void>` | Load plugin into runtime | `await tmc.loadPlugin('example');` |
| `unloadPlugin` | `async unloadPlugin(name: string): Promise<void>` | Unload plugin from runtime | `await tmc.unloadPlugin('example');` |
| `cli` | `cli(object: any): void` | Write a console log with color processing | `tmc.cli('test')` |
| `debug` | `debug(object: any): void` | Conditional debug log (if DEBUG env var set) | `tmc.debug('debug info')` |
| `chat` | `chat(text: string, login?: string | string[] | undefined): void` | Send a server chat message; pass login to DM single or multiple recipients | `tmc.chat('Hello', ['player1', 'player2']);` |

## Plugin lifecycle helpers

The API includes helpers for plugin lifecycle and discovery; preference is to use the `PluginLoader` where possible. The methods above are convenience wrappers used by many plugins.

## Best practices

- Prefer `tmc.settings` and `tmc.maps` APIs rather than manipulating plugin internals directly.
- For actions that need to persist across server restarts use `tmc.settings` rather than `tmc.storage`.
- When calling server-side APIs prefer `await tmc.server.call(...)` so errors can be caught and logged.

### Server call guidance
For direct interactions with the dedicated server use `tmc.server` methods. See the [Server class](./server.md) for details. Quick guidance:

- `tmc.server.call(...)` — Use when you need a response (blocking/awaitable), e.g. `GetCurrentMapInfo`.
- `tmc.server.send(...)` — Use for fire-and-forget commands where you don't need the result, e.g. `SendDisplayManialinkPage`.
- `tmc.server.multicall([...])` — Batch `call` requests to improve performance and reduce RPC round-trips.
- `tmc.server.multisend([...])` — Batch `send` requests for fire-and-forget batches.

Example:
```ts
// Get a map (needs response)
const map = await tmc.server.call('GetMapInfo', 'example.Gbx');

// Show a manialink without waiting
tmc.server.send('SendDisplayManialinkPage', xml, 0, false);

// Batch requests for multiple map infos
const calls = [['GetMapInfo', 'a.gbx'], ['GetMapInfo', 'b.gbx']];
const results = await tmc.server.multicall(calls);

// Batch many sends
await tmc.server.multisend([['SendDisplayManialinkPage', xml, 0, false], ...]);
```

## See also

- [Plugin base & loader](./plugins.md)
- [Server class (detailed call/send/multicall docs)](./server.md)
- [SettingsManager](./settingsmanager.md)
