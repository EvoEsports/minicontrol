import { castType, htmlEntities } from "@core/utils";

import Plugin from "@core/plugins";
import fs from "node:fs";
import LocalMapsWindow from "./LocalMapsWindow";
import PlayerListsWindow from "./ui/PlayerListsWindow";
import fsPath from "node:path";
import type { Map as TmMap } from "@core/mapmanager.ts";
import type { Player } from "@core/playermanager";
import AdminWidget from "./AdminWidget";
import Menu from "@core/menu";

import SettingsWindow from "./ui/SettingsWindow";
import ColorsWindow from "./ui/ColorsWindow";
import ModeSettingsWindow from "./ui/ModeSettingsWindow";

enum TmnfMode {
    Rounds = 0,
    TimeAttack = 1,
    Team = 2,
    Laps = 3,
    Stunts = 4,
    Cup = 5,
}

export interface Setting {
    key: string;
    value: any;
    default: any;
    type: "string" | "number" | "boolean" | "color";
}

declare module "@core/plugins" {
    interface PluginRegistry {
        "admin": AdminPlugin;
    }
}

export default class AdminPlugin extends Plugin {
    currentSetting: { [key: string]: Setting | undefined } = {};
    adminWidget: { [key: string]: AdminWidget } = {};

    async onLoad() {
        if (tmc.game.Name !== "TmForever") {
            this.addCommand("//modesettings", this.cmdModeSettings.bind(this), "Display mode settings");
        }
        this.addSetting("admin.panel", true, this.adminPanelChange.bind(this), "Admin: Enable admin panel");
        this.addListener("TMC.AdminsChanged", this.adminPanelChange, this);
        this.addListener("TMC.PlayerConnect", this.onPlayerConnect, this);
        this.addListener("TMC.PlayerDisconnect", this.onPlayerDisconnect, this);

        this.addCommand("//settings", this.cmdSettings.bind(this), "Set settings");
        this.addCommand("//colors", this.cmdColors.bind(this), "Set colors");
        this.addCommand("//set", this.cmdSetSetting.bind(this), "Set setting value");
        this.addCommand("//skip", async () => tmc.server.send("NextMap"), "Skips Map");
        this.addCommand("//res", async () => tmc.server.send("RestartMap"), "Restarts Map");
        this.addCommand(
            "//kick",
            async (login: string, params: string[]) => {
                const kickLogin: any = params.shift();
                if (!kickLogin) {
                    return tmc.chat("¤cmd¤//kick ¤info¤needs a login", login);
                }
                await tmc.server.call("Kick", kickLogin, params.join(" "));
            },
            "Kicks player",
        );
        this.addCommand(
            "//ban",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//ban ¤info¤needs a login", login);
                }
                await tmc.server.call("Ban", params[0]);
            },
            "Bans player",
        );
        this.addCommand(
            "//unban",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//unban ¤info¤needs a login", login);
                }
                await tmc.server.call("Unban", params[0]);
            },
            "Unbans player",
        );
        this.addCommand("//cancel", async () => await tmc.server.call("CancelVote"), "Cancels vote");
        this.addCommand(
            "//er",
            async () => {
                try {
                    tmc.server.send("ForceEndRound");
                } catch (err: any) {
                    tmc.chat(`¤error¤${err.message}`);
                }
            },
            "Ends round",
        );
        this.addCommand(
            "//mode",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//mode ¤info¤needs a mode", login);
                }
                if (tmc.game.Name === "TmForever") {
                    const modes: { [key: string]: number } = {
                        rounds: 0,
                        ta: 1,
                        team: 2,
                        laps: 3,
                        stunts: 4,
                        cup: 5,
                    };
                    if (modes[params[0]] === undefined) {
                        return tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                    }
                    tmc.chat(`Gamemode set to ${params[0]}`);
                    await tmc.server.call("SetGameMode", modes[params[0]]);
                }

                if (tmc.game.Name === "Trackmania") {
                    const scripts: { [key: string]: string } = {
                        rounds: "Trackmania/TM_Rounds_Online.Script.txt",
                        ta: "Trackmania/TM_TimeAttack_Online.Script.txt",
                        team: "Trackmania/TM_Team_Online.Script.txt",
                        laps: "Trackmania/TM_Laps_Online.Script.txt",
                        cup: "Trackmania/TM_Cup_Online.Script.txt",
                    };
                    if (scripts[params[0]] === undefined) {
                        return tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                    }
                    tmc.chat(`¤info¤Gamemode set to ¤white¤${params[0]}`);
                    await tmc.server.call("SetScriptName", scripts[params[0]]);
                }
            },
            "Sets gamemode",
        );
        this.addCommand(
            "//password",
            async (login: string, params: string[]) => {
                const newPass = params[0] || "";
                await tmc.server.call("SetServerPassword", newPass);
                await tmc.server.call("SetServerPasswordForSpectator", newPass);
                if (newPass === "") {
                    tmc.chat("¤info¤Password removed", login);
                } else {
                    tmc.chat(`¤info¤Password set to "¤white¤${newPass}¤info¤"`, login);
                }
            },
            "Sets server password",
        );

        this.addCommand(
            "//warmup",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//warmup ¤info¤needs numeric value");
                }
                tmc.chat(`¤info¤Warmup set to ¤white¤${params[0]}`, login);
                await tmc.server.call("SetAllWarmUpDuration", Number.parseInt(params[0]));
            },
            "Sets warmup duration",
        );
        this.addCommand(
            "//servername",
            async (login: string, params: string[]) => {
                const newName = params.join(" ");
                await tmc.server.call("SetServerName", newName);
                tmc.chat(`¤info¤Servername set to ¤white¤${newName}`, login);
            },
            "Sets server's name",
        );
        this.addCommand(
            "//servercomment",
            async (login: string, params: string[]) => {
                const newComment = params.join(" ");
                await tmc.server.call("SetServerComment", newComment);
                tmc.chat(`¤info¤Servercomment set to ¤white¤${newComment}`, login);
            },
            "set server comment",
        );
        this.addCommand(
            "//maxplayers",
            async (login: string, params: string[]) => {
                const newMax = Number.parseInt(params[0]);
                if (newMax < 0) {
                    return tmc.chat("¤cmd¤setmaxplayers ¤info¤needs a positive numeric value", login);
                }
                await tmc.server.call("SetMaxPlayers", newMax);
                tmc.chat(`¤info¤Max players set to ¤white¤${newMax}`, login);
            },
            "Sets max players",
        );

        this.addCommand(
            "//ignore",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//ignore ¤info¤needs a login", login);
                }
                await tmc.server.call("Ignore", params[0]);
                tmc.chat(`¤info¤Ignoring ¤white¤${params[0]}`, login);
            },
            "Ignores player",
        );

        this.addCommand(
            "//unignore",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//unignore ¤info¤needs a login", login);
                }
                await tmc.server.call("UnIgnore", params[0]);
                tmc.chat(`¤info¤Unignored ¤white¤${params[0]}`, login);
            },
            "Unignores player",
        );

        this.addCommand(
            "//talimit",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//talimit ¤info¤needs numeric value in seconds");
                }

                if (tmc.game.Name === "TmForever") {
                    const mode = await tmc.server.call("GetGameMode");
                    if (mode === TmnfMode.TimeAttack) {
                        tmc.server.send("SetTimeAttackLimit", Number.parseInt(params[0]) * 1000);
                        tmc.storage["minicontrol.taTimeLimit"] = Number.parseInt(params[0]);
                        tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                        return;
                    }
                    if (mode === TmnfMode.Laps) {
                        tmc.server.send("SetLapsTimeLimit", Number.parseInt(params[0]) * 1000);
                        tmc.storage["minicontrol.taTimeLimit"] = Number.parseInt(params[0]);
                        tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                        return;
                    }
                    tmc.chat("¤error¤Timelimit not supported in this mode");
                    return;
                }

                if (tmc.game.Name === "Trackmania" || tmc.game.Name === "ManiaPlanet") {
                    tmc.storage["minicontrol.taTimeLimit"] = Number.parseInt(params[0]);
                    const settings = { S_TimeLimit: Number.parseInt(params[0]) };
                    tmc.server.send("SetModeScriptSettings", settings);
                    tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`);
                    return;
                }
            },
            "Sets timelimit",
        );

        this.addCommand(
            "//jump",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//jump ¤info¤needs numeric value");
                }
                try {
                    let map: any;
                    if (params[0].toString().length < 5) {
                        const index = Number.parseInt(params[0]) - 1;
                        map = tmc.maps.getMaplist()[index];
                    } else {
                        map = tmc.maps.getMaplist().find((m: any) => m.UId === params[0]);
                    }
                    if (map) {
                        tmc.chat(`¤info¤Jumped to ¤white¤${map.Name}¤info¤ by ¤white¤${map.AuthorNickname ? map.AuthorNickname : map.Author}`);
                        tmc.server.send("JumpToMapIdent", map.UId);
                    } else {
                        tmc.chat("¤error¤Couldn't find map", login);
                    }
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Jumps to map in playlist",
        );

        this.addCommand(
            "//wml",
            async (login: string, params: string[]) => {
                let file = "tracklist.txt";
                if (params[0]) file = `${params[0].replace(".txt", "")}.txt`;
                try {
                    const answer = await tmc.server.call("SaveMatchSettings", `MatchSettings/${file}`);
                    if (!answer) {
                        tmc.chat(`¤error¤Couldn't save matchsettings to ¤white¤${file}`, login);
                        return;
                    }
                    tmc.chat(`¤info¤Saved matchsettings to ¤white¤${file}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Saves matchsettings",
        );

        this.addCommand(
            "//rml",
            async (login: string, params: string[]) => {
                let file = "tracklist";
                if (params[0]) file = `${params[0].replace(".txt", "")}.txt`;
                try {
                    const answer = await tmc.server.call("LoadMatchSettings", `MatchSettings/${file}`);
                    if (!answer) {
                        tmc.chat(`¤error¤Couldn't read matchsettings from ¤white¤${file}`, login);
                        return;
                    }
                    await tmc.maps.syncMaplist();
                    tmc.chat(`¤info¤Matchsettings read from ¤white¤${file}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Reads matchsettings",
        );
        this.addCommand(
            "//shuffle",
            async (login: string, params: string[]) => {
                try {
                    let maps: TmMap[] = await tmc.server.call("GetMapList", -1, 0);
                    maps = maps.sort(() => Math.random() - 0.5);
                    const toserver: string[] = [];
                    for (const map of maps) {
                        toserver.push(map.FileName);
                    }
                    await tmc.server.call("RemoveMapList", toserver);
                    tmc.server.send("AddMapList", toserver);
                    await tmc.maps.syncMaplist();
                    tmc.chat("¤info¤Maplist Shuffled.");
                } catch (err: any) {
                    tmc.chat(`¤error¤${err.message}`, login);
                }
            },
            "Shuffles maplist",
        );
        this.addCommand(
            "//remove",
            async (login: string, params: string[]) => {
                let map: any = tmc.maps.currentMap;
                if (params[0] !== undefined) {
                    if (params[0].toString().length < 5) {
                        const index = Number.parseInt(params[0]) - 1;
                        map = tmc.maps.getMaplist()[index];
                    } else {
                        map = tmc.maps.getMaplist().find((m: any) => m.UId === params[0]);
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
            },
            "Removes map from playlist",
        );
        this.addCommand(
            "//wu",
            async (login: string, params: string[]) => {
                if (tmc.game.Name === "TmForever") {
                    tmc.server.send("SetWarmUp", true);
                }
            },
            "Starts warmup",
        );
        this.addCommand(
            "//endwu",
            async (login: string, params: string[]) => {
                if (tmc.game.Name === "TmForever") {
                    tmc.server.send("SetWarmUp", false);
                } else {
                    tmc.server.callScript("Trackmania.WarmUp.ForceStop");
                }
            },
            "end warmup",
        );
        this.addCommand(
            "//timeout",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//timeout ¤info¤needs numeric value", login);
                }
                try {
                    tmc.server.send("SetFinishTimeout", Number.parseInt(params[0]) * 1000);
                    tmc.chat(`¤info¤Timeout set to ¤white¤${params[0]} ¤info¤seconds`);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set finish timeout for rounds",
        );
        this.addCommand(
            "//cupwinners",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//cupwinners ¤info¤needs numeric value", login);
                }
                try {
                    tmc.server.send("SetCupNbWinners", Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Cup winners set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set cup winners",
        );
        this.addCommand(
            "//forceteam",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//forceteam ¤info¤needs a login", login);
                }
                if (!params[1]) {
                    return tmc.chat("¤cmd¤//forceteam ¤info¤needs a team", login);
                }
                try {
                    tmc.server.send("ForcePlayerTeam", params[0], params[1]);
                    tmc.chat(`¤info¤Forced ¤white¤${params[0]} ¤info¤to team ${params[1]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Force player to team",
        );

        this.addCommand(
            "//pointlimit",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//pointlimit ¤info¤needs numeric value", login);
                }
                try {
                    const mode = await tmc.server.call("GetGameMode");
                    switch (mode) {
                        case TmnfMode.Team: {
                            tmc.server.send("SetTeamPointsLimit", Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Team points limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                        case TmnfMode.Rounds: {
                            tmc.server.send("SetRoundPointsLimit", Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Rounds limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                        case TmnfMode.Cup: {
                            tmc.server.send("SetCupPointsLimit", Number.parseInt(params[0]));
                            tmc.chat(`¤info¤Cup points limit set to ¤white¤${params[0]}`, login);
                            break;
                        }
                    }
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set points limit",
        );
        this.addCommand(
            "//maxpoints",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//maxpoints ¤info¤needs value", login);
                }
                try {
                    tmc.server.send("SetMaxPointsTeam", Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Max points set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set team max points",
        );
        this.addCommand(
            "//rpoints",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//rpoints ¤info¤needs value", login);
                }
                const array = params[0].split(",");
                if (array.length < 2) {
                    return tmc.chat("¤cmd¤//rpoints ¤info¤needs atleast 2 values", login);
                }
                const newArray: number[] = [];
                for (const number of array) {
                    if (!Number.isNaN(Number.parseInt(number.trim()))) {
                        newArray.push(Number.parseInt(number.trim()));
                    }
                }
                try {
                    tmc.server.send(
                        "SetRoundCustomPoints",
                        newArray.sort((a, b) => a - b),
                    );
                    tmc.chat(`¤info¤Rounds points set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set round points",
        );
        this.addCommand(
            "//usenewrules",
            async (login: string, params: string[]) => {
                const mode = await tmc.server.call("GetGameMode");

                if (params[0] === "true") {
                    if (mode === TmnfMode.Rounds) tmc.server.send("SetUseNewRulesRound", true);
                    if (mode === TmnfMode.Team) tmc.server.send("SetUseNewRulesTeam", true);
                    tmc.chat("¤info¤Using new rounds rules", login);
                } else if (params[0] === "false") {
                    if (mode === TmnfMode.Rounds) tmc.server.send("SetUseNewRulesRound", false);
                    if (mode === TmnfMode.Team) tmc.server.send("SetUseNewRulesTeam", false);
                    tmc.chat("¤info¤Using old rounds rules", login);
                } else {
                    tmc.chat("¤cmd¤//usenewrules ¤info¤needs a boolean value", login);
                }
            },
            "Use new rounds rules",
        );
        this.addCommand(
            "//laps",
            async (login: string, params: string[]) => {
                if (!params[0] && Number.isNaN(Number.parseInt(params[0]))) {
                    return tmc.chat("¤cmd¤//laps ¤info¤needs numeric value", login);
                }
                try {
                    tmc.server.send("SetNbLaps", Number.parseInt(params[0]));
                    tmc.chat(`¤info¤Laps set to ¤white¤${params[0]}`, login);
                } catch (err: any) {
                    tmc.chat(err.message, login);
                }
            },
            "Set laps",
        );

        this.addCommand("//addlocal", this.cmdAddLocal.bind(this), "Adds local map to playlist");
        this.addCommand(
            "//modecommand",
            async (login: string, params: string[]) => {
                if (!params[0]) {
                    return tmc.chat("¤cmd¤//modecommand ¤info¤needs a command", login);
                }
                if (!params[1]) {
                    return tmc.chat(`¤cmd¤//modecommand ${params[0]} ¤info¤needs a parameter`, login);
                }
                const outCommand: any = {};
                outCommand[`Command_${params[0]}`] = castType(params[1]);

                try {
                    await tmc.server.call("SendModeScriptCommands", outCommand);
                } catch (err: any) {
                    tmc.chat(`¤error¤${err.message}`, login);
                }
            },
            "Send mode command",
        );
        this.addCommand("//guestlist", this.cmdGuestlist.bind(this), "Manage Guestlist");
        this.addCommand("//blacklist", this.cmdBlacklist.bind(this), "Manage Blacklist");
        this.addCommand("//ignorelist", this.cmdIgnoreList.bind(this), "Manage Ignorelist");
        this.addCommand("//banlist", this.cmdBanlist.bind(this), "Manage Banlist");
        this.addCommand("//togglemute", this.cmdToggleMute.bind(this), "Toggle Mute");
    }

    async onUnload() {

    }

    async adminPanelChange(value: any) {
        for (const player of tmc.players.getAll()) {
            await this.onPlayerConnect(player);
        }
    }

    async onStart(): Promise<void> {
        for (const player of tmc.players.getAll()) {
            await this.onPlayerConnect(player);
        }

        const menu = Menu.getInstance();

        menu.addItem({
            category: "Map",
            title: "Add Local Maps",
            action: "//addlocal",
            admin: true,
        });
        menu.addItem({
            category: "Map",
            title: "Shuffle Map List",
            action: "//shuffle",
            admin: true,
        });
        menu.addItem({
            category: "Map",
            title: "Write Map List",
            action: "//wml",
            admin: true,
        });

        menu.addItem({
            category: "Map",
            title: "Goto Next Map",
            action: "//skip",
            admin: true,
        });

        menu.addItem({
            category: "Map",
            title: "Restart Map",
            action: "//res",
            admin: true,
        });

        menu.addItem({
            category: "Server",
            title: "Minicontrol Settings",
            action: "//settings",
            admin: true,
        });

        menu.addItem({
            category: "Server",
            title: "Colors",
            action: "//colors",
            admin: true,
        });

        if (tmc.game.Name === "Trackmania") {
            menu.addItem({
                category: "Server",
                title: "Mode Settings",
                action: "//modesettings",
                admin: true,
            });
        }

        menu.addItem({
            category: "Players",
            title: "Guest list",
            action: "//guestlist list",
            admin: true,
        });

        menu.addItem({
            category: "Players",
            title: "Mute list",
            action: "//ignorelist list",
            admin: true,
        });

        menu.addItem({
            category: "Players",
            title: "Ban list",
            action: "//banlist list",
            admin: true,
        });

        menu.addItem({
            category: "Players",
            title: "Black list",
            action: "//blacklist list",
            admin: true,
        });
    }

    async onPlayerConnect(player: Player) {
        if (!tmc.admins.includes(player.login)) return;
        if (tmc.settings.get("admin.panel")) {
            const widget = new AdminWidget(player.login);
            widget.size = { width: 60, height: 5 };
            widget.pos = { x: 35, y: -86, z: 1 };
            widget.display();
            this.adminWidget[player.login] = widget;
        } else if (this.adminWidget[player.login]) {
            await this.adminWidget[player.login].destroy();
            delete this.adminWidget[player.login];
        }
    }

    async onPlayerDisconnect(player: Player) {
        if (this.adminWidget[player.login]) {
            delete this.adminWidget[player.login];
        }
    }

    async cmdModeSettings(login: string, args: string[]) {
        const window = new ModeSettingsWindow(login);
        await window.update();
        await window.display();
    }

    async cmdAddLocal(login: string, args: string[]) {
        if (args.length < 1) {
            const window = new LocalMapsWindow(login);
            window.size = { width: 175, height: 95 };
            const out: any = [];
            for (const file of fs.readdirSync(tmc.mapsPath, { withFileTypes: true, recursive: true, encoding: "utf8" })) {
                if (file.name.toLowerCase().endsWith(".gbx")) {
                    const name = htmlEntities(file.name.replaceAll(/[.](Map|Challenge)[.]Gbx/gi, ""));
                    const filename = fsPath.resolve(tmc.mapsPath, file.parentPath, file.name);
                    const path = file.parentPath.replace(tmc.mapsPath, "");
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
                { key: "MapAuthor", title: "Author", width: 35 },
            ]);
            window.setActions(["Add"]);
            window.display();
        } else {
            try {
                const val = await tmc.server.call("CheckMapForCurrentServerParams", args[0]);
                if (!val) {
                    tmc.chat(`¤error¤Map ¤white¤${args[0]} ¤error¤is not valid for this server`, login);
                    return;
                }
                await tmc.server.call("AddMap", args[0]);
                await tmc.maps.syncMaplist();
                tmc.chat(`¤info¤Added $fff${args.length} ¤info¤map to the playlist`, login);
            } catch (e: any) {
                tmc.chat(`¤error¤${e.message}`, login);
            }
        }
    }

    async cmdToggleMute(login: any, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//togglemute ¤white¤<login>", login);
            return;
        }
        try {
            const ignores = await tmc.server.call("GetIgnoreList", 1000, 0);
            for (const ignore of ignores) {
                if (ignore.Login === args[0]) {
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

    async cmdSetModeSetting(login: any, args: string[]) {
        if (args.length < 2) {
            tmc.chat("¤info¤Usage: ¤cmd¤//setscript ¤white¤<setting> <value>", login);
            return;
        }
        const setting = args[0];
        const value: string = args[1];

        try {
            await tmc.server.call("SetModeScriptSettings", { [setting]: castType(value) });
        } catch (e: any) {
            tmc.chat(`¤error¤${e.message}`, login);
            return;
        }
        tmc.chat(`¤info¤Set $fff${setting} ¤info¤to $fff${value}`, login);
    }

    async cmdGuestlist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, clear, show, list", login);
            return;
        }
        switch (args[0]) {
            case "clear": {
                try {
                    await tmc.server.call("CleanGuestList");
                    tmc.chat("¤info¤Guestlist cleared", login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                }
                return;
            }
            case "add": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    await tmc.server.call("LoadGuestList", "guestlist.txt");
                    const res = await tmc.server.call("AddGuest", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send("SaveGuestList", "guestlist.txt");
                    return tmc.chat(`¤info¤Guest added: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "remove": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    await tmc.server.call("LoadGuestList", "guestlist.txt");
                    const res = await tmc.server.call("RemoveGuest", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send("SaveGuestList", "guestlist.txt");
                    return tmc.chat(`¤info¤Guest removed: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "show":
            case "list": {
                const window = new PlayerListsWindow(login);
                window.title = "Guestlist";
                window.size = { width: 175, height: 120 };
                window.setItems(await tmc.server.call("GetGuestList", -1, 0));
                window.setColumns({
                    Login: { title: "Login", width: 100 }
                });
                window.setAction("remove", "Remove", async (login: string, item: any) => {
                    await tmc.chatCmd.execute(login, `//guestlist remove ${item.Login}`);
                    window.setItems(await tmc.server.call("GetGuestList", -1, 0));
                    window.display();
                })
                window.display();
                return;
            }
            default: {
                tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, show, list", login);
                return;
            }
        }
    }
    async cmdBanlist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//banlist ¤white¤add <login>,remove <login>, clear, show, list", login);
            return;
        }
        switch (args[0]) {
            case "clear": {
                try {
                    await tmc.server.call("CleanBanList");
                    tmc.chat("¤info¤Banlist cleared", login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                }
                return;
            }
            case "add": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    const res = await tmc.server.call("Ban", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to ban ¤white¤${args[1]}¤error¤`, login);
                    return tmc.chat(`¤info¤Added to banlist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "remove": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    const res = await tmc.server.call("Unban", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to unban ¤white¤${args[1]}¤error¤`, login);
                    return tmc.chat(`¤info¤Removed from banlist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "show":
            case "list": {
                const window = new PlayerListsWindow(login);
                window.title = "BanList";
                window.size = { width: 175, height: 120 };
                window.setItems(await tmc.server.call("GetBanList", -1, 0));
                window.setColumns({
                    Login: { title: "Login", width: 100 }
                });
                window.setAction("remove", "Remove", async (login: string, item: any) => {
                    await tmc.chatCmd.execute(login, `//banlist remove ${item.Login}`);
                    window.setItems(await tmc.server.call("GetBanList", -1, 0));
                    window.display();
                })
                await window.display();
                return;
            }
            default: {
                tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>,clear, show, list", login);
                return;
            }
        }
    }
    async cmdIgnoreList(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//ignorelist ¤white¤add <login>,remove <login>, clear, show, list", login);
            return;
        }
        switch (args[0]) {
            case "clear": {
                try {
                    await tmc.server.call("CleanIgnoreList");
                    tmc.chat("¤info¤Ignorelist cleared", login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                }
                return;
            }
            case "add": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    const res = await tmc.server.call("Ignore", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as ignored player.`, login);
                    return tmc.chat(`¤info¤Player ignored: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "remove": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    const res = await tmc.server.call("UnIgnore", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ from ignored players`, login);
                    return tmc.chat(`¤info¤Player unignored: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "show":
            case "list": {
                const window = new PlayerListsWindow(login);
                window.title = "IgnoreList";
                window.size = { width: 175, height: 120 };
                window.setItems(await tmc.server.call("GetIgnoreList", -1, 0));
                window.setColumns({
                    Login: { title: "Login", width: 100 }
                });
                window.setAction("remove", "Remove", async (login: string, item: any) => {
                    await tmc.chatCmd.execute(login, `//ignorelist remove ${item.Login}`);
                    window.setItems(await tmc.server.call("GetIgnoreList", -1, 0));
                    window.display();
                })
                window.display();
                return;
            }
            default: {
                tmc.chat("Usage: ¤cmd¤//guestlist ¤white¤add <login>,remove <login>, clear, show, list", login);
                return;
            }
        }
    }

    async cmdBlacklist(login: string, args: string[]) {
        if (args.length < 1) {
            tmc.chat("Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, clear, show, list", login);
            return;
        }
        switch (args[0]) {
            case "clear": {
                try {
                    await tmc.server.call("ClearBlackList");
                    tmc.chat("¤info¤Blacklist cleared", login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                }
                return;
            }
            case "add": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    await tmc.server.call("LoadBlackList", "blacklist.txt");
                    const res = await tmc.server.call("BlackList", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to add ¤white¤${args[1]}¤error¤ as guest.`, login);
                    tmc.server.send("SaveBlackList", "blacklist.txt");
                    return tmc.chat(`¤info¤Added to blacklist: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "remove": {
                try {
                    if (!args[1]) return tmc.chat("¤error¤Missing madatory argument: <login>", login);
                    await tmc.server.call("LoadBlackList", "blacklist.txt");
                    const res = await tmc.server.call("UnBlackList", args[1]);
                    if (!res) return tmc.chat(`¤error¤Unable to remove ¤white¤${args[1]}¤error¤ from blacklist`, login);
                    tmc.server.send("SaveBlackList", "blacklist.txt");
                    return tmc.chat(`¤info¤Blacklist removed: ¤white¤${args[1]}`, login);
                } catch (e: any) {
                    tmc.chat(`¤error¤${e.message}`, login);
                    return;
                }
            }
            case "show":
            case "list": {
                const window = new PlayerListsWindow(login);
                window.title = "Blacklist";
                window.size = { width: 175, height: 120 };
                window.setItems(await tmc.server.call("GetBlackList", -1, 0));
                window.setColumns({
                    Login: { title: "Login", width: 100 }
                });
                window.setAction("remove", "Remove", async (login: string, item: any) => {
                    await tmc.chatCmd.execute(login, `//blacklist remove ${item.Login}`);
                    window.setItems(await tmc.server.call("GetBlackList", -1, 0));
                    window.display();
                })
                window.display();
                return;
            }
            default: {
                tmc.chat("Usage: ¤cmd¤//blacklist ¤white¤add <login>,remove <login>, clear, show, list", login);
                return;
            }
        }
    }

    async cmdSetSetting(login: any, args: string[]) {
        if (this.currentSetting[login] === undefined) {
            tmc.chat("¤info¤No setting selected.", login);
            return;
        }
        if (args.length < 1) {
            tmc.chat("¤info¤Usage: ¤cmd¤//set ¤white¤<value>", login);
            return;
        }

        const setting = this.currentSetting[login];

        if (setting.type === "color") {
            const color = args[0];
            if (!color.match(/^([A-Fa-f0-9]{3})|([A-Fa-f0-9]{6})$/)) {
                tmc.chat("¤error¤Invalid color value", login);
                return;
            }
            try {
                tmc.settings.setColor(setting.key, color);
            } catch (e: any) {
                tmc.chat(`Error: ${e.message}`, login);
                return;
            }
            tmc.chat(`¤info¤Set $fff${setting.key} ¤info¤to $fff"$${color}${color}$fff"`, login);
            this.currentSetting[login] = undefined;
            await this.cmdColors(login, []);
            return;
        }

        const value: any = castType(args.join(" ").trim(), setting.type);

        if (
            (setting.type === "string" && typeof value !== "string") ||
            (setting.type === "number" && (typeof value !== "number" || Number.isNaN(value))) ||
            (setting.type === "boolean" && typeof value !== "boolean") ||
            value === undefined
        ) {
            tmc.chat("¤error¤Invalid value", login);
            return;
        }

        try {
            tmc.settings.set(setting.key, value);
        } catch (e: any) {
            tmc.chat(`Error: ${e.message}`, login);
            return;
        }
        tmc.chat(`¤info¤Set $fff${setting.key} ¤info¤to $fff"${value}"`, login);
        this.currentSetting[login] = undefined;
        await this.cmdSettings(login, []);
    }

    async cmdSettings(login: string, args: string[]) {
        const window = new SettingsWindow(login);
        window.display();
    }

    async cmdColors(login: string, args: string[]) {
        const window = new ColorsWindow(login);
        window.display();
    }
}
