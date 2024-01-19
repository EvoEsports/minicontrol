# MINIcontrol for developers

Core concept is to provide modern, modular, easy-to-use server controller for all current trackmania games.
Idea for this started since [XAseco](https://xaseco.org), (most popular and very good controller overall) is getting aged.
PHP5 support has been dropped some while ago and attempts to get it running on even on PHP8 is limited. Luckily there is newer systems available like [Trakman](https://github.com/lythx/trakman), which is a nice controller as well, but for my needs it proven not to be as modular I would wished. So I started with MINIcontrol - the one tool for all trackmania games.

On key idea as well is to use same plugins code for all the games. This is due NADEO been kindly enough to keep the Dedicated server API quite the same all these years, kudos to them! So with a few adapters built-in it is very possible to build a plugin system running same code for all these games. Also this is not my first attempt to build a server controller, actually this is my 4th controller project, so i hope to have learnt something from the past projects. Previous attempts been: MLEPP, Expansion and Expansion<sup>2</sup>, you prolly can find these at github, they're all aswell open sourced.

## Typescript and Bun 
The MINIcontrol is coded usign typescript, and I just lately changed to use Bun over Nodejs since it's even faster than node runtime.

## Core

Core of the controller itself doesn't do much, rather provides a playground for the plugin developers to work with.

* 📂 **minicontrol**  
    * 📁 **core**  - core classes to reference and use
    * 📁 **documentation**  - this folder
    * 📁 **drizzle** - contains database migration info
    * 📁 **plugins** - all the plugins available
    * 📁 **schemas** - database schemas for drizzle orm
    * 📄 app.ts - minicontrol main entry 
    * 📄 .env - environmental variables for config
    * 📄 plugins.json - plugins list to load

## Trackmania Mini Control - the `tmc` global variable
 `tmc` is available for everywhere and should be always used to perform interactions with server, plugins, database and such.

### Public variables

* `tmc.admins` list of admin logins
* `tmc.version` contains the current iteration of the controller
* `tmc.startTime` is the start timestamp of the controller, for uptime and detecting the most newly started controller instance
* `tmc.server` [Server class](./class/server.md) 
* `tmc.players` [PlayerManager class](./class/playermanager.md) 
* `tmc.ui` [UiManager class](./class/uimanager.md)
* `tmc.chatCmd` [ChatCommandManager class](./class/chatcmd.md)
* `tmc.maps` [MapManager class](./class/maps.md)
* `tmc.plugins` object containing all the plugin instances
* `tmc.game` struct containing gameinfos 
* `tmc.mapsPath` string to map folder at os
* `tmc.storage` objectStorage for global key-value sharing between plugins

### Public methods

```ts
interface MiniControl {
    async getPlayer(login: string): Promise<Player>; // shortcut for tmc.player.getPlayer(login);
    addCommand(command: string, callback: CallableFunction, help: string = "");
    removeCommand(command: string);    
    async loadPlugin(name: string);
    async unloadPlugin(name:string);
    cli(string);
    debug(string);
    chat(text, receiver: undefined|string);
}
```
