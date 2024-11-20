# Server class

Server class is used to communicate with the game server itself.

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

}
```

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
