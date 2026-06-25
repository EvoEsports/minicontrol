[Back to Concept](../concept.md)

# Server class

Server class is used to communicate with the game server itself.

## Table of contents

- [API](#api)
    - [call / send / multicall / multisend](#when-to-use-call--send--multicall--multisend)
    - [callScript / sendScript](#callscript--sendscript)
    - [Override methods (addOverride / removeOverride)](#addoverride--removeoverride)
    - [Listeners (addListener / removeListener / prependListener)](#listeners)
- [Supported events](#supported-events)
- [Authentication & Initialization](#authentication--initialization)
- [Mode Script Callbacks & Normalization](#mode-script-callbacks--normalization)
- [limitScriptCallbacks](#limitscriptcallbacks)
- [Notes & best practices](#notes--best-practices)

## API

The calls you can interact with the server:

```ts
class Server {

    // call a xmlrpc method for server and WAIT for answer
    async call(method, ...params): any;

    // shorthand method to call script
    async callScript(method: string, ...args: any);

    // perform multicall for dedicated server and WAIT for answer
    async multicall([
        [method, ...params],
        [method, ...params]
        ]): any[];

    // just send and ignore everything else
    send(method, ...params)

    // add override
    async addOverride(method: string, callback: Function);
    async removeOverride(method: string);
    // add listener / remove listener
    addListener(method: string, callback: any, obj?: object);
    prependListener(method: string, callback: any, obj?: object);
    removeListener(method: string, callback: any);
    emit(method: string, ...args: any[]);

}
```

## Supported events
To make everything working with all generations of the games, some things had to changed.
Callbacks starting with: `TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.` Custom events that should be used instead of the native ones:

```ts
// async onPlayerConnect(player: Player) {}
tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this)

// async onPlayerDisconnect(player: Player) {}
tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this)

// async onPlayerCheckpoint(login:string, racetime:int, checkpointinrace:int) {}
tmc.server.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);

// async onPlayerFinish(login:string, time:int) {}
tmc.server.addListener("TMC.PlayerFinish", this.finish, this);

// async onPlayerGiveup() {}
tmc.server.addListener("TMC.PlayerGiveup", this.giveup, this);

//  onVoteCancel(data: VoteStruct) {}
tmc.server.addListener("TMC.Vote.Cancel", this.voteCancel, this);

//  onVoteDeny(data: VoteStruct) {}
tmc.server.addListener("TMC.Vote.Deny", this.voteDeny, this);

//  onVotePass(data: VoteStruct) {}
tmc.server.addListener("TMC.Vote.Pass", this.votePass, this);

// generic ones use this callbacks

tmc.server.addListener("Trackmania.*", this.callback, this);

```

### Common TMC events (normalized)
MINIcontrol normalizes (and exposes) common dedicated server callbacks via the `TMC.` namespace. Plugins should prefer these events over raw `Trackmania.` or `ManiaPlanet.` callbacks:

- `TMC.PlayerConnect` - Emitted with a `Player` object when a player connects; plugin typically fetches player details with `await tmc.players.getPlayer(login)`.
- `TMC.PlayerDisconnect` - Emitted with a `Player` object when a player disconnects.
- `TMC.PlayerCheckpoint` - Emitted with: `(login: string, racetime: number, checkpointIndex: number, rawData?)`.
- `TMC.PlayerFinish` - Emitted with: `(login: string, racetime: number)` when a player finishes.
- `TMC.PlayerGiveup` - Emitted when a player gives up.
- `TMC.BeginMap` or `Trackmania.BeginMap` - Emitted when a new map begins; data includes the new map object.
- `TMC.BeginRound` / `Trackmania.BeginRound` - Emitted when a round begins (useful for per-round timers).
- `TMC.MapListModified` - Emitted when the server's maplist changed.
- `TMC.Vote.Cancel`, `TMC.Vote.Deny`, `TMC.Vote.Pass` - Vote lifecycle events (payload depends on server call signature).

These `TMC.` events are safe across games and provide a uniform payload for plugin authors.

## When to use call / send / multicall / multisend

Server interactions generally fall into two categories:

- Blocking calls that expect a response (use `call`/`multicall`).
- Fire-and-forget sends where no response is needed (use `send`/`multisend`).

### `tmc.server.call(method, ...args)`
- Use when you need a return value or must wait for the action to complete. This is the most commonly used method when fetching data or waiting for server results.
- Example:
```ts
const currentMap = await tmc.server.call('GetCurrentMapInfo');
```

### `tmc.server.send(method, ...args)`
- Use to dispatch a command without waiting for a response. Useful for UI updates and commands where the result doesn't matter.
- Example:
```ts
tmc.server.send('SendDisplayManialinkPage', xml, 0, false);
```

### `tmc.server.multicall(calls: [method, ...args][])`
- Batch multiple `call` requests into a single round-trip and obtain an array of responses. Use this for efficiency and to avoid many separate `call` invocations.
- Example:
```ts
const calls = [ ['GetMapInfo', 'some.gbx'], ['GetMapInfo', 'another.gbx'] ];
const results = await tmc.server.multicall(calls);
```

### `tmc.server.multisend(calls: [method, ...args][])`
- Batch multiple `send` operations in a single request without expecting responses. Use this when you want to send many fire-and-forget commands.
- Example:
```ts
const calls = [ ['SendDisplayManialinkPageToLogin', login, xml, 0, false], ... ];
await tmc.server.multisend(calls);
```

### Choosing between them
- When you need a result: use `call` or `multicall`.
- When you just need to trigger a server action and don't need the result: use `send` or `multisend`.
- Use `multicall`/`multisend` to group calls for performance when issuing many calls in quick succession.

## Notes & best practices

Here are general recommendations when interacting with the server and writing plugins:

- Use `call` when you need a response, and always await it inside try/catch to handle server errors:
```ts
try {
    const info = await tmc.server.call('GetMapInfo', 'myMap.Gbx');
} catch (e) {
    tmc.cli(`Error fetching map info: ${e.message}`);
}
```

- Use `send` for fire-and-forget operations. If the server call might fail silently, consider using `call` to confirm status.

- Prefer `multicall`/`multisend` when dealing with many calls: they reduce latency and server round-trips.

- Avoid blocking work in event listeners; perform heavy work asynchronously and avoid long-running synchronous tasks.

- When using `addListener`, provide the bound object (third parameter) and use `removeListener` with the same callback to avoid leaks.

- Use `addOverride`/`removeOverride` in tests or temporary runtime emulation, and always remove overrides to restore original behavior.

- For script-related operations (callScript), supply sensible timeouts and fallback logic as script methods can hang or time out.

- Respect game-specific differences (e.g., `Trackmania` vs `TmForever` replacements) and use `tmc.server.fetchServerInfo()` to detect the game and adjust logic.

## See also

- [GBX Client (XML-RPC transport)](./gbx.md)
- [MiniControl (tmc) runtime API](./minicontrol.md)
- [UiManager](/documentation/devs/class/uimanager.md) (examples of efficient multisend usage)

## Authentication & Initialization

MiniControl uses the following sequence to initialize a running server connection:

1. `tmc.server.connect(host, port)` — Connect to the remote XML-RPC/GBX server.
2. `tmc.server.call('Authenticate', user, pass)` — Authenticate as a SuperAdmin account.
3. `tmc.server.fetchServerInfo()` — Helper to populate local `tmc.server.version`, `tmc.server.packmask`, `tmc.server.login` and `tmc.server.name` values. It calls several API methods internally (GetMainServerPlayerInfo, GetServerOptions, GetVersion etc.).
4. Enable callbacks & configure API version depending on the game type (`Trackmania`, `TmForever`, `ManiaPlanet`).

Example minimal initialization (already handled by MiniControl core):
```ts
const connected = await tmc.server.connect('127.0.0.1', 5000);
await tmc.server.call('Authenticate', 'SuperAdmin', 'SuperAdmin');
await tmc.server.fetchServerInfo();
// enable callbacks (core sets relevant flags automatically)
await tmc.server.send('EnableCallbacks', true);
```

Notes:
- MiniControl will attempt to set the correct API version for `Trackmania` / `ManiaPlanet` to ensure compatibility.
- It also updates `tmc.mapsPath` (games use different API names: `GetMapsDirectory` vs `GetTracksDirectory` for TmForever) and optionally toggles `XmlRpc.EnableCallbacks` via `sendScript()`.

## callScript / sendScript

### `tmc.server.callScript(method, ...args)`
- A helper to invoke a ModeScript/ManiaScript function and wait for its result via events.
- Implementation detail: `callScript` issues the script call and returns a promise which resolves once the script emits the associated callback event (the server emits an event corresponding to the script response). A timeout is used to prevent infinite waits.
- Example:
```ts
// Call a script function and capture result
const users = await tmc.server.callScript('GetPlayersWithProperty', 'someProperty');
```

### `tmc.server.sendScript(method, ...args)`
- Similar to `callScript` but fire-and-forget. The caller doesn't wait for a response event. Useful for scripts that don't return a value.
```ts
// Just send a script call
await tmc.server.sendScript('XmlRpc.EnableCallbacks', 'true');
```

## addOverride / removeOverride

These helpers let you intercept GBX method calls and provide custom implementations; this is useful for testing, emulation, or interception.

Example:
```ts
tmc.server.addOverride('GetMapInfo', (filename) => {
    // provide a stubbed response or forward to a custom handler
    return { UId: 'stub', Name: 'Stubbed map' };
});

// To restore normal behavior
tmc.server.removeOverride('GetMapInfo');
```

## Listeners (addListener, prependListener, removeListener)

- `addListener(method, callback, obj)` binds and registers a listener wrapper that stores the original callback in `wrapper.listener` (so `removeListener` can find and remove it cleanly). Use it to bind server events and ensure you can remove them reliably.
- `prependListener` puts the listener at the beginning of the listener list.
- `removeListener` removes the listener and any wrapper with `wrapper.listener === callback`.

### Example
```ts
// Register
tmc.server.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);

// Remove
tmc.server.removeListener('TMC.PlayerConnect', this.onPlayerConnect);
```

## ModeScript callbacks & normalization

MiniControl normalizes differences between various Trackmania server versions. Key points:

- Many events are delivered via ModeScript callbacks (e.g., `ModeScriptCallbackArray` or `Trackmania.ModeScriptCallbackArray`). MiniControl turns these into unified `TMC.*` events.
- The core `onCallback` implementation in `core/server.ts` normalizes method names (e.g., `ManiaPlanet.` -> `Trackmania.` and `Challenge` -> `Map`) and emits `TMC.*` events for listeners.

Example: `ModeScriptCallbackArray` for waypoint or other race events is converted into `TMC.PlayerFinish`, `TMC.PlayerCheckpoint` etc.

### limitScriptCallbacks

`tmc.server.limitScriptCallbacks()` is a helper used during initialization (for `Trackmania` / `ManiaPlanet`) to restrict which ModeScript callbacks scripts can call. This reduces the number of script callbacks the server has to process and helps prevent callback flooding (especially when many plugins or scripts register events).

What it does:
- Fetches the list of registered script callbacks via `XmlRpc.GetCallbacksList`.
- Blocks non-essential callbacks and only enables those required for typical behaviors (start/end events, certain game events).
- Logs the list of enabled callbacks and the reduction it achieved.

Use case:
- Enable by default in production to reduce server overhead. You can control behavior by setting `XMLRPC_LIMIT_SCRIPT_CALLBACKS` env var.
