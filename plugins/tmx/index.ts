import fs from 'fs';

class TmxPlugin {
    constructor() {
        tmc.server.on("TMC.Init", this.onInit.bind(this));
    }

    async onInit() {
        tmc.addCommand("//tmx", this.addMap.bind(this), "Add map from tmx");
        tmc.addCommand("//tmxpack", this.addMapPack.bind(this), "Add map pack from tmx");
        if (tmc.game.Name == "TmForever") {
            tmc.addCommand("//tmux", this.addTmuMap.bind(this), "Add map for tmuf");
            tmc.addCommand("//tmuxpack", this.addMapPackTmu.bind(this), "Add map pack for tmuf");
        }
    }

    async addMapPackTmu(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            tmc.chat("¤error¤No action. ¤white¤Available: add", login);
            return;
        }
        if (params[0] == "add") {
            if (!params[1]) {
                tmc.chat("No maps to fetch", login);
                return;
            }
            return await this.addTmnPack(login, params[1], "tmuf");
        }
        
    }

    async addMapPack(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("¤error¤No action. ¤white¤Available: add", login);
            return;
        }
        if (params[0] == "add") {
            if (!params[1]) {
                await tmc.chat("No maps to fetch", login);
                return;
            }
            if (tmc.game.Name == "TmForever") {
                return await this.addTmnPack(login, params[1]);
            }
            if (tmc.game.Name == "Trackmania") {
                return await this.addTmxPack(login, params[1]);
            }
        }
        return await tmc.chat("Not implemented yet.", login);
    }

    async addTmxPack(login: string, packid: string) {
        const res = await fetch(`https://trackmania.exchange/api/mappack/get_mappack_tracks/${packid}`);
        const json: any = await res.json();
        await tmc.chat("Processing Pack " + packid);
        if (!json) {
            await tmc.chat("Error while adding tmx pack.", login);
        }
        if (json.Message) {
            await tmc.chat(json.Message, login);
            return;
        }
        for (let data of json) {
            try {
                await tmc.chat(`Downloading: ${data.GbxMapName}`);
                await this.download(data.TrackID, login, false);
            } catch (err: any) {
                await tmc.chat(`$f00Error: ${err.message}`);
            }
        }
        tmc.chat("All Done!");
    }

    async addTmnPack(login: string, packid: string, site = "tmnf") {
        const res = await fetch(`https://${site}.exchange/api/tracks?packid=${packid}&fields=TrackId,TrackName`);
        const json: any = await res.json();
        await tmc.chat("Processing Track Pack " + packid);
        if (!json) {
            await tmc.chat("Error while adding tmx pack.", login);
        }
        for (let data of json.Results) {
            try {
                await tmc.chat(`Downloading: ${data.TrackName}`);
                await this.download(data.TrackId, login, false, site);
            } catch (err: any) {
                await tmc.chat(`$f00Error: ${err.message}`);
            }
        }
        tmc.chat("All Done!");
    }

    async addTmuMap(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("¤error¤No action. ¤white¤Available: add", login);
            return;
        }
        if (!params[0]) {
            await tmc.chat("¤error¤No maps to fetch", login);
            return;
        }
        if (params[0] == "add") {
            for (let id of params[1].split(",")) {
                await this.download(id, login, true, "tmuf");
            }
        }
    }

    async addMap(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("¤error¤No action. ¤white¤Available: add", login);
            return;
        }
        if (params[0] == "add") {
            if (!params[1]) {
                await tmc.chat("¤error¤No maps to fetch", login);
                return;
            }
            for (let id of params[1].split(",")) {
                await this.download(id, login);
            }
        }
    }

    async download(id: string, login: string, announce: boolean = true, site: string = "tmnf") {
        let res = undefined;
        let ext = ".Map.Gbx";
        if (tmc.game.Name == "TmForever") {
            res = await fetch(`https://${site}.exchange/trackgbx/${id}`);
            ext = ".Challenge.Gbx";
        } else {
            res = await fetch(`https://trackmania.exchange/maps/download/${id}`);
        }
        if (!res) {
            await tmc.chat("Invalid http response", login);
            return;
        }
        if (!res.ok) {
            await tmc.chat("Invalid http response", login);
            return;
        }
        if (!fs.existsSync(`${tmc.mapsPath}`)) {
            try {
                const abuffer = await (await res.blob()).arrayBuffer();
                const status = await tmc.server.call("WriteFile", `tmx/${id}${ext}`, Buffer.from(abuffer));
                if (!status) {
                    await tmc.chat(`Map path "${tmc.mapsPath}" is unreachable.`, login);
                    return;
                }
                await tmc.server.call("InsertMap", `tmx/${id}${ext}`);
                if (announce) {
                    await tmc.chat(`Added MapId: ${id} from tmx!`);
                }
                return;
            } catch (err: any) {
                await tmc.chat(err, login);
                return;
            }
        }
        if (!fs.existsSync(`${tmc.mapsPath}tmx/`)) fs.mkdirSync(`${tmc.mapsPath}tmx/`);
        const abuffer = await (await res.blob()).arrayBuffer();
        fs.writeFileSync(`${tmc.mapsPath}tmx/${id}${ext}`, Buffer.from(abuffer));

        await tmc.server.call("InsertMap", `tmx/${id}${ext}`);
        if (announce) {
            await tmc.chat(`Added MapId: ${id} from tmx!`);
        }
    }
}

tmc.addPlugin("tmx", new TmxPlugin);