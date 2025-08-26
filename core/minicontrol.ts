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
import { require } from "tsx/cjs/api";
import type * as SentryType from "@sentry/node";

const Sentry = require("./sentry", import.meta.url);
declare global {
    const tmc: MiniControl;
    const sentry: typeof SentryType;
}

import PlayerManager, { type Player } from "./playermanager";
import BillManager from "./billmanager";
import Server, { type VersionStruct } from "./server";
import UiManager from "./uimanager";
import MapManager from "./mapmanager";
import CommandManager, { type CallableCommand } from "./commandmanager";
import SettingsManager from "./settingsmanager";
import { clone, getCallerName, processColorString, setMemStart } from "./utils";
import log from "./log";
import fs from "node:fs";
import Plugin from "./plugins/index";
import path from "node:path";
import { DepGraph } from "dependency-graph";
import semver from "semver";
import version from "../version.json";
import { pathToFileURL } from "node:url";

/**
 * MiniControl class
 */
class MiniControl {
    /**
     * The version of MiniControl.
     */
    readonly brand: string = "$eeeΜΙΝΙ$abccontrol$z$s¤white¤";
    readonly version: string = process.env.npm_package_version || version.version || "unknown";
    /**
     * The start time of MiniControl.
     */
    readonly startTime: number = Date.now();
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
     * The settings manager.
     */
    settings: SettingsManager;
    /**
     * The plugins.
     */
    plugins: { [key: string]: Plugin } = {};
    pluginDependecies: DepGraph<string> = new DepGraph();
    billMgr: BillManager;
    /**
     * The game object.
     */
    game: VersionStruct = {} as VersionStruct;
    mapsPath = "";
    storage: { [key: string]: any } = {};
    startComplete = false;

    constructor() {
        console.time("Startup");
        this.server = new Server();
        this.maps = new MapManager();
        this.players = new PlayerManager();
        this.ui = new UiManager();
        this.chatCmd = new CommandManager();
        this.billMgr = new BillManager();
        this.settings = new SettingsManager();
        this.admins = this.settings.admins;
    }

    /**
     * Gets a player object from the player manager.
     * @param login The login of the player.
     * @returns A promise that resolves to the player object.
     */
    async getPlayer(login: string): Promise<Player> {
        return this.players.getPlayer(login);
    }

    /**
     * Adds chat command
     * @param command The command name, should start with / for public or // for admin only
     * @param callback The callback function to execute when the command is triggered.
     * @param help The help text for the command.
     */
    addCommand(command: string, callback: CallableCommand, help = "") {
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
            if (fs.existsSync(`${dir + name}/index.ts`)) {
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

            let plugin: any;
            const epoch = new Date().getTime();
            const realPath = fs.realpathSync(`${process.cwd()}/${pluginPath}`);
            const path = pathToFileURL(realPath);
            plugin = await import(path.href); // path.href + "?stamp=${epoch}";

            if (plugin.default === undefined) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤error¤ failed to load. Plugin has no default export.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            if (!(plugin.default && typeof plugin.default.prototype.getDepends === 'function')) {
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
                            this.pluginDependecies.addDependency(name, dependency);
                        }
                    }
                }
            }

            for (const depend of plugin.default.depends) {
                if (depend.startsWith("game:")) {
                    const game = depend.split(":")[1];
                    if (game !== this.game.Name) {
                        const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Game is not ¤cmd¤${game}¤white¤.`;
                        this.cli(msg);
                        if (this.startComplete) this.chat(msg);
                        return;
                    }
                }
                if (!this.pluginDependecies.hasNode(depend) && !depend.startsWith("game:")) {
                    const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Missing dependency ¤cmd¤${depend}¤white¤.`;
                    this.cli(msg);
                    if (this.startComplete) this.chat(msg);
                    return;
                }
                if (!depend.startsWith("game:") && this.pluginDependecies.dependentsOf(depend).includes(name) && !this.plugins[depend]) {
                    const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ not loaded. Plugin ¤cmd¤${depend}¤white¤ is not loaded.`;
                    this.cli(msg);
                    if (this.startComplete) this.chat(msg);
                    return;
                }
            }

            // load and init the plugin
            try {
                tmc.cli(`¤gray¤Loading ¤cmd¤${name}¤white¤...`);
                const cls = new plugin.default();
                this.plugins[name] = cls;
                await cls.onLoad();
                if (this.startComplete) {
                    await cls.onStart();
                    this.chat(`¤gray¤Plugin ¤cmd¤${name} ¤white¤loaded!`);
                }
                this.cli("¤gray¤Success.");
            } catch (e: any) {
                tmc.cli(`¤gray¤Error while starting plugin ¤cmd¤${name}`);
                sentry.captureException(e, {
                    tags: {
                        section: "initPlugin",
                    },
                });
                console.log(e);
            }
        } else {
            const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ already loaded.`;
            this.chat(msg);
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

            /* disabled for now
            const file = process.cwd() + pluginPath.replaceAll('.', '') + '/index.ts';
            if (require.cache[file]) {
                delete require.cache[file];
            } else {
                this.cli(`$fffFailed to remove require cache for ¤cmd¤${unloadName}¤white¤, hotreload will not work right.`);
            }
            */
            const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ unloaded.`;
            this.cli(msg);
            this.chat(msg);
        } else {
            const msg = `¤gray¤Plugin ¤cmd¤${unloadName}¤white¤ not loaded.`;
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
        if (process.env.DEBUGLEVEL === "3") getCallerName();
    }

    /**
     * log command to console if debug is enabled
     * @param object The object to log.
     */
    debug(object: any) {
        if (process.env.DEBUG === "true") {
            const level = Number.parseInt(process.env.DEBUGLEVEL || "1");
            if (level >= 1) log.debug(processColorString(object.toString()));
            if (level >= 3) getCallerName();
        }
    }

    /**
     * Sends chat message to server
     * @param text string to send to chat
     * @param login {string | string[]} login(s) to send message to, if undefined sends to all players
     */
    chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            const msg = `$9ab$n>$z$s ${text.toString()}`;
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg, "$z$s"), typeof login === "string" ? login : login.join(","));
        } else {
            const msg = `$9ab» ¤info¤${text.toString()}`;
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
        this.cli(`¤info¤Starting ${this.brand} ¤info¤version: $fff${version.build} (${this.version})`);
        this.cli(`¤info¤Using Node ¤white¤${process.version}`);
        if (semver.gt("21.5.0", process.version)) {
            this.cli("¤error¤Your Node version is too old. Must be atleast 21.5.0, please upgrade!");
            process.exit(1);
        }
        this.cli(`¤info¤Connecting to Trackmania Dedicated server at ¤white¤${process.env.XMLRPC_HOST ?? "127.0.0.1"}:${port}`);
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
        this.game = this.server.version;
        this.server.send("EnableCallbacks", true);
        this.server.send("SendHideManialinkPage");
        if (this.game.Name === "Trackmania") {
            await this.server.call("SetApiVersion", "2023-03-25");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.sendScript("XmlRpc.EnableCallbacks", "true");
        } else if (this.game.Name === "TmForever") {
            this.mapsPath = await this.server.call("GetTracksDirectory");
        } else if (this.game.Name === "ManiaPlanet") {
            await this.server.call("SetApiVersion", "2013-04-16");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.sendScript("XmlRpc.EnableCallbacks", "true");
            try {
                const settings = { S_UseLegacyXmlRpcCallbacks: false };
                tmc.server.send("SetModeScriptSettings", settings);
            } catch (e: any) {
                tmc.cli(e.message);
            }
        }
        await this.server.limitScriptCallbacks();
        this.settings.load();
        await this.maps.init();
        await this.players.init();
        await this.ui.init();
        this.beforeInit();
    }

    /**
     * Executes tasks before MiniControl initialization.
     * @ignore Shouldn't be called directly
     */
    async beforeInit() {
        await this.chatCmd.beforeInit();

        // load plugins
        let plugins = fs.readdirSync(`${process.cwd().replaceAll("\\", "/")}/core/plugins`, { withFileTypes: true, recursive: true });
        plugins = plugins.concat(fs.readdirSync(`${process.cwd().replaceAll("\\", "/")}/userdata/plugins`, { withFileTypes: true, recursive: true }));
        const exclude = process.env.EXCLUDED_PLUGINS?.split(",") || [];
        const loadList: string[] = [];
        for (const plugin of plugins) {
            let include = plugin?.name && (plugin.isDirectory() || plugin.isSymbolicLink());
            if (plugin.name.includes(".") || plugin.parentPath.includes(".")) include = false;
            if (plugin.name.includes("node_modules") || plugin.parentPath.includes("node_modules")) include = false;
            const directory = plugin.parentPath
                .replaceAll("\\", "/")
                .replace(path.resolve("core", "plugins").replaceAll("\\", "/"), "")
                .replace(path.resolve("userdata", "plugins").replaceAll("\\", "/"), "");
            if (include) {
                let pluginName: string = plugin.name;
                if (directory !== "") {
                    pluginName = `${directory}/${plugin.name}`.replaceAll("\\", "/");
                    if (pluginName.startsWith("/")) pluginName = pluginName.substring(1);
                }
                for (const excludeName of exclude) {
                    if (excludeName === "") continue;
                    if (pluginName === excludeName.trim()) {
                        include = false;
                    }
                }
                if (include) {
                    loadList.push(pluginName);
                }
            }
        }

        // load metadata
        let dependencyByPlugin: any = {};

        for (const name of loadList) {
            const pluginName = this.findPlugin(name);
            if (pluginName == null) {
                const msg = `¤error¤Didn't find a plugin. resolved plugin name is null.`;
                this.cli(msg);
                continue;
            }
            let cls: any = null;
            const realPath = fs.realpathSync(`${process.cwd()}/${pluginName}`);
            const path = pathToFileURL(realPath);
            cls = await import(path.href);

            let plugin: any = cls.default;

            if (plugin === undefined) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤error¤ failed to load. Plugin has no default export.`;
                this.cli(msg);
                cls = undefined;
                continue;
            }

            if (!(plugin.prototype && typeof plugin.prototype.getDepends === 'function')) {
                const msg = `¤gray¤Plugin ¤cmd¤${name}¤white¤ is not a valid plugin.`;
                this.cli(msg);
                cls = undefined;
                plugin = undefined;
                continue;
            }

            this.pluginDependecies.addNode(name);
            if (Reflect.has(plugin, "depends")) {
                dependencyByPlugin[name] = clone(plugin.depends);
            }
            cls = undefined;
            plugin = undefined;
        }

        for (const name in dependencyByPlugin) {
            for (const dependency of dependencyByPlugin[name]) {
                if (!dependency.startsWith("game:")) {
                    try {
                        this.pluginDependecies.addDependency(name, dependency);
                    } catch (error: any) {
                        // silent exception
                    }
                }
            }
        }
        dependencyByPlugin = null;

        for (const pluginName of this.pluginDependecies.overallOrder()) {
            if (loadList.includes(pluginName)) {
                await this.loadPlugin(pluginName);
            }
        }

        this.server.send("Echo", this.startTime.toString(), "MiniControl");
    }

    /**
     * Executes tasks after MiniControl initialization.
     * @ignore Should not be called directly
     *
     */
    async afterStart() {
        this.billMgr.afterInit();
        this.players.afterInit();
        this.chatCmd.afterInit();
        this.ui.afterInit();
        this.maps.afterInit();

        this.startComplete = true;
        if (gc) gc();
        setMemStart();
        const msg = `¤info¤Welcome to ${this.brand} ¤info¤version ¤white¤${this.version}¤info¤!`;
        this.chat(msg);
        this.cli(msg);
        for (const plugin of Object.values(this.plugins)) {
            try {
                plugin?.onStart();
            } catch (err: any) {
                this.cli(`¤error¤Error while starting plugin ¤cmd¤${plugin.constructor.name}`);
                /*
                sentry.captureException(err, {
                    tags: {
                        section: 'initPlugin'
                    }
                }); */
                console.log(err);
            }
        }
        console.timeEnd("Startup");
    }
}

(globalThis as any).tmc = new MiniControl();
(globalThis as any).sentry = Sentry;

process.on("SIGINT", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    Sentry.close(2000).then(() => {
        console.log("MINIcontrol exits successfully.");
        process.exit(0);
    });
});

process.on("SIGTERM", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    Sentry.close(2000).then(() => {
        console.log("MINIcontrol exits succesfully.");
        process.exit(0);
    });
});

process.on("uncaughtException", (err) => {
    tmc.cli(`¤error¤${err.message}`);
    console.log(err);
    if (process.env.DEBUG === "true") {
        // process.exit(1);
    }
});

try {
    tmc.run();
} catch (e: any) {
    tmc.cli(`¤error¤${e.message}`);
}

tmc.debug("MINIcontrol is running, add debug point this line to get tmc object to debug console.");
