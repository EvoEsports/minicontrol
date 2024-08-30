import { chunkArray, clone } from "./utils";

export interface Map {
    UId: string;
    Name: string;
    Author: string;
    AuthorNickname?: string;
    AuthorTime: number;
    GoldTime: number;
    SilverTime: number;
    BronzeTime: number;
    CopperPrize: number;
    FileName: string;
    Environnement: string;
    Mood: string;
    LapRace: boolean;
    NbLaps: number;
    NbCheckpoints: number;
    Vehicle?: string;
    [key: string]: any;
}

/**
 * MapManager class
 */
class MapManager {
    private maps: { [key: string]: Map; };
    previousMap?: Map;
    currentMap?: Map;
    nextMap?: Map;

    /**
     * @ignore
     */
    constructor() {
        this.maps = {};
    }

    /**
     * Initialize the map manager 
     * @ignore 
     **/
    async init() {
        this.maps = {};
        tmc.server.addListener("Trackmania.BeginMap", this.onBeginMap, this);
        tmc.server.addListener("Trackmania.MapListModified", this.onMapListModified, this);
        try {
            this.currentMap = await tmc.server.call("GetCurrentMapInfo");
            this.nextMap = await tmc.server.call("GetNextMapInfo");
        } catch (e:any) {
            tmc.cli("¤error¤" + e.message);
        }
        await this.syncMaplist();
    }

    private async onBeginMap(data: any) {
        this.previousMap = clone(this.currentMap);
        this.currentMap = data[0];
        const index = Object.keys(this.maps).indexOf(data[0].UId);
        const indexNext = (index + 1) % Object.keys(this.maps).length;
        this.nextMap = Object.values(this.maps)[indexNext];
    }

    private async onMapListModified(data: any) {
        if (data[2] === true) {
            await this.syncMaplist();
        }
    }

    /**
     * Sync the maplist with the server
     */
    async syncMaplist() {
        this.maps = {};
        
        const chunckedMaps: any = chunkArray(await tmc.server.call("GetMapList", -1, 0), 100);
        let method = "GetMapInfo";    
        if (tmc.game.Name == "TmForever") method = "GetChallengeInfo";

        for (const infos of chunckedMaps) {
            let out = [];
            
            for (const map of infos) {
                out.push([method, map.FileName]);
            }

            let res = await tmc.server.multicall(out) || [];
            
            for (const map of res) {
                this.maps[map.UId] = map;
            }

        }
    }
    /**
     * add map
     * @param map 
     */
    addMap(map: Map) {
        if (!this.maps[map.UId]) {
            this.maps[map.UId] = map;
        }
    }

    /**
     * remove map
     * @param mapUId 
     */
    removeMap(mapUId: string) {
        if (this.maps[mapUId]) {
            delete this.maps[mapUId];
        }
    }

    /**
     * get maps
     * @returns {Map[]} Returns the current maplist
     */
    get(): Map[] {
        return Object.values(this.maps);
    }

    getMap(mapUid: string): Map | undefined {
        return this.maps[mapUid];
    }

    /**
     * get mapslist
     * @returns {Map[]} Returns the current maplist
     */
    getMaplist(): Map[] {
        return this.get();
    }

    /**
     * get map uids
     * @returns {string[]} Returns the current map uids
     */
    getUids(): string[] {
        return Object.keys(this.maps);
    }

    /**
     * @returns {number} Returns the total number of maps present at server
     */
    getMapCount(): number {
        return Object.values(this.maps).length;
    }
}

export default MapManager;
