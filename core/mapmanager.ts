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
    Karma?: {
        positive: number;
        negative: number;
        total: number;
    };
    [key: string]: any;
}

/**
 * MapManager class
 */
class MapManager {
    private maps: { [key: string]: Map };
    previousMap: Map = {} as Map;
    currentMap: Map = {} as Map;
    nextMap: Map = {} as Map;
    private startTime = 0;

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
        tmc.server.addListener("Trackmania.BeginRound", this.onBeginRound, this);
        try {
            this.currentMap = await tmc.server.call("GetCurrentMapInfo");
            this.nextMap = await tmc.server.call("GetNextMapInfo");
        } catch (e: any) {
            tmc.cli(`¤error¤${e.message}`);
        }

        await this.syncMaplist();
    }

    async afterInit() {
        this.startTime = Date.now();
    }

    async onBeginRound() {
        this.startTime = Date.now();
    }

    /** @ignore */
    private async onBeginMap(data: any) {
        this.previousMap = clone(this.currentMap);
        this.currentMap = data[0];
        const index = Object.keys(this.maps).indexOf(data[0].UId);
        const indexNext = (index + 1) % Object.keys(this.maps).length;
        this.nextMap = Object.values(this.maps)[indexNext];
    }

    /** @ignore */
    private async onMapListModified(data: any) {
        if (data[2] === true) {
            await this.syncMaplist();
        }
        tmc.server.emit("TMC.MapListModified", data);
    }

    /**
     * Sync the maplist with the server
     */
    async syncMaplist() {
        const chunckedMaps: any = chunkArray(await tmc.server.call("GetMapList", -1, 0), 100);
        let method = "GetMapInfo";
        if (tmc.game.Name === "TmForever") method = "GetChallengeInfo";

        const newMaps = {};
        for (const infos of chunckedMaps) {
            const out: any[] = [];

            for (const map of infos) {
                out.push([method, map.FileName]);
            }
            const res: any = (await tmc.server.multicall(out)) || [];

            for (const map of res) {
                // sync old map objects to new map
                if (this.maps[map.UId]) {
                    const oldmap = clone(this.maps[map.UId]);
                    newMaps[map.UId] = Object.assign(map, oldmap);
                } else {
                    newMaps[map.UId] = map;
                }
            }
        }
        this.maps = newMaps;
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
     * get timing infos for current map
     */
    getTimeInfo(): { timePlayed: number; timeLeft: number; timeLimit: number } {
        const timeLimit = tmc.storage["minicontrol.taTimeLimit"] ?? Number.parseInt(process.env.TALIMIT ?? "300");
        const timeLeft = 3 + timeLimit - (Date.now() - this.startTime) / 1000;
        const timePlayed = 3 + (Date.now() - this.startTime) / 1000;
        return { timePlayed, timeLeft, timeLimit };
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
