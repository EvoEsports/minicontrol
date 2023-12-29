import fs from 'fs';

class TmxPlugin {
    constructor() {
        tmc.addCommand("//tmx add", this.addMap.bind(this));
        tmc.addCommand("//tmxpack add", this.addMapPack.bind(this));
    }

    async addMapPack(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("No maps to fetch", login);
            return;
        }
        if (tmc.game.Name == "TmForever") {
            return await this.addTmnPack(login, params[0]);
        }
        if (tmc.game.Name == "Trackmania") {
            return await this.addTmxPack(login, params[0]);
        }
        return await tmc.chat("Not implemented yet.", login);
    }

    async addTmxPack(login: string, packid: string) {
        const res = await fetch(`https://trackmania.exchange//api/mappack/get_mappack_tracks/${packid}`);
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
    }

    async addTmnPack(login: string, packid: string) {
        const res = await fetch(`https://tmnf.exchange/api/tracks?packid=${packid}&fields=TrackId,TrackName`);
        const json: any = await res.json();
        await tmc.chat("Processing Track Pack " + packid);
        if (!json) {
            await tmc.chat("Error while adding tmx pack.", login);
        }
        for (let data of json.Results) {
            try {
                await tmc.chat(`Downloading: ${data.TrackName}`);
                await this.download(data.TrackId, login, false);
            } catch (err: any) {
                await tmc.chat(`$f00Error: ${err.message}`);
            }
        }
    }


    async addMap(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("No maps to fetch", login);
            return;
        }

        for (let id of params[0].split(",")) {
            await this.download(id, login);
        }
    }

    async download(id: string, login: string, announce: boolean = true) {
        let res = undefined;
        let ext = ".Map.Gbx";
        if (tmc.game.Name == "TmForever") {
            res = await fetch(`https://tmnf.exchange/trackgbx/${id}`);
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