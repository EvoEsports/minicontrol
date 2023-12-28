# minicontrol
Minicontrol for trackmania united forever and trackmania 2020

# Install

1. npm i
2. copy .env.example to .env and configure
3. install typescript and ts-node as global npm packages
4. npm run dev


The controller is still in its very early stages.
Idea is to use same codebase as much as possible to both games, tmuf and tm2020.

Controller will use the default user and password: SuperAdmin, SuperAdmin for the dedicated server,
change port to match your install.

# Development

The core is set as simple as possible, so you should be able to just do plugins very easily:

## TMC

Mostly you wish to use tmc variable which is set to global scope.

## Server
To make everything cross platform with the games, i had to do few compromises.

Callbacks starting with:
`TrackMania.` and  `ManiaPlanet.` are all renamed to start with `Trackmania.`
Checkpoints and Finish event has custom ones:
```ts
tmc.server.on("Trackmania.", callback); // for generic ones
tmc.server.on("TMC.PlayerCheckpoint", this.checkpoint.bind(this));
tmc.server.on("TMC.PlayerFinish", this.finish.bind(this));
tmc.server.on("TMC.PlayerGiveup", this.giveup.bind(this));
```

Interactions and shortcuts:

```ts
// server call
await tmc.server.call("GetMapList", -1,0);
await tmc.chat("message", recipient /*optional*/ );

// public commands
tmc.addCommand("/command", callable);
// admin commands
tmc.addCommand("//command", callable);
```

## UI
```ts
const action = tmc.ui.addAction(this.buttonClick.bind(this), {map: "testmap", id: 47}); // this return generated action id for the button click

// usage
async buttonClick(login:string, data:any) {
    // do things when user clicks button with data
}
```

for more examples check the bestcps and map widget plugins...




