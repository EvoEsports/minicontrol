import ListWindow from "./ui/listwindow";
import { escapeRegex, sleep } from "./utils";
import fs from 'fs';

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
        this.addCommand("//plugins", this.cmdPluginManager.bind(this), "Open plugin manager");
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
                        tmc.chat(`Plugin $fd0${args[0]}¤white¤ already loaded.`, login);
                        return;
                    }
                    try {
                        await tmc.loadPlugin(plugin);
                    } catch (e: any) {
                        const msg = `Plugin $fd0${plugin}¤white¤ failed to load: ${e.message}`;
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
                        tmc.chat(`Plugin $fd0${plugin}¤white¤ not loaded.`, login);
                        return;
                    }
                    await tmc.unloadPlugin(plugin);
                    break;
                }
                case "reload": {
                    if (args.length < 2) {
                        tmc.chat("Please specify a plugin name.", login);
                        return;
                    }
                    const plugin = args[1];
                    if (!tmc.plugins[plugin]) {
                        tmc.chat(`Plugin $fd0${plugin}¤white¤ not loaded.`, login);
                        return;
                    }
                    await tmc.unloadPlugin(plugin);
                    await sleep(50);
                    await tmc.loadPlugin(plugin);
                    break;
                }
                default: {
                    tmc.chat("Valid options are: list, load, unload", login);
                }
            }
        }, "Manage plugins");
        tmc.addCommand("//admin", async (login: string, args: string[]) => {
            if (args.length < 1) {
                tmc.chat("¤white¤Valid options are: ¤cmd¤list¤white¤, ¤cmd¤add¤white¤, ¤cmd¤remove", login);
                return;
            }
            const action = args[0];
            switch (action) {
                case "list": {
                    let admins = "Admins: ";
                    for (let admin of tmc.admins) {
                        admins += `¤cmd¤${admin}¤white¤, `;
                    }
                    tmc.chat(admins, login);
                    break;
                }
                case "add": {
                    if (args.length < 2) {
                        tmc.chat("¤info¤Please specify a login.", login);
                        return;
                    }
                    const admin = args[1];
                    if (tmc.admins.includes(admin)) {
                        tmc.chat(`¤info¤Admin ¤white¤${admin}¤info¤ already exists.`, login);
                        return;
                    }
                    tmc.settingsMgr.addAdmin(admin);
                    tmc.chat(`¤info¤Admin ¤white¤${admin}¤info¤ added.`, login);
                    break;
                }
                case "remove": {
                    if (args.length < 2) {
                        tmc.chat("¤info¤Please specify a login.", login);
                        return;
                    }
                    const admin = args[1];
                    if (!tmc.admins.includes(admin)) {
                        tmc.chat(`¤info¤Admin ¤white¤${admin} ¤info¤does not exist.`, login);
                        return;
                    }
                    tmc.settingsMgr.removeAdmin(admin);
                    tmc.chat(`¤info¤Admin ¤white¤${admin} ¤info¤removed.`, login);
                    break;
                }
                default: {
                    tmc.chat("¤white¤Valid options are: ¤cmd¤list¤white¤, ¤cmd¤add¤white¤, ¤cmd¤remove", login);
                }
            }
        }, "Manage admins");
    }


    async cmdPluginManager(login: string, args: string[]) {
        const window = new PluginManagerWindow(login);
        window.size = { width: 160, height: 95 };
        window.title = "Plugins";
        let out = [];
        let all = [];
        let diff = [];
        let plugins = fs.readdirSync(process.cwd() +"/core/plugins", { withFileTypes: true, recursive: true });
        plugins = plugins.concat(fs.readdirSync(process.cwd() + "/userdata/plugins", { withFileTypes: true, recursive: true }));

        for (const i in plugins) {
            const plugin = plugins[i];
            if (plugin && plugin.isDirectory()) {
                if (plugin.name.includes(".") || plugin.parentPath.includes(".")) continue;
                if (plugin.name.includes("node_modules") || plugin.parentPath.includes("node_modules")) continue;
                const path = plugin.path.replace(process.cwd() + "/core/plugins", "").replace(process.cwd() + "/userdata/plugins", "");
                let pluginName = plugin.name.replaceAll("\\", "/");
                if (path != "") {
                    pluginName = (path.substring(1) +"/"+ plugin.name).replaceAll("\\", "/");
                }
                all.push(pluginName);
            }
        }

        for (const name of tmc.pluginDependecies.overallOrder()) {
            diff.push(name);
            const deps = tmc.pluginDependecies.dependenciesOf(name);
            out.push({
                pluginName: name,
                depends: deps.join(", "),
                active: tmc.plugins[name] ? "$0f0Yes" : "$f00No"
            });
        }

        for (const name of all.filter((value) => !diff.includes(value))) {
            out.push({
                pluginName: name,
                depends: "",
                active: tmc.plugins[name] ? "$0f0Yes" : "$f00No"
            });
        }
        out = out.sort((a: any, b: any) => {
            return a.pluginName.localeCompare(b.pluginName);
        });

        window.setItems(out);
        window.setColumns([
            { key: "active", title: "Running", width: 25, action: "toggle" },
            { key: "pluginName", title: "Plugin", width: 50 },
            { key: "depends", title: "Dependencies", width: 50 }
        ]);

        await window.display();

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
            admin = command.startsWith("//");
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
                const exp = new RegExp(`^${escapeRegex(command.trigger)}`, "i");
                const cmd = exp.test(text);
                if (cmd) {
                    const words = text.replace(command.trigger, "").trim();
                    let params = (words.match(/(?<!\\)(?:\\{2})*"(?:(?<!\\)(?:\\{2})*\\"|[^"])+(?<!\\)(?:\\{2})*"|[^\s"]+/gi) || []).map((word) => word.replace(/^"(.+(?="$))"$/, '$1').replaceAll("\\", ""));
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
    private async onPlayerChat(data: any) {
        if (data[0] == 0) return;
        const login: string = data[1];
        let text: string = data[2];
        await this.execute(login, text);
    }
}

class PluginManagerWindow extends ListWindow {
    async onAction(login: string, action: string, item: any) {
        if (action == "toggle") {
            if (tmc.plugins[item.pluginName]) {
                await tmc.chatCmd.execute(login, "//plugin unload " + item.pluginName);
            } else {
                await tmc.chatCmd.execute(login, "//plugin load " + item.pluginName);
            }
            await tmc.chatCmd.execute(login, "//plugins");
            return;
        }
    }
}