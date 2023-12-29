import { GbxClient } from '@evotm/gbxclient';
import PlayerManager, { Player } from './core/playermanager';
import TmServer from './core/server';
import UiManager from './core/uimanager';
import { ChatCommand, GameStruct } from './core/types';
import 'dotenv/config'
import log from './core/log';

const controllerStr = "$z$n$b4e$oMINI$ocontrol $z";

class MiniControl {
    server: TmServer;
    players: PlayerManager;
    ui: UiManager;
    plugins: any = {};
    game: GameStruct;
    mapsPath: string = "";
    admins: string[];
    chatCommands: ChatCommand[] = [];

    constructor() {

        const gbx = new GbxClient();
        this.server = new TmServer(gbx);
        this.players = new PlayerManager(gbx);
        this.ui = new UiManager(this.server);
        this.cli(controllerStr);
        this.admins = (process.env.ADMINS || "").split(",");
        this.game = { Name: "" };
    }

    async getPlayer(login: string): Promise<Player> {
        return await this.players.getPlayer(login);
    }

    addCommand(command: string, callback: CallableFunction) {
        this.chatCommands.push({ trigger: command, callback: callback });
    }

    addPlugin(name: string, object: any) {
        if (!this.plugins[name]) {
            this.plugins[name] = object;
            this.cli(`Plugin $fd0${name}$fff loaded.`);
        }
    }

    cli(object: any) {
        log.info(object.toString());
    }

    async chat(text: string, login: undefined | string | string[] = undefined) {
        if (login !== undefined) {
            await this.server.call("ChatSendServerMessageToLogin", "$z$5f0» $fff" + text.toString().replaceAll("$s", ""), (typeof login == "string") ? login : login.join(","));
        } else {
            await this.server.call("ChatSendServerMessage", controllerStr + " $fff» " + text.replaceAll("$s", ""));
        }
    }

    async run() {
        const port = Number.parseInt(process.env.PORT || "5000");
        const status = await this.server.connect(process.env.HOST ?? "127.0.0.1", port);
        if (!status) {
            console.log("Couldn't connect to server.");
            process.exit();
        }
        try {
            await this.server.call("Authenticate", process.env.USER ?? "SuperAdmin", process.env.PASS ?? "SuperAdmin");
        } catch (e: any) {
            console.log("Authenticate to server failed.");
            console.log(e.message);
            process.exit();
        }
        await this.server.call("EnableCallbacks", true);
        await this.server.call("SendHideManialinkPage");
        this.game = await this.server.call("GetVersion");

        if (this.game.Name == "Trackmania") {
            await this.server.call("SetApiVersion", "2023-04-16");
            this.mapsPath = await this.server.call("GetMapsDirectory");
            await this.server.callScript("XmlRpc.EnableCallbacks", "true");
        } else {
            this.mapsPath = await this.server.call("GetTracksDirectory");
        }

        await this.players.init();
        await this.ui.init();
        await this.beforeInit();
        this.server.emit("TMC.Init");
        await this.afterInit();


    }

    async beforeInit() {
        this.addCommand("/help", async (login: string) => {
            let out = "Available: ";
            for (let command of tmc.chatCommands) {
                if (command.trigger.startsWith("/") && !command.trigger.startsWith("//")) {
                    out += `$fd0${command.trigger}$999, `;
                }
            }
            out = out.substring(0, out.length - 2);
            await tmc.chat(out, login);
        });
        this.addCommand("//help", async (login: string) => {
            let out = "Available: ";
            for (let command of tmc.chatCommands) {
                if (command.trigger.startsWith("//")) {
                    out += `$fd0${command.trigger}$fff, `;
                }
            }
            out = out.substring(0, out.length - 2);
            await tmc.chat(out, login);
        });
        this.addCommand("/serverlogin", async () => {});
        this.addCommand("/version", async () => {});
    }

    async afterInit() {
        this.server.on("Trackmania.PlayerChat", async (data: any) => {
            if (data[0] == 0) return;
            const login: string = data[1];
            let text: string = data[2];
            if (text.startsWith("/")) {
                for (let command of this.chatCommands) {
                    if (text.startsWith("//") && !this.admins.includes(login)) {
                        this.chat("Not allowed.", login);
                        return;
                    }
                    if (text.startsWith(command.trigger)) {
                        const words = text.replace(command.trigger, "").trim();
                        let params = (words.match(/(?<!\\)(?:\\{2})*"(?:(?<!\\)(?:\\{2})*\\"|[^"])+(?<!\\)(?:\\{2})*"|[^\s\"]+/gi) || []).map((word) => word.replace(/^"(.+(?="$))"$/, '$1').replaceAll("\\", ""));
                        command.callback(login, params);
                        return;
                    }
                }
                this.chat(`Command "$fd0${text}$fff" not found.`, login);
            }
        });
        this.cli("Controller $0f0ready.");
        this.chat("ready");
    }
}

const TMC = new MiniControl();
TMC.run();

declare global {
    const tmc: MiniControl
}

(global as any).tmc = TMC

import './plugins/plugins';