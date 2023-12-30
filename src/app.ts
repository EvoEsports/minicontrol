import { GbxClient } from '@evotm/gbxclient';
import PlayerManager, { Player } from './core/playermanager';
import TmServer from './core/server';
import UiManager from './core/uimanager';
import MapManager from './core/mapmanager';
import { ChatCommand, GameStruct } from './core/types';
import { processColorString } from './core/utils';
import 'dotenv/config'
import log from './core/log';

const controllerStr = "$z$n¤brand¤$oMINI$o$fffcontrol$z$fff";
const version = "1.0";
class MiniControl {
    server: TmServer;
    players: PlayerManager;
    ui: UiManager;
    plugins: any = {};
    game: GameStruct;
    mapsPath: string = "";
    admins: string[];
    chatCommands: ChatCommand[] = [];
    maps: MapManager;

    constructor() {
        this.server = new TmServer(new GbxClient());
        this.maps = new MapManager(this.server);
        this.players = new PlayerManager(this.server);
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
            this.cli(`$aaaPlugin $fd0${name}$fff loaded.`);
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
            const msg = "$z$5f0» ¤white¤" + text.toString().replaceAll("$s", "");
            this.server.send("ChatSendServerMessageToLogin", processColorString(msg), (typeof login == "string") ? login : login.join(","));
        } else {
            const msg = controllerStr + " »¤brand¤ " + text.replaceAll("$s", "")
            this.server.send("ChatSendServerMessage", processColorString(msg, "$z$"));
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
        this.server.emit("TMC.Init");
        await this.afterInit();
    }

    async beforeInit() {
        this.addCommand("/help", async (login: string) => {
            let out = "Available: ";
            for (let command of tmc.chatCommands) {
                if (command.trigger.startsWith("/") && !command.trigger.startsWith("//")) {
                    out += `¤cmd¤${command.trigger}¤white¤, `;
                }
            }
            out = out.substring(0, out.length - 2);
            await tmc.chat(out, login);
        });
        this.addCommand("//help", async (login: string) => {
            let out = "Available: ";
            for (let command of tmc.chatCommands) {
                if (command.trigger.startsWith("//")) {
                    out += `¤cmd¤${command.trigger}¤white¤, `;
                }
            }
            out = out.substring(0, out.length - 2);
            await tmc.chat(out, login);
        });
        this.addCommand("/serverlogin", async () => { });
        this.addCommand("/version", async () => { });
    }

    async afterInit() {
        this.players.afterInit();
        this.server.on("Trackmania.PlayerChat", async (data: any) => {
            if (data[0] == 0) return;
            const login: string = data[1];
            let text: string = data[2];
            if (text.startsWith("/")) {
                for (let command of this.chatCommands) {
                    if (text.startsWith("//") && !this.admins.includes(login)) {
                        this.chat("¤error¤Not allowed.", login);
                        return;
                    }
                    if (text.startsWith(command.trigger)) {
                        const words = text.replace(command.trigger, "").trim();
                        let params = (words.match(/(?<!\\)(?:\\{2})*"(?:(?<!\\)(?:\\{2})*\\"|[^"])+(?<!\\)(?:\\{2})*"|[^\s\"]+/gi) || []).map((word) => word.replace(/^"(.+(?="$))"$/, '$1').replaceAll("\\", ""));
                        command.callback(login, params);
                        return;
                    }
                }
                this.chat(`Command $<¤cmd¤${text}$> not found.`, login);
            }
        });
        this.cli(`¤white¤ready`);
        await this.chat(``);
    }
}

const TMC = new MiniControl();
(async () => await TMC.run())();

declare global {
    const tmc: MiniControl
}

(global as any).tmc = TMC

import './plugins/plugins';

