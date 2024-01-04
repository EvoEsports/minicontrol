# minicontrol
Minicontrol for trackmania united forever, maniaplanet and trackmania 2020

# Intall

The core is set as simple as possible, so you should be able to just do plugins very easily.
> Notice: I changed to use bun instead of node, easiest way to migrate is just  `npm i -g bun`

1. bun install
2. copy .env.example to .env and configure
3. enable or disable needed plugins at `plugins.json` 
4. bun start

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
tmc.chat("message", recipient /*optional*/ );

// public commands
tmc.addCommand("/command", callable, "help text");
// admin commands
tmc.addCommand("//command", callable, "help text");
```

## UI
```ts
const action = tmc.ui.addAction(this.buttonClick.bind(this), {map: "testmap", id: 47}); // this return generated action id for the button click

// usage
async buttonClick(login:string, data:any, entries:string[]|undefined) {
    // do things when user clicks button with data
}
```

for more examples check the bestcps and map widget plugins...
