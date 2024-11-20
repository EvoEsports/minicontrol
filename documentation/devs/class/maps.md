# Maps manager

```ts
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

    // available if database is set and minicontrol has local access for dedicated server maps
    Vehicle?: string;

    [key: string]: any;
}
```


```ts
class MapManager {
    previousMap?: Map;
    currentMap?: Map;
    nextMap?: Map;

    /**
     * add map
     */
    addMap(map: Map);

    /**
     * remove map
     * @param mapUId
     */
    removeMap(mapUid);

    // return clone of map objects
    get();
    // alias for get()
    getMaplist();
    // return all uid's of maps
    getUids();
    // gets mapcount
    getMapCount();

}
```
