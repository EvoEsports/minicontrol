import Plugin from "@core/plugins";
import fs from "fs";

interface Map {
    id: string;
    baseUrl: string;
    site?: string;
}

export default class Tmx extends Plugin {
    readonly SITE_NAMES = ["TMN", "TMO", "TMS", "TMUF", "TMNF"];

    readonly BASE_URL_NATIONS = "https://nations.tm-exchange.com/";
    readonly BASE_URL_ORIGINAL = "https://original.tm-exchange.com/";
    readonly BASE_URL_SUNRISE = "https://sunrise.tm-exchange.com/";
    readonly BASE_URL_FOREVER_NATIONS = "https://tmnf.exchange/";
    readonly BASE_URL_FOREVER_UNITED = "https://tmuf.exchange/";
    readonly BASE_URL_TM2 = "https://tm.mania.exchange/";
    readonly BASE_URL_TM2020 = "https://trackmania.exchange/";
    private cancelToken: boolean = false;

    getBaseUrl(site?: string) {
        if (tmc.game.Name === "ManiaPlanet") return this.BASE_URL_TM2;
        else if (tmc.game.Name === "Trackmania") return this.BASE_URL_TM2020;
        else {
            if (site === "TMN") return this.BASE_URL_NATIONS;
            if (site === "TMO") return this.BASE_URL_ORIGINAL;
            if (site === "TMS") return this.BASE_URL_SUNRISE;
            if (site === "TMUF") return this.BASE_URL_FOREVER_UNITED;
            return this.BASE_URL_FOREVER_NATIONS;
        }
    }

    getFileExtension() {
        return tmc.game.Name === "TmForever" ? ".Challenge.Gbx" : ".Map.Gbx";
    }

    getDownloadEndpoint() {
        return tmc.game.Name === "TmForever" ? "trackgbx/" : "maps/download/";
    }

    async onLoad() {
        tmc.addCommand("//add", this.addMap.bind(this), "Add map from TMX");
        tmc.addCommand("//addpack", this.addMapPack.bind(this), "Add map pack from TMX");
        tmc.addCommand(
            "//cancelpack",
            () => {
                tmc.chat("Admin cancelled the download!");
                this.cancelToken = true;
            },
            "Cancel pack download"
        );
    }

    async onUnload() {
        tmc.removeCommand("//add");
        tmc.removeCommand("//addpack");
    }

    async addMap(login: string, params: string[]) {
        if (!params[0]) {
            if (tmc.game.Name === "TmForever") {
                tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID:SITE,ID2:SITE2>¤info¤ - e.g. ¤cmd¤//add ¤white¤12345:tmnf,123456:tmuf", login);
                return;
            } else {
                tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID,ID2,ID3,...>", login);
                return;
            }
        }

        if (params[0].includes(",")) {
            const ids = params[0].split(",");
            for (let id of ids) {
                await this.parseAndDownloadMapId(id, login);
            }
            return;
        }

        await this.parseAndDownloadMapId(params[0], login);
        return;
    }

    async addMapPack(login: string, params: string[]) {
        if (!params[0]) {
            if (tmc.game.Name === "TmForever") {
                tmc.chat("¤info¤Usage: ¤cmd¤//addpack ¤white¤<ID:SITE>¤info¤ - e.g. ¤cmd¤//addpack ¤white¤12345:tmnf", login);
            } else {
                tmc.chat("¤info¤Usage: ¤cmd¤//addpack ¤white¤<ID>", login);
            }
            tmc.chat("¤info¤To cancel: ¤cmd¤//addpack cancel", login);
            return;
        }

        if (params[0].toLowerCase() === "cancel") {
            this.cancelToken = true;
            tmc.chat("Map Pack download cancelled.", login);
            return;
        }

        await this.parseAndDownloadTrackPack(params[0], login);
    }

    async parseAndDownloadMapId(mapId: string, login: string) {
        if (tmc.game.Name === "TmForever") {
            if (mapId.includes(":")) {
                let data = mapId.split(":");
                if (isNaN(parseInt(data[0]))) {
                    tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                    return;
                }
                let id = data[0];
                let site = "TMNF";
                let baseUrl;
                if (this.SITE_NAMES.includes(data[1].toUpperCase())) {
                    site = data[1].toUpperCase();
                }
                baseUrl = this.getBaseUrl(site);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            } else {
                let id = mapId;
                let site = "TMNF";
                let baseUrl;
                baseUrl = this.getBaseUrl(site);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            }
        } else {
            if (mapId.includes(":")) {
                tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
                return;
            }
            if (isNaN(parseInt(mapId))) {
                tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                return;
            }
            const map: Map = { id: mapId, baseUrl: this.getBaseUrl() };
            await this.downloadMap(map, login);
        }
    }

    async downloadMap(map: Map, login: string) {
        let baseUrl = map.baseUrl;
        let endpoint = this.getDownloadEndpoint();
        let ext = this.getFileExtension();
        let fileUrl = baseUrl + endpoint + map.id;

        let filePath = `tmx/${map.id}`;
        if (map.site) filePath += "_" + map.site;
        filePath += ext;

        let res = await fetch(fileUrl, { keepalive: false });
        if (!res) {
            tmc.chat(`Invalid http response for ID ${map.id}`, login);
            return;
        }
        if (!res.ok) {
            tmc.chat(`Invalid http response for ID ${map.id}`, login);
            return;
        }
        if (!fs.existsSync(`${tmc.mapsPath}`)) {
            try {
                const abuffer = await (await res.blob()).arrayBuffer();
                const status = await tmc.server.call("WriteFile", filePath, Buffer.from(abuffer));
                if (!status) {
                    tmc.chat(`Map path "${tmc.mapsPath}" is unreachable.`, login);
                    return;
                }
                await tmc.server.call("AddMap", filePath);
                await tmc.maps.syncMaplist();
                const info = tmc.maps.get().filter(map => map.FileName == filePath)[0];
                if (info) {
                    const author = info.AuthorNickname || info.Author || "n/a";
                    tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author} ¤info¤from ¤white¤${map.baseUrl}!`);
                    if (Object.keys(tmc.plugins).includes("jukebox")) {
                        await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
                    }
                } else {
                    tmc.chat(`¤info¤Added map but didn't find map info!`);
                }
                return;
            } catch (err: any) {
                tmc.chat(err, login);
                return;
            }
        }
        if (!fs.existsSync(`${tmc.mapsPath}tmx/`)) fs.mkdirSync(`${tmc.mapsPath}tmx/`);
        const abuffer = await (await res.blob()).arrayBuffer();

        fs.writeFileSync(`${tmc.mapsPath}${filePath}`, Buffer.from(abuffer));
        await tmc.server.call("AddMap", filePath);
        await tmc.maps.syncMaplist();
        const info = tmc.maps.get().filter(map => map.FileName == filePath)[0];
        if (info) {
            const author = info.AuthorNickname || info.Author || "n/a";
            tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author} ¤info¤from ¤white¤${map.baseUrl}!`);
            if (Object.keys(tmc.plugins).includes("jukebox")) {
                await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
            }
        } else {
            tmc.chat(`¤info¤Added map but didn't find map info!`);
        }
    }

    async parseAndDownloadTrackPack(packId: string, login: string) {
        this.cancelToken = false;
        if (tmc.game.Name === "TmForever") {
            if (packId.includes(":")) {
                let data = packId.split(":");
                if (isNaN(parseInt(data[0]))) {
                    tmc.chat(`¤error¤The supplied Pack ID ${packId} is invalid.`, login);
                    return;
                }
                let id = data[0];
                let site = "TMNF";
                let baseUrl;
                if (this.SITE_NAMES.includes(data[1].toUpperCase())) {
                    site = data[1].toUpperCase();
                }
                baseUrl = this.getBaseUrl(site);
                await this.downloadMapPack(id, baseUrl, login, site);
            } else {
                let id = packId;
                let site = "TMNF";
                let baseUrl;
                baseUrl = this.getBaseUrl(site);
                await this.downloadMapPack(id, baseUrl, login, site);
            }
        } else {
            if (packId.includes(":")) {
                tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
                return;
            }
            if (isNaN(parseInt(packId))) {
                tmc.chat(`¤error¤The supplied Pack ID ${packId} is invalid.`, login);
                return;
            }
            await this.downloadMapPack(packId, this.getBaseUrl(), login);
        }
    }

    async downloadMapPack(packId: string, baseUrl: string, login: string, site?: string) {
        let url = baseUrl;
        if (tmc.game.Name === "TmForever") {
            url += `api/tracks?packid=${packId}&fields=TrackId,TrackName`;
        } else if (tmc.game.Name === "ManiaPlanet" || tmc.game.Name === "Trackmania") {
            url += `api/mappack/get_mappack_tracks/${packId}`;
        } else {
            tmc.chat(`¤error¤Game ${tmc.game.Name} is not supported for this command.`);
            return;
        }

        const res = await fetch(url, { keepalive: false });
        const json: any = await res.json();
        tmc.chat("Processing Map Pack ¤white¤" + packId);
        if (!json) {
            tmc.chat(`¤error¤Error while adding Pack ID ${packId}: ${res.statusText}`, login);
        }
        let results = json;
        if (tmc.game.Name === "TmForever") results = json.Results;
        for (let data of results) {
            if (this.cancelToken === true) return;
            try {
                let mapName = tmc.game.Name === "TmForever" ? data.TrackName : data.GbxMapName;
                let id = tmc.game.Name === "TmForever" ? data.TrackId : data.TrackID;
                tmc.chat(`Downloading: ¤white¤${mapName}`);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            } catch (err: any) {
                tmc.chat(`¤error¤Error: ${err.message}`);
            }
        }
        tmc.chat("¤white¤Done!");
    }
}
