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
tmc.server.on("Trackmania.*", this.callback.bind(this)); // for generic ones
tmc.server.on("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
tmc.server.on("TMC.PlayerFinish", this.finish.bind(this));
tmc.server.on("TMC.PlayerGiveup", this.giveup.bind(this));
```
