class AdminPlugin {
    constructor() {
        tmc.addCommand("//skip", async () => await tmc.server.call("NextMap"));
        tmc.addCommand("//res", async () => await tmc.server.call("RestartMap"));
        tmc.addCommand("//kick", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//kick needs a login", login);
            }
            await tmc.server.call("Kick", params[0]);
        });
        tmc.addCommand("//ban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//ban needs a login", login);
            }
            await tmc.server.call("Ban", params[0]);
        });
        tmc.addCommand("//unban", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//unban needs a login", login);
            }
            await tmc.server.call("Unban", params[0]);
        });
        tmc.addCommand("//cancel", async () => await tmc.server.call("CancelVote"));
        tmc.addCommand("//er", () => tmc.server.call("ForceEndRound"));
        tmc.addCommand("//mode", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//mode needs a mode", login);
            }
            if (tmc.game.Name == "TmForever") {
                const modes: { [key: string]: number } = {
                    "rounds": 0, "ta": 1, "team": 2, "laps": 3, "stunts": 4, "cup": 5
                }
                if (modes[params[0]] === undefined) {
                    return await tmc.chat("//mode needs a valid mode", login);
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
                    return await tmc.chat("//mode needs a valid mode", login);
                }
                await tmc.chat(`Gamemode set to ${params[0]}`);
                await tmc.server.call("SetScriptName", scripts[params[0]]);
            }
        });
        tmc.addCommand("//passwd", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//passwd needs a password", login);
            }
            await tmc.server.call("SetServerPassword", params[0]);
            await tmc.chat(`Password set to ${params[0]}`, login);
        });

        tmc.addCommand("//specpasswd", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//spectpasswd needs a password", login);
            }
            await tmc.server.call("SetServerPasswordForSpectator", params[0]);
            await tmc.chat(`Spectator password set to ${params[0]}`, login);
        });

        tmc.addCommand("//warmup", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return await tmc.chat("//warmup needs numeric value");
            }
            await tmc.chat(`Warmup set to ${params[0]}`, login);
            await tmc.server.call("SetWarmUpDuration", Number.parseInt(params[0]));
        });

        tmc.addCommand("//ignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//ignore needs a login", login);
            }
            await tmc.server.call("Ignore", params[0]);
            await tmc.chat(`Ignoring ${params[0]}`, login);
        });

        tmc.addCommand("//unignore", async (login: string, params: string[]) => {
            if (!params[0]) {
                return await tmc.chat("//unignore needs a login", login);
            }
            await tmc.server.call("UnIgnore", params[0]);
            await tmc.chat(`Unignoring ${params[0]}`, login);
        });

        tmc.addCommand("//talimit", async (login: string, params: string[]) => {
            if (tmc.game.Name == "TmForever") {
                if (!params[0]) {
                    return await tmc.chat("//talimit needs numeric value in seconds");
                }
                await tmc.chat(`Timelimit set to ${params[0]} seconds`, login);
                await tmc.server.call("SetTimeAttackLimit", Number.parseInt(params[0]) * 1000);
                return;
            }
        });
        tmc.addCommand("//jump", async (login: string, params: string[]) => {
            if (!params[0] && isNaN(Number.parseInt(params[0]))) {
                return await tmc.chat("//jump needs numeric value");
            }
            try {
                tmc.server.call("JumpToMapIndex", Number.parseInt(params[0]));
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        });

        tmc.addCommand("//wml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0];
            try {
                const answer = await tmc.server.call("SaveMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    await tmc.chat(`Couldn't save matchsettings to ${file}`, login);
                    return;
                }
                await tmc.chat(`Saved matchsettings to ${file}`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        });
        tmc.addCommand("//rml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0];
            try {
                const answer = await tmc.server.call("LoadMatchSettings", "MatchSettings/" + file);
                if (!answer) {
                    await tmc.chat(`Couldn't read matchsettings from ${file}`, login);
                    return;
                }
                await tmc.chat(`Matchsettings read from ${file}`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        });
        tmc.addCommand("//remove", async (login: string, params: string[]) => {
            const info: any = await tmc.server.call("GetCurrentMapInfo");
            try {
                await tmc.server.call("RemoveMap", info.FileName);
                await tmc.chat(`Removed map ${info.Name}$z$s from the playlist.`, login);
            } catch (err: any) {
                await tmc.chat(err.message, login);
            }
        });
        tmc.addCommand("//call", async (login: string, params: string[]) => {            
            const method = params.shift();
            if (method === undefined) {
                return await tmc.chat("//call needs a method", login);
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
        });
    }

}

tmc.addPlugin("admin", new AdminPlugin);