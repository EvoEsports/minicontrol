# Plugins

## Listeners

To make everything working with all generations of the games, some things had to changed.
Callbacks starting with: `TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.` All script callbacks will be redirected as events.

Also note that there's few `TMC.events` that should be used instead of the native ones.
These are writeen as adapters so they'll provide the right info from each game in same way,
even the game data differs.

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



## Interacting with server

To interact with the server you usually wish to listen for ingame event and react to it.
To communicate with the dedicated server you have 3 options:

```ts
// to perform a full call with the server getting answer back
const answer = await tmc.server.call("method", ...params);
// to perform just send call, ignore answer
tmc.server.send("method", ...params);
// to perform multicall
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

In case you need to call the original gbx method, use

```ts
async myOverride(data: any) {
    await tmc.server.gbx.call("method", ...params);
}
```

## Sending chat messages 

Sending public and personalized chat messages.
```ts
// note no await needed, it's a pure send, ignoring the answer from dedicated
tmc.chat(`Hello World!`);

// and to send personalized messages, use login, comma separated values of logins, or array of logins
tmc.chat(`Hello World!`, "login")
tmc.chat(`Hello World!`, "login1, login2, ...")
tmc.chat(`Hello World!`, ["login1", "login2"])
```

## Interacting with TTY console

```ts
// to send direct line at console, trackmania colors will be parsed to ansi sequences
tmc.cli("trackmania colorCoded string");
// send debug line at console, shows only when debug is enabled
tmc.debug("trackmania colorCoded string");
```

