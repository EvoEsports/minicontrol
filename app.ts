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

export default class MiniControl {
    version: string = "2024-01-04";
    startTime: string = Date.now().toString();
    server: Server;
    players: PlayerManager;
    ui: UiManager;
    plugins: { [key: string]: Plugin } = {};
    game: GameStruct;
    mapsPath: string = "";
    admins: string[];
    chatCmd: CommandManager;
    maps: MapManager;
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

    async getPlayer(login: string): Promise<Player> {
        return await this.players.getPlayer(login);
    }

    addCommand(command: string, callback: CallableFunction, help: string = "") {
        this.chatCmd.addCommand(command, callback, help);
    }

    removeCommand(command: string) {
        this.chatCmd.removeCommand(command);
    }

    async loadPlugin(name: string) {
        if (!this.plugins[name]) {
            if (fs.existsSync("./plugins/" + name + "/index.ts") == false) {
                const msg = `$aaaPlugin $fd0${name}$fff does not exist.`;
                this.cli(msg);
                this.chat(msg);
                return;
            }
            const plugin = await import("./plugins/" + name);

            if (plugin == undefined) {
                const msg = `$aaaPlugin $fd0${name}$fff failed to load, plugin is undefined.`;
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
            this.plugins[name] = cls;
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

    async unloadPlugin(name: string) {
        if (this.plugins[name]) {
            await this.plugins[name].onUnload();
            delete this.plugins[name];
            Bun.gc(true);
            const msg = `$aaaPlugin $fd0${name}$fff unloaded.`;
            this.cli(msg);
            this.chat(msg);
        } else {
            const msg = `$aaaPlugin $fd0${name}$fff not loaded.`
            this.cli(msg);
            this.chat(msg);
        }
    }

    cli(object: any) {
        log.info(processColorString(object.toString()));
    }

    debug(object: any) {
        if (process.env.DEBUG == "true") log.info(processColorString(object.toString()));
    }

    async chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            const msg = "$z$s$5f0» ¤white¤" + text.toString().replaceAll("", "");
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg, "$z$s"), (typeof login == "string") ? login : login.join(","));
        } else {
            const msg = controllerStr + " »¤info¤ " + text.replaceAll("", "")
            this.server.send("ChatSendServerMessage", processColorString(msg, "$z$s"));
        }
    }

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

