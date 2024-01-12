# Server class

Server class is used to communicate with the game server itself.

there's three types of calls you can interact with the server:

```ts
class Server extends EventsEmitter {
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
Callbacks starting with: `TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.`
Checkpoints and Finish event has custom ones:
```ts
tmc.server.addListener("Trackmania.*", this.callback, this); // for generic ones
tmc.server.addListener("TMC.PlayerCheckpoint", this.checkpoint, this);
tmc.server.addListener("TMC.PlayerFinish", this.finish, this);
tmc.server.addListener("TMC.PlayerGiveup", this.giveup, this);
```
