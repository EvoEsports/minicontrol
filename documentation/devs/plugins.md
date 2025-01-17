# Plugins

## Listeners

To make plugins work across all generations of Trackmania games, we took some creative liberties to make our lives easier.

* Callbacks starting with: `TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.`.
* All script callbacks will be redirected as events.

Also note that there's a few `TMC.events` that should be used instead of the native dedicated server callbacks.
These are writen as adapters so they'll provide the right info from each game in the same way,
even if the game's underlying data differs.

```ts
// async onPlayerConnect(player: Player) {}
tmc.server.addListener("TMC.PlayerConnect", this.onPlayerConnect, this)

// async onPlayerDisconnect(player: Player) {}
tmc.server.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this)

// async onPlayerCheckpoint(login:string, racetime:int, checkpointinrace:int) {}
tmc.server.addListener("TMC.PlayerCheckpoint", this.onPlayerCheckpoint, this);

// async onPlayerFinish(login:string, time:int) {}
tmc.server.addListener("TMC.PlayerFinish", this.finish, this);

// async onPlayerGiveup(login:string) {}
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

## Chat commands

```ts
tmc.addCommand("/mycommand", this.myCommand.bind(this), "description");
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
tmc.cli("trackmania colorCoded string");
// To log a debug message, shows only when debug is enabled in `.env`
tmc.debug("trackmania colorCoded string");
```
