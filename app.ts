import { GbxClient } from '@evotm/gbxclient';
import PlayerManager, { Player } from './core/playermanager';
import Server from './core/server';
import UiManager from './core/uimanager';
import MapManager from './core/mapmanager';
import CommandManager from './core/commandmanager';
import { type GameStruct } from './core/types';
import { processColorString } from './core/utils';
import log from './core/log';
import fs from 'fs';
import Plugin from './core/plugins';

const controllerStr = "$z$s$n$fff$oMINI$ocontrol$z$s$fff";

if (!process.versions.bun) {
    log.info(`Please install bun using "npm install -g bun"`);
    process.exit();
}
/**
 * MiniControl class
 */
export default class MiniControl {
    /**
     * The version of MiniControl.
     */
    readonly version: string = "2024-01-04";
    /**
     * The start time of MiniControl.
     */
    readonly startTime: string = Date.now().toString();
    /**
     * The admins of MiniControl.
     */
    admins: string[];
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
    * The plugins.
    */
    plugins: { [key: string]: Plugin } = {};
    private pluginDependecies: { [key: string]: string[] } = {};
    /**
     * The game object.
     */
    game: GameStruct;
    mapsPath: string = "";
    storage: { [key: string]: any } = {};
    startComplete: boolean = false;

    constructor() {
        console.time("Startup");
        this.server = new Server(new GbxClient());
        this.maps = new MapManager(this.server);
        this.players = new PlayerManager(this.server);
        this.ui = new UiManager(this.server);
        this.chatCmd = new CommandManager(this.server);
        this.admins = (process.env.ADMINS || "").split(",");
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
     * Loads a plugin to runtime
     * @param name name of the plugin folder in ./plugins
     * @returns 
     */
    async loadPlugin(name: string) {
        if (!this.plugins[name]) {
            if (fs.existsSync("./plugins/" + name + "/index.ts") == false) {
                const msg = `$aaaPlugin $fd0${name}$fff does not exist.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            const plugin = await import("./plugins/" + name);

            if (plugin.default == undefined) {
                const msg = `$aaaPlugin $fd0${name}¤error¤ failed to load. Plugin has no default export.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            if (!(plugin.default.prototype instanceof Plugin)) {
                const msg = `$aaaPlugin $fd0${name}$fff is not a valid plugin.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            const cls = new plugin.default();
            for (const depend of cls.depends) {
                if (depend.startsWith("game:")) {
                    const game = depend.split(":")[1];
                    if (game != this.game.Name) {
                        const msg = `$aaaPlugin $fd0${name}$fff failed to load. Game is not $fd0${game}$fff.`;
                        this.cli(msg);
                        this.chat(msg);
                        return;
                    }
                    continue;
                }
                if (this.plugins[depend] == undefined) {
                    const msg = `$aaaPlugin $fd0${name}$fff failed to load. Missing dependency $fd0${depend}$fff.`;
                    this.cli(msg);
                    this.chat(msg);
                    Bun.gc(true);
                    return;
                }
                this.pluginDependecies[depend].push(name);
            }
            // load and init the plugin
            this.plugins[name] = cls;
            if (this.pluginDependecies[name] == undefined) {
                this.pluginDependecies[name] = [];
            }
            const msg = `$aaaPlugin $fd0${name}$fff loaded.`;
            this.cli(msg);
            await cls.onLoad();
            if (this.startComplete) {
                this.chat(msg);
                await cls.onInit();
            }
        } else {
            const msg = `$aaaPlugin $fd0${name}$fff already loaded.`;
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
            if (this.pluginDependecies[unloadName].length > 0) {
                const msg = `$aaaPlugin $fd0${unloadName}$fff cannot be unloaded. It is a dependency of $fd0${this.pluginDependecies[unloadName].join(", ")}$fff.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            // unload
            await this.plugins[unloadName].onUnload();
            delete this.plugins[unloadName];
            const path = process.cwd() + "/plugins/" + unloadName + "/index.ts";
            if (require.cache[path]) {
                delete require.cache[path];
                try {
                    // eslint-disable-next-line drizzle/enforce-delete-with-where
                    Loader.registry.delete(path);
                } catch (e: any) {
                    this.cli(`$fffFailed to remove Loader cache for $fd0${unloadName}$fff, hotreload will not work right.`);
                }
            } else {
                this.cli(`$fffFailed to remove require cache for $fd0${unloadName}$fff, hotreload will not work right.`);
            }
            // remove from dependecies
            for (const key in this.pluginDependecies) {
                const index = this.pluginDependecies[key].indexOf(unloadName);
                if (index > -1) {
                    this.pluginDependecies[key].splice(index, 1);
                }
            }
            Bun.gc(true);
            const msg = `$aaaPlugin $fd0${unloadName}$fff unloaded.`;
            this.cli(msg);
            this.chat(msg);
        } else {
            const msg = `$aaaPlugin $fd0${unloadName}$fff not loaded.`
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
    }

    /**
     * log command to console if debug is enabled
     * @param object The object to log.
     */
    debug(object: any) {
        if (process.env.DEBUG == "true") log.info(processColorString(object.toString()));
    }

    /**
     * Sends chat message to server
     * @param text string to send to chat
     * @param login {string | string[]} login(s) to send message to, if undefined sends to all players
     */
    chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            const msg = "$z$s$5f0» ¤white¤" + text.toString().replaceAll("", "");
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg, "$z$s"), (typeof login == "string") ? login : login.join(","));
        } else {
            const msg = controllerStr + " »¤info¤ " + text.replaceAll("", "")
            this.server.send("ChatSendServerMessage", processColorString(msg, "$z$s"));
        }
    }

    /**
     * Runs MiniControl.
     * @ignore Should not be called directly
     */
    async run() {
        const port = Number.parseInt(process.env.XMLRPC_PORT || "5000");
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
        console.timeEnd("Startup");
    }

    /**
     * Executes tasks before MiniControl initialization. 
     * @ignore Shouldn't be called directly
     */
    async beforeInit() {
        this.chatCmd.beforeInit();
        const plugins = JSON.parse(await fs.readFileSync("plugins.json").toString());
        for (const plugin of plugins) {
            try {
                await tmc.loadPlugin(plugin);
            } catch (e: any) {
                console.log(e.message);
            }
        }
        this.server.send("Echo", this.startTime, "MiniControl",);
    }

    /**
     * Executes tasks after MiniControl initialization.
     * @ignore Should not be called directly
     * 
     */
    async afterStart() {
        tmc.cli("¤success¤MiniControl started successfully.");
        this.players.afterInit();
        this.chatCmd.afterInit();
        this.cli(`¤white¤Welcome to ${controllerStr} v${this.version}!`);
        this.server.send("ChatSendServerMessage", `Welcome to ${controllerStr} v${this.version}!`);
        this.startComplete = true;
        for (const plugin of Object.values(this.plugins)) {
            await plugin.onInit();
        }
    }
}

export const tmc = new MiniControl();
(async () => await tmc.run())();

declare global {
    const tmc: MiniControl
}

(global as any).tmc = tmc

process.on('SIGINT', function () {
    tmc.server.send("SendHideManialinkPage", 0, false);
    process.exit();
});

process.on("SIGTERM", () => {
    tmc.server.send("SendHideManialinkPage", 0, false);
    process.exit();
});

