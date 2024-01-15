import Server from "./server";
import fs from 'fs';
import { sleep } from "./utils";

export interface ChatCommand {
    trigger: string;
    help: string;
    admin: boolean;
    callback: CallableFunction;
}

/**
 * CommandManager class
 */
export default class CommandManager {
    private commands: { [key: string]: ChatCommand } = {};

    /**
     * Initialize the command manager
     * @ignore
     */
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
        this.addCommand("//shutdown", async () => { process.exit() }, "Close MINIcontroller");
        this.addCommand("//plugin", async (login: string, args: string[]) => {
            if (args.length < 1) {
                tmc.chat("Valid options are: list, load, unload, reload", login);
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
                    try {
                        await tmc.loadPlugin(plugin);
                    } catch (e: any) {
                        const msg = `Plugin $fd0${plugin}$fff failed to load: ${e.message}`;
                        tmc.chat(msg, login);
                        tmc.cli(msg);
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
                case "reload": {
                    if (args.length < 2) {
                        tmc.chat("Please specify a plugin name.", login);
                        return;
                    }
                    const plugin = args[1];
                    if (!tmc.plugins[plugin]) {
                        tmc.chat(`Plugin $fd0${plugin}$fff not loaded.`, login);
                        return;
                    }
                    await tmc.unloadPlugin(plugin);
                    sleep(50);
                    await tmc.loadPlugin(plugin);
                    break;
                }
                default: {
                    tmc.chat("Valid options are: list, load, unload", login);
                }
            }
        }, "Manage plugins");

    }

    /**
     * @ignore
     */
    async afterInit() {
        tmc.server.addListener("Trackmania.PlayerChat", this.onPlayerChat, this);
    }


    /**
     * adds command to the command manager
     * @param command command to add
     * @param callback callack function
     * @param help help text
     * @param admin force admin
     */
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
    /**
     * removes command from the command manager
     * @param command remove command
     */
    removeCommand(command: string) {
        if (this.commands[command]) {
            delete this.commands[command];
        }
    }

    /**
     * execute command
     * @param login 
     * @param text 
     */
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
                    await command.callback(login, params);
                    return;
                }
            }
            tmc.chat(`$fffCommand ¤cmd¤${text} $fffnot found.`, login);
        }
    }

    /**
     * @ignore
     * @param data data from the server
     * @returns 
     */
    private onPlayerChat(data: any) {
        if (data[0] == 0) return;
        const login: string = data[1];
        let text: string = data[2];
        this.execute(login, text);
    }

}