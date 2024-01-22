import { clone } from "./utils";

export interface Map {
    UId: string;
    Name: string;
    Author: string;
    AuthorNickName?: string;
    AuthorTime: number;
    GoldTime: number;
    FileName: string;
    Environnement: string;
    Mood: string;
    LapRace: boolean;
    NbLaps: number;
    NbCheckpoints: number;
}

/**
 * MapManager class
 */
class MapManager {
    private maps: { [key: string]: Map; };
    currentMap?: Map;
    nextMap?: Map;

    /**
     * @ignore
     * @param server server instance
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
        this.currentMap = await tmc.server.call("GetCurrentMapInfo");
        this.nextMap = await tmc.server.call("GetNextMapInfo");
        await this.syncMaplist();
    }

    private async onBeginMap(data: any) {
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
        const serverMaps = await tmc.server.call("GetMapList", -1, 0);
        for (const map of serverMaps) {
            this.maps[map.UId] = map;
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
    get() {
        return clone(Object.values(this.maps));
    }

    /**
     * get mapslist
     * @returns {Map[]} Returns the current maplist
     */
    getMaplist() {
        return this.get();
    }

    /**
     * get map uids
     * @returns {string[]} Returns the current map uids
     */
    getUids() {
        return Object.keys(this.maps);
    }

    /**
     * @returns {number} Returns the total number of maps present at server
     */
    getMapCount() {
        return Object.values(this.maps).length;
    }
}

export default MapManager;
