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
            await this.addTmnPack(login, params[0]);
        }
    }

    async addTmnPack(login: string, packid: string) {
        const res = await fetch(`https://tmnf.exchange/api/tracks?packid=${packid}&fields=TrackId,TrackName`);
        const json: any = await res.json();
        await tmc.chat("Processing Track Pack " + packid);
        console.log(json);
        if (!json.Results) {
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
            await tmc.chat("Map path is unreachable.", login);
            return;
        }
        if (!fs.existsSync(`${tmc.mapsPath}tmx/`)) fs.mkdirSync(`${tmc.mapsPath}tmx/`);
        const abuffer = await (await res.blob()).arrayBuffer();
        fs.writeFileSync(`${tmc.mapsPath}tmx/${id}${ext}`, Buffer.from(abuffer));

        await tmc.server.call("AddMap", `tmx/${id}${ext}`);
        if (announce) {
            await tmc.chat(`>>Added ${id} from tmx!`);
        }
    }
}

tmc.addPlugin("tmx", new TmxPlugin);