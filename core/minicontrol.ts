/*
    MINIcontrol - server controller for Trackmania games
    Copyright (C) 2024 Evo eSports e.V.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import PlayerManager, { Player } from './playermanager';
import Server from './server';
import UiManager from './uimanager';
import MapManager from './mapmanager';
import CommandManager from './commandmanager';
import SettingsManager from './settingsmanager';
import { getCallerName, processColorString, setMemStart } from './utils';
import log from './log';
import fs from 'fs';
import Plugin from './plugins/index';
import path from 'path';
import { DepGraph } from "dependency-graph";
import { require } from 'tsx/cjs/api'

export interface GameStruct {
    Name: string;
    Version?: string;
    Build?: string;
}


/**
 * MiniControl class
 */
class MiniControl {
    /**
     * The version of MiniControl.
     */
    readonly brand: string = "$n$o$eeeMINI$o$z$s$abccontrol$z$s¤white¤";
    readonly version: string = "0.6.1";
    /**
     * The start time of MiniControl.
     */
    readonly startTime: string = Date.now().toString();
    /**
     * The admins of MiniControl.
     */
    admins: string[] = [];
    /**
     * The server object.
     */
    server: Server;
    /**
     * The command manager.
     */
    chatCmd: CommandManager;
    /**
     * The map manager.
     */
    maps: MapManager;
    /**
     * The player manager.
     */
    players: PlayerManager;
    /**
     * The UI manager.
     */
    ui: UiManager;
    /**
     * The settings
     */
    settings: any = {};
    /**
     * The settings manager.
     */
    settingsMgr: SettingsManager;
    /**
     * The colors
     */
    colors: { [key: string]: string } = {};
    /**
    * The plugins.
    */
    plugins: { [key: string]: Plugin } = {};
    pluginDependecies: DepGraph<string> = new DepGraph();
    /**
     * The game object.
     */
    game: GameStruct;
    mapsPath: string = "";
    storage: { [key: string]: any } = {};
    startComplete: boolean = false;

    constructor() {
        console.time("Startup");
        this.server = new Server();
        this.maps = new MapManager();
        this.players = new PlayerManager();
        this.ui = new UiManager();
        this.chatCmd = new CommandManager();
        this.settingsMgr = new SettingsManager();
        this.settingsMgr.load();
        this.settings = this.settingsMgr.settings;
        this.colors = this.settingsMgr.colors;
        this.admins = this.settingsMgr.admins;
        this.game = { Name: "" };
    }

    /**
     * Gets a player object from the player manager.
     * @param login The login of the player.
     * @returns A promise that resolves to the player object.
     */
    async getPlayer(login: string): Promise<Player> {
        return await this.players.getPlayer(login);
    }

    /**
     * Adds chat command
     * @param command The command name, should start with / for public or // for admin only
     * @param callback The callback function to execute when the command is triggered.
     * @param help The help text for the command.
     */
    addCommand(command: string, callback: CallableFunction, help: string = "") {
        this.chatCmd.addCommand(command, callback, help);
    }

    /**
     *  Removes chat command
     * @param command The command name to remove.
     */
    removeCommand(command: string) {
        this.chatCmd.removeCommand(command);
    }

    /**
    * @param name name of the plugin folder in ./plugins
    * @returns
    */
    findPlugin(name: string): string | null {
        const dirsToCheck = ["./core/plugins/", "./userdata/plugins/"];
        for (const dir of dirsToCheck) {
            if (fs.existsSync(dir + name + "/index.ts")) {
                return (dir + name).replaceAll("\\", "/");
            }
        }
        return null;
    }

    /**
     * Loads a plugin to runtime
     * @param name name of the plugin folder in ./plugins
     * @returns
     */
    async loadPlugin(name: string) {
        if (!this.plugins[name]) {
            const pluginPath = this.findPlugin(name);
            if (pluginPath == null) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ does not exist.`;
                if (this.startComplete) {
                    this.cli(msg);
                    this.chat(msg);
                }
                return;
            }
            let plugin = null;
            if (process.platform === "win32") {
                plugin = await import("file:///" + process.cwd() + "/" + pluginPath);
            } else {
                plugin = await import(process.cwd() + "/" + pluginPath);
            }

            if (plugin.default == undefined) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤error¤ failed to load. Plugin has no default export.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            if (!(plugin.default.prototype instanceof Plugin)) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ is not a valid plugin.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }

            if (!this.pluginDependecies.hasNode(name)) {
                this.pluginDependecies.addNode(name);
                if (Reflect.has(plugin.default, "depends")) {
                    for (const dependency of plugin.default.depends) {
                        if (!dependency.startsWith("game:")) {
                            this.pluginDependecies.addDependency(name, dependency)
                        }
                    }
                }
            }

            for (const depend of plugin.default.depends) {
                if (depend.startsWith("game:")) {
                    const game = depend.split(":")[1];
                    if (game != this.game.Name) {
                        const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Game is not ¤cmd¤${game}¤white¤.`;
                        this.cli(msg);
                        if (this.startComplete) this.chat(msg);
                        return;
                    }
                }
                if (!this.pluginDependecies.hasNode(depend) && !depend.startsWith("game:")) {
                    const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ failed to load. Missing dependency ¤cmd¤${depend}¤white¤.`;
                    this.cli(msg);
                    if (this.startComplete) this.chat(msg);
                    return;
                }
            }

            // load and init the plugin
            try {
                tmc.cli(`¤gray¤Loading ¤cmd¤${name}¤white¤...`)
                const cls = new plugin.default();
                this.plugins[name] = cls;
                await cls.onLoad();
                if (this.startComplete) {
                    await cls.onStart();
                    this.chat(`¤gray¤Plugin ¤cmd¤${name} ¤white¤loaded!`);
                }
                this.cli("¤gray¤Success.");
            } catch (e: any) {
                tmc.cli("¤gray¤Error while starting plugin ¤cmd¤" + name);
                console.log(e);
            }
        } else {
            const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ already loaded.`;
            this.chat(msg)
            this.cli(msg);
        }
    }

    /**
     * unloads plugin from runtime, also checks for dependecies, runs onUnload and removes require cache
     * @param unloadName name of the plugin folder in ./plugins
     * @returns
     */
    async unloadPlugin(unloadName: string) {
        if (this.plugins[unloadName]) {
            const deps = this.pluginDependecies.dependantsOf(unloadName);
            if (deps.length > 0) {
                const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ cannot be unloaded. It has a dependency of ¤cmd¤${deps.join(", ")}¤white¤.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            const pluginPath = this.findPlugin(unloadName);
            if (pluginPath == null) {
                const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ does not exist.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }

            // unload
            await this.plugins[unloadName].onUnload();
            // remove from dependecies
            for (const dep of this.plugins[unloadName].getDepends()) {
                this.pluginDependecies.removeDependency(unloadName, dep);
            }
            this.pluginDependecies.removeNode(unloadName);

            delete this.plugins[unloadName];
            const file = process.cwd() + pluginPath.replaceAll(".", "") + "/index.ts";
            if (require.cache[file]) {
                // eslint-disable-next-line drizzle/enforce-delete-with-where
                // Loader.registry.delete(file); // @TODO check how to do this in tsx
                delete require.cache[file];
            } else {
                this.cli(`$fffFailed to remove require cache for ¤cmd¤${unloadName}¤white¤, hotreload will not work right.`);
            }
            const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ unloaded.`;
            this.cli(msg);
            this.chat(msg);
        } else {
            const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ not loaded.`
            this.cli(msg);
            this.chat(msg);
        }
    }

    /**
     * send message to console
     * @param object The object to log.
     */
    cli(object: any) {
        log.info(processColorString(object.toString()));
        if (process.env.DEBUG == "true") getCallerName();
    }

    /**
     * log command to console if debug is enabled
     * @param object The object to log.
     */
    debug(object: any) {
        if (process.env.DEBUG == "true") log.debug(processColorString(object.toString()));
        getCallerName();
    }

    /**
     * Sends chat message to server
     * @param text string to send to chat
     * @param login {string | string[]} login(s) to send message to, if undefined sends to all players
     */
    chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            const msg = "$9ab$n>$z$s " + text.toString();
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg, "$z$s"), (typeof login == "string") ? login : login.join(","));
        } else {
            const msg = "$9ab» ¤info¤" + text.toString();
            this.server.send("ChatSendServerMessage", processColorString(msg, "$z$s"));
        }
    }

    /**
     * Runs MiniControl.
     * @ignore Should not be called directly
     */
    async run() {
        if (this.startComplete) return;
        const port = Number.parseInt(process.env.XMLRPC_PORT || "5000");
        this.cli(`¤info¤Starting ¤white¤MINIcontrol ${this.version}`);
        this.cli(`¤info¤Using Node ¤white¤${process.version}`);
        this.cli("¤info¤Connecting to Trackmania Dedicated server at ¤white¤" + (process.env.XMLRPC_HOST ?? "127.0.0.1") + ":" + port);
        const status = await this.server.connect(process.env.XMLRPC_HOST ?? "127.0.0.1", port);
        if (!status) {
            this.cli("¤error¤Couldn't connect to server.");
            process.exit();
        }
        this.cli("¤info¤Connected to Trackmania Dedicated server.");
        try {
            await this.server.call("Authenticate", process.env.XMLRPC_USER ?? "SuperAdmin", process.env.XMLRPC_PASS ?? "SuperAdmin");
        } catch (e: any) {
            this.cli("¤error¤Authenticate to server failed.");
            this.cli(e.message);
            process.exit();
        }
        await this.server.fetchServerInfo();
        this.server.send("EnableCallbacks", true);
        this.server.send("SendHideManialinkPage");
        this.game = await this.server.call("GetVersion");

        if (this.game.Name == "Trackmania") {
            await this.server.call("SetApiVersion", "2023-04-16");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.callScript("XmlRpc.EnableCallbacks", "true");
        } else {
            this.mapsPath = await this.server.call("GetTracksDirectory");
        }

        await this.maps.init();
        await this.players.init();
        await this.ui.init();
        await this.beforeInit();
        setMemStart();
    }

    /**
     * Executes tasks before MiniControl initialization.
     * @ignore Shouldn't be called directly
     */
    async beforeInit() {
        await this.chatCmd.beforeInit();
        // load plugins
        let plugins = fs.readdirSync(process.cwd().replaceAll("\\", "/") + "/core/plugins", { withFileTypes: true, recursive: true });
        plugins = plugins.concat(fs.readdirSync(process.cwd().replaceAll("\\", "/") + "/userdata/plugins", { withFileTypes: true, recursive: true }));
        const exclude = process.env.EXCLUDED_PLUGINS?.split(",") || [];
        let loadList = [];
        for (const plugin of plugins) {
            let include = plugin && plugin.name && plugin.isDirectory();
            if (plugin.name.includes(".") || plugin.parentPath.includes(".")) include = false;
            if (plugin.name.includes("node_modules") || plugin.parentPath.includes("node_modules")) include = false;
            const directory = plugin.parentPath.replaceAll("\\", "/").replace(path.resolve("core", "plugins").replaceAll("\\", "/"), "").replace(path.resolve("userdata", "plugins").replaceAll("\\", "/"), "");
            if (include) {
                let pluginName = plugin.name;
                if (directory != "") {
                    pluginName = (directory + "/" + plugin.name).replaceAll("\\", "/");
                    if (pluginName.startsWith("/")) pluginName = pluginName.substring(1);
                }
                for (const excludeName of exclude) {
                    if (excludeName == "") continue;
                    if (pluginName.startsWith(excludeName.trim())) {
                        include = false;
                    }
                }
                if (include) {
                    loadList.push(pluginName);
                }
            }
        }

        // load metadata
        // this.pluginDependecies.addNode("game:" + tmc.game.Name);
        let dependencyByPlugin: any = {};

        for (const name of loadList) {
            const pluginName = this.findPlugin(name);
            if (pluginName == null) {
                const msg = `¤error¤Didn't find a plugin. resolved plugin name is null.`;
                this.cli(msg);
                continue;
            }
            let cls = null;
            if (process.platform === "win32") {
                cls = await import("file:///" + process.cwd() + "/" + pluginName);
            } else {
                cls = await import(process.cwd() + "/" + pluginName);
            }
            const plugin = cls.default;

            if (plugin == undefined) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤error¤ failed to load. Plugin has no default export.`;
                this.cli(msg);
                continue;
            }

            if (!(plugin.prototype instanceof Plugin)) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ is not a valid plugin.`;
                this.cli(msg);
                continue;
            }

            this.pluginDependecies.addNode(name);
            if (Reflect.has(plugin, "depends")) {
                dependencyByPlugin[name] = plugin.depends;
            }
        }

        for (const name in dependencyByPlugin) {
            for (const dependency of dependencyByPlugin[name]) {
                if (!dependency.startsWith("game:")) {
                    this.pluginDependecies.addDependency(name, dependency);
                }
            }
        }
        dependencyByPlugin = null;

        for (const plugin of this.pluginDependecies.overallOrder()) {
            if (loadList.includes(plugin)) {
                await this.loadPlugin(plugin)
            }
        }

        this.server.send("Echo", this.startTime, "MiniControl");
    }

    /**
     * Executes tasks after MiniControl initialization.
     * @ignore Should not be called directly
     *
     */
    async afterStart() {
        this.players.afterInit();
        await this.chatCmd.afterInit();
        await this.ui.afterInit();
        const msg = `¤info¤Welcome to ${this.brand} ¤info¤version ¤white¤${this.version}¤info¤!`;
        this.chat(msg);
        this.cli(msg);
        this.startComplete = true;
        for (const plugin of Object.values(this.plugins)) {
            await plugin.onStart();
        }
        console.timeEnd("Startup");
        tmc.cli("¤success¤MiniControl started successfully.");
    }
}

export const tmc = new MiniControl();

declare global {
    const tmc: MiniControl
}

(global as any).tmc = tmc;

(async () => {
    try {
        await tmc.run();
    } catch (e: any) {
        tmc.cli("¤error¤" + e.message);
    }
})();

process.on('SIGINT', function () {
    tmc.server.send("SendHideManialinkPage", 0, false);
    process.exit(0);
});

process.on("SIGTERM", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    process.exit(0);
});

process.on('uncaughtException', function (err) {
    tmc.cli("¤error¤" + err.message);
    console.log(err);
    if (process.env['DEBUG'] == "true") {
    // process.exit(1);
    }
});
