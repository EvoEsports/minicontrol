import { Interface } from "readline";
import Server from "./server";
import { Map } from "./types";

class MapManager {
    private maps: { [key: string]: Map; };
    currentMap?: Map;
    currentmapIndex: number = 0;
    server: Server;

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

    async onBeginMap(data: any) {
        this.currentMap = data[0];
    }

    async onMapListModified(data: any) {
        data = data[0];
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

    get() {
        return Object.values(this.maps);
    }

    getUids() {
        return Object.keys(this.maps);
    }

    getMapCount() {
        return Object.values(this.maps).length;
    }
}

export default MapManager;
