import Plugin from "@core/plugins";
import { formatTime, htmlEntities } from "@core/utils";
import fs from "node:fs";
import SearchWindow from "./searchWindow";
import Menu from "@core/plugins/menu/menu";
import type { Map as TmMap } from "@core/mapmanager";
import { QueryTypes, type Sequelize } from "sequelize";

export interface TmxMapInfo {
    TmxId: string;
    TmxUrl: string;
    Name: string;
    Style: string;
    Tags: string[];
    Difficulty: string;
    wrHolder: string;
    wrTime: number | undefined;
}

interface Map {
    id: string;
    baseUrl: string;
    site?: string;
}

export interface TmxMap extends TmMap {
    tmx?: TmxMapInfo;
}

export default class Tmx extends Plugin {
    readonly SITE_NAMES = ["TMN", "TMO", "TMS", "TMUF", "TMNF"];
    readonly TM1X_TAGS = [
        "Normal",
        "Stunt",
        "Maze",
        "Offroad",
        "Laps",
        "Fullspeed",
        "LOL",
        "Tech",
        "Speedtech",
        "RPG",
        "PressForward",
        "Trial",
        "Grass",
    ];
    readonly TM1X_UNLIMITER = ["none", "0.4", "0.6", "0.7", "1.1", "1.2", "1.3", "2.0", "2.1"];
    readonly TMX1X_DIFFICULTY = ["Beginner", "Intermediate", "Expert", "Lunatic"];
    readonly TMX_DIFFICULTY = ["Beginner", "Intermediate", "Advanced", "Expert", "Lunatic", "Impossible"];
    readonly BASE_URL_NATIONS = "https://nations.tm-exchange.com/";
    readonly BASE_URL_ORIGINAL = "https://original.tm-exchange.com/";
    readonly BASE_URL_SUNRISE = "https://sunrise.tm-exchange.com/";
    readonly BASE_URL_FOREVER_NATIONS = "https://tmnf.exchange/";
    readonly BASE_URL_FOREVER_UNITED = "https://tmuf.exchange/";
    readonly BASE_URL_TM2 = "https://tm.mania.exchange/";
    readonly BASE_URL_TM2020 = "https://trackmania.exchange/";
    private cancelToken = false;

    getBaseUrl(site?: string) {
        if (tmc.game.Name === "ManiaPlanet") return this.BASE_URL_TM2;
        if (tmc.game.Name === "Trackmania") return this.BASE_URL_TM2020;

        if (site === "TMN") return this.BASE_URL_NATIONS;
        if (site === "TMO") return this.BASE_URL_ORIGINAL;
        if (site === "TMS") return this.BASE_URL_SUNRISE;
        if (site === "TMUF") return this.BASE_URL_FOREVER_UNITED;
        return this.BASE_URL_FOREVER_NATIONS;
    }

    getFileExtension() {
        return tmc.game.Name === "TmForever" ? ".Challenge.Gbx" : ".Map.Gbx";
    }

    getDownloadEndpoint() {
        return tmc.game.Name === "TmForever" ? "trackgbx/" : "maps/download/";
    }

    async onLoad() {
        tmc.settings.register("tmx.fetchMapInfo", true, null, "TMX: Fetch map info for maps");
        tmc.addCommand("//add", this.addMap.bind(this), "Add map from TMX");
        tmc.addCommand("//addpack", this.addMapPack.bind(this), "Add map pack from TMX");
        tmc.addCommand(
            "//cancelpack",
            async () => {
                tmc.chat("Admin cancelled the download!");
                this.cancelToken = true;
            },
            "Cancel pack download",
        );
        tmc.addCommand("//search", this.searchMaps.bind(this), "Search maps on TMX");

        Menu.getInstance().addItem({
            category: "Map",
            title: "Search Tmx",
            action: "//search",
            admin: true,
        });
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        await this.onBeginMap();
    }

    async onUnload() {
        tmc.removeCommand("//add");
        tmc.removeCommand("//addpack");
    }

    async onBeginMap() {
        if (!tmc.settings.get("tmx.fetchMapInfo")) return;
        const uuid = tmc.maps.currentMap.UId;
        let type: undefined | string = undefined;
        if (uuid) {
            if (tmc.game.Name === "TmForever" && tmc.maps.currentMap.Environnement !== "Stadium") {
                type = "TMUF";
            }
            this.getTmxInfo(uuid, type).then((info) => {
                tmc.maps.currentMap.tmx = info;
                tmc.server.emit("Plugin.TMX.MapInfo", [info]);
            });
        }
    }

    async searchMaps(login: string, params: string[]) {
        const query = encodeURIComponent(params.join(" "));
        let fields = encodeURIComponent("MapId,Name,GbxMapName,Authors,Tags,AwardCount,Length");
        let urlPath = "api/maps";
        if (tmc.game.Name === "TmForever") {
            urlPath = "api/tracks";
            fields = encodeURIComponent("TrackId,TrackName,Authors,AuthorScore,Tags,Awards,UnlimiterVersion");
        }

        const url = `${this.getBaseUrl()}${urlPath}?fields=${fields}&name=${query}&count=150`;

        const res = await fetch(url, { keepalive: false });

        const json: any = await res.json();
        if (!json) {
            tmc.chat(`¤error¤Error while searching for ${query}: ${res.statusText}`, login);
            return;
        }
        const results = json.Results;
        if (results.length === 0) {
            tmc.chat(`No results found for ${query}`, login);
            return;
        }

        const out: any = [];
        for (const data of results) {
            let name = data.GbxMapName || data.TrackName || data.Name || "";
            if (name.startsWith("ï»¿")) {
                name = Buffer.from(name.replace("ï»¿", ""), "latin1").toString("utf-8");
            }
            out.push({
                id: data.TrackId || data.MapId,
                name: htmlEntities(name),
                author: htmlEntities(data.Authors[0].User.Name || "n/a"),
                length: formatTime(data.AuthorScore || data.Length) || "",
                tags:
                    data.Tags.map((tag: any) => {
                        let color = "";
                        if (tag.Color) {
                            const matches = tag.Color.match(/.{2}/g);
                            color = `$${matches.map((c: string) => Math.floor(Number.parseInt(c, 16) / 17).toString(16)).join("")}`;
                        }
                        if (tag.Name) return color + tag.Name;
                        return this.TM1X_TAGS[tag];
                    }).join("$fff, ") || "n/a",
                awards: `$fe0${data.Awards || data.AwardCount || "0"}`,
                unlimiter: data.UnlimiterVersion ? `$o$f00${this.TM1X_UNLIMITER[data.UnlimiterVersion]}` : "",
            });
        }

        const window = new SearchWindow(login);
        window.title = "Search Results";
        window.size = { width: 150, height: 95 };
        window.setColumns([
            { key: "name", title: "Name", width: 40 },
            { key: "author", title: "Author", width: 20 },
            { key: "tags", title: "Tags", width: 40 },
            { key: "length", title: "Length", width: 20 },
            { key: "awards", title: "Awards", width: 10 },
        ]);

        if (tmc.game.Name === "TmForever") {
            window.setColumns([
                { key: "name", title: "Name", width: 40 },
                { key: "author", title: "Author", width: 20 },
                { key: "tags", title: "Tags", width: 40 },
                { key: "length", title: "Length", width: 12 },
                { key: "unlimiter", title: "Unlimiter", width: 10 },
                { key: "awards", title: "Awards", width: 10 },
            ]);
        }

        window.setActions(["Install"]);
        window.setItems(out);
        window.display();
    }

    async addMap(login: string, params: string[]) {
        if (!params[0]) {
            if (tmc.game.Name === "TmForever") {
                tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID:SITE,ID2:SITE2>¤info¤ - e.g. ¤cmd¤//add ¤white¤12345:tmnf,123456:tmuf", login);
                return;
            }
            tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID,ID2,ID3,...>", login);
            return;
        }

        if (params[0].includes(",")) {
            const ids = params[0].split(",");
            for (const id of ids) {
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
                const data = mapId.split(":");
                if (Number.isNaN(Number.parseInt(data[0]))) {
                    tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                    return;
                }
                const id = data[0];
                let site = "TMNF";
                if (this.SITE_NAMES.includes(data[1].toUpperCase())) {
                    site = data[1].toUpperCase();
                }
                const baseUrl = this.getBaseUrl(site);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            } else {
                const id = mapId;
                const site = "TMNF";
                const baseUrl = this.getBaseUrl(site);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            }
        } else {
            if (mapId.includes(":")) {
                tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
                return;
            }
            if (Number.isNaN(Number.parseInt(mapId))) {
                tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                return;
            }
            const map: Map = { id: mapId, baseUrl: this.getBaseUrl() };
            await this.downloadMap(map, login);
        }
    }

    async downloadMap(map: Map, login: string) {
        const baseUrl = map.baseUrl;
        const endpoint = this.getDownloadEndpoint();
        const ext = this.getFileExtension();
        const fileUrl = baseUrl + endpoint + map.id;

        let filePath = `tmx/${map.id}`;
        if (map.site) filePath += `_${map.site}`;
        filePath += ext;

        const res = await fetch(fileUrl, { keepalive: false });
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
                    tmc.chat("Error while adding map", login);
                    return;
                }
                await tmc.server.call("AddMap", filePath);
                await tmc.maps.syncMaplist();
                const info = await tmc.server.call("GetMapInfo", tmc.mapsPath + filePath);
                if (info) {
                    const author = info.AuthorNickname || info.Author || "n/a";
                    this.updateDatabase(info.UId, map.id);
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
        try {
            if (!fs.existsSync(`${tmc.mapsPath}tmx/`)) fs.mkdirSync(`${tmc.mapsPath}tmx/`);
            const abuffer = await (await res.blob()).arrayBuffer();

            fs.writeFileSync(`${tmc.mapsPath}${filePath}`, new Uint8Array(abuffer));
            await tmc.server.call("AddMap", filePath);
            await tmc.maps.syncMaplist();
            const info = await tmc.server.call("GetMapInfo", tmc.mapsPath + filePath);
            if (info) {
                const author = info.AuthorNickname || info.Author || "n/a";
                this.updateDatabase(info.UId, map.id);
                tmc.chat(`¤info¤Added map ¤white¤${info.Name} ¤info¤by ¤white¤${author} ¤info¤from ¤white¤${map.baseUrl}!`);
                if (Object.keys(tmc.plugins).includes("jukebox")) {
                    await tmc.chatCmd.execute(login, `/addqueue ${info.UId}`);
                }
            } else {
                tmc.chat(`¤info¤Added map but didn't find map info!`);
            }
        } catch (err: any) {
            tmc.chat(`¤error¤${err.message}`, login);
            return;
        }
    }

    async parseAndDownloadTrackPack(packId: string, login: string) {
        this.cancelToken = false;
        if (tmc.game.Name === "TmForever") {
            if (packId.includes(":")) {
                const data = packId.split(":");
                if (Number.isNaN(Number.parseInt(data[0]))) {
                    tmc.chat(`¤error¤The supplied Pack ID ${packId} is invalid.`, login);
                    return;
                }
                const id = data[0];
                let site = "TMNF";
                if (this.SITE_NAMES.includes(data[1].toUpperCase())) {
                    site = data[1].toUpperCase();
                }
                const baseUrl = this.getBaseUrl(site);
                await this.downloadMapPack(id, baseUrl, login, site);
            } else {
                const id = packId;
                const site = "TMNF";
                const baseUrl = this.getBaseUrl(site);
                await this.downloadMapPack(id, baseUrl, login, site);
            }
        } else {
            if (packId.includes(":")) {
                tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
                return;
            }
            if (Number.isNaN(Number.parseInt(packId))) {
                tmc.chat(`¤error¤The supplied Pack ID ${packId} is invalid.`, login);
                return;
            }
            await this.downloadMapPack(packId, this.getBaseUrl(), login);
        }
    }

    async downloadMapPack(packId: string, baseUrl: string, login: string, site?: string) {
        let url = baseUrl;
        if (tmc.game.Name === "TmForever") {
            url += `api/tracks?packid=${packId}&fields=${encodeURIComponent("TrackId,TrackName")}`;
        } else if (tmc.game.Name === "ManiaPlanet" || tmc.game.Name === "Trackmania") {
            url += `api/mappack/get_mappack_tracks/${packId}`;
        } else {
            tmc.chat(`¤error¤Game ${tmc.game.Name} is not supported for this command.`);
            return;
        }

        const res = await fetch(url, { keepalive: false });
        const json: any = await res.json();
        tmc.chat(`Processing Map Pack ¤white¤${packId}`);
        if (!json) {
            tmc.chat(`¤error¤Error while adding Pack ID ${packId}: ${res.statusText}`, login);
        }
        let results = json;
        if (tmc.game.Name === "TmForever") results = json.Results;
        for (const data of results) {
            if (this.cancelToken === true) return;
            try {
                const mapName = tmc.game.Name === "TmForever" ? data.TrackName : data.GbxMapName;
                const id = tmc.game.Name === "TmForever" ? data.TrackId : data.TrackID;
                tmc.chat(`Downloading: ¤white¤${mapName}`);
                const map: Map = { id, baseUrl, site };
                await this.downloadMap(map, login);
            } catch (err: any) {
                tmc.chat(`¤error¤Error: ${err.message}`);
            }
        }
        tmc.chat("¤white¤Done!");
    }

    async getTmxInfo(uid: string, envir: string | undefined): Promise<TmxMapInfo> {
        let maps = "maps";
        let wr = "OnlineWR,MapId";
        if (tmc.game.Name === "TmForever") {
            maps = "tracks";
            wr = "WRReplay.ReplayTime,WRReplay.User.Name,TrackId";
        }
        const url: string = `${this.getBaseUrl(envir)}api/${maps}?fields=${encodeURIComponent(`${wr},Difficulty,Tags`)}&uid=${encodeURIComponent(uid)}`;

        try {
            const controller = new AbortController();
            const { signal } = controller;
            const timeoutID = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(url, { keepalive: false, signal: signal });
            clearTimeout(timeoutID);
            if (res.ok === false) return {} as TmxMapInfo;
            const json: any = await res.json();
            if (!json || !json.Results) return {} as TmxMapInfo;
            let result: any = {};

            if (json.Results.length > 0) {
                result = json.Results[0];
            }
            result.Tags = result.Tags?.map((tag: any) => {
                let color = "";
                if (tag.Color) {
                    const matches = tag.Color.match(/.{2}/g);
                    color = `$${matches.map((c: string) => Math.floor(Number.parseInt(c, 16) / 17).toString(16)).join("")}`;
                }
                if (tag.Name) return color + tag.Name;
                return this.TM1X_TAGS[tag];
            });
            if (result.Tags == null || result.Tags?.length === 0) result.Tags = ["Normal"];
            result.Style = result.Tags[0] || "Normal";
            result.TmxId = result.MapId || result.TrackId;
            result.TmxUrl = this.getBaseUrl(envir);
            result.wrHolder = result.OnlineWR?.DisplayName || result.WRReplay?.User?.Name || "n/a";
            result.wrTime = result.OnlineWR?.RecordTime || result.WRReplay?.ReplayTime || undefined;
            if (tmc.game.Name === "TmForever") {
                result.Difficulty = this.TMX1X_DIFFICULTY[result.Difficulty] || "Difficulty not set";
            } else {
                result.Difficulty = this.TMX_DIFFICULTY[result.Difficulty] || "Difficulty not set";
            }
            return result as TmxMapInfo;
        } catch (e: any) {
            tmc.debug(`TmxInfo Error: ${e.message}`);
            return {} as TmxMapInfo;
        }
    }

    async updateDatabase(uuid: string, id: string) {
        const sequelize = tmc.storage["db"] as Sequelize;
        if (!sequelize) {
            tmc.debug("Database not initialized");
            return;
        }
        const query = "UPDATE maps SET tmxId = ? WHERE uuid = ?";
        try {
            await sequelize
                .query(query, {
                    replacements: [id, uuid],
                    type: QueryTypes.UPDATE,
                })
                .then(() => {
                    tmc.debug(`Updated map ${uuid} with TMX ID ${id}`);
                });
            const map = tmc.maps.getMap(uuid);
            if (map) map.tmx.TmxId = id;
        } catch (err: any) {
            tmc.debug(`Error updating map ${uuid} with TMX ID ${id}: ${err.message}`);
        }
    }
}
