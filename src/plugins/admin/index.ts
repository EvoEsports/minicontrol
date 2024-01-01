import { Map } from "../../core/types";

class AdminPlugin {
    constructor() {
        tmc.addCommand("//skip", async () => await tmc.server.call("NextMap"), "Skips Map");
        tmc.addCommand("//res", async () => await tmc.server.call("RestartMap"), "Restarts Map");
        tmc.addCommand("//kick", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//kick ¤info¤needs a login", login);
            }
            await tmc.server.call("Kick", params[0]);
        }, "Kicks player");
        tmc.addCommand("//ban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//ban ¤info¤needs a login", login);
            }
            await tmc.server.call("Ban", params[0]);
        }, "Bans player");
        tmc.addCommand("//unban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//unban ¤info¤needs a login", login);
            }
            await tmc.server.call("Unban", params[0]);
        }, "Unbans player");
        tmc.addCommand("//cancel", async () => await tmc.server.call("CancelVote"), "Cancels vote");
        tmc.addCommand("//er", () => tmc.server.call("ForceEndRound"), "Ends round");
        tmc.addCommand("//mode", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//mode ¤info¤needs a mode", login);
            }
            if (tmc.game.Name == "TmForever") {
                const modes: { [key: string]: number } = {
                    "rounds": 0, "ta": 1, "team": 2, "laps": 3, "stunts": 4, "cup": 5
                }
                if (modes[params[0]] === undefined) {
                    return await tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                }
                await tmc.chat(`Gamemode set to ${params[0]}`);
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
                    return await tmc.chat("¤cmd¤//mode ¤info¤needs a valid mode", login);
                }
                await tmc.chat(`¤info¤Gamemode set to ¤white¤${params[0]}`);
                await tmc.server.call("SetScriptName", scripts[params[0]]);
            }
        }, "Sets gamemode");
        tmc.addCommand("//pass", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//passwd ¤info¤needs a password", login);
            }
            await tmc.server.call("SetServerPassword", params[0]);
            await tmc.chat(`¤info¤Password set to "¤white¤${params[0]}¤info¤"`, login);
        }, "Sets server password");

        tmc.addCommand("//specpass", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//spectpasswd ¤info¤needs a password", login);
            }
            await tmc.server.call("SetServerPasswordForSpectator", params[0]);
            await tmc.chat(`¤info¤Spectator password set to ¤white¤${params[0]}`, login);
        }, "Sets spectator password");

        tmc.addCommand("//warmup", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return await tmc.chat("¤cmd¤//warmup ¤info¤needs numeric value");
            }
            await tmc.chat(`¤info¤Warmup set to ¤white¤${params[0]}`, login);
            await tmc.server.call("SetWarmUpDuration", Number.parseInt(params[0]));
        }, "Sets warmup duration");

        tmc.addCommand("//ignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//ignore ¤info¤needs a login", login);
            }
            await tmc.server.call("Ignore", params[0]);
            await tmc.chat(`¤info¤Ignoring ¤white¤${params[0]}`, login);
        }, "Ignores player");

        tmc.addCommand("//unignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("¤cmd¤//unignore ¤info¤needs a login", login);
            }
            await tmc.server.call("UnIgnore", params[0]);
            await tmc.chat(`¤info¤Unignored ¤white¤${params[0]}`, login);
        }, "Unignores player");

        tmc.addCommand("//talimit", async (login: string, params: string[]) => {
            if (tmc.game.Name == "TmForever") {
                if (!params[0]) {
                    return await tmc.chat("¤cmd¤//talimit ¤info¤needs numeric value in seconds");
                }
                await tmc.chat(`¤info¤Timelimit set to ¤white¤${params[0]} ¤info¤seconds`, login);
                await tmc.server.call("SetTimeAttackLimit", Number.parseInt(params[0]) * 1000);
                return;
            }

            if (tmc.game.Name == "Trackmania") {
                if (!params[0]) {
                    return await tmc.chat("¤cmd¤//talimit ¤info¤needs numeric value in seconds");
                }
                const settings = await tmc.server.call("GetModeScriptSettings");
                settings["S_TimeLimit"] = Number.parseInt(params[0]);
                await tmc.server.call("SetModeScriptSettings", settings);
                return;
            }
        }, "Sets timelimit");

        tmc.addCommand("//jump", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return await tmc.chat("¤cmd¤//jump ¤info¤needs numeric value");
            }
            try {
                const index = Number.parseInt(params[0]) - 1;
                const maps = tmc.maps.get();
                if (maps[index]) {
                    const map = maps[index];
                    await tmc.chat(`¤info¤Jumped to ¤white¤${map.Name}¤info¤ by ¤white¤${map.AuthorNickName ? map.AuthorNickName : map.Author}`);
                    await tmc.server.call("SetNextMapIndex", index);
                    tmc.server.send("NextMap");
                }
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        }, "Jumps to map in playlist");

        tmc.addCommand("//wml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0];
            try {
                const answer = await tmc.server.call("SaveMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    await tmc.chat(`¤error¤Couldn't save matchsettings to ¤white¤${file}`, login);
                    return;
                }
                await tmc.chat(`¤info¤Saved matchsettings to ¤white¤${file}`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        }, "Saves matchsettings");
        tmc.addCommand("//rml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0];
            try {
                const answer = await tmc.server.call("LoadMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    await tmc.chat(`¤error¤Couldn't read matchsettings from ¤white¤${file}`, login);
                    return;
                }
                await tmc.chat(`¤info¤Matchsettings read from ¤white¤${file}`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
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
                await tmc.chat(`¤info¤Maplist Shuffled.`);
            } catch (err: any) {
                await tmc.chat("¤error¤" + err.message, login);
            }
        }, "Shuffles maplist");
        tmc.addCommand("//remove", async (login: string, params: string[]) => {
            let map: any = tmc.maps.currentMap;
            if (params[0]) {
                let index = Number.parseInt(params[0]) - 1;
                map = tmc.maps.getMaplist()[index];
            }

            try {
                if (!map) {
                    await tmc.chat(`¤error¤Couldn't find map`, login);
                    return;
                }
                await tmc.server.call("RemoveMap", map.FileName);
                await tmc.chat(`¤info¤Removed map ¤white¤${map.Name} ¤info¤from the playlist.`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        }, "Removes map from playlist");

        tmc.addCommand("//call", async (login: string, params: string[]) => {
            const method = params.shift();
            if (method === undefined) {
                return await tmc.chat("¤cmd¤//call ¤info¤needs a method", login);
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
                await tmc.chat(answer.toString(), login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        }, "Calls server method");
    }
}

tmc.addPlugin("admin", new AdminPlugin);