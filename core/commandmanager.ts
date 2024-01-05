import Server from "./server";
import { type ChatCommand } from "./types";
import fs from 'fs';

export default class CommandManager {
    private commands: { [key: string]: ChatCommand } = {};
    private server: Server;

    constructor(server: Server) {
        this.server = server;
    }

    async beforeInit() {
        this.addCommand("/help", async (login: string, args: string[]) => {
            let help = "Available: \n";
            for (let command in this.commands) {
                if (this.commands[command].admin) continue;
                help += `¤cmd¤${this.commands[command].trigger} ¤white¤${this.commands[command].help}, `;
            }
            tmc.chat(help, login);
        }, "Display help for command");

        this.addCommand("//help", async (login: string, args: string[]) => {
            let help = "Available: \n";
            for (let command in this.commands) {
                if (!this.commands[command].admin) continue;
                help += `¤cmd¤${this.commands[command].trigger} ¤white¤${this.commands[command].help}, `;
            }
            tmc.chat(help, login);
        }, "Display help for command");

        this.addCommand("/serverlogin", async () => { }, "Display server login");
        this.addCommand("/version", async (login: string) => {
            tmc.chat(`MiniController version: ${tmc.version}`, login);
        }, "Display server versions");

        this.addCommand("//plugin", async (login: string, args: string[]) => {
            if (args.length < 1) {
                tmc.chat("Valid options are: list, load, unload", login);
                return;
            }
            const action = args[0];
            switch (action) {
                case "list": {
                    let plugins = "Loaded plugins: ";
                    for (let plugin in tmc.plugins) {
                        plugins += `¤cmd¤${plugin}¤white¤, `;
                    }
                    tmc.chat(plugins, login);
                    break;
                }
                case "load": {
                    if (args.length < 2) {
                        tmc.chat("Please specify a plugin name.", login);
                        return;
                    }
                    const plugin = args[1];
                    if (tmc.plugins[plugin]) {
                        tmc.chat(`Plugin $fd0${args[0]}$fff already loaded.`, login);
                        return;
                    }
                    if (fs.existsSync(`./plugins/${plugin}/index.ts`)) {
                        try {
                            await tmc.loadPlugin(plugin);
                        } catch (e: any) {
                            const msg = `Plugin $fd0${plugin}$fff failed to load: ${e.message}`;
                            tmc.chat(msg, login);
                            tmc.cli(msg);
                        }
                    } else {
                        tmc.chat(`Plugin $fd0${plugin}$fff not found.`, login);
                    }
                    break;
                }
                case "unload": {
                    if (args.length < 2) {
                        tmc.chat("Please specify a plugin name.", login);
                        return;
                    }
                    const plugin = args[1];
                    if (!tmc.plugins[plugin]) {
                        tmc.chat(`Plugin $fd0${plugin}$fff not loaded.`, login);
                        return;
                    }
                    tmc.unloadPlugin(plugin);
                    break;
                }
                default: {
                    tmc.chat("Valid options are: list, load, unload", login);
                }
            }
        }, "Manage plugins");

    }

    async afterInit() {
        this.server.on("Trackmania.PlayerChat", this.onPlayerChat.bind(this));
    }


    addCommand(command: string, callback: CallableFunction, help: string = "", admin: boolean | undefined = undefined) {
        if (admin === undefined) {
            admin = command.startsWith("//") ? true : false;
        }
        if (!this.commands[command]) {
            this.commands[command] = {
                trigger: command,
                callback: callback,
                admin: admin,
                help: help,
            }
        }
        else {
            tmc.cli(`¤white¤Command $fd0${command} ¤white¤already exists.`);
        }
    }

    removeCommand(command: string) {
        if (this.commands[command]) {
            delete this.commands[command];
        }
    }

    async execute(login: string, text: string) {
        if (text.startsWith("/")) {
            for (let command of Object.values(this.commands)) {
                if (text.startsWith("//") && !tmc.admins.includes(login)) {
                    tmc.chat("¤error¤Not allowed.", login);
                    return;
                }
                const cmd = text.match(/[/]{1,2}\w+/)?.[0];
                if (cmd == command.trigger) {
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