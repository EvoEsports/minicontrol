import Server from "./server";
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
    currentmapIndex: number = 0;

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
        tmc.server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        tmc.server.on("Trackmania.MapListModified", this.onMapListModified.bind(this));
        this.currentMap = await tmc.server.call("GetCurrentMapInfo");
        const serverMaps = await tmc.server.call("GetMapList", -1, 0);
        let i = 0;

        for (const map of serverMaps) {
            this.maps[map.UId] = map;
            if (map.UId === this.currentMap?.UId) {
                this.currentmapIndex = i;
            }
            i += 1;
        }
    }

    private async onBeginMap(data: any) {
        this.currentMap = data[0];
    }

    private async onMapListModified(data: any) {
        if (data[2] === true) {
            this.maps = {};
            this.currentMap = await tmc.server.call("GetCurrentMapInfo");
            const serverMaps = await tmc.server.call("GetMapList", -1, 0);
            let i = 0;    
            for (const map of serverMaps) {
                this.maps[map.UId] = map;
                if (map.UId === this.currentMap?.UId) {
                    this.currentmapIndex = i;
                }
                i += 1;
            }
        }
    }

    private addMap(map: Map) {
        this.maps[map.UId] = map;
    }

    private removeMap(mapUId: string) {
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
