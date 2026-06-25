[Back to Concept](../concept.md)

# PlayerManager (Player class)

This doc explains the `PlayerManager` and the `Player` class that is used throughout MINIcontrol to represent connected players, manage player state and expose helper methods.

## Table of contents

- [Overview](#overview)
- [Player object](#player-object)
- [PlayerManager API](#playermanager-api)
- [Events & lifecycle](#events--lifecycle)
- [Examples](#examples)
- [Best practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

`PlayerManager` maintains a live, in-memory map of players currently connected to the server. It registers server callbacks to keep the player state up to date and offers helper methods for plugin authors to fetch, query and enumerate player objects.

Key responsibilities:
- Track connected players and cache their detailed info
- Provide accessors to fetch `Player` objects (`getPlayer`, `getAll`, `getAllLogins`) and search utilities (`getPlayerbyNick`)
- Emit friendly events using `tmc.server.emit` such as `TMC.PlayerConnect` and `TMC.PlayerDisconnect` when players connect/disconnect
- Keep objects in sync with `Trackmania.PlayerInfoChanged` and `Trackmania.BeginRound` events

## Player object

The `Player` class models the typical player structure returned by the server. Not all fields are present in every game or server, and the object may also contain additional properties depending on the game/API.

Key fields:
- `login` — Unique player login string
- `nickname` — Display name
- `customNick` — Optional custom nickname
- `playerId` — Player ID as reported by server
- `teamId` — Team id / slot
- `path` — current path/zone/position
- `language` — player's language setting
- `clientVersion` — client's version string
- `iPAddress` — player's IP
- `isSpectator` — true if player is currently in spectator mode
- `isAdmin` — computed by checking `login` against `tmc.admins`
- `isReferee`, `isPodiumReady`, `isBroadcasting`, `isManagedByOtherServer`, `isServer`, `hasPlayerSlot`, `hasJoinedGame`, etc. — flags derived from `Flags` bit fields reported by the server
- `ladderStats` & `ladderRanking` — when available, ladder/ranking information
- `avatar` — when present, avatar data with filename/checksum

Helper methods available on the Player object:
- `syncFromDetailedPlayerInfo(data: any)` — fill all fields from a full detailed player info object, apply sanitization for nickname and derive flags
- `syncFromPlayerInfo(data: any)` — update basic fields from a short PlayerInfo object (used by PlayerInfoChanged)
- `set(key, value)` — set a field on the object dynamically

Notes about flags and specator handling:
- `forcedSpectatorState`, `isReferee`, `isPodiumReady`, `isUsingStereoScopy`, `isManagedByOtherServer`, `isServer`, `hasPlayerSlot`, `isBroadcasting`, `hasJoinedGame` are all derived from the numeric `Flags` field in the server payload. This may vary by game platform and is calculated by reading specific digits in `Flags`.
- `spectatorTarget` is extracted from `SpecatorStatus` by `Math.floor(data.SpecatorStatus / 10000)`.

## PlayerManager API

```ts
class PlayerManager {
  // Accessors
  getAll(): Player[]; // returns cached players
  getAllLogins(): string[]; // return array of logins
  getPlayerbyNick(nickname: string): Player | null; // search by nickname
  async getPlayer(login: string): Promise<Player>; // fetch or return cached player

  // internal / lifecycle
  async init(): Promise<void>; // registers server callbacks, fetches initial players
  afterInit(): void; // registers additional callbacks
  async syncFromServer(): Promise<void>; // not a direct public method, called by init
}
```

- `getPlayer(login)` will return the cached `Player` if present; otherwise it will call the server's `GetDetailedPlayerInfo` to create and cache a new `Player` object.
- Calling `getPlayer()` for the server login will produce a console error and return an empty `Player` object — the server is not modeled as a player entity.

## Events & lifecycle

`PlayerManager` listens for and reacts to these server callbacks:
- `Trackmania.PlayerInfoChanged`: when a player's short info line changes (team, spectator status), `PlayerManager` will update the cached `Player` via `syncFromPlayerInfo`. If the player is newly joined, it will call `getPlayer` to populate full details.
- `Trackmania.PlayerConnect`: creates a new `Player` by calling `getPlayer` and emits `TMC.PlayerConnect` with the `Player` object.
- `Trackmania.PlayerDisconnect`: emits `TMC.PlayerDisconnect` (with a cloned `Player` object) and removes the player from the cache.

## Examples

### Basic: Get a player and display info

```ts
const p = await tmc.getPlayer('someLogin');
if (!p) return;
tmc.chat(`Player ${p.nickname}, admin=${p.isAdmin}.`, p.login);
```

### List players in a ListWindow

```ts
this.addCommand('/players', async (login) => {
  const players = tmc.players.getAll().map((p) => ({
    login: p.login,
    name: p.nickname,
  }));
  const window = new ListWindow(login);
  window.title = 'Players online';
  window.setColumns([{ key: 'login', title: 'Login', width: 30 }, { key: 'name', title: 'Name', width: 130 }]);
  window.setItems(players);
  await window.display();
});
```

### Find by nickname

```ts
const player = tmc.players.getPlayerbyNick('SomeNick');
if (player) {
  tmc.chat(`${player.nickname} is currently online (login=${player.login}).`, yourLogin);
}
```

### Track Player connect/disconnect events

```ts
tmc.server.addListener('TMC.PlayerConnect', async (player: Player) => {
  tmc.chat(`Player connected: ${player.nickname}`);
});

tmc.server.addListener('TMC.PlayerDisconnect', async (player: Player) => {
  tmc.chat(`Player disconnected: ${player.nickname}`);
});
```

## Best practices

- Use `getPlayer()` to retrieve a player prior to accessing detailed fields (e.g., `avatar`, `ladderStats`) — otherwise the fields may be undefined.
- Avoid mutating the `Player` object directly unless you're intentionally storing ephemeral or plugin-specific state. Prefer plugin-local storage or use namespaced keys.
- When diagnosing issues, check `tmc.server` callbacks and ensure `PlayerInfoChanged` payloads are processed correctly.
- For UI listing, prefer `getAll()` for consistent, cached values instead of calling `getPlayer()` in a loop.

## Troubleshooting

- If `getPlayer(login)` fails to fetch details, the server might be unreachable or not support `GetDetailedPlayerInfo` — check server logs.
- Duplicate logins: the manager guards against duplicate connections (kicks duplicate if login already connected) — this is a server-level safety measure.
- If `isAdmin` is unexpectedly false, check the `tmc.settings.admins` source and ensure the login is included.
