import Server from "./server";
import { ChatCommand } from "./types";

export default class CommandManager {
    private commands: { [key: string]: ChatCommand } = {};
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    async beforeInit() {
        this.addCommand("/help", async (login: string, args: string[]) => {
            let help = "";
            for (let command in this.commands) {
                if (this.commands[command].admin) continue;
                help += `¤cmd¤${this.commands[command].trigger} ¤white¤${this.commands[command].help}\n`;
            }
            tmc.chat(help, login);
        }, "Display help for command");

        this.addCommand("//help", async (login: string, args: string[]) => {
            let help = "";
            for (let command in this.commands) {
                if (!this.commands[command].admin) continue;
                help += `¤cmd¤${this.commands[command].trigger} ¤white¤${this.commands[command].help}\n`;
            }
            tmc.chat(help, login);
        }, "Display help for command");

    }

    async afterInit() {
        this.server.on("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
    }


    addCommand(command: string, callback: CallableFunction, help: string = "", admin: boolean | undefined = undefined) {
        if (admin === undefined) {
            admin = command.startsWith("//") ? true : false;
        }

        this.commands[command] = {
            trigger: command,
            callback: callback,
            admin: admin,
            help: help,
        }
    }

    removeCommand(command: string) {
        delete this.commands[command];
    }

    private async executeCommand(login: string, command: string, args: string[]) {
        if (this.commands[command]) {
            await this.commands[command].callback(login, args);
        }
    }

    async execute(login: string, text: string) {
        if (text.startsWith("/")) {
            for (let command of Object.values(this.commands)) {
                if (command.admin && !tmc.admins.includes(login)) {
                    tmc.chat("¤error¤Not allowed.", login);
                    return;
                }
                if (text.startsWith(command.trigger)) {
                    const words = text.replace(command.trigger, "").trim();
                    let params = (words.match(/(?<!\\)(?:\\{2})*"(?:(?<!\\)(?:\\{2})*\\"|[^"])+(?<!\\)(?:\\{2})*"|[^\s\"]+/gi) || []).map((word) => word.replace(/^"(.+(?="$))"$/, '$1').replaceAll("\\", ""));
                    command.callback(login, params);
                    return;
                }
            }
            tmc.chat(`Command $<¤cmd¤${text}$> not found.`, login);
        }
    }

    onPlayerChat(data: any) {
        if (data[0] == 0) return;
        const login: string = data[1];
        let text: string = data[2];
        this.execute(login, text);
    }





}