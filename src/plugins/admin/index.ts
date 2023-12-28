class AdminPlugin {
    constructor() {       
        tmc.addCommand("//skip", async () => await tmc.server.call("NextMap"));
        tmc.addCommand("//res", async () => await tmc.server.call("RestartMap"));
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
        tmc.addCommand("//wml", async (login: string, params: string[]) => {
            let file = "tracklist.txt";
            if (params[0]) file = params[0];
            try {
                const answer = await tmc.server.call("SaveMatchSettings", "MatchSettings/"+file);
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
                const answer = await tmc.server.call("LoadMatchSettings", "MatchSettings/"+file);
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
            const info:any = await tmc.server.call("GetCurrentMapInfo");
            try {
                await tmc.server.call("RemoveMap", info.FileName);
                await tmc.chat(`Removed map ${info.Name} from playlist`, login);
            }catch(err:any) {
                await tmc.chat(err.message, login);
            }
        });
    }

}

tmc.plugins.push(new AdminPlugin);