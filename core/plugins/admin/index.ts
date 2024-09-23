import { castType, escape, removeColors } from "@core/utils";
import ModeSettingsWindow from "./ModeSettingsWindow";
import Plugin from "@core/plugins";
import fs, { existsSync, promises as fspromises } from "fs";
import LocalMapsWindow from "./LocalMapsWindow";
import PlayerListsWindow from "./PlayerListsWindow";
import fspath from 'path';

export default class AdminPlugin extends Plugin {

    async onLoad() {
        if (tmc.game.Name != "TmForever") {
            tmc.addCommand("//modesettings", this.cmdModeSettings.bind(this), "Display mode settings");
        }
        tmc.addCommand("//skip", async () => await tmc.server.call("NextMap"), "Skips Map");
        tmc.addCommand("//res", async () => await tmc.server.call("RestartMap"), "Restarts Map");
        tmc.addCommand("//kick", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//kick ¤info¤needs a login", login);
            }
            await tmc.server.call("Kick", params[0]);
        }, "Kicks player");
        tmc.addCommand("//ban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//ban ¤info¤needs a login", login);
            }
            await tmc.server.call("Ban", params[0]);
        }, "Bans player");
        tmc.addCommand("//unban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//unban ¤info¤needs a login", login);
            }
            await tmc.server.call("Unban", params[0]);
        }, "Unbans player");
        tmc.addCommand("//cancel", async () => await tmc.server.call("CancelVote"), "Cancels vote");
        tmc.addCommand("//er", () => {
            try {
                tmc.server.send("ForceEndRound");
            } catch (err: any) {
                tmc.chat("¤error¤" + err.message);
            }
        }, "Ends round");
        tmc.addCommand("//mode", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//mode ¤info¤needs a mode", login);
            }
            if (tmc.game.Name == "TmForever") {
                const modes: { [key: string]: number } = {
                    "rounds": 0, "ta": 1, "team": 2, "laps": 3, "stunts": 4, "cup": 5
                }
                if (modes[params[0]] === undefined) {
                    return tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                }
                tmc.chat(`Gamemode set to ${params[0]}`);
                await tmc.server.call("SetGameMode", modes[params[0]]);
            }

            if (tmc.game.Name == "Trackmania") {
                const scripts: { [key: string]: string } = {
                    "rounds": "Trackmania/TM_Rounds_Online.Script.txt",
                    "ta": "Trackmania/TM_TimeAttack_Online.Script.txt",
                    "team": "Trackmania/TM_Team_Online.Script.txt",
                    "laps": "Trackmania/TM_Laps_Online.Script.txt",
                    "cup": "Trackmania/TM_Cup_Online.Script.txt"
                };
                if (scripts[params[0]] === undefined) {
                    return tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                }
                tmc.chat(`¤info¤Gamemode set to ¤white¤${params[0]}`);
                await tmc.server.call("SetScriptName", scripts[params[0]]);
            }
        }, "Sets gamemode");
        tmc.addCommand("//setpass", async (login: string, params: string[]) => {
            const newPass = params[0] || "";
            await tmc.server.call("SetServerPassword", newPass);
            if (newPass == "") {
                tmc.chat(`¤info¤Password removed`, login);
            } else {
                tmc.chat(`¤info¤Password set to "¤white¤${newPass}¤info¤"`, login);
            }
        }, "Sets server password");

        tmc.addCommand("//setspecpass", async (login: string, params: string[]) => {
            const newPass = params[0] || "";
            await tmc.server.call("SetServerPasswordForSpectator", newPass);
            if (newPass == "") {
                tmc.chat(`¤info¤Spectator password removed`, login);
            } else {
                tmc.chat(`¤info¤Spectator password set to "¤white¤${newPass}¤info¤"`, login);
            }
        }, "Sets spectator password");

        tmc.addCommand("//warmup", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return tmc.chat("¤cmd¤//warmup ¤info¤needs numeric value");
            }
            tmc.chat(`¤info¤Warmup set to ¤white¤${params[0]}`, login);
            await tmc.server.call("SetWarmUpDuration", Number.parseInt(params[0]));
        }, "Sets warmup duration");

        tmc.addCommand("//ignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//ignore ¤info¤needs a login", login);
            }
            await tmc.server.call("Ignore", params[0]);
            tmc.chat(`¤info¤Ignoring ¤white¤${params[0]}`, login);
        }, "Ignores player");

        tmc.addCommand("//unignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//unignore ¤info¤needs a login", login);
            }
            await tmc.server.call("UnIgnore", params[0]);
            tmc.chat(`¤info¤Unignored ¤white¤${params[0]}`, login);
        }, "Unignores player");

        tmc.addCommand("//talimit", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//talimit ¤info¤needs numeric value in seconds");
            }

            if (tmc.game.Name == "TmForever") {
                tmc.server.send("SetTimeAttackLimit", Number.parseInt(params[0]) * 1000);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                return;
            }

            if (tmc.game.Name == "Trackmania" || tmc.game.Name == "ManiaPlanet") {
                const settings = { "S_TimeLimit": Number.parseInt(params[0]) };
                tmc.server.send("SetModeScriptSettings", settings);
                tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                return;
            }

        }, "Sets timelimit");

        tmc.addCommand("//jump", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return tmc.chat("¤cmd¤//jump ¤info¤needs numeric value");
            }
            try {
                let map: any;
                if (params[0].toString().length < 5) {
                    let index = Number.parseInt(params[0]) - 1;
                    map = tmc.maps.getMaplist()[index];
                } else {
                    map = tmc.maps.getMaplist().find((m: any) => m.UId == params[0]);
                }
                if (map) {
                    tmc.chat(`¤info¤Jumped to ¤white¤${map.Name}¤info¤ by ¤white¤${map.AuthorNickname ? map.AuthorNickname : map.Author}`);
                    await tmc.server.call("ChooseNextMap", map.FileName);
                    tmc.server.send("NextMap");
                } else {
                    tmc.chat("¤error¤Couldn't find map", login)
                }
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        }, "Jumps to map in playlist");

        tmc.addCommand("//wml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0].replace(".txt", "") + ".txt"
            try {
                const answer = await tmc.server.call("SaveMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    tmc.chat(`¤error¤Couldn't save matchsettings to ¤white¤${file}`, login);
                    return;
                }
                tmc.chat(`¤info¤Saved matchsettings to ¤white¤${file}`, login);
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        }, "Saves matchsettings");

        tmc.addCommand("//rml", async (login: string, params: string[]) => {
            let file = "tracklist";
            if (params[0]) file = params[0].replace(".txt", "") + ".txt";
            try {
                const answer = await tmc.server.call("LoadMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    tmc.chat(`¤error¤Couldn't read matchsettings from ¤white¤${file}`, login);
                    return;
                }
                await tmc.maps.syncMaplist();
                tmc.chat(`¤info¤Matchsettings read from ¤white¤${file}`, login);
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        }, "Reads matchsettings");
        tmc.addCommand("//shuffle", async (login: string, params: string[]) => {
            try {
                let maps = await tmc.server.call("GetMapList", -1, 0);
                maps = maps.sort(() => Math.random() - 0.5);
                let toserver = [];
                for (const map of maps) {
                    toserver.push(map.FileName);
                }
                await tmc.server.call("RemoveMapList", toserver);
                tmc.server.send("AddMapList", toserver);
                await tmc.maps.syncMaplist();
                tmc.chat(`¤info¤Maplist Shuffled.`);
            } catch (err: any) {
                tmc.chat("¤error¤" + err.message, login);
            }
        }, "Shuffles maplist");
        tmc.addCommand("//remove", async (login: string, params: string[]) => {
            let map: any = tmc.maps.currentMap;
            if (params[0] != undefined) {
                if (params[0].toString().length < 5) {
                    let index = Number.parseInt(params[0]) - 1;
                    map = tmc.maps.getMaplist()[index];
                } else {
                    map = tmc.maps.getMaplist().find((m: any) => m.UId == params[0]);
                }
            }

            try {
                if (!map) {
                    tmc.chat(`¤error¤Couldn't find map`, login);
                    return;
                }
                await tmc.server.call("RemoveMap", map.FileName);
                tmc.maps.removeMap(map.UId);
                tmc.chat(`¤info¤Removed map ¤white¤${map.Name} ¤info¤from the playlist.`, login);
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        }, "Removes map from playlist");

        tmc.addCommand("//call", async (login: string, params: string[]) => {
            const method = params.shift();
            if (method === undefined) {
                return tmc.chat("¤cmd¤//call ¤info¤needs a method", login);
            }
            try {
                let out: any = [];
                for (let i = 0; i < params.length; i++) {
                    if (params[i].toLowerCase() == "true") out[i] = true;
                    else if (params[i].toLowerCase() == "false") out[i] = false;
                    else if (!isNaN(Number.parseInt(params[i]))) out[i] = Number.parseInt(params[i]);
                    else out[i] = params[i];
                }
                const answer = await tmc.server.call(method, ...out);
                tmc.chat(answer.toString(), login);
            } catch (err: any) {
                tmc.chat(err.message, login);
            }
        }, "Calls server method");
        tmc.addCommand("//wu", async (login: string, params: string[]) => {
            if (tmc.game.Name == "TmForever") {
                tmc.server.send("SetWarmUp", true);
            }
        }, "Starts warmup");
        tmc.addCommand("//endwu", async (login: string, params: string[]) => {
            if (tmc.game.Name == "TmForever") {
                tmc.server.send("SetWarmUp", false);
            } else {
                tmc.server.callScript("Trackmania.WarmUp.ForceStop");
            }
        }, "end warmup");


        tmc.addCommand("//addlocal", this.cmdAddLocal.bind(this), "Adds local map to playlist");
        tmc.addCommand("//modecommand", async (login: string, params: string[]) => {
            if (!params[0]) {
                return tmc.chat("¤cmd¤//modecommand ¤info¤needs a command", login);
            }
            if (!params[1]) {
                return tmc.chat(`¤cmd¤//modecommand ${params[0]} ¤info¤needs a parameter`, login);
            }
            const outCommand: any = {};
            outCommand["Command_" + params[0]] = castType(params[1]);

            try {
                await tmc.server.call("SendModeScriptCommands", outCommand);
            } catch (err: any) {
                tmc.chat("¤error¤" + err.message, login);
            }
        }, "Send mode command");
        tmc.addCommand("//guestlist", this.cmdGuestlist.bind(this), "Manage Guestlist");
        tmc.addCommand("//blacklist", this.cmdBlacklist.bind(this), "Manage Blacklist");
        tmc.addCommand("//togglemute", this.cmdToggleMute.bind(this), "Toggle Mute");
    }

    async onUnload() {
        tmc.removeCommand("//skip");
        tmc.removeCommand("//res");
        tmc.removeCommand("//kick");
        tmc.removeCommand("//ban");
        tmc.removeCommand("//unban");
        tmc.removeCommand("//cancel");
        tmc.removeCommand("//er");
        tmc.removeCommand("//mode");
        tmc.removeCommand("//setpass");
        tmc.removeCommand("//setspecpass");
        tmc.removeCommand("//warmup");
        tmc.removeCommand("//ignore");
        tmc.removeCommand("//unignore");
        tmc.removeCommand("//togglemute");
        tmc.removeCommand("//talimit");
        tmc.removeCommand("//jump");
        tmc.removeCommand("//wml");
        tmc.removeCommand("//rml");
        tmc.removeCommand("//shuffle");
        tmc.removeCommand("//remove");
        tmc.removeCommand("//call");
        tmc.removeCommand("//wu");
        tmc.removeCommand("//endwu");
        if (tmc.game.Name != "TmForever") {
            tmc.removeCommand("//modesettings");
            tmc.removeCommand("//set");
        }
        tmc.removeCommand("//addlocal");
        tmc.removeCommand("//modecommand");
        tmc.removeCommand("//guestlist");
        tmc.removeCommand("//blacklist");
    }

    async onStart(): Promise<void> {
        const menu = tmc.storage["menu"];
        if (menu) {
            menu.addItem({
                category: "Map",
                title: "Adm: Add",
                action: "//addlocal",
                admin: true,
            });
            menu.addItem({
                category: "Map",
                title: "Adm: Shuffle",
                action: "//shuffle",
                admin: true,
            });
            menu.addItem({
                category: "Map",
                title: "Adm: Write list",
                action: "//wml",
                admin: true
            });
            menu.addItem({
                category: "Map",
                title: "Adm: Skip",
                action: "//skip",
                admin: true
            });
            menu.addItem({
                category: "Map",
                title: "Adm: Restart",
                action: "//res",
                admin: true
            });


            if (tmc.game.Name == "Trackmania") {
                menu.addItem({
                    category: "Server",
                    title: "ModeSettings",
                    action: "//modesettings",
                    admin: true
                });
            }
        }
    }

    async cmdModeSettings(login: string, args: string[]) {
        const window = new ModeSettingsWindow(login);
        window.size = { width: 160, height: 95 };
        window.title = "Mode Settings";
        const settings = await tmc.server.call("GetModeScriptSettings");
        let out = [];
        for (const data in settings) {
            out.push({
                setting: data,
                value: settings[data],
                type: typeof settings[data]
            });
        }
        window.setItems(out);
        window.setColumns([
            { key: "setting", title: "Setting", width: 75 },
            { key: "value", title: "Value", width: 50, type: "entry" },
            { key: "type", title: "Type", width: 25 }
        ]);
        window.addApplyButtons();
        await window.display();
    }

    async cmdAddLocal(login: string, args: string[]) {
        if (args.length < 1) {
            const window = new LocalMapsWindow(login);
            window.size = { width: 175, height: 95 };
            let out = [];
            for (let file of fs.readdirSync(tmc.mapsPath, { withFileTypes: true, recursive: true, encoding: "utf8" })) {
                if (file.name.toLowerCase().endsWith(".gbx")) {
                    let name = escape(file.name.replaceAll(/[.](Map|Challenge)[.]Gbx/gi, ""));
                    let filename = fspath.resolve(tmc.mapsPath, file.parentPath, file.name);
                    let path = file.parentPath.replace(tmc.mapsPath, "");
                    out.push({
                        File: filename,
                        FileName: name,
                        Path: path,
                        MapName: "",
                        MapAuthor: "",
                    });
                }
            }
            window.title = `Add Local Maps [${out.length}]`;
            window.setItems(out);
            window.setColumns([
                { key: "Path", title: "Path", width: 40 },
                { key: "FileName", title: "Map File", width: 30, action: "Add" },
                { key: "MapName", title: "Name", width: 50, action: "Add" },
                { key: "MapAuthor", title: "Author", width: 35 }
            ]);
            window.setActions(["Add"]);
            await window.display();
        } else {
            try {
                await tmc.server.call("AddMapList", args);
                await tmc.maps.syncMaplist();
                tmc.chat(`Added ${args.length} maps to the playlist`, login);
            } catch (e: any) {
                tmc.chat("Error: " + e.message, login);
            }
        }
    }
    async cmdToggleMute(login: any, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//togglemute ¤white¤<login>", login);
            return;
        }
        try {
            let ignores = await tmc.server.call("GetIgnoreList", 1000, 0);
            for (const ignore of ignores) {
                if (ignore.Login == args[0]) {
                    tmc.server.send("UnIgnore", args[0]);
                    tmc.chat(`¤info¤UnIgnoring ¤white¤${args[0]}`, login);
                    return;
                }
            }
            tmc.server.send("Ignore", args[0]);
            tmc.chat(`¤info¤Ignoring ¤white¤${args[0]}`, login);
        } catch (e: any) {
            tmc.chat(e, login);
        }
    }

    async cmdSetSetting(login: any, args: string[]) {
        if (args.length < 2) {
            tmc.chat("Usage: ¤cmd¤//set ¤white¤<setting> <value>", login);
            return;
        }
        const setting = args[0];
        const value: string = args[1];

        try {
            await tmc.server.call("SetModeScriptSettings", { [setting]: castType(value) });
        } catch (e: any) {
            tmc.chat("Error: " + e.message, login);
            return;
        }
        tmc.chat(`Set ${setting} to ${value}`, login);
    }

    async cmdGuestlist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, show, list", login);
            return;
        }
        switch (args[0]) {
            case "add":
                {
                    try {
                        if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                        await tmc.server.call("LoadGuestList", "guestlist.txt");
                        const res = await tmc.server.call("AddGuest", args[1]);
                        if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                        tmc.server.send("SaveGuestList", "guestlist.txt");
                        return tmc.chat(`¤info¤Guest added: ¤white¤${args[1]}`, login);
                    }
                    catch (e: any) {
                        tmc.chat(`¤error¤${e.message}`, login);
                        return;
                    }
                }
            case "remove":
                {
                    try {
                        if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                        await tmc.server.call("LoadGuestList", "guestlist.txt");
                        const res = await tmc.server.call("RemoveGuest", args[1]);
                        if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ as guest.`, login);
                        tmc.server.send("SaveGuestList", "guestlist.txt");
                        return tmc.chat(`¤info¤Guest removed: ¤white¤${args[1]}`, login);
                    }
                    catch (e: any) {
                        tmc.chat(`¤error¤${e.message}`, login);
                        return;
                    }
                }
            case "show":
            case "list":
                {
                    const window = new PlayerListsWindow(login);
                    window.title = "Guestlist";
                    window.size = { width: 175, height: 95 };
                    window.setItems(await tmc.server.call("GetGuestList", -1, 0));
                    window.setColumns([
                        { key: "Login", title: "Login", width: 100 },

                    ]);
                    window.setActions(["RemoveGuest"]);
                    await window.display();
                    return;
                }
            default: {
                tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, show, list", login);
                return;
            }
        }
    }

    async cmdBlacklist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, show, list", login);
            return;
        }
        switch (args[0]) {
            case "add":
                {
                    try {
                        if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                        await tmc.server.call("LoadBlackList", "blacklist.txt");
                        const res = await tmc.server.call("BlackList", args[1]);
                        if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                        tmc.server.send("SaveBlackList", "blacklist.txt");
                        return tmc.chat(`¤info¤Added to blacklist: ¤white¤${args[1]}`, login);
                    }
                    catch (e: any) {
                        tmc.chat(`¤error¤${e.message}`, login);
                        return;
                    }
                }
            case "remove":
                {
                    try {
                        if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                        await tmc.server.call("LoadBlackList", "blacklist.txt");
                        const res = await tmc.server.call("UnBlackList", args[1]);
                        if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ from blacklist`, login);
                        tmc.server.send("SaveBlackList", "blacklist.txt");
                        return tmc.chat(`¤info¤Blacklist removed: ¤white¤${args[1]}`, login);
                    }
                    catch (e: any) {
                        tmc.chat(`¤error¤${e.message}`, login);
                        return;
                    }
                }
            case "show":
            case "list":
                {
                    const window = new PlayerListsWindow(login);
                    window.title = "Blacklist";
                    window.size = { width: 175, height: 95 };
                    window.setItems(await tmc.server.call("GetBlackList", -1, 0));
                    window.setColumns([
                        { key: "Login", title: "Login", width: 100 },

                    ]);
                    window.setActions(["RemoveBan"]);
                    await window.display();
                    return;
                }
            default: {
                tmc.chat("Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, show, list", login);
                return;
            }
        }
    }

}
