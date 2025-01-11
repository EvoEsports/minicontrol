# MINIcontrol for developers

The core concept of MINIcontrol is to provide a modern, modular, easy-to-use server controller for all current Trackmania games.

The idea for this project came to reaby due to looking into hosting servers for TMNF/UF and [XAseco](https://xaseco.org) - the most popular and feature-rich server controller - really shows its age these days.

XAseco 1.16 relies on PHP 5.6, which has now been end-of-life for several years, and while there have been community attempts to port XAseco to modern versions of PHP like PHP7.4 and PHP8, these versions lack support for several available plugins, which would have to be ported manually.
Modern alternatives exist, like [Trakman](https://github.com/lythx/trakman), but for reaby's needs it proved not to be as modular as he would have liked. So he started working on MINIcontrol - the one tool for all Trackmania games. Soon after realizing its potential, we at Evo Esports took the project under our wing and provided reaby with additional development support for MINIcontrol.

One key idea of MINIcontrol is to make plugins compatible across all games with one single code-base.
While this would normally not be a small feat, thankfully the XML-RPC API of the Dedicated Servers for the Trackmania games haven't changed much over the years, meaning with a few adapters built-in it is very possible to build a plugin system running the same code for all these games.

Furthermode, this isn't reaby's or our first attempt to build a server controller, combined we have worked on several controller projects in the past (MLEPP, Expansion, Expansion², EvoSC, etc), and have learnt a lot of lessons from those.

## Core

The core of the controller itself doesn't do much, it provides a framework for plugin developers to work with.

### Overview of the folder structure

* 📂 **minicontrol**
  * 📁 **core**  - core contains all built-in classes and also plugins MINIcontrol ships with
    * 📄 minicontrol.ts - entry for controller
    * 📄 billmanager.ts - [BillManager class](./class/billmanager.md)
    * 📄 commandmanager.ts - [CommandManager class](./class/chatcmd.md)
    * 📄 mapmanager.ts - [MapManager class](./class/maps.md)
    * 📄 playermanager.ts - [PlayerManager class](./class/playermanager.md)
    * 📄 settingsmanager.ts - [SettingsManager class](./class/settingsmanager.md)
    * 📄 uimanager.ts - [UIManager class](./class/uimanager.md)
    * 📄 utils.ts - [UIManager class](./class/utils.md)
  * 📁 **documentation**  - this folder
  * 📁 **docker** - Dockerfile and example Docker Compose
  * 📁 **userdata** - contains all user data, e.g. the db migrations and schemata, the .sqlite file and user-installed plugins
  * 📄 .env - environmental variables for config

## Trackmania Mini Control - the `tmc` global variable

 `tmc` is available for everywhere and should be always used to interact with the dedicated server, plugins, database and such.

### Public variables

* `tmc.admins` - List of admin logins
* `tmc.version` - Contains the current version of the controller
* `tmc.startTime` - Start timestamp of the controller, for uptime tracking
* `tmc.server` - See [Server class](./class/server.md)
* `tmc.players` - See [PlayerManager class](./class/playermanager.md)
* `tmc.ui` - See [UiManager class](./class/uimanager.md)
* `tmc.chatCmd` - See [CommandManager class](./class/chatcmd.md)
* `tmc.maps` - See [MapManager class](./class/maps.md)
* `tmc.plugins` - object containing all the plugin instances
* `tmc.game` - struct containing current game info from the dedicated server
* `tmc.mapsPath` - string containing absolute path to the dedicated server's map folder
* `tmc.storage` - Object Storage for global key-value sharing between plugins

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
