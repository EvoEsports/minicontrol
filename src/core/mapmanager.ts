import { Interface } from "readline";
import Server from "./server";
import { Map } from "./types";

class MapManager {
    private maps: { [key: string]: Map; };
    currentMap?: Map;
    currentmapIndex: number = 0;
    private server: Server;

    constructor(server: Server) {
        this.server = server;
        this.maps = {};
        server.on("Trackmania.BeginMap", this.onBeginMap.bind(this));
        server.on("Trackmania.MapListModified", this.onMapListModified.bind(this));
    }

    async init() {
        this.maps = {};
        this.currentMap = await this.server.call("GetCurrentMapInfo");
        const serverMaps = await this.server.call("GetMapList", -1, 0);
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
        if (data[2]) {
            this.init();
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
        return JSON.parse(JSON.stringify(Object.values(this.maps)));
    }

    /**
     * get mapslist
     * @returns {Map[]} Returns the current maplist
     */
    getMaplist() {
        return Object.values(this.maps);
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
