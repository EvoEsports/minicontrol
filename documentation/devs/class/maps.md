[Back to Concept](../concept.md)

# Maps manager

The `MapManager` keeps a local view of the server's map list and provides convenience helpers for common map operations. It also tracks the `previousMap`, `currentMap`, and `nextMap` — updated by server callbacks (BeginMap/BeginRound/MapListModified).

## Table of contents

- [Map interface](#map-interface)
- [Core behavior](#core-behavior)
- [API & Methods](#api--methods)
- [Events & lifecycle](#events--lifecycle)
- [Examples](#examples)
- [Best practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Map interface

Below is a minimal shape of a `Map` object returned by the server. Actual map objects may carry more fields depending on the game and server settings (karma, vehicle, formatting, etc.).

```ts
export interface Map {
    UId: string;
    Name: string;
    Author: string;
    AuthorNickname?: string;
    AuthorTime: number;
    GoldTime: number;
    SilverTime: number;
    BronzeTime: number;
    CopperPrize: number;
    FileName: string;
    Environnement: string;
    Mood: string;
    LapRace: boolean;
    NbLaps: number;
    NbCheckpoints: number;
    Vehicle?: string; // available when local db or specific game
    Karma?: { positive: number; negative: number; total: number };
    [key: string]: any;
}
```

## Core behavior

- The `MapManager` maintains an in-memory map index keyed by `UId`.
- On startup `MapManager.init()` will fetch `GetCurrentMapInfo`, `GetNextMapInfo` and run `syncMaplist()` which fetches the entire server maplist in chunks and resolves additional map details using `GetMapInfo` (or `GetChallengeInfo` for TmForever).
- The `syncMaplist()` method merges old map data with new map objects (preserving custom data if present).
- `MapManager` listens to `Trackmania.MapListModified` and `Trackmania.BeginMap` to keep its data up-to-date with server changes.

## API & Methods

```ts
class MapManager {
    // Properties
    previousMap: Map;
    currentMap: Map;
    nextMap: Map;

    // Control & lifecycle (internal)
    init(): Promise<void> // hook used by core to register listeners and sync data
    afterInit(): Promise<void>

    // Map operations
    syncMaplist(): Promise<void> // force a full maplist sync using GBX multicalls
    addMap(map: Map): void
    removeMap(mapUId: string): void

    // Accessors
    get(): Map[] // returns the current maplist
    getMaplist(): Map[] // alias for get()
    getUids(): string[]
    getMapCount(): number
    getMap(mapUid: string): Map | undefined

    // Time helper
    getTimeInfo(): { timePlayed: number; timeLeft: number; timeLimit: number }
}
```

### getTimeInfo()

Returns an estimate of the current map time:
- `timePlayed`: seconds elapsed since the current round started (includes 3 second pre-race offset)
- `timeLeft`: remaining seconds until the configured TA time limit
- `timeLimit`: configured TA limit (from `tmc.storage['minicontrol.taTimeLimit']`, `TALIMIT` env var, or default 300s)

## Events & lifecycle

`MapManager` registers the following server callbacks:
- `Trackmania.BeginMap`: updates `previousMap`, `currentMap`, and `nextMap`
- `Trackmania.MapListModified`: triggers `syncMaplist()` when map list has changed
- `Trackmania.BeginRound`: resets internal `startTime` used by `getTimeInfo()`

### How maplist synchronization works

- `syncMaplist()` calls `GetMapList` to fetch map filenames and then uses `GetMapInfo` (or `GetChallengeInfo` for TMForever) via `multicall` in chunks of 100 to improve performance.
- When a new map object is found, the manager preserves custom fields previously attached to a map UID (merges old data into the new map object).

## Examples

### Basic: list maps

```ts
// Display map count and UIDs
const maps = tmc.maps.get();
console.log(`Map Count: ${tmc.maps.getMapCount()}`);
for (const map of maps) console.log(map.UId, map.Name);
```

### Example plugin command: show current map details

```ts
this.addCommand('/mapinfo', async (login: string) => {
    const map = tmc.maps.currentMap;
    if (!map) {
        tmc.chat('No current map known', login);
        return;
    }
    tmc.chat(`Map: ${map.Name} by ${map.Author} — ${map.FileName}`, login);
});
```

### Example plugin command: interactive ListWindow

```ts
this.addCommand('/maps', async (login: string) => {
    const list = tmc.maps.get().map(m => ({ UId: m.UId, Name: m.Name }));
    const window = new ListWindow(login);
    window.title = 'Server Maps';
    window.setColumns([{ key: 'UId', title: 'UID', width: 30 }, { key: 'Name', title: 'Name', width: 130 }]);
    window.setItems(list);
    window.setActions(['View']);
    await window.display();
});
```

### Example: programmatically add or remove a map

```ts
// Add map object (local index only)
tmc.maps.addMap({ UId: 'local-uid', Name: 'Custom map', FileName: 'custom.Map.Gbx', ... });

// Remove map
tmc.maps.removeMap('local-uid');
```

## Best practices

- Avoid mutating `Map` objects returned from `tmc.maps.get()` — if you need to attach plugin-specific metadata, keep a plugin-local map keyed by UId or use `tmc.maps.addMap()` to add custom entries.
- Use `syncMaplist()` when you need to ensure the maplist is fresh (e.g., after a plugin installed new map files).
- Use `tmc.server.multicall` style for large operations rather than many single requests.
- When presenting map lists in UI, use `getUids()` for efficient lookups and `get()` to fetch cached objects.

## Troubleshooting

- `GetMapList` may fail or return an empty list if the server is not properly configured or the maps directory is unavailable; `syncMaplist()` will log CLI errors.
- If `currentMap` is undefined after startup, confirm the server responded to `GetCurrentMapInfo` — gameplay or API compatibility issues may cause missing data.
- If `getTimeInfo()` returns unexpected values, check `TALIMIT` env var or `tmc.storage['minicontrol.taTimeLimit']` override and ensure `onBeginRound` is firing correctly.
