import Plugin from 'core/plugins';
import fs from 'fs';
import { getNameOfDeclaration } from 'typescript';

interface Map {
    id: string,
    baseUrl: string,
    site?: string,
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

    getBaseUrl = (site?:string) => {
        if(tmc.game.Name === "ManiaPlanet") return this.BASE_URL_TM2;
        else if(tmc.game.Name === "Trackmania") return this.BASE_URL_TM2020;
        else {
            if (site === "TMN") return this.BASE_URL_NATIONS;
            if (site === "TMO") return this.BASE_URL_ORIGINAL;
            if (site === "TMS") return this.BASE_URL_SUNRISE;
            if (site === "TMUF") return this.BASE_URL_FOREVER_UNITED;
            return this.BASE_URL_FOREVER_NATIONS;
        }
        
    }

    getFileExtension = () => tmc.game.Name === "TmForever" ? ".Challenge.Gbx" : ".Map.Gbx";

    getDownloadEndpoint = () => tmc.game.Name === "TmForever" ? "trackgbx/" : "maps/download/";

    async onLoad() {
        tmc.addCommand("//add", this.addMap.bind(this), "Add map from TMX");
        //tmc.addCommand("//addpack", this.addMapPack.bind(this), "Add map pack from TMX");
    }

    async onUnload() {
        tmc.removeCommand("//add");
        //tmc.removeCommand("//addpack");
    }

    async addMap(login: string, params: string[]) {

        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            if(tmc.game.Name === "TmForever") {
                await tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID:SITE,ID2:SITE2>¤info¤ - e.g. ¤cmd¤//add ¤white¤12345:tmnf,123456:tmuf", login);
                return;
            } else {
                await tmc.chat("¤info¤Usage: ¤cmd¤//add ¤white¤<ID,ID2,ID3,...>", login)
                return;
            }
        }

        if(params[0].includes(",")){
            const ids = params[0].split(",");
            tmc.debug(`Received command to download ${ids.length} maps.`);
            for(let id of ids) {
                await this.parseAndDownloadMapId(id, login);
            }
            return;
        }
        

        await this.parseAndDownloadMapId(params[0], login);
        return;
        /*if (isNaN(parseInt(params[0]))) {
            await tmc.chat("¤error¤Map ID has to be a number.", login);
            return;
        }
        if(tmc.game.Name != "TmForever" && params[1]) {
            await tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
            return;
        }*/
    }

    parseAndDownloadMapId = async (mapId:string, login: string) => {
        tmc.debug(`Trying to parse id: ${mapId}`)
        if(tmc.game.Name === "TmForever") {
            tmc.debug(`We're in TmForever`)
            if(mapId.includes(":")) {
                tmc.debug(`Map has optional site parameter`)
                let data = mapId.split(':');
                if(isNaN(parseInt(data[0]))) {
                    await tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                    return;
                }
                tmc.debug(`ID ${data[0]} seems valid.`)
                let id = data[0];
                let site = "tmnf";
                let baseUrl;
                if(this.SITE_NAMES.includes(data[1].toUpperCase())) {
                    site = data[1];
                }
                baseUrl = this.getBaseUrl(site.toUpperCase()); 
                tmc.debug(`Setting base url for ID ${data[0]} to ${baseUrl}.`)
                const map: Map = { id, baseUrl, site }
                await this.downloadMap(map, login);
            } else {
                let id = mapId;
                let site = "tmnf";
                let baseUrl;
                baseUrl = this.getBaseUrl(site.toUpperCase()); 
                tmc.debug(`Setting base url for ID ${mapId} to ${baseUrl}.`)
                const map: Map = { id, baseUrl, site }
                await this.downloadMap(map, login);
            }
        } else {
            if(mapId.includes(":")) {
                await tmc.chat(`¤error¤Game ${tmc.game.Name} does not support optional site parameter.`, login);
                return;
            }
            if(isNaN(parseInt(mapId))) {
                await tmc.chat(`¤error¤The supplied ID ${mapId} is invalid.`, login);
                return;
            }
            const map: Map = { id: mapId, baseUrl: this.getBaseUrl() };
            await this.downloadMap(map, login);
        }
    }

    downloadMap = async (map: Map, login: string) => {
        let baseUrl = map.baseUrl;
        let endpoint = this.getDownloadEndpoint();
        let ext = this.getFileExtension();
        let fileUrl = baseUrl + endpoint + map.id;
        
        let filePath = `tmx/${map.id}`;
        if(map.site) filePath += "_" + map.site;
        filePath += ext;

        tmc.debug(`Downloading URL for ID ${map.id} set to ${fileUrl}`)
        let res = await fetch(fileUrl, {keepalive: false});
        if(!res) {
            await tmc.chat(`Invalid http response for ID ${map.id}`, login);
            return;
        }
        if(!res.ok) {
            await tmc.chat(`Invalid http response for ID ${map.id}`, login);
            return;
        }
        if (!fs.existsSync(`${tmc.mapsPath}`)) {
            try {
                const abuffer = await (await res.blob()).arrayBuffer();
                tmc.debug("Done downloading file")
                tmc.debug(`Sending map file to server - should be saved as ${filePath}`)
                const status = await tmc.server.call("WriteFile", filePath, Buffer.from(abuffer));
                if (!status) {
                    await tmc.chat(`Map path "${tmc.mapsPath}" is unreachable.`, login);
                    return;
                }
                await tmc.server.call("AddMap", filePath);
                await tmc.chat(`Added MapId ¤white¤${map.id} ¤info¤from ¤white¤${map.baseUrl}!`);
                return;
            } catch (err: any) {
                await tmc.chat(err, login);
                return;
            }
        }
        if (!fs.existsSync(`${tmc.mapsPath}tmx/`)) fs.mkdirSync(`${tmc.mapsPath}tmx/`);
        const abuffer = await (await res.blob()).arrayBuffer();
        
        fs.writeFileSync(`${tmc.mapsPath}filePath`, Buffer.from(abuffer));
        await tmc.server.call("AddMap", filePath);
        await tmc.maps.syncMaplist();     
        await tmc.chat(`Added MapId ¤white¤${map.id} ¤info¤from ¤white¤${map.baseUrl}!`);
    }

/*    async download(id: string, login: string, announce: boolean = true, site: string = "tmnf") {
        let res = undefined;
        let ext = ".Map.Gbx";
        if (tmc.game.Name == "TmForever") {
            res = await fetch(`https://${site}.exchange/trackgbx/${id}`);
            ext = ".Challenge.Gbx";
        } else if (tmc.game.Name == "Trackmania") {
            res = await fetch(`https://trackmania.exchange/maps/download/${id}`);
        } else if (tmc.game.Name == "ManiaPlanet") {
            res = await fetch(`https://tm.mania.exchange/maps/download/${id}`);
        
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
                await tmc.server.call("AddMap", `tmx/${id}${ext}`);
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
        await tmc.server.call("AddMap", `tmx/${id}${ext}`);
        await tmc.maps.syncMaplist();     
        if (announce) {
            await tmc.chat(`Added MapId: ${id} from tmx!`);
        }
    }
        
    async addMapPackTmu(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            tmc.chat("¤white¤Available: add", login);
            return;
        }
        if (params[0] == "add") {
            if (!params[1]) {
                tmc.chat("No maps to fetch", login);
                return;
            }
            return await this.addTmnPack(login, params[1].trim(), "tmuf");
        }
        
    }

    async addMapPack(login: string, params: string[]) {
        const player = await tmc.getPlayer(login);
        if (!params[0]) {
            await tmc.chat("¤white¤Available: add", login);
            return;
        }
        if (params[0] == "add") {
            if (!params[1]) {
                await tmc.chat("No maps to fetch", login);
                return;
            }
            if (tmc.game.Name == "TmForever") {
                return await this.addTmnPack(login, params[1].trim());
            }
            if (tmc.game.Name == "Trackmania") {
                return await this.addTmxPack(login, params[1].trim());
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
                await this.download(id.trim(), login, true, "tmuf");
            }
        }
    }

*/
}